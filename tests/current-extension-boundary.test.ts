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
  const navigationController = readFileSync(
    join(root, "src/ui/side-panel-navigation-controller.svelte.ts"),
    "utf8",
  );
  const navigationDependencies = readFileSync(
    join(root, "src/ui/side-panel-navigation-dependencies.ts"),
    "utf8",
  );
  const sidePanel = readFileSync(join(root, "src/ui/components/SidePanelView.svelte"), "utf8");
  const screenStage = readFileSync(join(root, "src/ui/components/ScreenStage.svelte"), "utf8");
  const workSurface = readFileSync(join(root, "src/ui/components/WorkSurface.svelte"), "utf8");
  const pmsGuestPanel = readFileSync(join(root, "src/ui/components/PmsGuestPanel.svelte"), "utf8");
  const shellHeader = readFileSync(join(root, "src/ui/components/ShellHeader.svelte"), "utf8");

  assert.match(main, /mount\(App, \{ target \}\)/);
  assert.match(
    app,
    /createSidePanelNavigationController\(browserSidePanelNavigationDependencies\)/,
  );
  assert.match(app, /<SidePanel \{controller\} \/>/);
  assert.doesNotMatch(
    app,
    /{#if|<main|<section|fetch\(|chrome\.storage|navigator\.clipboard|window\.|side-panel-controller|side-panel-dependencies/,
  );
  assert.match(sidePanel, /<ScreenStage/);
  assert.match(sidePanel, /<ShellHeader/);
  assert.doesNotMatch(sidePanel, /activeMenuIcon=/);
  assert.doesNotMatch(shellHeader, /export let activeMenuIcon|app-header-title|<h1/);
  assert.match(screenStage, /<HomeView/);
  assert.match(screenStage, /<PmsGuestPanel/);
  assert.match(screenStage, /<WorkSurface/);
  assert.match(sidePanel, /function openMenu\(target: MenuId \| HomeNavigationItem\)/);
  assert.match(sidePanel, /onOpenMenu=\{openMenu\}/);
  assert.match(sidePanel, /function goBack\(\)/);
  assert.match(sidePanel, /homeReturnGroupId=\{homeReturnGroupId\}/);
  assert.match(screenStage, /initialGroupId=\{homeReturnGroupId\}/);
  assert.match(readFileSync(join(root, "src/ui/components/HomeView.svelte"), "utf8"), /export let initialGroupId = ""/);
  assert.match(sidePanel, /function syncViewFromController\(\)/);
  assert.match(sidePanel, /renderedBottomPanel = controller\.activeBottomPanel/);
  assert.match(sidePanel, /renderedMenu = controller\.activeMenuId \? getMenu\(controller\.activeMenuId\) : null/);
  assert.match(sidePanel, /let renderedMenu = \$state<MenuItem \| null>\(null\)/);
  assert.match(
    sidePanel,
    /#key controller\.activeMenu\?\.title \|\| renderedMenu\?\.title \|\| controller\.activeBottomPanel\?\.title \|\| renderedBottomPanel\?\.title \|\| "navigation"/,
  );
  assert.doesNotMatch(sidePanel, /renderedMenuId|renderedRouteKey/);
  assert.doesNotMatch(sidePanel, /#key renderedMenuId \|\| renderedBottomPanel\?\.id \|\| "navigation"/);
  assert.match(sidePanel, /await controller\.openMenu\(target\)/);
  assert.match(sidePanel, /await controller\.openBottomNavigation\(item\)/);
  assert.match(sidePanel, /class="work-status shell-status"/);
  assert.doesNotMatch(sidePanel, /selectedMenuId|selectedBottomItem/);
  assert.doesNotMatch(screenStage, /stageMenu|stageBottomPanel/);
  assert.doesNotMatch(screenStage, /revision|stageViewKey/);
  assert.doesNotMatch(navigationController, /revision|function touch\(|touch\(\)/);
  assert.doesNotMatch(
    sidePanel + screenStage,
    /AirportVanPanel|CustomerGuidancePanel|LaundryPanel|OtaReservationPanel|RouteMotionFrame|SettingsPanel|TemplateList|WorkHeader|RoomsSettingsBar|home-bottom-toggle/,
  );
  assert.doesNotMatch(sidePanel + screenStage + workSurface + pmsGuestPanel, /chrome\.storage|navigator\.clipboard|window\.|fetch\(|confirm\(/);
  assert.match(workSurface, /draggable/);
  assert.match(workSurface, /ondragstart/);
  assert.match(workSurface, /ondrop/);
  assert.match(workSurface, /oncontextmenu/);
  assert.match(workSurface, /onRemoveLaundryRecord/);
  assert.match(workSurface, /class="airport-route-card"/);
  assert.match(workSurface, /class="laundry-status-board"/);
  assert.match(workSurface, /class=\{`laundry-scheduled/);
  assert.match(shellHeader, /class="branch-logo-trigger"/);
  assert.match(shellHeader, /class="branch-picker-strip"/);
  assert.doesNotMatch(shellHeader, /class="branch-trigger"/);
  assert.doesNotMatch(workSurface, />\s*\{getManualVariables\(template\)\.length\} 입력\s*</);
  assert.doesNotMatch(workSurface, /work-hero|template-meta|kanban-drop-zones|progress-card|진행 기록|업무 기록과 고객 전달|History Log Preview|진행상태|<p>\{menu\.description\}<\/p>/);
  assert.doesNotMatch(screenStage + sidePanel, /onRefreshLaundry|onHideLaundryProgressEntry|onRemoveLaundryProgressEntry|laundryProgressLog/);
  assert.doesNotMatch(workSurface, /class="settings-inputs" aria-label="공항밴/);
  assert.doesNotMatch(workSurface, /<div class="kanban-stack" aria-label="세탁 상태">/);
  assert.doesNotMatch(workSurface, /class="laundry-entry"/);
  assert.match(readFileSync(join(root, "styles/sidepanel.css"), "utf8"), /\.home-nav-root-item \{\s+min-height: var\(--home-root-row-height\);\s+border-bottom: 0;/);
  assert.doesNotMatch(
    navigationController + navigationDependencies,
    /fetch\(|pms-workflow|ota-workflow|laundry-workflow|rooms-settings-actions|side-panel-controller|side-panel-dependencies/,
  );
  assert.match(navigationDependencies, /active-tab-automation/);
  assert.match(navigationDependencies, /navigator\.clipboard/);
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
