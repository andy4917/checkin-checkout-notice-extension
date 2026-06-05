import test from "node:test";
import assert from "node:assert/strict";

import {
  AIRPORT_VAN_PAYMENT_OPTIONS,
  AIRPORT_VAN_RIDE_DIRECTION_OPTIONS,
  renderAirportVanCopy,
} from "../src/application/airport-van-form.js";
import { guardRequiredContext, PMS_CONTEXT_MESSAGE } from "../src/application/context-guard.js";
import { formatSalesExpenseAmount } from "../src/application/sales-expense-form.js";
import { fillWingsReservationFromPreview } from "../src/application/ota-reservation-input.js";
import { addLaundryRecord, getAllowedLaundryMoveTargets, moveLaundryRecord } from "../src/application/laundry-records.js";
import {
  filterTemplatesForMenu,
  getHomeMenuSections,
  homeNavigationGroups,
  settingsNavigationItems,
  settingsUtilityItems,
} from "../src/catalog/menu-routing.js";
import { applyStoredUnifiedTemplateState } from "../src/catalog/template-catalog.js";
import { renderTemplate } from "../src/catalog/template-renderer.js";
import { DEFAULT_EXTENSION_STATE, StorageSchemaError, normalizeStoredExtensionState } from "../src/platform/storage-schema.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
import { fetchPmsGuests, PmsRequestError } from "../src/pms/client.js";
import { normalizePmsGuestRows } from "../src/pms/normalizer.js";
import { normalizeOtaReservation } from "../src/ota/normalizer.js";
import { buildWingsReservationFieldMap } from "../src/wings/reservation-draft.js";

type PmsMode = "ARRIVAL" | "DEPARTURE";
type PmsEntry = [string, string];

function expectedOriginalCoexPmsEntries(date: string, mode: PmsMode): PmsEntry[] {
  const isArrival = mode === "ARRIVAL";
  const entries: PmsEntry[] = [
    ["take", "300"],
    ["skip", "0"],
    ["page", "1"],
    ["pageSize", "300"],
    ["filter[PAGE_ID]", "IR04_0100X_V03"],
    ["filter[AUTH_PASS_YN]", "N"],
  ];
  const pairFilters: Array<[number, string, string]> = [
    [0, "BSNS_CODE", "13"],
    [1, "PROPERTY_NO", "13"],
    [2, "GUEST_NAME", ""],
    [3, "RSVN_FOLIO_NO", ""],
    [4, "ROOM_NO", ""],
    [5, "SEARCH_KEY", ""],
    [6, "ARRV_DATE_F", isArrival ? date : ""],
    [7, "ARRV_DATE_T", isArrival ? date : ""],
    [8, "STAY_DATE_F", ""],
    [9, "STAY_DATE_T", ""],
    [10, "DEPT_DATE_F", isArrival ? "" : date],
    [11, "DEPT_DATE_T", isArrival ? "" : date],
    [12, "RSVN_DATE_F", ""],
    [13, "RSVN_DATE_T", ""],
    [14, "ACCOMPANY", ""],
    [15, "CORP_CUSTM_NAME", ""],
    [16, "CORP_CUSTM_NO", ""],
    [17, "RSVN_BY_NAME", ""],
    [18, "RSVN_BY_ID", ""],
    [19, "CHECK_IN_BY_NAME", ""],
    [20, "CHECK_IN_BY_ID", ""],
    [21, "GLOBAL_RSVN_NO", ""],
    [22, "CAR_NO", ""],
    [23, "ROOM_TYPE_CODE", ""],
  ];
  pairFilters.forEach(([index, field, value]) => appendExpectedPairFilter(entries, index, field, value));
  appendExpectedFieldOnlyFilter(entries, 24, "ROOM_TYPE_CODE_ARRAY");
  appendExpectedPairFilter(entries, 25, "MARKET_CODE", "");
  appendExpectedFieldOnlyFilter(entries, 26, "MARKET_CODE_ARRAY");
  appendExpectedPairFilter(entries, 27, "SOURCE_CODE", "");
  appendExpectedFieldOnlyFilter(entries, 28, "SOURCE_CODE_ARRAY");
  appendExpectedPairFilter(entries, 29, "RATE_CODE", "");
  appendExpectedFieldOnlyFilter(entries, 30, "RATE_CODE_ARRAY");
  appendExpectedPairFilter(entries, 31, "NAT_CODE", "");
  appendExpectedFieldOnlyFilter(entries, 32, "NAT_CODE_ARRAY");
  appendExpectedPairFilter(entries, 33, "PRMT_EMP_ID", "");
  appendExpectedFieldOnlyFilter(entries, 34, "PRMT_EMP_ID_ARRAY");
  appendExpectedPairFilter(entries, 35, "SEARCH_CONDITION", "");
  appendExpectedFieldOnlyFilter(entries, 36, "SEARCH_CONDITION_ARRAY");
  appendExpectedPairFilter(entries, 37, "RSVN_STATUS_CODE", "RR,RN,RC,RW,CI,CO,CH,");
  entries.push(["filter[filters][38][field]", "RSVN_STATUS_CODE_ARRAY"]);
  entries.push(["filter[filters][38][value][]", "RR,RN,RC,RW"]);
  entries.push(["filter[filters][38][value][]", "CI"]);
  entries.push(["filter[filters][38][value][]", "CO,CH"]);
  appendExpectedPairFilter(entries, 39, "TYPE_CODE", "RR");
  entries.push(["filter[filters][40][field]", "TYPE_CODE_ARRAY"]);
  entries.push(["filter[filters][40][value][]", "RR"]);
  appendExpectedPairFilter(entries, 41, "IND_GROUP_CODE", "F,G,");
  entries.push(["filter[filters][42][field]", "IND_GROUP_CODE_ARRAY"]);
  entries.push(["filter[filters][42][value][]", "F"]);
  entries.push(["filter[filters][42][value][]", "G"]);
  appendExpectedPairFilter(entries, 43, "DISPLAY_OPTION", "TTL");
  appendExpectedPairFilter(entries, 44, "PP_BSNS_CODE", "13");
  entries.push(["PAGE_ID", "IR04_0100X_V03"]);
  entries.push(["AUTH_PASS_YN", "N"]);
  return entries;
}

function appendExpectedPairFilter(entries: PmsEntry[], index: number, field: string, value: string): void {
  entries.push([`filter[filters][${index}][field]`, field]);
  entries.push([`filter[filters][${index}][value]`, value]);
}

function appendExpectedFieldOnlyFilter(entries: PmsEntry[], index: number, field: string): void {
  entries.push([`filter[filters][${index}][field]`, field]);
}

test("catalog routes define the product surface map and template filtering", () => {
  assert.deepEqual(homeNavigationGroups.map((group) => group.title), [
    "고객 안내문",
    "빠른 문의 답변",
    "고객 서비스 관리",
    "업무 관리",
    "템플릿 / 양식 편집",
  ]);
  assert.deepEqual(settingsUtilityItems.map((item) => item.surfaceCountPolicy), [
    "utilityNotProductSurface",
    "utilityNotProductSurface",
    "utilityNotProductSurface",
  ]);
  assert.deepEqual(settingsNavigationItems.map((item) => [item.title, item.role]), [
    ["안내문 편집 / 빠른답변 편집", "editorShortcut"],
    ["업무 양식 편집", "editorShortcut"],
  ]);

  const templates = applyStoredUnifiedTemplateState(DEFAULT_EXTENSION_STATE);
  assert.ok(filterTemplatesForMenu("CUSTOMER_NOTICE", templates).length > 0);
  assert.ok(filterTemplatesForMenu("QUICK_REPLY", templates).some((template) => template.id === "quick-rental-item-inquiry"));
  assert.deepEqual(filterTemplatesForMenu("OTA_RESERVATION_INPUT", templates), []);
});

test("catalog-owned home sections keep service and work menus separated", () => {
  const sections = new Map(getHomeMenuSections().map((section) => [section.title, section.items.map((item) => item.title)]));

  assert.deepEqual(sections.get("고객 서비스 관리"), ["세탁물 관리", "매지출 관리", "공항밴 관리"]);
  assert.deepEqual(sections.get("업무 관리"), ["객실 정보 리마크", "NAVER / STATION 예약입력", "업무보고 양식"]);
});

test("template rendering fails required values instead of producing fake success", () => {
  const template = applyStoredUnifiedTemplateState(DEFAULT_EXTENSION_STATE).find((item) => item.id === "quick-rental-item-inquiry");
  assert.ok(template);
  assert.throws(() => renderTemplate(template, "KO", {}), /필수 입력값/);
  assert.equal(renderTemplate(template, "KO", { rentalItemName: "가습기" }).includes("가습기"), true);
});

test("PMS context guard does not require a WINGS browser tab", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: PMS_CONTEXT_MESSAGE,
  });
  assert.doesNotMatch(PMS_CONTEXT_MESSAGE, /WINGS|브라우저 탭/);
});

test("PMS request state uses branch/date owner modules and rejects malformed backend responses", async () => {
  const params = buildPmsSearchParams("20260604", "ARRIVAL", "coex");
  assert.deepEqual(Array.from(params.entries()), expectedOriginalCoexPmsEntries("20260604", "ARRIVAL"));
  assert.equal(Array.from(params.entries()).length, 94);
  assert.deepEqual(
    Array.from(buildPmsSearchParams("20260604", "DEPARTURE", "coex").entries()),
    expectedOriginalCoexPmsEntries("20260604", "DEPARTURE"),
  );
  assert.equal(params.get("filter[filters][0][field]"), "BSNS_CODE");
  assert.equal(params.get("filter[filters][0][value]"), "13");
  assert.equal(params.get("filter[filters][6][value]"), "20260604");

  const rows = await fetchPmsGuests("20260604", "ARRIVAL", "coex", async (input, init) => {
    assert.equal(input, "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "include");
    assert.deepEqual(init.headers, { "Content-Type": "application/x-www-form-urlencoded" });
    assert.equal(init.body.get("filter[filters][0][value]"), "13");
    assert.equal(init.body.get("filter[filters][6][value]"), "20260604");
    return { ok: true, json: async () => ({ rows: [{ GUEST_NAME: "Kim", ROOM_NO: 1302 }] }) };
  });
  assert.deepEqual(rows, [{ GUEST_NAME: "Kim", ROOM_NO: "1302" }]);

  await assert.rejects(
    () => fetchPmsGuests("20260604", "ARRIVAL", "coex", async () => ({ ok: true, json: async () => ({ rows: {} }) })),
    PmsRequestError,
  );

  let htmlJsonCalled = false;
  await assert.rejects(
    () =>
      fetchPmsGuests("20260604", "ARRIVAL", "coex", async () => ({
        ok: true,
        headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html;charset=UTF-8" : null) },
        text: async () => "<form action='https://idp.sanhait.com/identity/samlsso'>PMS SAML redirect</form>",
        json: async () => {
          htmlJsonCalled = true;
          return { rows: [{ GUEST_NAME: "Fake" }] };
        },
      })),
    /PMS 응답 형식이 올바르지 않습니다: JSON response expected\./,
  );
  assert.equal(htmlJsonCalled, false);

  let nonJsonCalled = false;
  await assert.rejects(
    () =>
      fetchPmsGuests("20260604", "ARRIVAL", "coex", async () => ({
        ok: true,
        headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/plain" : null) },
        json: async () => {
          nonJsonCalled = true;
          return { rows: [{ GUEST_NAME: "Fake" }] };
        },
      })),
    /PMS 응답 형식이 올바르지 않습니다: JSON response expected\./,
  );
  assert.equal(nonJsonCalled, false);

  let nonOkTextCalled = false;
  await assert.rejects(
    () =>
      fetchPmsGuests("20260604", "ARRIVAL", "coex", async () => ({
        ok: false,
        status: 599,
        statusText: "Unexpected HTML response",
        text: async () => {
          nonOkTextCalled = true;
          return "<html>Unexpected PMS HTML</html>";
        },
        json: async () => ({ rows: [] }),
      })),
    /PMS 요청 실패: 599 Unexpected HTML response/,
  );
  assert.equal(nonOkTextCalled, false);
});

test("PMS normalizer keeps distinct records even when names or room values are missing", () => {
  const records = normalizePmsGuestRows(
    [
      { GUEST_NAME: "", ROOM_NO: "", DEPT_DATE: "20260604" },
      { GUEST_NAME: "", ROOM_NO: "", DEPT_DATE: "20260605" },
    ],
    { branchId: "coex", mode: "ARRIVAL", queryDate: "20260604" },
  );
  assert.equal(new Set(records.map((record) => record.id)).size, 2);
  assert.doesNotMatch(records.map((record) => record.id).join("\n"), /-guest$/);
});

test("OTA normalization and WINGS field mapping are branch-bound without save semantics", async () => {
  const draft = normalizeOtaReservation(
    {
      source: "naver",
      pageUrl: "https://partner.booking.naver.com/bizes/1356779/booking-list-view/bookings/1202156803",
      businessId: "1356779",
      bookingId: "1202156803",
      apiUrl: "https://partner.booking.naver.com/api/businesses/1356779/bookings/1202156803",
    },
    { guestName: "Kim", phone: "01012345678", checkInDate: "20260604", checkOutDate: "20260605" },
  );
  const fields = buildWingsReservationFieldMap(draft, "coex");
  assert.equal(fields.PROPERTY_NO, "13");
  assert.equal(Object.keys(fields).some((key) => /save|insert|update|confirm/i.test(key)), false);
  await assert.rejects(
    () => fillWingsReservationFromPreview({ draft, fields }, "gangnam", { async fillForm() { return { filled: [], missing: [] }; } }),
    /올바른 지점이 아닙니다/,
  );
});

test("airport van, sales, storage, and laundry domain functions reject fake fallbacks", async () => {
  assert.equal(formatSalesExpenseAmount("45000"), "45,000");
  assert.equal(formatSalesExpenseAmount(undefined), "0");

  assert.throws(() => renderAirportVanCopy("workLog", {}, new Date("2026-06-04T09:00:00+09:00")), /필수 입력값/);
  const vanCopy = renderAirportVanCopy(
    "guestMessage",
    {
      rideDirection: AIRPORT_VAN_RIDE_DIRECTION_OPTIONS[0].value,
      rideDate: "2026. 06. 04",
      rideTime: "14:30",
      guestName: "Kim",
      guestContact: "010-1111-2222",
      roomNo: "A302",
      airportName: "인천공항",
      terminal: "T1",
      flightNo: "KE082",
      flightTime: "18:00",
      passengerCount: "2",
      largeLuggageCount: "1",
      smallLuggageCount: "0",
      paymentMethod: AIRPORT_VAN_PAYMENT_OPTIONS[1].value,
    },
    new Date("2026-06-04T09:00:00+09:00"),
  );
  assert.doesNotMatch(vanCopy, /N\/A|YYYY|HH:MM/);

  assert.deepEqual(normalizeStoredExtensionState(undefined), DEFAULT_EXTENSION_STATE);
  assert.throws(() => normalizeStoredExtensionState("corrupt"), StorageSchemaError);

  const storage: Record<string, unknown> = {};
  const storageArea = {
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, storage[key]]));
    },
    async set(values: Record<string, unknown>) {
      Object.assign(storage, values);
    },
  };
  const record = await addLaundryRecord({ branchId: "coex", guestName: "", roomNo: "", displayRoom: "", itemSummary: "직접 입력 세탁물" }, storageArea, new Date("2026-06-04T09:00:00+09:00"));
  assert.deepEqual(getAllowedLaundryMoveTargets(record), ["WASHER", "DRYER"]);
  await assert.rejects(() => moveLaundryRecord(record.id, "READY", storageArea, new Date("2026-06-04T09:01:00+09:00")), /잘못된 절차/);
});
