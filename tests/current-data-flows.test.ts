import test from "node:test";
import assert from "node:assert/strict";

import { upsertWingsRemarkLine } from "../src/application/wings-remark.js";
import { fetchPmsGuests, PmsRequestError } from "../src/pms/client.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
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

test("PMS client posts to the configured endpoint and rejects malformed responses", async () => {
  const calls: Array<{ input: string; body: URLSearchParams }> = [];
  const rows = await fetchPmsGuests("20260426", "ARRIVAL", "coex", async (input, init) => {
    calls.push({ input, body: init.body });
    return { ok: true, json: async () => ({ rows: [{ GUEST_NAME: "Kim", ROOM_NO: 1302 }] }) };
  });

  assert.equal(calls[0]?.input, "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do");
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
    () => fetchPmsGuests("20260426", "ARRIVAL", "", async () => ({ json: async () => ({ rows: [] }) })),
    /지점을 선택해주세요/,
  );
  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", async () => ({ json: async () => ({ rows: {} }) })),
    PmsRequestError,
  );
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
  assert.equal(Object.keys(fields).some((key) => /save|insert|update|confirm/i.test(key)), false);
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
