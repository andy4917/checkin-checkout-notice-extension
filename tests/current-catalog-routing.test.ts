import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { guardRequiredContext } from "../src/application/context-guard.js";
import {
  filterTemplatesForMenu,
  getHomeMenuSections,
  getMenu,
  getRoomsSettingsCommand,
  homeBottomNavigationItems,
  homeNavigationGroups,
  homeNavigationLabels,
  usesWorkLanguageSelector,
} from "../src/catalog/menu-routing.js";
import {
  ManualRequiredValueMissingError,
  PmsRequiredValueMissingError,
  TemplateLanguageUnavailableError,
  getAvailableTemplateLanguages,
  renderTemplate,
} from "../src/catalog/template-renderer.js";
import { getUnifiedTemplatesForBranch, UNIFIED_TEMPLATE_CATALOG } from "../src/catalog/template-catalog.js";
import type { TemplateDefinition } from "../src/catalog/template-types.js";

const allBranches = ["coex", "gangnam", "seolleung"] as const;

test("home and customer guidance routing are catalog-owned current contracts", () => {
  const sections = getHomeMenuSections();
  const primary = sections.find((section) => section.id === "primary");
  const customerNotice = getMenu("CUSTOMER_NOTICE");

  assert.equal(primary?.title, "고객 커뮤니케이션");
  assert.equal(primary?.items[0]?.id, "CUSTOMER_NOTICE");
  assert.equal(customerNotice.title, "고객 안내문");
  assert.equal(customerNotice.screenKind, "customerGuidance");
  assert.deepEqual(customerNotice.templateFilter, { kind: "menu" });
});

test("home navigation is a five-group drill-down schema with fixed bottom items", () => {
  assert.deepEqual(
    homeNavigationGroups.map((group) => group.title),
    [
      "고객 안내문",
      "빠른 문의 답변",
      "고객 서비스 관리",
      "업무 관리",
      "템플릿 / 양식 편집",
    ],
  );

  assert.deepEqual(
    homeNavigationGroups[0]?.items.map((item) => item.title),
    ["체크인 안내문", "체크아웃 안내문", "객실 관련 안내문", "각종 요금 관련 안내문"],
  );
  assert.equal(
    homeNavigationGroups[3]?.items.find((item) => item.id === "work-ota")?.badgeLabel,
    "WINGS",
  );
  assert.deepEqual(
    homeNavigationGroups[2]?.items.map((item) => item.title),
    ["세탁물 관리", "매출 관리", "공항밴 관리"],
  );
  assert.deepEqual(
    homeBottomNavigationItems.map((item) => item.title),
    ["체크인 목록", "체크아웃 목록", "객실 선택", "설정"],
  );
  assert.equal(homeNavigationLabels.backToRootLabel, "홈 메뉴로 돌아가기");
  assert.equal(homeNavigationLabels.openSubmenuLabel("고객 안내문"), "고객 안내문 메뉴 열기");
  assert.equal(usesWorkLanguageSelector("CUSTOMER_NOTICE"), true);
  assert.equal(usesWorkLanguageSelector("WORK_REPORT"), false);
});

test("home navigation styling contract keeps reference-like typography and drill-down motion", () => {
  const css = readFileSync("styles/sidepanel.css", "utf8");

  assert.match(css, /--font-korean-title:\s*"NAVERNANUM"/);
  assert.match(css, /--font-korean-body:\s*"Noto Sans KR"/);
  assert.match(css, /--font-latin:\s*"Plus Jakarta Sans",\s*"Jakarta Sans"/);
  assert.match(css, /font-family:\s*"NAVERNANUM";/);
  assert.match(css, /NotoSansKR-VariableFont_wght\.ttf/);
  assert.match(css, /PlusJakartaSans-VariableFont_wght\.ttf/);
  assert.match(css, /--text-tracking-tight:\s*0;/);
  assert.match(css, /--color-home-divider:\s*#ececea;/);
  assert.match(css, /\.home-nav-root-item\s*\{[^}]*border-bottom:\s*0;/s);
  assert.match(css, /\.home-nav-icon\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.home-nav-badge\s*\{/);
  assert.match(css, /--home-focus-ring:\s*#aeb5ae;/);
  assert.match(css, /--home-header-block-space:\s*78px;/);
  assert.match(css, /--home-root-row-height:\s*78px;/);
  assert.match(css, /--home-submenu-row-height:\s*66px;/);
  assert.match(css, /--home-root-row-gap:\s*6px;/);
  assert.match(css, /--home-hover-label-shift:\s*0px;/);
  assert.match(css, /--home-hover-underline-height:\s*2px;/);
  assert.match(css, /--sidepanel-motion-duration:\s*280ms;/);
  assert.match(css, /--sidepanel-motion-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);
  assert.match(css, /\.app-shell\.home-mode\s*\{[^}]*padding-bottom:\s*0;/s);
  assert.match(css, /\.home-surface\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto;[^}]*min-height:\s*calc\(100dvh - var\(--home-header-block-space\)\);/s);
  assert.match(css, /\.home-fixed-bottom-bar\s*\{[^}]*position:\s*sticky;/s);
  assert.match(css, /\.home-navigation-viewport\s*\{[^}]*overflow:\s*hidden;[^}]*height:\s*100%;/s);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
  assert.match(css, /\.home-navigation-panel\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*transition:\s*transform var\(--sidepanel-motion-duration\) var\(--sidepanel-motion-ease\);/s);
  assert.match(css, /\.home-nav-root-item:hover,\s*\.home-submenu-item:hover\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
  assert.match(css, /\.home-nav-root-item:hover > \.home-nav-label,\s*\.home-submenu-item:hover > \.home-nav-label,[^{]+\{[^}]*transform:\s*translateX\(var\(--home-hover-label-shift\)\);/s);
  assert.match(css, /\.interactive-label::after\s*\{/);

  const homeView = readFileSync("src/ui/components/HomeView.svelte", "utf8");
  assert.match(homeView, /aria-haspopup="true"/);
  assert.match(homeView, /aria-expanded=\{activeGroup\?\.id === group\.id\}/);
  assert.match(homeView, /aria-controls=\{getSubmenuPanelId\(group\.id\)\}/);
  assert.match(homeView, /aria-label=\{labels\.backToRootLabel\}/);
  assert.doesNotMatch(homeView, /--stagger-index/);
  assert.doesNotMatch(readFileSync("src/ui/components/ShellHeader.svelte", "utf8"), /--stagger-index/);
  assert.doesNotMatch(css, /\.priority-card\b/);
  assert.doesNotMatch(css, /\.priority-menu\b/);
  assert.doesNotMatch(css, /\.home-list-item\b/);
  assert.doesNotMatch(css, /\.home-menu-section\b/);
  assert.doesNotMatch(css, /@keyframes home-item-reveal/);
  assert.doesNotMatch(css, /@keyframes home-detail-reveal/);
  assert.doesNotMatch(css, /\.home-submenu-section-label\b/);
  assert.doesNotMatch(css, /\.home-submenu-section-items\b/);
  assert.doesNotMatch(homeView, /home-submenu-section/);
  assert.doesNotMatch(css, /--stagger-index|--stagger-base-delay|--stagger-step-delay|--stagger-max-delay/);
  assert.doesNotMatch(css, /\.home-navigation-viewport\s*\{[^}]*486px/s);
  assert.doesNotMatch(css, /@container home-panel[^}]+\.home-navigation-viewport\s*\{[^}]*520px/s);
  assert.equal(existsSync("assets/fonts/NotoSansKR-VariableFont_wght.ttf"), true);
  assert.equal(existsSync("assets/fonts/PlusJakartaSans-VariableFont_wght.ttf"), true);
});

test("current frontend tree does not keep inactive work-screen components", () => {
  const removedFrontendSurfaces = [
    "src/ui/side-panel-controller.svelte.ts",
    "src/ui/side-panel-dependencies.ts",
    "src/ui/components/AirportVanPanel.svelte",
    "src/ui/components/CustomerGuidancePanel.svelte",
    "src/ui/components/LaundryPanel.svelte",
    "src/ui/components/OtaReservationPanel.svelte",
    "src/ui/components/RouteMotionFrame.svelte",
    "src/ui/components/SettingsPanel.svelte",
    "src/ui/components/TemplateList.svelte",
    "src/ui/components/WorkHeader.svelte",
    "src/ui/components/LanguageSegmentedControl.svelte",
    "src/ui/components/LoadingImage.svelte",
    "src/ui/components/RoomsSettingsBar.svelte",
    "src/ui/app-state-helpers.ts",
    "src/ui/app-view-model.ts",
    "src/ui/display-helpers.ts",
    "src/ui/laundry-workflow.ts",
    "src/ui/ota-workflow.ts",
    "src/ui/pms-workflow.ts",
    "src/ui/rooms-settings-actions.ts",
    "src/ui/template-runtime-values.ts",
    "src/ui/template-settings-workflow.ts",
    "src/ui/ui-options.ts",
    "src/catalog/airport-van-ui.ts",
    "src/laundry/presentation.ts",
  ];

  for (const path of removedFrontendSurfaces) {
    assert.equal(existsSync(path), false, `${path} should not remain in current frontend`);
  }
});

test("template filtering uses catalog metadata, branch scope, and attachment exclusion", () => {
  const airportMenu = getMenu("AIRPORT_VAN_MANAGEMENT");
  const airportTemplates = filterTemplatesForMenu("AIRPORT_VAN_MANAGEMENT", UNIFIED_TEMPLATE_CATALOG);
  const customerTemplates = filterTemplatesForMenu("CUSTOMER_NOTICE", UNIFIED_TEMPLATE_CATALOG);

  assert.deepEqual(airportMenu.templateFilter, { kind: "type", typeId: "airport_van" });
  assert.equal(airportTemplates.every((template) => template.typeId === "airport_van"), true);
  assert.equal(customerTemplates.every((template) => template.menuId === "CUSTOMER_NOTICE"), true);
  for (const branchId of allBranches) {
    assert.equal(
      getUnifiedTemplatesForBranch(branchId).some((template) =>
        template.attachments.includes("coex-door-password-guide-video"),
      ),
      false,
    );
  }
});

test("renderer fails required PMS/manual values and unavailable languages instead of producing fake success", () => {
  const pmsTemplate = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "guest-arrival-notice");
  assert.ok(pmsTemplate);
  assert.throws(() => renderTemplate(pmsTemplate, "KO", { roomNo: "A302" }), PmsRequiredValueMissingError);

  const manualRequiredTemplate: TemplateDefinition = {
    id: "manual-required-contract",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "manual required",
    branchScope: ["coex"],
    languages: { KO: "{guestName}" },
    variables: [{ name: "guestName", label: "고객명", kind: "manualRequired" }],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "{guestName}",
  };
  assert.throws(() => renderTemplate(manualRequiredTemplate, "KO", {}), ManualRequiredValueMissingError);

  const salesReport = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "report-sales");
  assert.ok(salesReport);
  assert.deepEqual(getAvailableTemplateLanguages(salesReport), ["KO"]);
  assert.throws(() => renderTemplate(salesReport, "EN"), TemplateLanguageUnavailableError);
});

test("context and room remark command contracts surface operator-visible failure paths", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: "로그인된 WINGS 페이지를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("guestRecord", { isPmsPage: true, isGuestRecord: false }), {
    ok: false,
    message: "고객정보를 열어주십시오",
  });

  const remarkCommand = getRoomsSettingsCommand("UPSERT_WINGS_REMARK");
  assert.equal(remarkCommand.visibleWhenSelectedTemplateAudience, "pmsRemark");
  assert.equal(remarkCommand.requiresPmsRecord, true);
  assert.equal(remarkCommand.requiresWingsReservationWindow, true);
});
