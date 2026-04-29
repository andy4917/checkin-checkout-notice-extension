import test from "node:test";
import assert from "node:assert/strict";

import { detectOtaReservationLocator } from "../src/ota/source-detection.js";
import { normalizeOtaReservation } from "../src/ota/normalizer.js";
import {
  OtaRequestThrottledError,
  createOtaRequestGuard,
} from "../src/ota/request-guard.js";
import { buildWingsReservationFieldMap } from "../src/wings/reservation-draft.js";
import {
  fillWingsReservationFromPreview,
  loadOtaReservationPreview,
} from "../src/application/ota-reservation-input.js";
import { WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE } from "../src/platform/active-tab-automation.js";

test("OTA locator detects Naver and Station detail URLs", () => {
  assert.deepEqual(
    detectOtaReservationLocator(
      "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
    ),
    {
      source: "naver",
      pageUrl:
        "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
      businessId: "1217752",
      bookingId: "1219592380",
      apiUrl: "https://partner.booking.naver.com/api/businesses/1217752/bookings/1219592380",
    },
  );

  assert.equal(
    detectOtaReservationLocator(
      "https://api.admin-stationbyuhc.com/admin/branch/16/reservation/7910",
    ).apiUrl,
    "https://api.admin-stationbyuhc.com/admin/branch/16/reservation/7910",
  );
});

test("OTA payload normalizes into WINGS reservation field map without save semantics", () => {
  const locator = detectOtaReservationLocator(
    "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
  );
  const draft = normalizeOtaReservation(locator, {
    reserverName: "Kim",
    phone: "010-1234-5678",
    checkInDate: "2026-05-11",
    checkOutDate: "2026-05-14",
    adultCount: 2,
    childCount: 0,
    roomTypeName: "Grand City Spa Suite",
    roomTypeCode: "GSS",
    totalPrice: "600,000",
    requestMemo: "고층 요청",
  });
  const fields = buildWingsReservationFieldMap(draft, "gangnam");

  assert.equal(fields.PROPERTY_NO, "91");
  assert.equal(fields.ARRV_DATE, "2026-05-11");
  assert.equal(fields.DEPT_DATE, "2026-05-14");
  assert.equal(fields.NIGHTS, "3");
  assert.equal(fields.ADULT_CNT, "2");
  assert.equal(fields.CHILD_CNT, "0");
  assert.equal(fields.RSVN_ROOM_CNT, "1");
  assert.equal(fields.INHS_GEST_NAME, "Kim");
  assert.equal(fields.RSVN_GEST_NAME, "Kim");
  assert.equal(fields.RSVN_GEST_TEL_NO, "01012345678");
  assert.equal(fields.MOBILE_NO, "01012345678");
  assert.equal(fields.GLOBAL_RSVN_NO, "1219592380");
  assert.equal(fields.CORP_CUSTM_NAME, "네이버[91]");
  assert.equal(fields.CORP_CUSTM_NO, "00048147");
  assert.equal(fields.MARKET_CODE, "DOO");
  assert.equal(fields.SOURCE_CODE, "OTA");
  assert.equal(fields.TOTAL_AMT, "600000");
  assert.equal(fields.ROOM_FEE, "200000");
  assert.equal(fields.STD_ROOM_FEE, "200000");
  assert.equal(
    fields.COMT,
    "(유아X) / [성인 2명] / [KOR, 3박] / [01012345678] / 메신저 :",
  );
  assert.equal(Object.keys(fields).some((key) => /save|insert|update|confirm/i.test(key)), false);
});

test("selected WINGS branch is explicit and OTA branch mismatch fails fast", () => {
  const locator = detectOtaReservationLocator(
    "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
  );
  const draft = normalizeOtaReservation(locator, {
    branchId: "13",
    reserverName: "Kim",
    checkInDate: "2026-05-11",
    checkOutDate: "2026-05-12",
  });

  assert.equal(draft.branchId, "coex");
  assert.throws(
    () => buildWingsReservationFieldMap(draft, "gangnam"),
    /올바른 지점이 아닙니다/,
  );
  assert.throws(
    () => buildWingsReservationFieldMap({ ...draft, branchId: undefined }, ""),
    /지점을 선택해주세요/,
  );
});

test("Station branch code must match the selected WINGS branch", () => {
  const locator = detectOtaReservationLocator(
    "https://api.admin-stationbyuhc.com/admin/branch/16/reservation/7910",
  );
  const draft = normalizeOtaReservation(locator, {
    reserverName: "Kim",
    checkInDate: "2026-05-11",
    checkOutDate: "2026-05-12",
  });

  assert.equal(draft.branchId, "gangnam");
  assert.throws(() => buildWingsReservationFieldMap(draft, "coex"), /올바른 지점이 아닙니다/);
});

test("Station Seolleung HAR-shaped payload maps to WINGS fields", () => {
  const locator = detectOtaReservationLocator(
    "https://api.admin-stationbyuhc.com/admin/branch/37/reservation/7917",
  );
  const draft = normalizeOtaReservation(locator, {
    guestName: "Kim",
    guestMobile: "+82 1012345678",
    guestEmail: "guest@example.com",
    roomName: "Standard City Suite",
    checkInDateTime: "2026-04-29T15:00:00",
    checkOutDateTime: "2026-05-01T11:00:00",
    totalPaymentPrice: 594300,
  });
  const fields = buildWingsReservationFieldMap(draft, "seolleung");

  assert.equal(draft.branchId, "seolleung");
  assert.equal(fields.PROPERTY_NO, "14");
  assert.equal(fields.ARRV_DATE, "2026-04-29");
  assert.equal(fields.DEPT_DATE, "2026-05-01");
  assert.equal(fields.NIGHTS, "2");
  assert.equal(fields.ADULT_CNT, "4");
  assert.equal(fields.CHILD_CNT, "0");
  assert.equal(fields.RSVN_ROOM_CNT, "1");
  assert.equal(fields.MOBILE_NO, "+821012345678");
  assert.equal(fields.EMAIL, "guest@example.com");
  assert.equal(fields.GLOBAL_RSVN_NO, "7917");
  assert.equal(fields.ROOM_TYPE_NAME, "Standard City Suite");
  assert.equal(fields.ROOM_FEE, "297150");
  assert.equal(fields.TOTAL_AMT, "594300");
  assert.equal(fields.COMT, "(유아X) / [성인 4명] / [KOR, 2박] / [+821012345678] / 메신저 :");
});

test("Seolleung Naver account number is omitted until configured", () => {
  const locator = detectOtaReservationLocator(
    "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
  );
  const draft = normalizeOtaReservation(locator, {
    reserverName: "Kim",
    checkInDate: "2026-05-11",
    checkOutDate: "2026-05-12",
  });
  const fields = buildWingsReservationFieldMap(draft, "seolleung");

  assert.equal(fields.CORP_CUSTM_NAME, "네이버[14]");
  assert.equal("CORP_CUSTM_NO" in fields, false);
});

test("OTA reservation application boundary can be exercised without live Chrome", async () => {
  const preview = await loadOtaReservationPreview("coex", {
    fetchPayload: async () => ({
      locator: detectOtaReservationLocator(
        "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592380",
      ),
      payload: {
        reserverName: "Kim",
        phone: "010-1234-5678",
        checkInDate: "2026-05-11",
        checkOutDate: "2026-05-12",
      },
    }),
  });

  assert.equal(preview.fields.PROPERTY_NO, "13");
  assert.equal(preview.fields.ADULT_CNT, "4");
  assert.equal(preview.fields.CHILD_CNT, "0");
  assert.equal(preview.fields.RSVN_ROOM_CNT, "1");
  assert.deepEqual(
    await fillWingsReservationFromPreview(preview, {
      fillForm: async (fields) => ({
        filled: Object.keys(fields),
        missing: [],
      }),
    }),
    { filled: Object.keys(preview.fields), missing: [] },
  );
});

test("WINGS reservation input exposes a specific missing-window message", () => {
  assert.equal(
    WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE,
    "WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.",
  );
});

test("OTA request guard merges in-flight calls and caches short repeated reads", async () => {
  let currentTime = 1_000;
  let calls = 0;
  const guard = createOtaRequestGuard({
    minIntervalMs: 2_000,
    cacheTtlMs: 30_000,
    now: () => currentTime,
  });

  const first = guard.run("naver:1", async () => {
    calls += 1;
    await Promise.resolve();
    return { id: "payload-1" };
  });
  const second = guard.run("naver:1", async () => {
    calls += 1;
    return { id: "payload-2" };
  });

  assert.deepEqual(await Promise.all([first, second]), [
    { id: "payload-1" },
    { id: "payload-1" },
  ]);
  assert.equal(calls, 1);

  currentTime += 1_000;
  assert.deepEqual(await guard.run("naver:1", async () => ({ id: "payload-3" })), {
    id: "payload-1",
  });
  assert.equal(calls, 1);
});

test("OTA request guard throttles immediate retry after uncached failures", async () => {
  let currentTime = 10_000;
  const guard = createOtaRequestGuard({
    minIntervalMs: 2_000,
    cacheTtlMs: 30_000,
    now: () => currentTime,
  });

  await assert.rejects(
    () =>
      guard.run("station:1", async () => {
        throw new Error("network");
      }),
    /network/,
  );

  await assert.rejects(
    () => guard.run("station:1", async () => ({ id: "retry" })),
    OtaRequestThrottledError,
  );

  currentTime += 2_000;
  assert.deepEqual(await guard.run("station:1", async () => ({ id: "retry-ok" })), {
    id: "retry-ok",
  });
});
