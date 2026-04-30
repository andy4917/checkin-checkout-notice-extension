import test from "node:test";
import assert from "node:assert/strict";

import { EXTENSION_CONFIG, PMS_CONFIG } from "../src/config/app-config.js";
import { BRANCHES } from "../src/config/branches.js";
import { ASSET_CATALOG, hasDoorPasswordGuideAsset } from "../src/assets/asset-catalog.js";
import {
  TEMPLATE_CATALOG,
  TEMPLATE_DUPLICATE_GROUPS,
  getTemplatesForBranch,
} from "../src/messages/template-catalog.js";
import { syncGuests } from "../src/application/sync-guests.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";
import { PmsRequestError, fetchPmsGuests } from "../src/pms/client.js";
import { normalizePmsGuestRow } from "../src/pms/normalizer.js";
import type { BranchId, PmsFetch } from "../src/types.js";
import manifest from "../manifest.json" with { type: "json" };
import { getExtensionIdFromManifestKey } from "../scripts/extension-id.js";

test("manifest maps MV3 entrypoints to compiled extension assets", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, "dist/assets/background.js");
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.side_panel.default_path, "dist/sidepanel.html");
  assert.deepEqual(manifest.host_permissions, [
    "https://pms.sanhait.com/*",
    "https://partner.booking.naver.com/*",
    "https://admin.admin-stationbyuhc.com/*",
    "https://api.admin-stationbyuhc.com/*",
  ]);
  assert.equal(manifest.permissions.includes("scripting"), true);
});

test("manifest key fixes the unpacked Chrome extension ID", () => {
  assert.equal(
    getExtensionIdFromManifestKey(manifest.key),
    "jeidoobjhbnnicfkcdfncheimgdnhmjk",
  );
});

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
  const fakeFetch: PmsFetch = async () => {
    called = true;
    return {
      async json() {
        return { rows: [] };
      },
    };
  };
  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "", fakeFetch),
    /지점을 선택해주세요/,
  );
  assert.equal(called, false);
});

test("PMS client posts encoded filter body and returns rows", async () => {
  const calls: Array<{
    url: string;
    options: Parameters<PmsFetch>[1];
  }> = [];
  const fakeFetch: PmsFetch = async (url, options) => {
    calls.push({ url, options });
    return {
      async json() {
        return { rows: [{ GUEST_NAME: "Kim" }] };
      },
    };
  };

  const rows = await fetchPmsGuests("20260426", "ARRIVAL", "coex", fakeFetch);

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
  const failingFetch: PmsFetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    async json() {
      return { rows: [] };
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", failingFetch),
    /PMS 요청 실패: 401 Unauthorized/,
  );

  const missingRowsFetch: PmsFetch = async () => ({
    ok: true,
    async json() {
      return {};
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", missingRowsFetch),
    /rows is required/,
  );

  const malformedFetch: PmsFetch = async () => ({
    ok: true,
    async json() {
      return { rows: "not-array" };
    },
  });

  await assert.rejects(
    () => fetchPmsGuests("20260426", "ARRIVAL", "coex", malformedFetch),
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
  const fakeFetch: PmsFetch = async () => ({
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
    fetchImpl: fakeFetch,
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

test("door password guide video is intentionally excluded from runtime attachments", () => {
  assert.deepEqual(ASSET_CATALOG, []);
  assert.equal(hasDoorPasswordGuideAsset("coex"), false);
  assert.equal(hasDoorPasswordGuideAsset("gangnam"), false);
  assert.equal(hasDoorPasswordGuideAsset("seolleung"), false);

  assert.equal(
    getTemplatesForBranch("coex").some((template) =>
      template.attachments.includes("coex-door-password-guide-video"),
    ),
    false,
  );
  assert.equal(
    getTemplatesForBranch("gangnam").some((template) =>
      template.attachments.includes("coex-door-password-guide-video"),
    ),
    false,
  );
});

test("template catalog records only proven duplicate groups as canonical groups", () => {
  const duplicateGroupIds = new Set(
    TEMPLATE_CATALOG
      .map((template) => template.duplicateGroupId)
      .filter(Boolean),
  );

  assert.deepEqual([...duplicateGroupIds].sort(), [
    "csm-foreign-prearrival-exact",
    "csm-two-week-strong-similar",
    "full-cleaning-exact",
    "laundry-complete-strong-similar",
    "room-upgrade-en-exact",
    "room-upgrade-ko-exact",
  ]);
  assert.deepEqual(TEMPLATE_DUPLICATE_GROUPS["csm-foreign-prearrival-exact"], [
    "CSM.zip::CSM/2주전CSM.txt",
    "CSM.zip::CSM/외국고객리뷰요청.txt",
    "CSM.zip::CSM/외국인 재실CSM.txt",
    "CSM.zip::CSM/한 달 전CSM.txt",
  ]);
});
