import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function cssRule(source: string, selector: string) {
  const match = new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{(?<body>[\\s\\S]*?)\\n\\}`).exec(source);
  assert.ok(match?.groups?.body, `${selector} rule must exist`);
  return match.groups.body;
}

test("work menu chrome does not expose legacy tab filters", () => {
  const workHeader = read("src/ui/components/WorkHeader.svelte");
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const controller = read("src/ui/side-panel-controller.svelte.ts");
  const viewModel = read("src/ui/app-view-model.ts");
  const routing = read("src/catalog/menu-routing.ts");
  const css = read("styles/sidepanel.css");

  for (const source of [workHeader, sidePanel, controller, viewModel, routing, css]) {
    assert.doesNotMatch(source, /activeTabs|selectedTabId|onSelectTab|selectTab|tab-bar/);
    assert.doesNotMatch(source, /TemplateTab|getTabsForMenu|matchesTemplateTab|MENU_TABS/);
  }

  assert.doesNotMatch(workHeader, /전체|안내문/);
});

test("language selection is a segmented bar, not a dropdown", () => {
  const workHeader = read("src/ui/components/WorkHeader.svelte");
  const settingsPanel = read("src/ui/components/SettingsPanel.svelte");
  const languageControl = read("src/ui/components/LanguageSegmentedControl.svelte");
  const uiOptions = read("src/ui/ui-options.ts");
  const css = read("styles/sidepanel.css");

  assert.match(workHeader, /LanguageSegmentedControl/);
  assert.match(settingsPanel, /LanguageSegmentedControl/);
  assert.match(languageControl, /class="language-segmented"/);
  assert.match(uiOptions, /label: "KR"/);
  assert.match(uiOptions, /label: "CH"/);
  const languageBarRule = cssRule(css, ".language-segmented");
  const languageButtonRule = cssRule(css, ".language-segmented button");
  const activeLanguageRule = cssRule(css, ".language-segmented button.active");
  assert.match(languageBarRule, /border-radius:\s*999px;/);
  assert.match(languageBarRule, /padding:\s*2px;/);
  assert.match(languageButtonRule, /border-radius:\s*999px;/);
  assert.match(languageButtonRule, /min-height:\s*24px;/);
  assert.match(languageButtonRule, /font-size:\s*12px;/);
  assert.match(activeLanguageRule, /background:\s*#fff;/);

  for (const source of [workHeader, settingsPanel, languageControl]) {
    assert.doesNotMatch(source, /template-language|settings-language/);
  }
});

test("customer guidance uses reference card workflow instead of generic template rows", () => {
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const customerGuidance = read("src/ui/components/CustomerGuidancePanel.svelte");
  const templateList = read("src/ui/components/TemplateList.svelte");
  const controller = read("src/ui/side-panel-controller.svelte.ts");
  const catalogTypes = read("src/catalog/template-types.ts");
  const catalog = read("src/catalog/template-catalog.ts");
  const css = read("styles/sidepanel.css");
  const docs = read("docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md");

  assert.match(sidePanel, /CustomerGuidancePanel/);
  assert.match(sidePanel, /activeMenu === "CUSTOMER_NOTICE"/);
  assert.match(sidePanel, /activeMenu !== "CUSTOMER_NOTICE"/);
  assert.match(sidePanel, /selectedGuidanceTemplateId/);
  assert.match(sidePanel, /onSelectGuidanceTemplate/);
  assert.match(customerGuidance, /customer-guidance-card/);
  assert.match(customerGuidance, /copyTemplate|templateSummary/);
  assert.match(controller, /selectGuidanceTemplate/);
  assert.match(catalogTypes, /icon:\s*string;/);
  assert.match(catalog, /TEMPLATE_TYPE_ICONS/);
  assert.doesNotMatch(customerGuidance, /template-meta|branchScopeLabel|availableLanguageLabel|onTemplateVariableInput|<input/);
  assert.doesNotMatch(customerGuidance, /includes\(/);
  assert.doesNotMatch(templateList, /includes\(/);
  assert.doesNotMatch(customerGuidance, /let selectedGuidanceId/);
  assert.match(css, /\.customer-guidance-card/);
  assert.doesNotMatch(css, /customer-guidance-fields/);
  assert.match(docs, /Customer guidance is a distinct copy workflow/);
});

test("menu cards are compact separate cards and hover does not introduce card borders", () => {
  const homeView = read("src/ui/components/HomeView.svelte");
  const css = read("styles/sidepanel.css");
  const docs = read("docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md");

  assert.match(homeView, /class="home-list-stack"/);
  assert.match(homeView, /class="home-list-item"/);
  assert.doesNotMatch(homeView, /home-list-card|selectedMenuId/);
  assert.doesNotMatch(css, /home-list-card/);
  assert.match(docs, /menu cards are separate cards/);
  const stackRule = cssRule(css, ".home-list-stack");
  assert.match(stackRule, /gap:\s*4px;/);

  const priorityHoverRule = cssRule(css, ".priority-card:hover");
  const customerHoverMatch = /\.customer-guidance-card:has\(\.customer-guidance-select:hover\)\s*\{(?<body>[\s\S]*?)\n\}/.exec(css);
  assert.ok(customerHoverMatch?.groups?.body, "customer guidance hover rule must exist");
  const customerHoverRule = customerHoverMatch.groups.body;
  assert.doesNotMatch(priorityHoverRule, /border|outline/);
  assert.doesNotMatch(customerHoverRule, /border|outline/);

  const customerCardRule = cssRule(css, ".customer-guidance-card");
  const compactTemplateMatch = /\.template-card\s*\{(?<body>[\s\S]*?min-height:\s*62px;[\s\S]*?padding:\s*10px;[\s\S]*?)\n\}/.exec(css);
  assert.ok(compactTemplateMatch?.groups?.body, "compact template card rule must exist");
  const templateCardRule = compactTemplateMatch.groups.body;
  assert.match(customerCardRule, /min-height:\s*64px;/);
  assert.match(customerCardRule, /padding:\s*10px;/);
  assert.match(templateCardRule, /min-height:\s*62px;/);
  assert.match(templateCardRule, /padding:\s*10px;/);
});

test("screen transitions, loading image, and drag selection rules are centralized", () => {
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const loadingImage = read("src/ui/components/LoadingImage.svelte");
  const laundryPanel = read("src/ui/components/LaundryPanel.svelte");
  const otaPanel = read("src/ui/components/OtaReservationPanel.svelte");
  const css = read("styles/sidepanel.css");
  const docs = read("docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md");

  assert.match(sidePanel, /#key controller\.activeMenu/);
  assert.match(sidePanel, /screen-stage/);
  assert.match(loadingImage, /class="loading-image"/);
  assert.match(loadingImage, /src=\{logoUrl\}/);
  assert.match(laundryPanel, /LoadingImage/);
  assert.match(otaPanel, /LoadingImage/);
  assert.match(css, /@keyframes screen-switch/);
  assert.match(css, /@keyframes loading-image-pulse/);
  assert.match(css, /-webkit-user-drag:\s*none;/);
  assert.match(css, /user-select:\s*none;/);
  assert.match(css, /\.template-card,[\s\S]*\.customer-guidance-card,[\s\S]*user-select:\s*text;/);
  assert.match(docs, /shared loading image component/);
});

test("rooms settings bar does not expose unsupported quick actions", () => {
  const routing = read("src/catalog/menu-routing.ts");
  const roomsSettingsBar = read("src/ui/components/RoomsSettingsBar.svelte");
  const actions = read("src/ui/rooms-settings-actions.ts");
  const css = read("styles/sidepanel.css");

  assert.doesNotMatch(routing, /Wings Login|Light|Dark/);
  assert.doesNotMatch(roomsSettingsBar, /연결된 동작 없음|대기|index === 2|home-bottom-divider/);
  assert.doesNotMatch(css, /home-bottom-divider/);
  assert.match(routing, /menuId: MenuId;/);
  assert.match(routing, /commandId: RoomsSettingsCommandId;/);
  assert.match(actions, /activeMenu === "ROOM_REMARK_MEMO"/);
  assert.match(routing, /label: "설정"/);
  assert.match(roomsSettingsBar, /class:hidden=\{bottomSheetOpen\}/);
  assert.match(css, /\.home-bottom-toggle\.hidden/);
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-width: 152px;/);
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-height: 42px;/);
});

test("PMS work menus expose WINGS status without broad automation buttons", () => {
  const workHeader = read("src/ui/components/WorkHeader.svelte");
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const css = read("styles/sidepanel.css");

  assert.match(workHeader, /wings-status-pill/);
  assert.match(workHeader, /roomContextLabel/);
  assert.match(workHeader, /roomContextMeta/);
  assert.match(workHeader, /readNationalityFromFields/);
  assert.match(workHeader, /객실 미선택/);
  assert.match(sidePanel, /selectedPmsRecord=\{controller\.selectedPmsRecord\}/);
  assert.match(sidePanel, /hasWingsPmsContext/);
  assert.doesNotMatch(sidePanel, /RoomBottomBar|roomBottomMode|room-bottom-bar/);
  assert.doesNotMatch(css, /room-bottom-bar|selected-room-overlay|roomBottomMode/);
  assert.match(workHeader, /<MaterialIcon name=\{workIconName\} size=\{18\} filled \/>/);
  assert.doesNotMatch(workHeader, /작업 메뉴|selectedMenu\?\.description|work-context-card|<h2>\{selectedMenu\?\.title\}<\/h2>/);
  assert.doesNotMatch(workHeader, /debug-panel|console|trace/i);
});

test("status text is not rendered as a card or generic instruction block", () => {
  const sidePanel = read("src/ui/components/SidePanelView.svelte");
  const controller = read("src/ui/side-panel-controller.svelte.ts");
  const css = read("styles/sidepanel.css");

  assert.match(sidePanel, /#if controller\.statusMessage/);
  assert.doesNotMatch(controller, /템플릿을 선택해 복사하세요|수정할 항목을 선택해주세요|시작화면으로 돌아왔습니다/);
  const statusBarRule = cssRule(css, ".status-bar");
  assert.match(statusBarRule, /background:\s*transparent;/);
  assert.match(statusBarRule, /box-shadow:\s*none;/);
  assert.doesNotMatch(statusBarRule, /border:\s*1px|border-radius/);
  assert.doesNotMatch(statusBarRule, /background:\s*#fff/);
  assert.doesNotMatch(statusBarRule, /background:\s*rgb\(255 255 255\)/);
  assert.doesNotMatch(statusBarRule, /background:\s*var\(--color-surface\)/);
  assert.doesNotMatch(css, /work-context-card/);
});
