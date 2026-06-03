import test from "node:test";
import assert from "node:assert/strict";

import {
  AIRPORT_VAN_PAYMENT_OPTIONS,
  AIRPORT_VAN_RIDE_DIRECTION_OPTIONS,
  renderAirportVanCopy,
} from "../src/application/airport-van-form.js";
import { formatSalesExpenseAmount } from "../src/application/sales-expense-form.js";
import { fillWingsReservationFromPreview } from "../src/application/ota-reservation-input.js";
import { addLaundryRecord, getAllowedLaundryMoveTargets, moveLaundryRecord } from "../src/application/laundry-records.js";
import { filterTemplatesForMenu, homeNavigationGroups, settingsNavigationItems } from "../src/catalog/menu-routing.js";
import { applyStoredUnifiedTemplateState } from "../src/catalog/template-catalog.js";
import { renderTemplate } from "../src/catalog/template-renderer.js";
import { DEFAULT_EXTENSION_STATE, StorageSchemaError, normalizeStoredExtensionState } from "../src/platform/storage-schema.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
import { fetchPmsGuests, PmsRequestError } from "../src/pms/client.js";
import { normalizePmsGuestRows } from "../src/pms/normalizer.js";
import { normalizeOtaReservation } from "../src/ota/normalizer.js";
import { buildWingsReservationFieldMap } from "../src/wings/reservation-draft.js";

test("catalog routes define the product surface map and template filtering", () => {
  assert.deepEqual(homeNavigationGroups.map((group) => group.title), [
    "고객 안내문",
    "빠른 문의 답변",
    "고객 서비스 관리",
    "업무 관리",
    "템플릿 / 양식 편집",
  ]);
  assert.deepEqual(settingsNavigationItems.map((item) => item.title), ["템플릿 편집", "양식 편집"]);

  const templates = applyStoredUnifiedTemplateState(DEFAULT_EXTENSION_STATE);
  assert.ok(filterTemplatesForMenu("CUSTOMER_NOTICE", templates).length > 0);
  assert.ok(filterTemplatesForMenu("QUICK_REPLY", templates).some((template) => template.id === "quick-rental-item-inquiry"));
  assert.deepEqual(filterTemplatesForMenu("OTA_RESERVATION_INPUT", templates), []);
});

test("template rendering fails required values instead of producing fake success", () => {
  const template = applyStoredUnifiedTemplateState(DEFAULT_EXTENSION_STATE).find((item) => item.id === "quick-rental-item-inquiry");
  assert.ok(template);
  assert.throws(() => renderTemplate(template, "KO", {}), /필수 입력값/);
  assert.equal(renderTemplate(template, "KO", { rentalItemName: "가습기" }).includes("가습기"), true);
});

test("PMS request state uses branch/date owner modules and rejects malformed backend responses", async () => {
  const params = buildPmsSearchParams("20260604", "ARRIVAL", "coex");
  assert.equal(params.get("filter[filters][0][field]"), "BSNS_CODE");
  assert.equal(params.get("filter[filters][0][value]"), "13");
  assert.equal(params.get("filter[filters][6][value]"), "20260604");

  const rows = await fetchPmsGuests("20260604", "ARRIVAL", "coex", async (input, init) => {
    assert.equal(input, "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "include");
    return { ok: true, json: async () => ({ rows: [{ GUEST_NAME: "Kim", ROOM_NO: 1302 }] }) };
  });
  assert.deepEqual(rows, [{ GUEST_NAME: "Kim", ROOM_NO: "1302" }]);

  await assert.rejects(
    () => fetchPmsGuests("20260604", "ARRIVAL", "coex", async () => ({ ok: true, json: async () => ({ rows: {} }) })),
    PmsRequestError,
  );
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
