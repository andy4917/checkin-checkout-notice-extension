import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("repo-local agent contract uses the real file casing and does not hardcode an absent global workflow", () => {
  const rootEntries = readdirSync(root);
  assert.equal(rootEntries.includes("agents.md"), true);
  assert.equal(rootEntries.includes("AGENTS.md"), false);

  const contract = read("agents.md");
  assert.match(contract, /Higher-priority system, developer, runtime, global, and direct user instructions always take precedence/);
  assert.match(contract, /The file on disk is `agents\.md`/);
  assert.doesNotMatch(contract, /Dev-Management\\docs\\GLOBAL_AGENT_WORKFLOW\.md/);
});

test("tracked docs do not revive the absent external workflow path as current authority", () => {
  const trackedDocs = execFileSync("git", ["ls-files", "docs", "DESIGN.md"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((file) => file.endsWith(".md") && existsSync(join(root, file)));

  const violations = trackedDocs.filter((file) =>
    /Dev-Management\\docs\\GLOBAL_AGENT_WORKFLOW\.md/.test(read(file)),
  );

  assert.deepEqual(violations, []);
});

test("generated agent run receipts are neither tracked nor allowed back into the repo", () => {
  const trackedAgentRuns = execFileSync("git", ["ls-files", ".agent-runs/*"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);

  assert.deepEqual(trackedAgentRuns, []);
  assert.match(read(".gitignore"), /^\.agent-runs\/$/m);
});

test("current test surface contains only the current contract suite", () => {
  const currentTests = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "tests"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((file) => file && existsSync(join(root, file)))
    .sort();

  assert.deepEqual(currentTests, [
    "tests/current-catalog-routing.test.ts",
    "tests/current-data-flows.test.ts",
    "tests/current-extension-boundary.test.ts",
    "tests/current-manual-variable-flow.test.ts",
    "tests/current-repo-contract.test.ts",
    "tests/current-storage-settings.test.ts",
  ]);
});

test("legacy sidepanel product surface is absent and current structure docs do not use it as a source of truth", () => {
  assert.equal(existsSync(join(root, "src", "sidepanel")), false);

  const structureMapping = read("docs/STRUCTURE_MAPPING.md");
  assert.match(structureMapping, /The removed DOM side panel is not a source of truth/);
  assert.doesNotMatch(structureMapping, /sidepanel\.js/);
});

test("Svelte UI files do not own operation codes, customer numbers, PMS endpoints, or fake placeholder business data", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src/ui"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((file) => (file.endsWith(".ts") || file.endsWith(".svelte")) && existsSync(join(root, file)));

  const bannedPatterns = [
    /https:\/\/pms\.sanhait\.com/,
    /searchListGlobalRsvn_v03/,
    /IR04_0100X_V03/,
    /\b(?:00064633|00048147)\b/,
    /\b(?:BSNS_CODE|PROPERTY_NO|PP_BSNS_CODE)\b/,
    /\b(?:AIRPORT_VAN_MANAGEMENT|OTA_RESERVATION_INPUT|LAUNDRY_MANAGEMENT|SETTINGS)\b/,
    /\b(?:PICKUP|SENDING|CASH|CARD|ROOM_CHARGE|RECEIVED|WASHER|DRYER|READY|IN_PROGRESS)\b/,
    /\bN\/A\b/,
    /fake|demo|sample customer|placeholder business data/i,
  ];

  const violations = files.flatMap((file) => {
    const source = read(file);
    return bannedPatterns
      .filter((pattern) => pattern.test(source))
      .map((pattern) => `${file}: ${pattern}`);
  });

  assert.deepEqual(violations, []);
});
