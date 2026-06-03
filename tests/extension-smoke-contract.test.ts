import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("extension smoke validates actual Chrome profile path and built dist manifest", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");

  assert.match(smoke, /readActualChromeExtensionInstall/);
  assert.match(smoke, /Secure Preferences/);
  assert.match(smoke, /Actual Chrome profile loads a different path/);
  assert.match(smoke, /validateDistManifest\(\)/);
  assert.match(smoke, /distManifest\.minimum_chrome_version !== "120"/);
  assert.match(smoke, /expectedExtensionId = getExtensionIdFromManifestKey/);
  assert.match(smoke, /chrome-extension:\/\/\$\{expectedExtensionId\}\/sidepanel\.html/);
});

test("extension smoke covers all critical surfaces and collects runtime evidence", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  for (const surfaceId of [
    "home-root",
    "branch-picker-header-lock",
    "home-submenu-customer-guidance",
    "home-submenu-quick-replies",
    "home-submenu-service-management",
    "home-submenu-work-management",
    "home-submenu-template-editor",
    "settings-hub",
    "template-settings",
    "form-settings",
    "laundry-management",
    "sales-management",
    "airport-van-management",
    "room-remark-memo",
    "ota-reservation-input",
    "work-report-template-list",
    "pms-checkin-list",
    "pms-checkout-list",
    "pms-room-select",
  ]) {
    assert.match(smoke, new RegExp(`"${surfaceId}"`));
  }

  assert.match(smoke, /Runtime\.enable/);
  assert.match(smoke, /Log\.enable/);
  assert.match(smoke, /runtimeErrors\.length === 0/);
  assert.match(smoke, /consoleErrors/);
  assert.match(smoke, /input\[placeholder\],textarea\[placeholder\]/);
  assert.match(smoke, /logoVisibleWhenLocked/);
  assert.match(smoke, /usesContractTransition/);
  assert.match(smoke, /usesRouteMotion/);
  assert.match(smoke, /overflowItems/);
  assert.match(smoke, /extension-smoke-result\.json/);
});

test("extension smoke uses visible scoped interactions rather than PASS strings or hidden-root shortcuts", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");

  assert.doesNotMatch(smoke, /result:\s*"PASS"/);
  assert.match(smoke, /byRootText/);
  assert.match(smoke, /byDetailText/);
  assert.match(smoke, /await sleep\(320\)/);
  assert.match(smoke, /waitFor\(\(\)=>document\.querySelector\("\.work-surface"\)/);
  assert.match(smoke, /pms-checkin-list/);
  assert.match(smoke, /pms-checkout-list/);
  assert.match(smoke, /pms-room-select/);
});
