import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  getDefaultSidePanelOptions,
  getRuntimeSidePanelPath,
} from "../src/background/side-panel-policy.js";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function gitFiles(paths: string[]): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", ...paths], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((file) => file && existsSync(join(root, file)));
}

test("test surface was regenerated into product contract groups", () => {
  assert.deepEqual(gitFiles(["tests"]).sort(), [
    "tests/application-domain.test.ts",
    "tests/extension-smoke-contract.test.ts",
    "tests/integration-state.test.ts",
    "tests/product-surface-contract.test.ts",
    "tests/repo-boundary.test.ts",
  ]);
});

test("Chrome extension manifest and Svelte side panel boundary remain current", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const packageJson = JSON.parse(read("package.json"));
  const app = read("src/ui/App.svelte");
  const main = read("src/ui/main.ts");
  const homeView = read("src/ui/components/HomeView.svelte");
  const screenStage = read("src/ui/components/ScreenStage.svelte");
  const sidePanelView = read("src/ui/components/SidePanelView.svelte");
  const viteConfig = read("vite.config.ts");
  const css = read("styles/sidepanel.css");

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "120");
  assert.equal(manifest.background.service_worker, "dist/assets/background.js");
  assert.equal(manifest.side_panel.default_path, "dist/sidepanel.html");
  assert.equal(manifest.action.default_popup, undefined);
  assert.deepEqual(manifest.permissions, ["sidePanel", "storage", "tabs", "scripting"]);
  assert.equal(packageJson.scripts.verify, "npm run typecheck && npm run build && npm test && npm run check:sidepanel-scale && npm run check:extension-smoke");
  assert.match(main, /mount\(App, \{ target:\s*panelRoot \}\)/);
  assert.match(main, /resolveRuntimePanelHeight/);
  assert.match(main, /new ResizeObserver\(scheduleRuntimePanelHeightSync\)/);
  assert.match(main, /observer\.observe\(document\.documentElement\)/);
  assert.match(main, /window\.visualViewport\?\.height/);
  assert.match(main, /document\.documentElement\.clientHeight/);
  assert.match(main, /function startRuntimePanelObserver\(\)/);
  assert.match(main, /function resumeRuntimePanelHeightSync\(\)/);
  assert.match(main, /function handleRuntimePanelVisibilityChange\(\)/);
  assert.match(main, /resumeRuntimePanelHeightSync\(\)\s*\{[\s\S]*startRuntimePanelObserver\(\);[\s\S]*scheduleRuntimePanelHeightSync\(\);[\s\S]*\}/);
  assert.match(main, /handleRuntimePanelVisibilityChange\(\)\s*\{[\s\S]*document\.visibilityState === "hidden"[\s\S]*stopRuntimePanelObserver\(\);[\s\S]*return;[\s\S]*resumeRuntimePanelHeightSync\(\);[\s\S]*\}/);
  assert.match(main, /window\.addEventListener\("pageshow", resumeRuntimePanelHeightSync/);
  assert.match(main, /document\.addEventListener\("visibilitychange", handleRuntimePanelVisibilityChange\)/);
  assert.match(main, /window\.addEventListener\("pagehide", stopRuntimePanelObserver\)/);
  assert.doesNotMatch(main, /window\.addEventListener\("pagehide", stopRuntimePanelObserver,\s*\{[^}]*once:\s*true/s);
  assert.doesNotMatch(main, /document\.addEventListener\("visibilitychange", scheduleRuntimePanelHeightSync\)/);
  assert.doesNotMatch(main, /panelRoot\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(main, /document\.querySelector\("\.app-shell"\)\?\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(main, /document\.documentElement\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(main, /observer\.observe\(panelRoot\)/);
  assert.doesNotMatch(main, /Math\.min\(\.\.\.viewportHeights\)/);
  assert.doesNotMatch(main, /CHROME_TAB_VERTICAL_CHROME_ESTIMATE/);
  assert.doesNotMatch(main, /browserChromeHeight/);
  assert.doesNotMatch(main, /window\.devicePixelRatio > 1/);
  assert.doesNotMatch(main, /\/ window\.devicePixelRatio/);
  assert.match(main, /document\.body\.style\.setProperty\("--runtime-panel-height"/);
  assert.match(main, /document\.body\.dataset\.runtimePanelHeight/);
  assert.match(css, /--runtime-panel-height:\s*100dvh;/);
  assert.match(css, /body\s*\{[^}]*height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);[^}]*max-height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);/s);
  assert.match(css, /#app\s*\{[^}]*height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);[^}]*max-height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);[^}]*container:\s*sidepanel-root \/ size;/s);
  assert.match(css, /\.app-shell\s*\{[^}]*height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);[^}]*max-height:\s*min\(var\(--runtime-panel-height\),\s*100dvh\);/s);
  assert.match(app, /createSidePanelNavigationController\(browserSidePanelNavigationDependencies\)/);
  assert.match(app, /<SidePanel \{controller\} \/>/);
  assert.match(sidePanelView, /let showingHome = \$derived\(\s*!renderedMenu && !controller\.activeMenu && !controller\.activeBottomPanel && !renderedBottomPanel,/s);
  assert.match(sidePanelView, /class:home-mode=\{showingHome\}/);
  assert.doesNotMatch(sidePanelView, /showBottomNavigation/);
  assert.doesNotMatch(sidePanelView, /<nav class="home-fixed-bottom-bar"/);
  assert.match(screenStage, /bottomItems=\{homeBottomNavigation\}/);
  assert.match(screenStage, /onOpenBottomItem=\{onOpenBottomItem\}/);
  assert.match(homeView, /<nav class="home-fixed-bottom-bar"/);
  assert.match(viteConfig, /chunkInfo\.name === "background" \? "assets\/background\.js" : "assets\/\[name\]-\[hash\]\.js"/);
  assert.doesNotMatch(viteConfig, /entryFileNames:\s*"assets\/\[name\]\.js"/);
  assert.doesNotMatch(app, /{#if|<main|<section|fetch\(|chrome\.storage|navigator\.clipboard|window\./);
});

test("background side panel policy uses runtime manifest path without tab-specific state", () => {
  const rootManifest = {
    manifest_version: 3,
    name: "root",
    version: "1",
    side_panel: { default_path: "dist/sidepanel.html" },
  } as chrome.runtime.ManifestV3;
  const distManifest = {
    manifest_version: 3,
    name: "dist",
    version: "1",
    side_panel: { default_path: "sidepanel.html" },
  } as chrome.runtime.ManifestV3;

  assert.equal(getRuntimeSidePanelPath(rootManifest), "dist/sidepanel.html");
  assert.equal(getRuntimeSidePanelPath(distManifest), "sidepanel.html");
  assert.deepEqual(getDefaultSidePanelOptions(rootManifest), {
    path: "dist/sidepanel.html",
    enabled: true,
  });
  assert.deepEqual(getDefaultSidePanelOptions(distManifest), {
    path: "sidepanel.html",
    enabled: true,
  });
  assert.equal("tabId" in getDefaultSidePanelOptions(rootManifest), false);
});

test("legacy sidepanel and generated success-looking residue are not product surfaces", () => {
  assert.equal(existsSync(join(root, "src", "sidepanel")), false);
  assert.equal(readdirSync(root).includes("agents.md"), true);
  assert.equal(readdirSync(root).includes("AGENTS.md"), false);
  assert.deepEqual(execFileSync("git", ["ls-files", ".agent-runs/*"], { cwd: root, encoding: "utf8" }).trim(), "");
  assert.match(read(".gitignore"), /^\.agent-runs\/$/m);
  assert.match(read(".gitignore"), /^reports\/\*\.json$/m);
  assert.match(read(".gitignore"), /^reports\/\*\.png$/m);
});

test("visible UI source does not contain placeholder attributes or fake business fallback data", () => {
  const uiFiles = gitFiles(["src/ui"]);
  const violations = uiFiles.flatMap((file) => {
    const source = read(file);
    const matches = [
      /placeholder=/,
      />\s*없음\s*</,
      /YYYY\.MM\.DD|HH:MM|The Gangnan|현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|복사되었습니다\.|복사됨/,
      /입력값을 저장했습니다|필요한 탬플릿|>\s*저장됨\s*<|리마크 입력됨|보고 복사됨|업무 복사됨|고객 복사됨/,
      /Save Record|Recent Expense|RECENT|Cleaning Supplies|HVAC Repair|Room 402|Occupied|Towels|Water|Bedding/,
      /test-only|fake|demo|sample customer|placeholder business data/i,
    ].filter((pattern) => pattern.test(source));
    return matches.map((pattern) => `${file}: ${pattern}`);
  });

  assert.deepEqual(violations, []);
});

test("controller does not show generic success or storage feedback as shell status text", () => {
  const controller = read("src/ui/side-panel-navigation-controller.svelte.ts");

  assert.doesNotMatch(
    controller,
    /예약정보를 가져왔습니다|입력값을 저장했습니다|세탁물을 추가했습니다|진행상태를 기록했습니다|세탁물을 제거했습니다|객실을 선택했습니다|템플릿 설정을 초기화했습니다|템플릿을 저장했습니다|저장소를 불러오지 못했습니다|WINGS 입력이 완료되었습니다|WINGS 리마크에 입력했습니다/,
  );
  assert.match(controller, /TEXT_STATUS_ERROR_KINDS/);
  assert.match(controller, /"pmsRequestFailed"/);
  assert.match(controller, /"otaActiveTab"/);
  assert.match(controller, /"wingsReservationWindow"/);
  assert.match(controller, /hiddenFailureEvidence/);
  assert.match(controller, /setHiddenFailureEvidence\(error, "template-variable-storage-write"\)/);
  assert.match(controller, /setHiddenFailureEvidence\(error, "airport-van-form-storage-write"\)/);
  assert.match(controller, /if \(!TEXT_STATUS_ERROR_KINDS\.has\(resolved\.kind\)\)/);
});

test("PMS production dependency uses extension host-permission fetch, not a required WINGS tab", () => {
  const packageJson = JSON.parse(read("package.json"));
  const deps = read("src/ui/side-panel-navigation-dependencies.ts");
  const automation = read("src/platform/active-tab-automation.ts");
  const client = read("src/pms/client.ts");
  const background = read("src/background/index.ts");
  const sidePanelPolicy = read("src/background/side-panel-policy.ts");
  const diagnostic = read("scripts/diagnose-pms-backend.ts");

  assert.match(background, /ensureSidePanelOptions/);
  assert.match(background, /chrome\.sidePanel\.setPanelBehavior\(getDefaultSidePanelBehavior\(\)\)/);
  assert.match(background, /chrome\.sidePanel\.setOptions\(getDefaultSidePanelOptions\(\)\)/);
  assert.doesNotMatch(background, /chrome\.tabs|tabId|getOptions\(\{ tabId \}\)|isPmsTabUrl|getPmsTabSidePanelOptions|getTabSidePanelOptions|sidePanelTabOptionsNeedRepair/);
  assert.match(sidePanelPolicy, /manifest\.manifest_version === 3 \? manifest\.side_panel\?\.default_path : undefined/);
  assert.match(sidePanelPolicy, /manifestPath \|\| EXTENSION_CONFIG\.sidePanelPath/);
  assert.match(sidePanelPolicy, /getRuntimeSidePanelPath/);
  assert.doesNotMatch(sidePanelPolicy, /allowedPmsOrigins|tabId|getTabSidePanelOptions|sidePanelTabOptionsNeedRepair/);
  assert.match(deps, /fetchPmsWithHostPermissions/);
  assert.match(deps, /requireGlobalFetch/);
  assert.match(deps, /fetchImpl:\s*fetchPmsWithHostPermissions/);
  assert.equal(packageJson.scripts["diagnose:pms"], "tsx scripts/diagnose-pms-backend.ts");
  assert.doesNotMatch(deps, /fetchPmsThroughWingsPage/);
  assert.doesNotMatch(automation, /fetchPmsThroughWingsPage|getPmsTab|fetchPmsInPage/);
  assert.match(client, /credentials:\s*"include"/);
  assert.doesNotMatch(client, /SsoLoginResponse|LoginRequired|identity\/login|SAML|idp\.sanhait\.com/i);
  assert.doesNotMatch(client, /response\.text\(\)/);
  assert.match(client, /PMS 응답 형식이 올바르지 않습니다: JSON response expected/);
  assert.match(diagnostic, /buildPmsSearchParams/);
  assert.match(diagnostic, /credentials:\s*"include"/);
  assert.match(diagnostic, /original-no-cookie-post/);
  assert.match(diagnostic, /originalSidePanelEnabledOnPmsTab/);
  assert.match(diagnostic, /originalPmsFetchLocation:\s*"extension-sidepanel"/);
  assert.match(diagnostic, /originalWingsLoginRequiredBeforePmsFetch/);
  assert.match(diagnostic, /productWingsLoginRequiredBeforePmsFetch:\s*false/);
  assert.match(diagnostic, /--require-connected/);
  assert.match(diagnostic, /PMS_DIAGNOSTIC_REPORT_DIR/);
  assert.match(diagnostic, /hasSamlForm/);
  assert.match(diagnostic, /jsonRowsResponseCount/);
  assert.match(diagnostic, /json rows observed; body sample omitted/);
  assert.match(diagnostic, /saml html observed; body sample omitted/);
  assert.match(diagnostic, /non-json response observed; body sample omitted/);
  assert.doesNotMatch(diagnostic, /text\.slice\(0, 500\)/);
  assert.doesNotMatch(diagnostic, /chrome\.cookies|document\.cookie/i);
});

test("logo visibility, motion, and scroll contracts are explicit CSS/runtime contracts", () => {
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const shellHeader = read("src/ui/components/ShellHeader.svelte");
  const screenStage = read("src/ui/components/ScreenStage.svelte");
  const css = read("styles/sidepanel.css");

  assert.match(sidePanel, /branchPickerEnabled=\{!homeDrillActive\}/);
  assert.match(shellHeader, /class:locked=\{!branchPickerEnabled\}/);
  assert.match(css, /\.header-logo-mark:disabled\s*\{[^}]*opacity:\s*1;/s);
  assert.match(screenStage, /data-view-motion=\{viewDirection\}/);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*transition:\s*transform var\(--sidepanel-motion-duration\) var\(--sidepanel-motion-ease\);/s);
  assert.match(css, /\.screen-stage\[data-view-motion="backward"\]\s*>\s*\.work-surface,/);
  assert.match(css, /@keyframes work-view-enter-forward/);
  assert.match(css, /@keyframes work-view-enter-backward/);
  assert.match(css, /@keyframes work-view-replace/);
  assert.doesNotMatch(css, /\.header-logo-mark:disabled\s*\{[^}]*opacity:\s*0\.[0-9]/s);
  assert.doesNotMatch(css, /min-height:\s*calc\(100dvh - var\(--home-header-block-space\)/);
});

test("home root navigation CSS token math stays compact and bottom-bar safe", () => {
  const css = read("styles/sidepanel.css");
  const contract = JSON.parse(read("docs/product-surface-targets/home/contract.json"));
  const stabilityContract = read("docs/UI_SURFACE_STABILITY_CONTRACT.md");
  const homeView = read("src/ui/components/HomeView.svelte");
  const screenStage = read("src/ui/components/ScreenStage.svelte");
  const sidePanelView = read("src/ui/components/SidePanelView.svelte");
  const pxVar = (name: string): number => {
    const match = css.match(new RegExp(`${name}:\\s*(\\d+)px;`));
    assert.ok(match, `${name} must be declared as a px token`);
    return Number(match[1]);
  };
  const rule = (selector: string): string => {
    const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "s"));
    assert.ok(match, `${selector} rule must exist`);
    return match[1];
  };
  const pxDeclaration = (block: string, property: string): number => {
    const match = block.match(new RegExp(`${property}:\\s*(\\d+)px(?:\\s+[^;]*)?;`));
    assert.ok(match, `${property} must be declared in ${block}`);
    return Number(match[1]);
  };
  const narrowViewportMedia = css.slice(
    css.indexOf("@media (max-width: 460px)"),
    css.indexOf("@container sidepanel-root (max-height: 640px)"),
  );
  const rootRowHeight = pxVar("--home-root-row-height");
  const submenuRowHeight = pxVar("--home-submenu-row-height");
  const rootRowGap = pxVar("--home-root-row-gap");
  const rootPanelTopPad = pxVar("--home-root-panel-top-pad");
  const bottomBarButtonMinHeight = pxDeclaration(rule("\\.home-fixed-bottom-bar button"), "min-height");

  assert.deepEqual(contract.primaryActions, [
    "고객 안내문",
    "빠른 문의 답변",
    "고객 서비스 관리",
    "업무 관리",
    "템플릿 / 양식 편집",
  ]);
  assert.match(contract.fixedShellContract, /400px Chrome side panel/);
  assert.match(contract.verticalAnchoringInvariant.coordinateSpace, /Actual Google Chrome side panel/);
  assert.match(stabilityContract, /HomeView\.svelte` owns the home root menu/);
  assert.match(stabilityContract, /Adaptive height rules may target a specific failing work surface/);
  assert.match(homeView, /export let bottomItems: readonly HomeBottomNavigationItem\[\]/);
  assert.match(screenStage, /bottomItems=\{homeBottomNavigation\}/);
  assert.doesNotMatch(sidePanelView, /<nav class="home-fixed-bottom-bar"/);
  assert.match(css, /--home-root-font-size:\s*21px;/);
  assert.equal(rootRowHeight, 48, "root rows must keep the 48px home rhythm");
  assert.equal(submenuRowHeight, 48, "submenu rows must share the 48px root row rhythm");
  assert.equal(rootRowGap, 16, "root rows must keep the protected home rhythm");
  assert.equal(rootPanelTopPad, 22, "root panel top padding must keep the protected home rhythm");
  assert.doesNotMatch(css, /--home-bottom-bar-block-size/);
  assert.match(css, /html\s*\{[^}]*background:\s*#f1f1ef;/s);
  assert.match(css, /--sidepanel-reference-width:\s*400px;/);
  assert.match(css, /--panel-width:\s*min\(var\(--sidepanel-reference-width\),\s*100%\);/);
  assert.doesNotMatch(narrowViewportMedia, /--panel-width:/);
  assert.doesNotMatch(css, /100dvw/);
  assert.match(css, /\.app-shell\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\);/s);
  assert.match(css, /\.app-shell\s*\{[^}]*width:\s*var\(--panel-width\);[^}]*padding:\s*0 calc\(var\(--panel-pad-right\) \+ var\(--sidepanel-right-rail\)\) 0 var\(--panel-pad-left\);/s);
  assert.match(css, /\.app-shell\.home-mode\s*\{[^}]*padding:\s*0;[^}]*padding-bottom:\s*0;/s);
  assert.match(css, /\.app-shell\.has-status\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\);/s);
  assert.match(css, /\.screen-stage\s*\{[^}]*grid-row:\s*2 \/ -1;/s);
  assert.match(css, /\.app-shell\.home-mode \.screen-stage\s*\{[^}]*overflow:\s*hidden;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.match(css, /\.home-surface\s*\{[^}]*container:\s*home-panel \/ inline-size;[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto;[^}]*height:\s*100%;/s);
  assert.match(css, /\.root-panel\s*\{[^}]*padding:\s*var\(--home-root-panel-top-pad\) var\(--home-panel-inline-pad\) 0;/s);
  assert.match(css, /\.home-submenu-list\s*\{[^}]*gap:\s*var\(--home-detail-row-gap\);[^}]*padding-top:\s*var\(--home-detail-list-top-pad\);/s);
  assert.match(css, /--home-hover-label-shift:\s*6px;/);
  assert.match(css, /--home-hover-chevron-shift:\s*6px;/);
  assert.match(css, /\.home-nav-root-item,\s*\.home-submenu-item\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*overflow:\s*visible;[^}]*padding:\s*8px 0;/s);
  assert.match(css, /\.home-nav-root-item\s*\{[^}]*min-height:\s*var\(--home-root-row-height\);/s);
  assert.match(css, /\.home-submenu-item\s*\{[^}]*min-height:\s*var\(--home-submenu-row-height\);/s);
  assert.match(css, /\.home-nav-root-item:hover,\s*\.home-submenu-item:hover\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
  assert.match(css, /\.interactive-label::after\s*\{[^}]*height:\s*var\(--home-hover-underline-height\);[^}]*transform:\s*scaleX\(0\);/s);
  assert.match(css, /\.home-nav-root-item:hover \.interactive-label::after,[^}]*\.home-submenu-item:focus-visible \.interactive-label::after\s*\{[^}]*transform:\s*scaleX\(1\);/s);
  assert.match(css, /\.home-navigation-viewport\s*\{[^}]*contain:\s*layout paint;[^}]*overflow:\s*hidden;[^}]*height:\s*100%;/s);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*width:\s*200%;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(css, /\.home-navigation-viewport\s*\{[^}]*(?:-webkit-)?mask:/s);
  assert.match(css, /\.home-fixed-bottom-bar\s*\{[^}]*position:\s*sticky;[^}]*bottom:\s*0;[^}]*z-index:\s*65;[^}]*width:\s*100%;/s);
  assert.doesNotMatch(css, /\.home-fixed-bottom-bar\s*\{[^}]*position:\s*fixed;/s);
  assert.doesNotMatch(css, /\.home-fixed-bottom-bar\s*\{[^}]*position:\s*(absolute|relative);/s);
  assert.doesNotMatch(css, /\.home-fixed-bottom-bar\s*\{[^}]*top:\s*calc\(var\(--runtime-panel-height\) - var\(--home-bottom-bar-block-size\)\);/s);
  assert.doesNotMatch(css, /\.home-fixed-bottom-bar\s*\{[^}]*box-shadow:/s);
  assert.match(css, /\.home-fixed-bottom-bar\s*\{[^}]*padding:\s*10px 32px calc\(10px \+ var\(--bottom-bar-gap\)\);/s);
  assert.doesNotMatch(css, /@container sidepanel-root \(max-height:\s*640px\)[\s\S]*--home-root-font-size/);
  assert.doesNotMatch(css, /@container sidepanel-root \(max-height:\s*500px\)/);
  assert.ok(bottomBarButtonMinHeight >= 44, "bottom bar button min-height must keep icon and label visible");
  assert.doesNotMatch(css, /\.work-dock\s*\{[^}]*position:\s*(sticky|fixed|absolute)/s);
  assert.match(css, /\.work-dock\s*\{[^}]*display:\s*grid;[^}]*padding:\s*\d+px 0 0;[^}]*background:\s*transparent;/s);
  assert.match(css, /\.sales-amount-panel,\s*\.sales-category-panel,\s*\.sales-detail-panel,\s*\.sales-template-panel\s*\{[^}]*gap:\s*8px;/s);
  assert.ok(pxDeclaration(rule("\\.sales-amount-panel input"), "font-size") <= 30, "sales amount input must stay first-screen safe");
  assert.match(css, /\.work-surface:has\(\.sales-console\)\s*\{[^}]*gap:\s*8px;[^}]*padding-top:\s*8px;/s);
  assert.match(css, /@container sidepanel-root \(max-height:\s*640px\)[\s\S]*\.work-surface:has\(\.sales-console\) \.sales-category-panel button,/);
  assert.match(css, /@container sidepanel-root \(max-height:\s*640px\)[\s\S]*min-height:\s*28px;/);
  assert.match(css, /@container sidepanel-root \(max-height:\s*640px\)[\s\S]*\.work-surface:has\(\.sales-console\) \.sales-amount-panel input\s*\{[^}]*font-size:\s*28px;/);
  assert.match(css, /\.work-surface\s*\{[^}]*padding:\s*10px 0 12px;/s);
  assert.match(css, /\.pms-panel\s*\{[^}]*padding:\s*10px 0 12px;/s);
});

test("room remark leaf keeps reference-critical markers and rejects demo data", () => {
  const css = read("styles/sidepanel.css");
  const surface = read("src/ui/components/RoomRemarkSurface.svelte");
  const workSurface = read("src/ui/components/WorkSurface.svelte");
  const screenStage = read("src/ui/components/ScreenStage.svelte");
  const sidePanel = read("src/ui/components/SidePanelView.svelte");

  assert.match(css, /\.room-inventory-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(css, /\.inventory-main strong\s*\{[^}]*overflow:\s*visible;[^}]*white-space:\s*normal;/s);
  assert.match(css, /\.room-remark-hero h1\s*\{[^}]*font-size:\s*42px;/s);
  assert.match(css, /\.room-additional-panel\s*\{[^}]*min-height:\s*192px;[^}]*border-radius:\s*var\(--work-card-radius\);/s);
  assert.match(css, /\.room-remark-action\s*\{[^}]*min-height:\s*58px;[^}]*background:\s*#000;/s);
  assert.doesNotMatch(css, /\.room-(?:additional-panel|remark-action)\s*\{[^}]*border-radius:\s*var\(--work-pill-radius\);/s);

  assert.match(surface, /const remarkOrder: readonly RemarkType\[\] = \["cardKeys", "rentals", "medicalBloom", "stoneHouse"\];/);
  assert.match(surface, /getBuiltInRemarkType\(template\.id\)/);
  assert.match(surface, /workRoomContext\.selected \? `Room \$\{workRoomContext\.roomLabel\}` : "객실 선택"/);
  assert.match(surface, /<h2 id="room-inventory-title">객실 물품<\/h2>/);
  assert.match(surface, /<h2 id="room-additional-title">추가 리마크<\/h2>/);
  assert.match(surface, /onUpsertRoomRemark\(activeTemplate\.id\)/);
  assert.doesNotMatch(surface, /Towels|Water|Bedding|Room 402|Occupied|placeholder=/);
  assert.match(workSurface, /<RoomRemarkSurface/);
  assert.match(screenStage, /workRoomContext=\{workRoomContext\}/);
  assert.match(sidePanel, /workRoomContext=\{controller\.workRoomContext\}/);
});

test("template manual variables stay behind component-owned wrappers", () => {
  const workSurface = read("src/ui/components/WorkSurface.svelte");
  const roomRemarkSurface = read("src/ui/components/RoomRemarkSurface.svelte");

  assert.match(workSurface, /function templateManualVariables\(template: UnifiedTemplateDefinition\): TemplateVariable\[\]/);
  assert.match(workSurface, /resolveManualTemplateVariables\(template\)/);
  assert.doesNotMatch(workSurface, /\{#(?:if|each)[^}]*getManualVariables\(/);
  assert.doesNotMatch(workSurface, /\bgetManualVariables\(template\)/);
  assert.match(roomRemarkSurface, /function templateVariables\(template: UnifiedTemplateDefinition\): TemplateVariable\[\]/);
  assert.doesNotMatch(roomRemarkSurface, /\{#(?:if|each)[^}]*getManualVariables\(/);
});
