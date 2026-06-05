import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  homeNavigationGroups,
  settingsNavigationItems,
  settingsUtilityItems,
  templateEditorMenu,
  formEditorMenu,
} from "../src/catalog/menu-routing.js";

const root = process.cwd();
const targetRoot = join(root, "docs", "product-surface-targets");

type ProductSurfaceContract = {
  surfaceId: string;
  order: number;
  title: string;
  group: string;
  menuPath: readonly string[];
  ownerModules: readonly string[];
  primaryActions: readonly string[];
  expectedVisibleState: string;
  errorState: string;
  statusPolicy: string;
  hiddenSurfacePolicy: string;
  backendContract: {
    owners: readonly string[];
    boundary: string;
    successEvidence: string;
    failureEvidence: string;
  };
  prohibitedVisibleText: readonly string[];
  prohibitedStatusText: readonly string[];
  prohibitedPlaceholders: readonly string[];
  fixedShellContract: string;
  motionContract: string;
  overflowContract: string;
  verticalAnchoringInvariant: {
    coordinateSpace: string;
    tolerancePx: number;
    requiredMeasurements: readonly string[];
    failureSignals: readonly string[];
  };
  expectedImagePath: string;
  imageGenerationStatus: "expectedImagePresent";
  smokeCoverage: {
    required: true;
    accessPath: readonly string[];
    assertions: readonly string[];
  };
};

const expectedSurfaceIds = [
  "home",
  "customer-checkin-notice",
  "customer-checkout-notice",
  "customer-room-notice",
  "customer-fee-notice",
  "quick-rental-reply",
  "quick-lost-item-reply",
  "quick-room-visit-reply",
  "laundry-management",
  "sales-management",
  "airport-van-management",
  "room-remark",
  "ota-reservation-input",
  "work-report-form",
  "notice-reply-editor",
  "work-form-editor",
] as const;

const requiredContractKeys = [
  "surfaceId",
  "order",
  "title",
  "group",
  "menuPath",
  "ownerModules",
  "primaryActions",
  "expectedVisibleState",
  "statusPolicy",
  "hiddenSurfacePolicy",
  "backendContract",
  "prohibitedVisibleText",
  "prohibitedStatusText",
  "prohibitedPlaceholders",
  "fixedShellContract",
  "motionContract",
  "overflowContract",
  "verticalAnchoringInvariant",
  "expectedImagePath",
  "imageGenerationStatus",
  "smokeCoverage",
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
      return contract;
    })
    .sort((left, right) => left.order - right.order);
}

function readPngDimensions(path: string): { width: number; height: number } {
  const image = readFileSync(path);
  assert.ok(image.length >= 24, `${path} must be large enough to contain a PNG header`);
  assert.deepEqual(
    Array.from(image.subarray(0, 8)),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${path} must have a PNG signature`,
  );
  assert.equal(image.subarray(12, 16).toString("ascii"), "IHDR", `${path} must start with an IHDR chunk`);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

function isGitTracked(path: string): boolean {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", path], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

test("product surface targets are exactly the 16 surfaces from 구조.md", () => {
  const contracts = readContracts();
  assert.deepEqual(
    contracts.map((contract) => contract.surfaceId),
    [...expectedSurfaceIds],
  );
  assert.equal(contracts.length, 16);

  for (const contract of contracts) {
    assert.ok(contract.title.trim());
    assert.ok(contract.expectedVisibleState.trim());
    assert.ok(contract.primaryActions.length > 0);
    assert.match(contract.fixedShellContract, /400px Chrome side panel/);
    assert.match(contract.statusPolicy, /No general|status|OTA|WINGS|feedback/i);
    assert.match(contract.hiddenSurfacePolicy, /must not (?:hide|remove)|remain visible/i);
    assert.equal(contract.smokeCoverage.required, true);
    assert.match(contract.expectedImagePath, new RegExp(`${contract.surfaceId}/expected\\.png$`));
    assert.equal(contract.imageGenerationStatus, "expectedImagePresent");

    const targetSvg = readFileSync(join(targetRoot, contract.surfaceId, "target.svg"), "utf8");
    assert.match(targetSvg, new RegExp(`surfaceId: ${contract.surfaceId}`));
    assert.match(targetSvg, /class="sidepanel"/);
    assert.match(targetSvg, /vertical anchoring invariant/);
    assert.doesNotMatch(targetSvg, /contact sheet|phone|ImageGen/i);
  }
});

test("expected.png files are present image contracts for exactly the 16 product surfaces", () => {
  const contracts = readContracts();
  for (const contract of contracts) {
    const expectedImage = join(root, contract.expectedImagePath);
    assert.equal(existsSync(expectedImage), true, `${contract.surfaceId} expected.png missing`);
    assert.equal(
      isGitTracked(contract.expectedImagePath),
      true,
      `${contract.surfaceId} expected.png must be tracked by git before it can satisfy the image contract`,
    );
    assert.ok(statSync(expectedImage).size > 1024, `${contract.surfaceId} expected.png must not be an empty stub`);
    const dimensions = readPngDimensions(expectedImage);
    assert.ok(dimensions.width >= 400, `${contract.surfaceId} expected.png width must cover side-panel target`);
    assert.ok(dimensions.height >= 720, `${contract.surfaceId} expected.png height must cover side-panel target`);
  }
});

test("customer guidance and quick reply leaves cannot be hidden by template absence", () => {
  const contracts = readContracts().filter((contract) =>
    contract.group === "customer-guidance" || contract.group === "quick-reply"
  );
  assert.equal(contracts.length, 7);
  for (const contract of contracts) {
    assert.match(contract.hiddenSurfacePolicy, /Missing templates/);
    assert.match(contract.hiddenSurfacePolicy, /must not remove the catalog row in HomeView/);
    assert.match(contract.backendContract.failureEvidence, /fake success|required value|clipboard/i);
  }
});

test("HomeView keeps accordion leaf rows and labels anchored to the catalog contract", () => {
  const homeView = read("src/ui/components/HomeView.svelte");
  assert.match(
    homeView,
    /function getRenderedDetailItems\(group: HomeNavigationGroup\): readonly HomeNavigationItem\[\]\s*\{\s*return group\.items;\s*\}/,
  );
  assert.doesNotMatch(homeView, /group\.items\.filter\(\(item\)\s*=>\s*getInlineTemplates\(item\)\.length > 0\)/);

  const directRowIndex = homeView.indexOf('class="home-submenu-item home-template-row-direct"');
  assert.ok(directRowIndex > 0, "single-template accordion row must keep the direct copy action surface");
  const directRowSource = homeView.slice(directRowIndex, homeView.indexOf("<button", directRowIndex));
  assert.match(directRowSource, /\{item\.title\}/);
  assert.doesNotMatch(directRowSource, /\{template\.title\}/);
});

test("route catalog owner matches 구조.md instead of hiding stale rows in components", () => {
  const groups = new Map(homeNavigationGroups.map((group) => [group.id, group.items.map((item) => item.title)]));
  assert.deepEqual(groups.get("customer-guidance"), [
    "체크인 안내문",
    "체크아웃 안내문",
    "객실 관련 안내문",
    "각종 요금 관련 안내문",
  ]);
  assert.deepEqual(groups.get("quick-replies"), [
    "물품 대여 문의",
    "분실물 문의",
    "객실 방문 예정",
  ]);
  assert.deepEqual(groups.get("service-management"), [
    "세탁물 관리",
    "매지출 관리",
    "공항밴 관리",
  ]);
  assert.deepEqual(groups.get("work-management"), [
    "객실 정보 리마크",
    "NAVER / STATION 예약입력",
    "업무보고 양식",
  ]);
  assert.deepEqual(groups.get("template-editor"), [
    "안내문 편집 / 빠른답변 편집",
    "업무 양식 편집",
  ]);

  const allCatalogLabels = [...groups.values()].flat().join("\n");
  assert.doesNotMatch(
    allCatalogLabels,
    /조식 문의|인보이스 문의|체크인 1주이내 취소 문의|세탁 서비스 문의|카톡 채널 문의|근처 식당 문의|객실 정보 메모/,
  );
  assert.equal(templateEditorMenu.title, "안내문 편집 / 빠른답변 편집");
  assert.equal(formEditorMenu.title, "업무 양식 편집");
  assert.deepEqual(settingsUtilityItems.map((item) => item.title), [
    "지점 선택",
    "PMS 목록",
    "로컬 저장소",
  ]);
  assert.ok(settingsUtilityItems.every((item) => item.surfaceCountPolicy === "utilityNotProductSurface"));
  assert.deepEqual(settingsNavigationItems.map((item) => [item.title, item.role, item.surfaceCountPolicy]), [
    ["안내문 편집 / 빠른답변 편집", "editorShortcut", "linksExistingProductSurface"],
    ["업무 양식 편집", "editorShortcut", "linksExistingProductSurface"],
  ]);
});

test("all contracts include real Chrome vertical anchoring proof requirements", () => {
  for (const contract of readContracts()) {
    assert.match(contract.verticalAnchoringInvariant.coordinateSpace, /Actual Google Chrome side panel/);
    assert.equal(contract.verticalAnchoringInvariant.tolerancePx, 2);
    assert.match(contract.verticalAnchoringInvariant.requiredMeasurements.join("\n"), /visualViewport\.height/);
    assert.match(contract.verticalAnchoringInvariant.requiredMeasurements.join("\n"), /\.app-shell bounding rect/);
    assert.match(contract.verticalAnchoringInvariant.requiredMeasurements.join("\n"), /\.screen-stage bounding rect/);
    assert.match(contract.verticalAnchoringInvariant.failureSignals.join("\n"), /extension URL tab viewport/);
    assert.match(contract.smokeCoverage.assertions.join("\n"), /vertical anchoring|footer|visible|status|failure|controls|rows/i);
  }
});

test("room remark contract requires WINGS remark owner and reference-critical controls", () => {
  const roomRemark = readContracts().find((contract) => contract.surfaceId === "room-remark");
  assert.ok(roomRemark);
  assert.deepEqual(roomRemark.primaryActions, [
    "제공 카드키",
    "대여물품",
    "추가 리마크",
    "WINGS 리마크 입력",
  ]);
  assert.match(roomRemark.expectedVisibleState, /객실 선택 상태/);
  assert.match(roomRemark.expectedVisibleState, /물품 stepper/);
  assert.match(roomRemark.backendContract.boundary, /remark read\/upsert\/write/);
  assert.deepEqual(roomRemark.backendContract.owners, [
    "src/application/wings-remark.ts",
    "src/domain/remarks.ts",
  ]);
  assert.match(roomRemark.backendContract.failureEvidence, /missing WINGS room information window/);
  assert.deepEqual(roomRemark.smokeCoverage.assertions, [
    "room context state visible",
    "WINGS dependency failure captured when unavailable",
  ]);
  assert.doesNotMatch(roomRemark.prohibitedPlaceholders.join("\n"), /Towels|Water|Bedding|Room 402|Occupied/);
});

test("inventory is regenerated from the 16-surface contract and excludes old target surfaces", () => {
  const inventory = read("docs/product-surface-inventory.md");
  for (const surfaceId of expectedSurfaceIds) {
    assert.match(inventory, new RegExp(`\\\`${surfaceId}\\\``));
  }
  assert.doesNotMatch(
    inventory,
    /home-submenu-quick-replies|settings-hub|storage-recovery|pms-checkin-list|pms-checkout-list|pms-room-select|branch-picker-header-lock|template-form-editor-hub/,
  );
  assert.match(inventory, /PMS bottom navigation remains a backend verification surface/);
  assert.match(inventory, /bottom-bar settings screen is a utility and operation surface/);
});

test("current design docs do not preserve stale menu labels or settings-hub wording", () => {
  const docs = [
    "docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md",
    "docs/UI_REFERENCE_LOCALIZATION_BACKEND_ALIGNMENT_PLAN.md",
    "docs/TEST_CONTRACT.md",
  ]
    .map(read)
    .join("\n");

  assert.doesNotMatch(docs, /객실 정보 메모|current settings hub rows|템플릿 편집` and `양식 편집|settings hub/);
  assert.match(docs, /객실 정보 리마크/);
  assert.match(docs, /안내문 편집 \/ 빠른답변 편집/);
  assert.match(docs, /업무 양식 편집/);
  assert.match(docs, /utility surface/);
});

test("implementation docs require Product Design and backend contract reviews before leaf work", () => {
  const designContract = read("docs/PRODUCT_DESIGN_CONTRACT.md");
  const backendReview = read("docs/BACKEND_CONTRACT_REVIEW.md");
  const directive = read("docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md");
  const testContract = read("docs/TEST_CONTRACT.md");
  const alignment = read("docs/UI_REFERENCE_LOCALIZATION_BACKEND_ALIGNMENT_PLAN.md");
  const salesContract = JSON.parse(read("docs/product-surface-targets/sales-management/contract.json")) as ProductSurfaceContract;
  const roomRemarkContract = JSON.parse(read("docs/product-surface-targets/room-remark/contract.json")) as ProductSurfaceContract;

  for (const doc of [directive, testContract, alignment]) {
    assert.match(doc, /docs\/PRODUCT_DESIGN_CONTRACT\.md/);
    assert.match(doc, /docs\/BACKEND_CONTRACT_REVIEW\.md/);
  }

  assert.match(designContract, /16 product surfaces/);
  assert.match(designContract, /UI Reference/);
  assert.match(designContract, /actual Chrome side-panel surface/i);
  assert.match(designContract, /template value plus clipboard output/);
  assert.match(designContract, /Do not add `Save Record`, recent expense rows/);
  assert.match(designContract, /fake `Room 402`, `Towels`, `Water`, `Bedding`/);

  assert.match(backendReview, /direct host-permission POST/);
  assert.match(backendReview, /does not require a WINGS login workflow/);
  assert.match(backendReview, /network-observed JSON `rows`/);
  assert.match(backendReview, /SAML HTML[^.]+not[^.]+PMS backend success/s);
  assert.match(backendReview, /Do not add a WINGS-login prerequisite, fake PMS rows/);

  assert.match(salesContract.backendContract.boundary, /template value and clipboard boundary/);
  assert.match(salesContract.backendContract.successEvidence, /clipboard write receives rendered report/);
  assert.doesNotMatch(salesContract.expectedVisibleState, /Save Record|recent expense|recent rows/i);
  assert.match(roomRemarkContract.backendContract.boundary, /active WINGS remark read\/upsert\/write/);
  assert.match(roomRemarkContract.errorState, /WINGS/);
});
