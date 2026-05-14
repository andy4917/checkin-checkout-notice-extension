import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDefaultSidePanelBehavior } from "../src/background/side-panel-policy.js";
import { getTabContextFromUrl } from "../src/platform/tab-context.js";

const root = process.cwd();

test("manifest remains a Chrome MV3 Svelte side panel extension boundary", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, "dist/assets/background.js");
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.side_panel.default_path, "dist/sidepanel.html");
  assert.deepEqual(manifest.permissions, ["sidePanel", "storage", "tabs", "scripting"]);
  assert.deepEqual(manifest.host_permissions, [
    "https://pms.sanhait.com/*",
    "https://partner.booking.naver.com/*",
    "https://admin.admin-stationbyuhc.com/*",
    "https://api.admin-stationbyuhc.com/*",
  ]);
});

test("Svelte entry is the only side panel app entry and App stays an orchestrator", () => {
  const main = readFileSync(join(root, "src/ui/main.ts"), "utf8");
  const app = readFileSync(join(root, "src/ui/App.svelte"), "utf8");
  const sidePanel = readFileSync(join(root, "src/ui/components/SidePanelView.svelte"), "utf8");

  assert.match(main, /mount\(App, \{ target \}\)/);
  assert.match(app, /createSidePanelController\(browserSidePanelDependencies\)/);
  assert.match(app, /<SidePanel \{controller\} \/>/);
  assert.doesNotMatch(app, /{#if|<main|<section|fetch\(|chrome\.storage|navigator\.clipboard|window\./);
  assert.match(sidePanel, /CustomerGuidancePanel/);
  assert.match(sidePanel, /RoomsSettingsBar/);
});

test("side panel open policy and tab context are explicit instead of silently inferring a product surface", () => {
  assert.deepEqual(getDefaultSidePanelBehavior(), { openPanelOnActionClick: true });
  assert.deepEqual(getTabContextFromUrl("https://example.com"), {
    url: "https://example.com",
    isPmsPage: false,
    isGuestRecord: false,
  });
  assert.equal(
    getTabContextFromUrl("https://pms.sanhait.com/pms/biz/ir04_0100X/detail.do?RSVN_NO=1")
      .isGuestRecord,
    true,
  );
});
