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

  assert.match(workHeader, /LanguageSegmentedControl/);
  assert.match(settingsPanel, /LanguageSegmentedControl/);
  assert.match(languageControl, /class="language-segmented"/);

  for (const source of [workHeader, settingsPanel, languageControl]) {
    assert.doesNotMatch(source, /template-language|settings-language/);
  }
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
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-width: 152px;/);
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-height: 42px;/);
});

test("PMS work menus expose WINGS status without broad automation buttons", () => {
  const workHeader = read("src/ui/components/WorkHeader.svelte");
  const roomBottomBar = read("src/ui/components/RoomBottomBar.svelte");
  const sidePanel = read("src/ui/components/SidePanelView.svelte");

  assert.match(workHeader, /wings-status-pill/);
  assert.match(sidePanel, /hasWingsPmsContext/);
  assert.match(roomBottomBar, /체크인 공항 픽업|recordBadgeLabel/);
  assert.doesNotMatch(workHeader, /작업 메뉴|selectedMenu\?\.description|work-context-card/);
  assert.doesNotMatch(workHeader, /debug-panel|console|trace/i);
  assert.doesNotMatch(roomBottomBar, /WINGS에 입력|자동 입력/);
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
