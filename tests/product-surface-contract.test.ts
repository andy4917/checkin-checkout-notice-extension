import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  homeNavigationGroups,
  settingsNavigationItems,
} from "../src/catalog/menu-routing.js";

const root = process.cwd();
const targetRoot = join(root, "docs", "product-surface-targets");

type ProductSurfaceContract = {
  surfaceId: string;
  title: string;
  menuPath: readonly string[];
  ownerModules: readonly string[];
  storageKeys: readonly string[];
  actions: readonly string[];
  expectedVisibleState: string;
  loadingState: string;
  emptyState: string;
  errorState: string;
  forbiddenResidue: readonly string[];
  motionContract: string;
  overflowContract: string;
  backendVerification: string;
  smokeRequired: boolean;
  referenceFiles: readonly string[];
};

const expectedSurfaceIds = [
  "home-root",
  "branch-picker-header-lock",
  "home-submenu-customer-guidance",
  "home-submenu-quick-replies",
  "home-submenu-service-management",
  "home-submenu-work-management",
  "home-submenu-template-editor",
  "customer-guidance",
  "quick-reply",
  "service-management",
  "work-management",
  "template-form-editor-hub",
  "settings-hub",
  "laundry-management",
  "sales-management",
  "airport-van-management",
  "room-remark-memo",
  "ota-reservation-input",
  "work-report-template-list",
  "pms-checkin-list",
  "pms-checkout-list",
  "pms-room-select",
  "template-settings",
  "form-settings",
  "storage-recovery",
] as const;

const requiredContractKeys = [
  "surfaceId",
  "title",
  "menuPath",
  "ownerModules",
  "storageKeys",
  "actions",
  "expectedVisibleState",
  "loadingState",
  "emptyState",
  "errorState",
  "forbiddenResidue",
  "motionContract",
  "overflowContract",
  "backendVerification",
  "smokeRequired",
  "referenceFiles",
] as const;

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function readContracts(): ProductSurfaceContract[] {
  assert.equal(existsSync(targetRoot), true, "docs/product-surface-targets must exist");
  return readdirSync(targetRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(targetRoot, entry.name);
      assert.equal(existsSync(join(dir, "target.svg")), true, `${entry.name} target.svg missing`);
      assert.equal(existsSync(join(dir, "contract.json")), true, `${entry.name} contract.json missing`);
      assert.equal(existsSync(join(dir, "notes.md")), true, `${entry.name} notes.md missing`);
      const contract = JSON.parse(readFileSync(join(dir, "contract.json"), "utf8")) as ProductSurfaceContract;
      for (const key of requiredContractKeys) {
        assert.equal(key in contract, true, `${entry.name} contract missing ${key}`);
      }
      assert.equal(contract.surfaceId, entry.name);
      assert.match(readFileSync(join(dir, "target.svg"), "utf8"), new RegExp(contract.title));
      return contract;
    })
    .sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
}

test("every product surface has a deterministic target and test-readable contract", () => {
  const contracts = readContracts();
  assert.deepEqual(
    contracts.map((contract) => contract.surfaceId).sort(),
    [...expectedSurfaceIds].sort(),
  );

  for (const contract of contracts) {
    assert.ok(contract.title.trim());
    assert.ok(contract.expectedVisibleState.trim());
    assert.ok(contract.motionContract.trim());
    assert.ok(contract.overflowContract.trim());
    assert.ok(contract.backendVerification.trim());
    assert.ok(contract.forbiddenResidue.length > 0);
    assert.doesNotMatch(readFileSync(join(targetRoot, contract.surfaceId, "target.svg"), "utf8"), /contact sheet|ImageGen/i);
  }
});

test("surface contracts are backed by catalog routes instead of the plan text alone", () => {
  const contracts = readContracts();
  const surfaceIds = new Set(contracts.map((contract) => contract.surfaceId));
  const groupIds = homeNavigationGroups.map((group) => `home-submenu-${group.id}`);

  for (const groupSurfaceId of groupIds) {
    assert.equal(surfaceIds.has(groupSurfaceId), true, `${groupSurfaceId} must have a contract`);
  }
  assert.equal(settingsNavigationItems.length, 2);
  assert.equal(surfaceIds.has("settings-hub"), true);
  assert.equal(surfaceIds.has("template-settings"), true);
  assert.equal(surfaceIds.has("form-settings"), true);
});

test("all smoke-required surface contracts are named in the extension smoke coverage", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  const contracts = readContracts();
  const missing = contracts
    .filter((contract) => contract.smokeRequired)
    .map((contract) => contract.surfaceId)
    .filter((surfaceId) => !smoke.includes(`"${surfaceId}"`));

  assert.deepEqual(missing, []);
});
