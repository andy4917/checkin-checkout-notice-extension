import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
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

  assert.doesNotMatch(workHeader, /전체|안내문|WINGS/);
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
  const css = read("styles/sidepanel.css");

  assert.doesNotMatch(routing, /Wings Login|Light|Dark/);
  assert.doesNotMatch(roomsSettingsBar, /연결된 동작 없음|대기|index === 2|home-bottom-divider/);
  assert.doesNotMatch(css, /home-bottom-divider/);
  assert.match(routing, /menuId: MenuId;/);
  assert.match(routing, /label: "설정"/);
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-width: 152px;/);
  assert.match(css, /\.home-bottom-toggle[\s\S]*min-height: 42px;/);
});
