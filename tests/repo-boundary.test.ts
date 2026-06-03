import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "120");
  assert.equal(manifest.background.service_worker, "dist/assets/background.js");
  assert.equal(manifest.side_panel.default_path, "dist/sidepanel.html");
  assert.equal(manifest.action.default_popup, undefined);
  assert.deepEqual(manifest.permissions, ["sidePanel", "storage", "tabs", "scripting"]);
  assert.equal(packageJson.scripts.verify, "npm run typecheck && npm run build && npm test && npm run check:sidepanel-scale && npm run check:extension-smoke");
  assert.match(main, /mount\(App, \{ target \}\)/);
  assert.match(app, /createSidePanelNavigationController\(browserSidePanelNavigationDependencies\)/);
  assert.match(app, /<SidePanel \{controller\} \/>/);
  assert.doesNotMatch(app, /{#if|<main|<section|fetch\(|chrome\.storage|navigator\.clipboard|window\./);
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
      /YYYY\.MM\.DD|HH:MM|The Gangnan|현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|복사되었습니다\./,
      /test-only|fake|demo|sample customer|placeholder business data/i,
    ].filter((pattern) => pattern.test(source));
    return matches.map((pattern) => `${file}: ${pattern}`);
  });

  assert.deepEqual(violations, []);
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
