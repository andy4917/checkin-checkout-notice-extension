import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDefaultSidePanelBehavior } from "../src/background/side-panel-policy.js";
import { getTabContextFromUrl } from "../src/platform/tab-context.js";

const root = process.cwd();

test("manifest remains a Chrome MV3 Svelte side panel extension boundary", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const testContract = readFileSync(join(root, "docs/TEST_CONTRACT.md"), "utf8");

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
  assert.equal(packageJson.scripts["check:extension-smoke"], "tsx scripts/check-extension-sidepanel-smoke.ts");
  assert.match(
    packageJson.scripts.verify,
    /npm run typecheck && npm run build && npm test && npm run check:sidepanel-scale && npm run check:extension-smoke/,
  );
  assert.doesNotMatch(testContract, /Vite-served|localhost render|localhost\/Vite/);
  assert.match(testContract, /chrome-extension:\/\/jeidoobjhbnnicfkcdfncheimgdnhmjk\/sidepanel\.html/);
  assert.doesNotMatch(
    readFileSync(join(root, "scripts/check-extension-sidepanel-smoke.ts"), "utf8"),
    /result:\s*"PASS"/,
  );
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
  const backButton = readFileSync(join(root, "src/ui/components/BackButton.svelte"), "utf8");
  const sidepanelCss = readFileSync(join(root, "styles/sidepanel.css"), "utf8");
  const salesExpenseForm = readFileSync(join(root, "src/application/sales-expense-form.ts"), "utf8");

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
  assert.match(sidePanel, /renderedMenu = typeof target === "string"\s*\?\s*baseMenu\s*:\s*\{ \.\.\.baseMenu, title: target\.title, icon: target\.icon \}/);
  assert.match(sidePanel, /let renderedMenu = \$state<MenuItem \| null>\(null\)/);
  assert.match(sidePanel, /let renderedViewKey = \$state\(""\)/);
  assert.match(
    sidePanel,
    /#key renderedViewKey \|\| controller\.activeBottomPanel\?\.id \|\| renderedBottomPanel\?\.id \|\| "navigation"/,
  );
  assert.match(sidePanel, /activeMenu=\{renderedMenu \|\| controller\.activeMenu\}/);
  assert.match(sidePanel, /activeMenuTitle=\{renderedMenu\?\.title \|\| controller\.activeMenu\?\.title \|\| null\}/);
  assert.match(sidePanel, /let homeDrillActive = \$state\(false\)/);
  assert.match(sidePanel, /activeMenuTitle=\{activeShellTitle\}/);
  assert.match(screenStage, /export let onBack: \(\) => void/);
  assert.doesNotMatch(sidePanel, /renderedMenuId|renderedRouteKey|controller\.activeMenu\?\.title \|\| renderedMenu\?\.title/);
  assert.doesNotMatch(sidePanel, /#key renderedMenuId \|\| renderedBottomPanel\?\.id \|\| "navigation"/);
  assert.match(sidePanel, /await controller\.openMenu\(target\)/);
  assert.match(sidePanel, /await controller\.openBottomNavigation\(item\)/);
  assert.match(sidePanel, /class="work-status shell-status"/);
  assert.doesNotMatch(sidePanel, /showErrorToast|status-toast|statusVersion/);
  assert.match(workSurface, /usesWorkLanguageSelector\(menu\.id\) && availableLanguages\.length > 0/);
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
  assert.match(workSurface, /class="room-memo-head"/);
  assert.match(workSurface, /class="inventory-stepper"/);
  assert.match(workSurface, /WINGS 리마크 입력/);
  assert.match(workSurface, /adjustRoomRemarkCount/);
  assert.match(workSurface, /class="room-note-panel"/);
  assert.match(workSurface, /pendingRoomRemarkTemplateId/);
  assert.doesNotMatch(workSurface, /return templateValue\(variable\.name\)\.trim\(\) \|\| "0"/);
  assert.match(backButton, /onclick=\{onBack\}/);
  assert.match(workSurface, /<BackButton className="home-nav-back work-nav-back" label=\{menu\.title\} onBack=\{onBack\}/);
  assert.match(pmsGuestPanel, /<BackButton className="home-nav-back work-nav-back" label=\{panel\.title\} onBack=\{onBack\}/);
  assert.match(screenStage, /onBack=\{onBack\}/);
  assert.doesNotMatch(pmsGuestPanel, /돌아가기/);
  assert.match(pmsGuestPanel, /loading\s*\?\s*"PMS 조회 중"/);
  assert.doesNotMatch(pmsGuestPanel, /N\/A|NA_LABEL|valueOrNa/);
  assert.doesNotMatch(shellHeader, /BackButton|header-back-button|onBack/);
  assert.match(shellHeader, /class="header-logo-mark"/);
  assert.match(shellHeader, /id="branch-selection-popup"/);
  assert.match(shellHeader, /class="branch-selection-popup"/);
  assert.match(shellHeader, /onclick=\{\(\) => chooseBranch\(branch\.id\)\}/);
  assert.match(shellHeader, /bind:this=\{branchTriggerElement\}/);
  assert.match(shellHeader, /onpointerdown=\{handleWindowPointerdown\}/);
  assert.match(shellHeader, /closeBranchPanel\(true\)/);
  assert.doesNotMatch(shellHeader, /nextBranchId|chooseNextBranch|target:\s*\{\s*value/);
  assert.doesNotMatch(shellHeader, /class="branch-trigger"|class="branch-logo-trigger"|class="branch-picker-strip"/);
  assert.doesNotMatch(shellHeader, /MIN_BRANCH_APPLY_MS|waitForBranchApplyMotion|setTimeout/);
  assert.doesNotMatch(workSurface, />\s*\{getManualVariables\(template\)\.length\} 입력\s*</);
  assert.doesNotMatch(workSurface, /<b>\{group\.templates\.length\}<\/b>|<b>\{requiredManualVariables\.length\}<\/b>|총 지출|복사 전 자동 적용/);
  assert.doesNotMatch(workSurface, /<span>\{copiedTemplateId === template\.id \? "복사됨" : "복사"\}<\/span>/);
  assert.doesNotMatch(workSurface, /menu\.id === "SALES_MANAGEMENT"|menu\.id === "ROOM_REMARK_MEMO"/);
  assert.doesNotMatch(workSurface, /remark-card-keys|remark-rentals/);
  assert.doesNotMatch(workSurface, /screenKind === "templateSettings" \|\| menu\.screenKind === "settings"/);
  assert.doesNotMatch(workSurface, /screenKind === "formSettings" \|\| menu\.screenKind === "settings"/);
  assert.doesNotMatch(workSurface, /work-hero|template-meta|kanban-drop-zones|progress-card|진행 기록|업무 기록과 고객 전달|History Log Preview|진행상태|<p>\{menu\.description\}<\/p>/);
  assert.doesNotMatch(readFileSync(join(root, "src/catalog/menu-routing.ts"), "utf8"), /homeQuickActions/);
  assert.doesNotMatch(screenStage + sidePanel, /onRefreshLaundry|onHideLaundryProgressEntry|onRemoveLaundryProgressEntry|laundryProgressLog/);
  assert.doesNotMatch(workSurface, /class="settings-inputs" aria-label="공항밴/);
  assert.match(workSurface, /menu\.screenKind === "settings"/);
  assert.match(workSurface, /settingsNavigationItems/);
  const settingsHubBlock =
    workSurface
      .split('{:else if menu.screenKind === "settings"}')[1]
      ?.split('{:else if menu.screenKind === "templateSettings"}')[0] || "";
  assert.match(settingsHubBlock, /#each settingsLinks as item/);
  assert.doesNotMatch(settingsHubBlock, /settings-editor-head|\{menu\.title\}/);
  assert.doesNotMatch(workSurface, /onOpenMenu\("TEMPLATE_EDITOR"\)|onOpenMenu\("FORM_EDITOR"\)/);
  assert.doesNotMatch(workSurface, /placeholder:\s*fieldName|label:\s*fieldName/);
  assert.doesNotMatch(workSurface, /reference-screen-head|sales-entry-head|template-editor-card|template-toolbar|Copied|Copy Record|Save Template|Subject Line|Edit Template|Draft|Optional|현재 설정 항목 없음/);
  assert.doesNotMatch(workSurface, /placeholder=|settings-editor-head|laundry-chip empty|column-empty|>\s*없음\s*</);
  assert.match(workSurface, /class="sales-amount-panel"/);
  assert.match(workSurface, /class="sales-category-panel"/);
  assert.match(workSurface, /class="sales-detail-panel"/);
  assert.match(workSurface, /class="operation-card ota-fetch-card"/);
  assert.match(workSurface, /class="laundry-add-field"/);
  assert.doesNotMatch(workSurface, /<div class="kanban-stack" aria-label="세탁 상태">/);
  assert.doesNotMatch(workSurface, /class="laundry-entry"/);
  assert.match(sidepanelCss, /\.home-nav-root-item \{\s+min-height: var\(--home-root-row-height\);\s+border-bottom: 0;/);
  assert.doesNotMatch(sidepanelCss, /settings-editor-head|laundry-chip\.empty|column-empty|min-height:\s*calc\(100dvh - var\(--home-header-block-space\)/);
  assert.match(salesExpenseForm, /SALES_EXPENSE_CATEGORIES/);
  assert.doesNotMatch(workSurface, /SUPPLIES|REPAIRS|FOOD|OTHER/);
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
