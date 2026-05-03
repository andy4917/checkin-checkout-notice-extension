import test from "node:test";
import assert from "node:assert/strict";

import { EXTENSION_CONFIG, PMS_CONFIG } from "../src/config/app-config.js";
import { BRANCHES } from "../src/config/branches.js";
import { syncGuests } from "../src/application/sync-guests.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
import { PmsRequestError, fetchPmsGuests } from "../src/pms/client.js";
import { normalizePmsGuestRow } from "../src/pms/normalizer.js";
import type { BranchId, PmsFetch } from "../src/types.js";

test("PMS branch config maps WINGS codes to all three request fields", () => {
  const cases: Array<[BranchId, string]> = [
    ["coex", "13"],
    ["gangnam", "91"],
    ["seolleung", "14"],
  ];

  for (const [branchId, expectedCode] of cases) {
    const params = buildPmsSearchParams("20260426", "ARRIVAL", branchId);
    assert.equal(params.get("filter[filters][0][value]"), expectedCode);
    assert.equal(params.get("filter[filters][1][value]"), expectedCode);
    assert.equal(params.get("filter[filters][44][value]"), expectedCode);
    assert.equal(BRANCHES[branchId].pms.bsnsCode, expectedCode);
  }
});

test("arrival PMS params put selected date in arrival filters", () => {
  const params = buildPmsSearchParams("20260426", "ARRIVAL", "coex");

  assert.equal(params.get("take"), PMS_CONFIG.requestDefaults.take);
  assert.equal(params.get("filter[filters][0][field]"), "BSNS_CODE");
  assert.equal(params.get("filter[filters][0][value]"), "13");
  assert.equal(params.get("filter[filters][6][field]"), "ARRV_DATE_F");
  assert.equal(params.get("filter[filters][6][value]"), "20260426");
  assert.equal(params.get("filter[filters][10][field]"), "DEPT_DATE_F");
  assert.equal(params.get("filter[filters][10][value]"), "");
});

test("departure PMS params put selected date in departure filters", () => {
  const params = buildPmsSearchParams("20260426", "DEPARTURE", "coex");

  assert.equal(params.get("filter[filters][6][value]"), "");
  assert.equal(params.get("filter[filters][10][value]"), "20260426");
  assert.deepEqual(params.getAll("filter[filters][38][value][]"), [
    "RR,RN,RC,RW",
    "CI",
    "CO,CH",
  ]);
});

test("PMS client requires a selected branch before fetch", async () => {
  let called = false;
  const pmsFetchStub: PmsFetch = async () => {
    called = true;
    return {
      async json() {
        return { rows: [] };
      },
    };
  };
  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "", pmsFetchStub),
    /지점을 선택해주세요/,
  );
  assert.equal(called, false);
});

test("PMS client posts encoded filter body and returns rows", async () => {
  const calls: Array<{
    url: string;
    options: Parameters<PmsFetch>[1];
  }> = [];
  const pmsFetchStub: PmsFetch = async (url, options) => {
    calls.push({ url, options });
    return {
      async json() {
        return { rows: [{ GUEST_NAME: "Kim" }] };
      },
    };
  };

  const rows = await fetchPmsGuests("20260426", "ARRIVAL", "coex", pmsFetchStub);

  assert.deepEqual(rows, [{ GUEST_NAME: "Kim" }]);
  assert.equal(
    calls[0].url,
    `${EXTENSION_CONFIG.allowedPmsOrigins[0]}${PMS_CONFIG.endpointPath}`,
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(
    calls[0].options.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  );
  assert.equal(calls[0].options.body.get("filter[filters][6][value]"), "20260426");
});

test("PMS client rejects HTTP failures and malformed rows", async () => {
  const unauthorizedFetch: PmsFetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    async json() {
      return { rows: [] };
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", unauthorizedFetch),
    /PMS 요청 실패: 401 Unauthorized/,
  );

  const missingRowsResponseFetch: PmsFetch = async () => ({
    ok: true,
    async json() {
      return {};
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", missingRowsResponseFetch),
    /rows is required/,
  );

  const malformedRowsResponseFetch: PmsFetch = async () => ({
    ok: true,
    async json() {
      return { rows: "not-array" };
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", malformedRowsResponseFetch),
    PmsRequestError,
  );
});

test("PMS rows normalize into template-free guest records", () => {
  const record = normalizePmsGuestRow(
    {
      GUEST_NAME: "Kim",
      ROOM_NO: "1302",
      ROOM_TYPE_NAME: "Grand Suite",
      DEPT_DATE: "20260427",
      RSVN_STATUS_CODE: "CI",
      RSVN_NO: "R1",
    },
    { branchId: "coex", mode: "ARRIVAL", queryDate: "20260426" },
  );

  assert.equal(record.id, "coex-arrival-20260426-R1");
  assert.equal(record.displayRoom, "A302");
  assert.equal(record.statusLabel, "재실 중");
  assert.deepEqual(record.templateValues, {
    branchId: "coex",
    branchName: "코엑스",
    guestName: "Kim",
    roomNo: "1302",
    displayRoom: "A302",
    roomType: "Grand Suite",
    roomTypeName: "Grand Suite",
    departureDate: "20260427",
    statusCode: "CI",
    statusLabel: "재실 중",
    queryDate: "20260426",
    pmsMode: "ARRIVAL",
  });
});

test("syncGuests fetches, sorts, filters, and exposes template value bags", async () => {
  const pmsFetchStub: PmsFetch = async () => ({
    ok: true,
    async json() {
      return {
        rows: [
          { GUEST_NAME: "Kim", ROOM_NO: "1302", RSVN_STATUS_CODE: "CI" },
          { GUEST_NAME: "Lee", ROOM_NO: "0101", RSVN_STATUS_CODE: "RR" },
        ],
      };
    },
  });

  const result = await syncGuests({
    date: "20260426",
    mode: "ARRIVAL",
    branchId: "gangnam",
    searchTerm: "b101",
    fetchImpl: pmsFetchStub,
  });

  assert.equal(result.branchId, "gangnam");
  assert.deepEqual(
    result.records.map((record) => record.guestName),
    ["Lee", "Kim"],
  );
  assert.deepEqual(
    result.visibleRecords.map((record) => record.templateValues.branchName),
    ["강남"],
  );
});
