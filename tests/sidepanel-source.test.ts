import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("side panel home markup uses local menu aliases for bundled runtime safety", () => {
  const source = readFileSync("src/ui/App.svelte", "utf8");

  assert.match(source, /const homeMenuGroups = menuGroups;/);
  assert.match(source, /const homeSettingsMenu = settingsMenu;/);
  assert.doesNotMatch(source, /\{#each\s+menuGroups\s+as\s+group\}/);
  assert.doesNotMatch(source, /\{settingsMenu\./);
});
