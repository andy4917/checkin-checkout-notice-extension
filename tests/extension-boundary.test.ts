import test from "node:test";
import assert from "node:assert/strict";

import manifest from "../manifest.json" with { type: "json" };
import { getDefaultSidePanelBehavior } from "../src/background/side-panel-policy.js";
import { getTabContextFromUrl } from "../src/platform/tab-context.js";
import { getExtensionIdFromManifestKey } from "../scripts/extension-id.js";

test("manifest keeps Chrome MV3 entrypoints aligned with built extension assets", () => {
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

test("unpacked extension ID remains fixed by manifest key", () => {
  assert.equal(getExtensionIdFromManifestKey(manifest.key), "jeidoobjhbnnicfkcdfncheimgdnhmjk");
});

test("side panel action remains available while PMS context is detected separately", () => {
  assert.deepEqual(getDefaultSidePanelBehavior(), {
    openPanelOnActionClick: true,
  });
  assert.deepEqual(getTabContextFromUrl("https://example.com"), {
    url: "https://example.com",
    isPmsPage: false,
    isGuestRecord: false,
  });

  const pmsContext = getTabContextFromUrl(
    "https://pms.sanhait.com/pms/biz/ir04_0100X/detail.do?RSVN_NO=1",
  );
  assert.equal(pmsContext.isPmsPage, true);
  assert.equal(pmsContext.isGuestRecord, true);
});
