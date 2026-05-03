import test from "node:test";
import assert from "node:assert/strict";

import {
  TEMPLATE_DUPLICATE_GROUPS,
  UNIFIED_TEMPLATE_CATALOG,
  applyStoredUnifiedTemplateState,
  getUnifiedTemplate,
  getUnifiedTemplatesForBranch,
} from "../src/catalog/template-catalog.js";
import { createCustomTemplateDefinition } from "../src/catalog/template-schema.js";
import type { StoredExtensionState } from "../src/catalog/template-types.js";
import { WORKFLOW_TEMPLATE_CATALOG, applyStoredTemplateState } from "../src/catalog/workflow-catalog.js";

test("unified catalog supplies menu type and source metadata for runtime templates", () => {
  const arrival = getUnifiedTemplate("guest-arrival-notice");
  const laundry = getUnifiedTemplate("laundry-complete-message");
  const airportVan = getUnifiedTemplate("airport-van-request-guide");

  assert.equal(arrival?.menuId, "CUSTOMER_NOTICE");
  assert.equal(arrival?.typeId, "arrival_notice");
  assert.equal(arrival?.sourceRefs.some((source) => source.includes("workflow-catalog")), true);
  assert.equal(laundry?.menuId, "LAUNDRY_MANAGEMENT");
  assert.equal(laundry?.typeId, "laundry_complete");
  assert.equal(laundry?.duplicateGroupId, "laundry-complete-strong-similar");
  assert.equal(airportVan?.menuId, "CUSTOMER_NOTICE");
  assert.equal(airportVan?.typeId, "airport_van");
  assert.equal(airportVan?.sourceRefs.some((source) => source.includes("16_공항밴")), true);
});

test("duplicate groups remain explicit source evidence, not inferred text matches", () => {
  assert.deepEqual(TEMPLATE_DUPLICATE_GROUPS["room-upgrade-ko-exact"], [
    "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(한글).txt",
    "CSM.zip::CSM/룸업글 안내문(한글).txt",
  ]);
  assert.deepEqual(TEMPLATE_DUPLICATE_GROUPS["csm-foreign-prearrival-exact"], [
    "CSM.zip::CSM/2주전CSM.txt",
    "CSM.zip::CSM/외국고객리뷰요청.txt",
    "CSM.zip::CSM/외국인 재실CSM.txt",
    "CSM.zip::CSM/한 달 전CSM.txt",
  ]);
});

test("branch-scoped catalog filtering never exposes excluded attachment ids", () => {
  const coexArrival = getUnifiedTemplatesForBranch("coex").find(
    (template) => template.id === "guest-arrival-notice",
  );
  const gangnamArrival = getUnifiedTemplatesForBranch("gangnam").find(
    (template) => template.id === "guest-arrival-notice",
  );

  assert.equal(coexArrival?.attachments.includes("coex-door-password-guide-video"), false);
  assert.equal(gangnamArrival?.attachments.includes("coex-door-password-guide-video"), false);
  assert.deepEqual(getUnifiedTemplatesForBranch("unknown"), []);
});

test("stored overrides and custom entries merge into workflow and unified catalogs", () => {
  const customTemplate = createCustomTemplateDefinition({
    id: "custom-unified-entry",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "사용자 통합 항목",
    branchScope: ["seolleung"],
    languages: { KO: "사용자 통합 항목" },
    requiresContext: "none",
    defaultValue: "사용자 통합 항목",
  });
  const state: StoredExtensionState = {
    schemaVersion: 1,
    templateOverrides: {
      "quick-room-upgrade": {
        title: "수정된 업그레이드",
        branchScope: ["coex"],
        languages: { KO: "수정" },
      },
    },
    customTemplates: [customTemplate],
    ui: {},
  };

  const workflowCatalog = applyStoredTemplateState(state);
  const unifiedCatalog = applyStoredUnifiedTemplateState(state);

  assert.equal(
    workflowCatalog.find((template) => template.id === "quick-room-upgrade")?.title,
    "수정된 업그레이드",
  );
  assert.deepEqual(
    workflowCatalog.find((template) => template.id === "quick-room-upgrade")?.branchScope,
    ["coex"],
  );
  assert.equal(
    unifiedCatalog.find((template) => template.id === "custom-unified-entry")?.sourceRefs[0],
    "custom://custom-unified-entry",
  );
  assert.equal(UNIFIED_TEMPLATE_CATALOG.length, WORKFLOW_TEMPLATE_CATALOG.length);
});
