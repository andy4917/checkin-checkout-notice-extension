import test from "node:test";
import assert from "node:assert/strict";

import {
  createOperatorErrorMessageTracker,
  OTA_ACTIVE_TAB_REFRESH_MESSAGE,
  OTA_BRANCH_MISMATCH_MESSAGE,
  OPERATION_REPEATED_ERROR_MESSAGE,
  PMS_REQUEST_FAILED_MESSAGE,
  WINGS_RESERVATION_WINDOW_MESSAGE,
} from "../src/application/operator-error-messages.js";
import {
  AIRPORT_VAN_PAYMENT_OPTIONS,
  AIRPORT_VAN_RIDE_DIRECTION_OPTIONS,
  renderAirportVanCopy,
} from "../src/application/airport-van-form.js";
import {
  addLaundryRecord,
  getAllowedLaundryMoveTargets,
  hideLaundryProgressEntry,
  moveLaundryRecord,
  removeLaundryProgressEntry,
  removeLaundryRecord,
  visibleLaundryProgressLog,
} from "../src/application/laundry-records.js";
import { readLaundryRecords } from "../src/laundry/storage.js";
import { upsertWingsRemarkLine } from "../src/application/wings-remark.js";
import { fillWingsReservationFromPreview } from "../src/application/ota-reservation-input.js";
import { fetchPmsGuests, PmsRequestError } from "../src/pms/client.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
import { normalizePmsGuestRows } from "../src/pms/normalizer.js";
import { normalizeOtaReservation, requireOtaDraftMinimum } from "../src/ota/normalizer.js";
import { buildWingsReservationFieldMap } from "../src/wings/reservation-draft.js";

test("PMS search body requires an explicit branch and puts date filters in the selected mode", () => {
  const arrival = buildPmsSearchParams("20260426", "ARRIVAL", "coex");
  const departure = buildPmsSearchParams("20260426", "DEPARTURE", "gangnam");

  assert.equal(arrival.get("filter[filters][0][field]"), "BSNS_CODE");
  assert.equal(arrival.get("filter[filters][0][value]"), "13");
  assert.equal(arrival.get("filter[filters][6][value]"), "20260426");
  assert.equal(arrival.get("filter[filters][10][value]"), "");
  assert.equal(departure.get("filter[filters][0][value]"), "91");
  assert.equal(departure.get("filter[filters][6][value]"), "");
  assert.equal(departure.get("filter[filters][10][value]"), "20260426");
});

test("PMS client posts to the configured endpoint with session credentials and rejects malformed responses", async () => {
  const calls: Array<{
    input: string;
    method: string;
    credentials: RequestCredentials;
    contentType: string;
    body: URLSearchParams;
  }> = [];
  const rows = await fetchPmsGuests("20260426", "ARRIVAL", "coex", async (input, init) => {
    calls.push({
      input,
      method: init.method,
      credentials: init.credentials,
      contentType: init.headers["Content-Type"],
      body: init.body,
    });
    return { ok: true, json: async () => ({ rows: [{ GUEST_NAME: "Kim", ROOM_NO: 1302 }] }) };
  });

  assert.equal(calls[0]?.input, "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do");
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.credentials, "include");
  assert.equal(calls[0]?.contentType, "application/x-www-form-urlencoded");
  assert.equal(calls[0]?.body.get("filter[filters][0][value]"), "13");
  assert.equal(calls[0]?.body.get("filter[filters][6][value]"), "20260426");
  assert.deepEqual(rows, [{ GUEST_NAME: "Kim", ROOM_NO: "1302" }]);

  await assert.rejects(
    () =>
      fetchPmsGuests("20260426", "ARRIVAL", "coex", async () => ({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({ rows: [] }),
      })),
    /PMS 요청 실패: 500 Server Error/,
  );
  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "", async () => ({ ok: true, json: async () => ({ rows: [] }) })),
    /지점을 선택해주세요/,
  );
  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", async () => ({ ok: true, json: async () => ({ rows: {} }) })),
    PmsRequestError,
  );
});

test("PMS guest records do not collapse missing reservation ids into a shared guest fallback", () => {
  const records = normalizePmsGuestRows(
    [
      { GUEST_NAME: "", ROOM_NO: "", DEPT_DATE: "20260530" },
      { GUEST_NAME: "", ROOM_NO: "", DEPT_DATE: "20260531" },
    ],
    { branchId: "coex", mode: "ARRIVAL", queryDate: "20260530" },
  );

  assert.equal(new Set(records.map((record) => record.id)).size, 2);
  assert.doesNotMatch(records[0]?.id || "", /-guest$/);
});

test("OTA normalization builds WINGS input fields without save or confirm semantics", () => {
  const draft = normalizeOtaReservation(
    {
      source: "station",
      pageUrl: "https://admin.admin-stationbyuhc.com/reservations/7917",
      branchCode: "37",
      reservationId: "7917",
      apiUrl: "https://api.admin-stationbyuhc.com/reservations/7917",
    },
    {
      예약자명: "Lee",
      예약자연락처: "+82 10-1234-5678",
      예약시작일: "2026-04-29",
      예약종료일: "2026-05-01",
      객실명: "Standard City Suite",
      총금액: "594,300",
      성인: "4",
      국적: "KOR",
    },
  );
  requireOtaDraftMinimum(draft);
  const fields = buildWingsReservationFieldMap(draft, "seolleung");

  assert.equal(draft.branchId, "seolleung");
  assert.equal(fields.PROPERTY_NO, "14");
  assert.equal(fields.ARRV_DATE, "2026-04-29");
  assert.equal(fields.DEPT_DATE, "2026-05-01");
  assert.equal(fields.ROOM_FEE, "297150");
  assert.equal(fields.TOTAL_AMT, "594300");
  assert.equal(fields.SOURCE_NAME, "Telephone");
  assert.equal(fields.SOURCE_CODE, "PHN");
  assert.equal(Object.keys(fields).some((key) => /save|insert|update|confirm/i.test(key)), false);
});

test("Naver business id from the OTA document participates in branch validation", () => {
  const drafts = [
    ["1356779", "1202156803", "coex", "13"],
    ["1217752", "1219592380", "gangnam", "91"],
    ["1655089", "1249191128", "seolleung", "14"],
  ] as const;

  for (const [businessId, bookingId, branchId, propertyNo] of drafts) {
    const draft = normalizeOtaReservation(
      {
        source: "naver",
        pageUrl: `https://partner.booking.naver.com/bizes/${businessId}/booking-list-view/bookings/${bookingId}`,
        businessId,
        bookingId,
        apiUrl: `https://partner.booking.naver.com/api/businesses/${businessId}/bookings/${bookingId}`,
      },
      { guestName: "Kim", phone: "01012345678", checkInDate: "20260501", checkOutDate: "20260503" },
    );

    assert.equal(draft.branchId, branchId);
    assert.equal(buildWingsReservationFieldMap(draft, branchId).PROPERTY_NO, propertyNo);
    assert.throws(
      () => buildWingsReservationFieldMap(draft, branchId === "coex" ? "gangnam" : "coex"),
      /올바른 지점이 아닙니다/,
    );
  }
});

test("OTA branch mismatch and WINGS remark dependency gaps fail before hidden side effects", async () => {
  const draft = normalizeOtaReservation(
    {
      source: "station",
      pageUrl: "https://admin.admin-stationbyuhc.com/reservations/1",
      branchCode: "18",
      reservationId: "1",
      apiUrl: "https://api.admin-stationbyuhc.com/reservations/1",
    },
    { guestName: "Kim", phone: "01012345678", checkInDate: "20260501", checkOutDate: "20260503" },
  );

  assert.throws(() => buildWingsReservationFieldMap(draft, "gangnam"), /올바른 지점이 아닙니다/);
  await assert.rejects(
    () => upsertWingsRemarkLine({ type: "cardKeys", values: { count: 2 } }, undefined),
    /WINGS 리마크 읽기 의존성이 연결되지 않았습니다/,
  );

  let writtenRemark = "";
  const result = await upsertWingsRemarkLine(
    { type: "cardKeys", values: { count: 2 } },
    {
      readRemark: async () => "기존 메모",
      writeRemark: async (nextRemark) => {
        writtenRemark = nextRemark;
      },
    },
  );
  assert.equal(result.line, "- 제공 카드키 : 2장");
  assert.equal(writtenRemark, "기존 메모\n\n- 제공 카드키 : 2장");
});

test("WINGS fill rebinds OTA preview fields to the current selected branch", async () => {
  const draft = normalizeOtaReservation(
    {
      source: "naver",
      pageUrl: "https://partner.booking.naver.com/bookings/AG-1",
      businessId: "9999999",
      bookingId: "AG-1",
      apiUrl: "https://partner.booking.naver.com/bookings/AG-1",
    },
    { guestName: "Kim", phone: "01012345678", checkInDate: "20260501", checkOutDate: "20260503" },
  );
  const preview = {
    draft,
    fields: buildWingsReservationFieldMap(draft, "coex"),
  };
  let filledFields: Record<string, string> = {};

  await fillWingsReservationFromPreview(preview, "gangnam", {
    fillForm: async (fields) => {
      filledFields = fields;
      return { filled: Object.keys(fields), missing: [] };
    },
  });

  assert.equal(filledFields.PROPERTY_NO, "91");
  assert.equal(filledFields.BSNS_CODE, "91");
  assert.equal(filledFields.CORP_CUSTM_NAME, "네이버[91]");
  assert.equal(filledFields.CORP_CUSTM_NO, "00048147");
});

test("operator OTA errors use confirmed copy and collapse repeated setup failures", () => {
  const tracker = createOperatorErrorMessageTracker();

  assert.equal(
    tracker.format(new Error("네이버 또는 스테이션 예약 상세 페이지에서 실행해주세요.")),
    OTA_ACTIVE_TAB_REFRESH_MESSAGE,
  );
  assert.equal(
    tracker.format(new Error("네이버 또는 스테이션 예약 상세 페이지에서 실행해주세요.")),
    OPERATION_REPEATED_ERROR_MESSAGE,
  );

  tracker.reset();
  assert.equal(
    tracker.format(new Error("WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.")),
    WINGS_RESERVATION_WINDOW_MESSAGE,
  );
  assert.equal(
    tracker.format(new Error("WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.")),
    OPERATION_REPEATED_ERROR_MESSAGE,
  );

  tracker.reset();
  assert.equal(tracker.format(new Error("올바른 지점이 아닙니다.")), OTA_BRANCH_MISMATCH_MESSAGE);
  assert.equal(tracker.format(new Error("PMS 요청 실패: 500 Server Error")), PMS_REQUEST_FAILED_MESSAGE);
  assert.equal(
    tracker.format(new Error("internal token parser failed: secret-ish implementation detail")),
    OPERATION_REPEATED_ERROR_MESSAGE,
  );
});

test("airport van form renders separate work-log and guest-message copy", () => {
  const values = {
    rideDirection: AIRPORT_VAN_RIDE_DIRECTION_OPTIONS[0].value,
    rideDate: "2026. 05. 25",
    rideTime: "06:35",
    guestName: "Kim",
    guestContact: "010-1111-2222",
    roomNo: "A302",
    airportName: "인천공항",
    terminal: "T1",
    flightNo: "KE001",
    flightTime: "09:10",
    passengerCount: "4",
    largeLuggageCount: "2",
    smallLuggageCount: "1",
    paymentMethod: AIRPORT_VAN_PAYMENT_OPTIONS[1].value,
    requestNote: "카시트 요청",
  };

  const receivedAt = new Date("2026-05-25T09:00:00+09:00");
  const workLog = renderAirportVanCopy("workLog", values, receivedAt);
  const guestMessage = renderAirportVanCopy("guestMessage", values, receivedAt);

  assert.doesNotMatch(workLog, /N\/A/);
  assert.doesNotMatch(guestMessage, /N\/A/);
  assert.match(workLog, /\* 공항밴 예약보고/);
  assert.match(workLog, /\* 예약 받은 날짜 : 2026\. 05\. 25/);
  assert.match(workLog, /\* 구분 : 픽업/);
  assert.match(workLog, /\* 객실번호 : A302/);
  assert.match(workLog, /\* 결제수단 : 카드/);
  assert.match(guestMessage, /공항밴 예약 요청 정보 확인 부탁드립니다\./);
  assert.match(guestMessage, /- 항공편: 인천공항 T1 KE001/);
  assert.match(guestMessage, /- 결제수단: 카드/);
  assert.notEqual(workLog, guestMessage);
});

test("airport van form fails missing required values instead of rendering fallback copy", () => {
  assert.throws(
    () => renderAirportVanCopy("workLog", {}, new Date("2026-05-25T09:00:00+09:00")),
    /필수 입력값/,
  );
});

test("laundry workflow restricts movement and records 24-hour progress", async () => {
  const storage: Record<string, unknown> = {};
  const storageArea = {
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, storage[key]]));
    },
    async set(values: Record<string, unknown>) {
      Object.assign(storage, values);
    },
  };

  const record = await addLaundryRecord(
    {
      branchId: "coex",
      guestName: "",
      roomNo: "",
      displayRoom: "",
      itemSummary: "직접 입력 세탁물",
    },
    storageArea,
    new Date("2026-05-25T09:00:00+09:00"),
  );

  assert.deepEqual(getAllowedLaundryMoveTargets(record), ["WASHER", "DRYER"]);
  await assert.rejects(
    () => moveLaundryRecord(record.id, "READY", storageArea, new Date("2026-05-25T09:01:00+09:00")),
    /잘못된 절차입니다/,
  );

  const washer = await moveLaundryRecord(record.id, "WASHER", storageArea, new Date("2026-05-25T09:05:00+09:00"));
  assert.equal(washer.status, "IN_PROGRESS");
  assert.equal(washer.machineType, "WASHER");
  assert.deepEqual(getAllowedLaundryMoveTargets(washer), ["WASHER", "DRYER"]);

  const dryer = await moveLaundryRecord(record.id, "DRYER", storageArea, new Date("2026-05-25T09:40:00+09:00"));
  assert.equal(dryer.machineType, "DRYER");

  const ready = await moveLaundryRecord(record.id, "READY", storageArea, new Date("2026-05-25T10:20:00+09:00"));
  assert.equal(ready.status, "READY");
  assert.deepEqual(getAllowedLaundryMoveTargets(ready), []);

  const records = await readLaundryRecords(storageArea);
  const progress = visibleLaundryProgressLog(records, new Date("2026-05-25T10:30:00+09:00")).map(
    (entry) => entry.message,
  );
  assert.deepEqual(progress, [
    "직접 입력 세탁물 예정",
    "직접 입력 세탁물 09:05 세탁중",
    "직접 입력 세탁물 09:40 세탁 완료. 건조중",
    "직접 입력 세탁물 완료",
  ]);

  assert.equal(visibleLaundryProgressLog(records, new Date("2026-05-27T10:30:00+09:00")).length, 0);
});

test("laundry right-click actions hide progress entries and remove blocks without fake success", async () => {
  const storage: Record<string, unknown> = {};
  const storageArea = {
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, storage[key]]));
    },
    async set(values: Record<string, unknown>) {
      Object.assign(storage, values);
    },
  };

  const record = await addLaundryRecord(
    {
      branchId: "coex",
      guestName: "",
      roomNo: "",
      displayRoom: "",
      itemSummary: "수건 2장",
    },
    storageArea,
    new Date("2026-05-25T09:00:00+09:00"),
  );
  const washer = await moveLaundryRecord(record.id, "WASHER", storageArea, new Date("2026-05-25T09:10:00+09:00"));
  const progressId = washer.progressLog[1]?.id || "";

  await hideLaundryProgressEntry(progressId, storageArea);
  let records = await readLaundryRecords(storageArea);
  assert.equal(visibleLaundryProgressLog(records, new Date("2026-05-25T09:20:00+09:00")).some((entry) => entry.id === progressId), false);

  await removeLaundryProgressEntry(progressId, storageArea);
  records = await readLaundryRecords(storageArea);
  assert.equal(records[0]?.progressLog.some((entry) => entry.id === progressId), false);

  await removeLaundryRecord(record.id, storageArea);
  assert.deepEqual(await readLaundryRecords(storageArea), []);

  await assert.rejects(() => removeLaundryRecord(record.id, storageArea), /세탁 기록을 찾을 수 없습니다/);
  await assert.rejects(() => hideLaundryProgressEntry(progressId, storageArea), /진행 기록을 찾을 수 없습니다/);
});
