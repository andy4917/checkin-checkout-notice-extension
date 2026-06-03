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
  settingsNavigationItems,
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

test("home navigation is a five-group drill-down schema with accordion and menu-screen modes", () => {
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
  assert.deepEqual(
    homeNavigationGroups.map((group) => group.selectionMode),
    ["accordion", "accordion", "menuScreen", "menuScreen", "menuScreen"],
  );
  assert.deepEqual(homeNavigationGroups[0]?.items[0]?.templateFilter, {
    kind: "types",
    typeIds: ["arrival_notice", "prearrival_csm", "prestay_notice", "self_checkin", "early_checkin"],
  });
  assert.deepEqual(homeNavigationGroups[0]?.items[1]?.templateFilter, {
    kind: "type",
    typeId: "cleaning_notice",
  });
  assert.deepEqual(homeNavigationGroups[1]?.items.map((item) => item.templateFilter), [
    { kind: "type", typeId: "rental_item" },
    { kind: "type", typeId: "lost_item" },
    { kind: "type", typeId: "room_visit" },
    { kind: "type", typeId: "breakfast_inquiry" },
    { kind: "type", typeId: "invoice_inquiry" },
    { kind: "type", typeId: "cancellation_inquiry" },
    { kind: "type", typeId: "laundry_service_inquiry" },
    { kind: "type", typeId: "kakao_channel_connect" },
    { kind: "type", typeId: "kakao_channel_closing" },
    { kind: "type", typeId: "nearby_restaurant" },
  ]);
  assert.deepEqual(
    homeNavigationGroups.map((group) => group.items.map((item) => item.title)),
    [
      ["체크인 안내문", "체크아웃 안내문", "객실 관련 안내문", "각종 요금 관련 안내문"],
      [
        "물품 대여 문의",
        "분실물 문의",
        "객실 방문 예정",
        "조식 문의",
        "인보이스 문의",
        "체크인 1주이내 취소 문의",
        "세탁 서비스 문의",
        "카톡 채널 문의 연결",
        "카톡 채널 문의 마무리",
        "근처 식당 문의",
      ],
      ["세탁물 관리", "매지출 관리", "공항밴 관리"],
      ["객실 정보 메모", "NAVER / STATION 예약입력", "업무보고 양식"],
      ["템플릿 편집", "양식 편집"],
    ],
  );
  assert.deepEqual(
    homeNavigationGroups[4]?.items.map((item) => item.menuId),
    ["TEMPLATE_EDITOR", "FORM_EDITOR"],
  );
  assert.notEqual(homeNavigationGroups[4]?.items[0]?.menuId, homeNavigationGroups[4]?.items[1]?.menuId);
  assert.deepEqual(
    homeNavigationGroups[4]?.items.map((item) => getMenu(item.menuId).screenKind),
    ["templateSettings", "formSettings"],
  );
  assert.equal(Object.hasOwn(homeNavigationGroups[3]?.items.find((item) => item.id === "work-ota") || {}, "badgeLabel"), false);
  assert.deepEqual(
    homeNavigationGroups[2]?.items.map((item) => item.title),
    ["세탁물 관리", "매지출 관리", "공항밴 관리"],
  );
  assert.deepEqual(
    homeBottomNavigationItems.map((item) => item.title),
    ["체크인 목록", "체크아웃 목록", "객실 선택", "설정"],
  );
  assert.deepEqual(
    homeBottomNavigationItems.map((item) => item.action?.kind || item.menuId),
    ["pmsGuestList", "pmsGuestList", "pmsGuestList", "SETTINGS"],
  );
  assert.equal(getMenu("SETTINGS").screenKind, "settings");
  assert.deepEqual(
    settingsNavigationItems.map((item) => item.menuId),
    ["TEMPLATE_EDITOR", "FORM_EDITOR"],
  );
  assert.deepEqual(
    homeBottomNavigationItems.map((item) => item.action?.mode || null),
    ["ARRIVAL", "DEPARTURE", "ARRIVAL", null],
  );
  assert.equal(homeNavigationLabels.backToRootLabel, "홈 메뉴로 돌아가기");
  assert.equal(homeNavigationLabels.openSubmenuLabel("고객 안내문"), "고객 안내문 메뉴 열기");
  assert.equal(usesWorkLanguageSelector("CUSTOMER_NOTICE"), true);
  assert.equal(usesWorkLanguageSelector("WORK_REPORT"), false);
  assert.equal(getMenu("SALES_MANAGEMENT").title, "매지출 관리");
  assert.equal(getMenu("SALES_MANAGEMENT").screenKind, "salesManagement");
  assert.equal(getMenu("ROOM_REMARK_MEMO").title, "객실 정보 메모");
  assert.equal(getMenu("ROOM_REMARK_MEMO").screenKind, "roomRemarkMemo");
});

test("visible home navigation icons are backed by local material paths", () => {
  const materialIcon = readFileSync("src/ui/components/MaterialIcon.svelte", "utf8");
  const iconDefinitions = new Set([...materialIcon.matchAll(/^\s{4}([a-z0-9_]+):/gm)].map((match) => match[1]));
  const visibleIcons = [
    ...homeNavigationGroups.map((group) => group.icon),
    ...homeNavigationGroups.flatMap((group) => group.items.map((item) => item.icon)),
    ...homeBottomNavigationItems.map((item) => item.icon),
  ];

  assert.deepEqual(
    visibleIcons.filter((icon) => !iconDefinitions.has(icon)),
    [],
  );
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
  assert.match(css, /--color-canvas:\s*#fdfdfc;/);
  assert.match(css, /--color-surface:\s*#fdfdfc;/);
  assert.match(css, /--color-line:\s*#eeeeec;/);
  assert.match(css, /--color-home-divider:\s*#eeeeec;/);
  assert.match(css, /\.home-nav-root-item\s*\{[^}]*border-bottom:\s*0;/s);
  assert.match(css, /--home-row-icon-size:\s*20px;/);
  assert.match(css, /\.home-nav-icon\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;/s);
  assert.doesNotMatch(css, /\.home-nav-badge\s*\{/);
  assert.match(css, /--home-focus-ring:\s*#aeb5ae;/);
  assert.match(css, /--home-header-block-space:\s*64px;/);
  assert.match(css, /--font-display:\s*var\(--font-korean-body\);/);
  assert.match(css, /--home-root-font-size:\s*21px;/);
  assert.match(css, /--home-root-font-weight:\s*700;/);
  assert.match(css, /--home-submenu-font-size:\s*17px;/);
  assert.match(css, /--home-submenu-font-weight:\s*680;/);
  assert.match(css, /--home-root-row-height:\s*48px;/);
  assert.match(css, /--home-submenu-row-height:\s*48px;/);
  assert.match(css, /--home-root-row-gap:\s*16px;/);
  assert.match(css, /--home-hover-label-shift:\s*6px;/);
  assert.match(css, /--home-hover-chevron-shift:\s*6px;/);
  assert.match(css, /--home-content-motion-duration:\s*400ms;/);
  assert.match(css, /--home-content-motion-delay:\s*100ms;/);
  assert.match(css, /--home-hover-underline-height:\s*2px;/);
  assert.match(css, /--back-motion-duration:\s*160ms;/);
  assert.match(css, /--back-hover-color:\s*var\(--color-primary-soft\);/);
  assert.match(css, /--sidepanel-motion-duration:\s*600ms;/);
  assert.match(css, /--sidepanel-motion-ease:\s*cubic-bezier\(0\.54,\s*0\.01,\s*0\.19,\s*0\.93\);/);
  assert.match(css, /\.app-shell\.home-mode\s*\{[^}]*padding:\s*0;[^}]*padding-bottom:\s*0;/s);
  assert.match(css, /\.app-header\s*\{[^}]*margin:\s*0 0 12px;[^}]*border-bottom:\s*0;[^}]*padding:\s*0;/s);
  assert.match(css, /\.app-header::after\s*\{[^}]*left:\s*0;[^}]*background:\s*var\(--color-line\);/s);
  assert.match(css, /body\s*\{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*hidden;/s);
  assert.match(css, /\.app-shell\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\);[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.screen-stage\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.shell-status \+ \.screen-stage\s*\{[^}]*grid-row:\s*3;/s);
  assert.match(css, /\.app-shell\.home-mode \.screen-stage\s*\{[^}]*overflow:\s*hidden;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.doesNotMatch(css, /\.branch-picker-strip|branch-option-enter|branch-loading-sweep|branch-strip-enter/);
  assert.match(css, /\.branch-selection-popup\s*\{/);
  assert.match(css, /@keyframes branch-panel-enter\s*\{/);
  assert.match(css, /--panel-pad-left:\s*14px;/);
  assert.match(css, /--sidepanel-right-rail:\s*0px;/);
  assert.match(css, /\.header-logo-mark\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(css, /\.home-surface\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto;[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
  assert.match(css, /\.home-fixed-bottom-bar\s*\{[^}]*position:\s*sticky;/s);
  assert.match(css, /\.home-fixed-bottom-bar \.material-icon\s*\{[^}]*display:\s*inline-grid;/s);
  assert.doesNotMatch(css, /\.status-toast/);
  assert.doesNotMatch(css, /\.work-status\s*\{[^}]*position:\s*fixed;/s);
  assert.match(css, /\.home-navigation-viewport\s*\{[^}]*overflow:\s*hidden;[^}]*height:\s*100%;/s);
  assert.match(css, /\.home-navigation-viewport\s*\{[^}]*mask:\s*linear-gradient/s);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
  assert.match(css, /\.home-navigation-panel\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.home-navigation-track\s*\{[^}]*transition:\s*transform var\(--sidepanel-motion-duration\) var\(--sidepanel-motion-ease\);/s);
  assert.match(css, /\.home-nav-root-item:hover,\s*\.home-submenu-item:hover\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
  assert.match(css, /\.home-nav-root-item:hover > \.home-nav-label,\s*\.home-submenu-item:hover > \.home-nav-label,[^{]+\{[^}]*transform:\s*translateX\(var\(--home-hover-label-shift\)\);/s);
  assert.match(css, /\.home-nav-root-item,\s*\.home-submenu-item\s*\{[^}]*grid-template-columns:\s*var\(--home-row-icon-size\) minmax\(0,\s*1fr\) 22px;[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.home-nav-root-item > \.home-nav-label,\s*\.home-submenu-item > \.home-nav-label\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.home-nav-title-row\s*\{[^}]*display:\s*inline-grid;[^}]*grid-template-columns:\s*minmax\(0,\s*max-content\);/s);
  assert.match(css, /\.interactive-label\s*\{[^}]*width:\s*max-content;[^}]*max-width:\s*100%;[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.home-nav-root-item > \.home-nav-label,\s*\.home-submenu-item > \.home-nav-label\s*\{[^}]*text-wrap:\s*nowrap;[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /\.interactive-label\s*\{[^}]*text-wrap:\s*nowrap;[^}]*white-space:\s*nowrap;/s);
  assert.doesNotMatch(css, /\.home-nav-title-row:has\(\.home-nav-badge\)/);
  assert.match(css, /\.interactive-label::after\s*\{[^}]*will-change:\s*opacity,\s*transform;/s);
  assert.match(css, /\.home-nav-root-item:hover b,\s*\.home-submenu-item:hover b,[^{]+\{[^}]*transform:\s*translateX\(var\(--home-hover-chevron-shift\)\);/s);
  assert.match(css, /\.home-nav-root-item:hover b,\s*\.home-submenu-item:hover b,[^{]+\{[^}]*color:\s*var\(--color-primary\);[^}]*opacity:\s*1;/s);
  assert.match(css, /\.home-navigation-viewport\[data-motion-direction="forward"\]\.submenu-active \.detail-panel \.home-nav-back,[^{]+\{[^}]*animation:\s*home-detail-content-enter/s);
  assert.match(css, /\.home-navigation-viewport\.detail-retained \.detail-panel \.home-nav-back,[^{]+\{[^}]*animation:\s*home-detail-content-exit/s);
  assert.match(css, /\.home-nav-back\s*\{[^}]*transition:\s*color var\(--back-motion-duration\) var\(--motion-standard\);/s);
  assert.match(css, /\.home-nav-back:hover,\s*\.home-nav-back:focus-visible\s*\{[^}]*color:\s*var\(--back-hover-color\);/s);
  assert.doesNotMatch(css, /\.home-nav-back:hover,\s*\.home-nav-back:focus-visible\s*\{[^}]*background:/s);
  assert.doesNotMatch(css, /\.home-nav-back:hover \.material-icon|\.home-nav-back:focus-visible \.material-icon|\.home-nav-back:active/);
  assert.match(css, /\.home-navigation-viewport\[data-motion-direction="forward"\]\.submenu-active \.detail-panel \.home-language-strip,/);
  assert.match(css, /\.home-navigation-viewport\.detail-retained \.detail-panel \.home-language-strip,/);
  assert.match(css, /\.home-navigation-viewport\[data-motion-direction="backward"\] \.root-panel \.home-nav-root-item\s*\{[^}]*animation:\s*home-root-content-return/s);
  assert.match(css, /\.home-template-accordion\s*\{/);
  assert.match(css, /\.home-template-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 36px;[^}]*min-height:\s*42px;/s);
  assert.match(css, /\.home-template-row-direct\s*\{[^}]*grid-template-columns:\s*var\(--home-row-icon-size\) minmax\(0,\s*1fr\) 36px;[^}]*cursor:\s*default;/s);
  assert.match(css, /\.home-template-copy\s*\{[^}]*display:\s*inline-grid;[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*place-items:\s*center;/s);
  assert.match(css, /\.home-language-strip\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);[^}]*height:\s*30px;/s);
  assert.match(css, /\.home-language-strip::before\s*\{[^}]*transform:\s*translateX\(calc\(var\(--active-index\) \* 100%\)\);[^}]*transition:\s*transform 180ms/s);
  assert.match(css, /\.home-language-strip\.loading::after\s*\{[^}]*animation:\s*home-language-loading 180ms/s);
  assert.match(css, /\.home-submenu-entry::details-content\s*\{[^}]*block-size:\s*0;[^}]*transition:/s);
  assert.match(css, /\.home-submenu-entry\[open\]::details-content\s*\{[^}]*block-size:\s*auto;[^}]*opacity:\s*1;/s);
  assert.match(css, /@keyframes home-accordion-enter\s*\{/);
  assert.match(css, /\.home-submenu-entry > summary\.home-submenu-item\s*\{[^}]*list-style:\s*none;/s);
  assert.match(css, /\.home-submenu-entry\[open\] \.home-submenu-item b\s*\{[^}]*transform:\s*rotate\(180deg\);/s);
  assert.match(css, /@keyframes home-detail-content-enter\s*\{/);
  assert.match(css, /@keyframes home-detail-content-exit\s*\{/);
  assert.match(css, /@keyframes home-root-content-return\s*\{/);
  assert.match(css, /@keyframes action-loading-spin\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{/);

  const homeView = readFileSync("src/ui/components/HomeView.svelte", "utf8");
  assert.match(homeView, /renderedDetailGroupId/);
  assert.match(homeView, /class:detail-retained=\{!activeGroup && renderedDetailGroup\}/);
  assert.match(homeView, /releaseDetailTimer = setTimeout/);
  assert.match(homeView, /aria-haspopup="true"/);
  assert.match(homeView, /aria-expanded=\{activeGroup\?\.id === group\.id\}/);
  assert.match(homeView, /aria-controls=\{getSubmenuPanelId\(group\.id\)\}/);
  assert.doesNotMatch(homeView, /title=\{group\.title\}/);
  assert.doesNotMatch(homeView, /title=\{item\.title\}/);
  assert.match(homeView, /className="home-nav-back"/);
  assert.match(homeView, /onBack=\{goRoot\}/);
  assert.doesNotMatch(homeView, /class="home-submenu-heading"|aria-label=\{labels\.backToRootLabel\}/);
  assert.match(homeView, /<details class="home-submenu-entry">/);
  assert.doesNotMatch(homeView, /<details class="home-submenu-entry" name=/);
  assert.match(homeView, /<summary class="home-submenu-item accordion-trigger"/);
  assert.match(homeView, /const languageOptions: readonly Language\[\] = Object\.freeze\(\["KO", "EN", "JP", "CN"\]\)/);
  assert.match(homeView, /\{#if isAccordionGroup\(renderedDetailGroup\)\}\s*<div[^>]+class="home-language-strip"/s);
  assert.match(homeView, /class="home-language-strip"/);
  assert.match(homeView, /style=\{`--active-index: \$\{languageOptions\.indexOf\(selectedLanguage\)\}`\}/);
  assert.match(homeView, /disabled=\{languageChanging\}\s+aria-pressed=\{selectedLanguage === language\}\s+tabindex=\{activeGroup \? 0 : -1\}/);
  assert.match(homeView, /getInlineTemplates\(item\)/);
  assert.match(homeView, /shouldGroupInlineTemplates\(item\)/);
  assert.match(homeView, /getDirectInlineTemplate\(item\)/);
  assert.match(homeView, /\.\.\.templateItems\.filter\(\(item\) => getInlineTemplates\(item\)\.length > 1\),\s*\.\.\.templateItems\.filter\(\(item\) => getInlineTemplates\(item\)\.length === 1\)/s);
  assert.match(homeView, /class="home-submenu-item home-template-row-direct"/);
  assert.match(homeView, /use:copyTemplateEvents=\{\{ item, templateId: template\.id \}\}/);
  assert.match(homeView, /class="home-template-copy"[\s\S]*?disabled=\{loading\}\s+tabindex=\{activeGroup \? 0 : -1\}/);
  assert.doesNotMatch(homeView, /disabled=\{loading \|\| Boolean\(requirement\)\}/);
  assert.doesNotMatch(homeView, /template\.variables\.some\(\(variable\) => variable\.kind === "pmsRequired"\)/);
  assert.doesNotMatch(homeView, /template\.summary/);
  assert.doesNotMatch(homeView, /resolveHomeManualVariables/);
  assert.doesNotMatch(homeView, /<span>\{requirement \|\|/);
  assert.doesNotMatch(homeView, /--stagger-index/);
  assert.doesNotMatch(readFileSync("src/ui/components/ShellHeader.svelte", "utf8"), /--stagger-index/);
  assert.doesNotMatch(css, /\.priority-card\b/);
  assert.doesNotMatch(css, /\.priority-menu\b/);
  assert.doesNotMatch(css, /\.home-list-item\b/);
  assert.doesNotMatch(css, /\.home-menu-section\b/);
  assert.doesNotMatch(css, /@keyframes home-item-reveal/);
  assert.doesNotMatch(css, /@keyframes home-detail-reveal/);
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
  const checkoutTemplates = filterTemplatesForMenu("CUSTOMER_NOTICE", UNIFIED_TEMPLATE_CATALOG)
    .filter((template) => template.typeId === "cleaning_notice");
  const quickTemplates = filterTemplatesForMenu("QUICK_REPLY", UNIFIED_TEMPLATE_CATALOG);

  assert.equal(airportMenu.screenKind, "airportVan");
  assert.equal(getMenu("QUICK_REPLY").screenKind, "templateList");
  assert.deepEqual(airportMenu.templateFilter, { kind: "type", typeId: "airport_van" });
  assert.equal(airportTemplates.every((template) => template.typeId === "airport_van"), true);
  assert.equal(customerTemplates.every((template) => template.menuId === "CUSTOMER_NOTICE"), true);
  assert.equal(checkoutTemplates.some((template) => template.id === "full-cleaning-notice"), true);
  assert.deepEqual(
    quickTemplates
      .filter((template) =>
        [
          "breakfast_inquiry",
          "invoice_inquiry",
          "cancellation_inquiry",
          "laundry_service_inquiry",
          "kakao_channel_connect",
          "kakao_channel_closing",
          "nearby_restaurant",
        ].includes(template.typeId),
      )
      .map((template) => template.id)
      .sort(),
    [
      "quick-breakfast-inquiry",
      "quick-cancellation-within-week",
      "quick-invoice-inquiry",
      "quick-kakao-channel-closing",
      "quick-kakao-channel-connect",
      "quick-laundry-service-inquiry",
      "quick-nearby-restaurant-inquiry",
    ],
  );
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
  assert.doesNotThrow(() =>
    renderTemplate(pmsTemplate, "KO", { roomNo: "A302" }, { missingRequiredValueMode: "blank" }),
  );

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

test("provided zip template assets render through the current catalog mappings", () => {
  const breakfast = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "quick-breakfast-inquiry");
  const invoice = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "quick-invoice-inquiry");
  const cancellation = UNIFIED_TEMPLATE_CATALOG.find(
    (template) => template.id === "quick-cancellation-within-week",
  );
  const laundry = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "quick-laundry-service-inquiry");
  const kakaoConnect = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "quick-kakao-channel-connect");
  const kakaoClosing = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "quick-kakao-channel-closing");
  const nearbyRestaurant = UNIFIED_TEMPLATE_CATALOG.find(
    (template) => template.id === "quick-nearby-restaurant-inquiry",
  );
  const cleaning = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "full-cleaning-notice");

  assert.ok(breakfast);
  assert.ok(invoice);
  assert.ok(cancellation);
  assert.ok(laundry);
  assert.ok(kakaoConnect);
  assert.ok(kakaoClosing);
  assert.ok(nearbyRestaurant);
  assert.ok(cleaning);
  assert.match(renderTemplate(breakfast, "KO", { branchName: "코엑스점" }), /UH SUITE 코엑스점/);
  assert.match(renderTemplate(invoice, "EN"), /does not issue separate invoices directly/);
  assert.match(renderTemplate(cancellation, "JP"), /チェックイン1週間以内/);
  assert.match(renderTemplate(laundry, "CN"), /洗衣服务/);
  assert.match(renderTemplate(kakaoConnect, "EN"), /branch you would like to inquire about/);
  assert.match(renderTemplate(kakaoClosing, "KO"), /계속 상담이 가능/);
  assert.match(renderTemplate(nearbyRestaurant, "KO"), /청기와타운 선릉점/);
  assert.match(
    renderTemplate(cleaning, "KO", {
      cleaningDate: "5월 26일",
      cleaningRoom: "A302",
      cleaningTimeSlot: "13:00-15:00",
      replyDeadline: "오늘 18:00",
      hotelName: "UH SUITE",
    }),
    /5월 26일에 고객님의 A302 전체 청소가 예정되어 있습니다\./,
  );
});

test("context and room remark command contracts surface operator-visible failure paths", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: "WINGS 브라우저 탭에서 진행하여주십시오.",
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
