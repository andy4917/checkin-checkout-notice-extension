import test from "node:test";
import assert from "node:assert/strict";

import {
  filterTemplatesForMenu,
  getMenu,
  matchesTemplateTab,
} from "../src/catalog/menu-routing.js";
import type { UnifiedTemplateDefinition } from "../src/catalog/template-types.js";

function template(
  id: string,
  overrides: Partial<UnifiedTemplateDefinition>,
): UnifiedTemplateDefinition {
  return {
    id,
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "opaque title",
    branchScope: ["coex", "gangnam", "seolleung"],
    languages: { KO: "opaque body" },
    variables: [],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "opaque default",
    menuId: "WORK_REPORT",
    typeId: "day_night_report",
    summary: "opaque summary",
    sourceRefs: [`test://${id}`],
    duplicateGroupId: null,
    ...overrides,
  };
}

test("menu routing uses catalog metadata instead of text heuristics", () => {
  const laundry = template("opaque-laundry", {
    menuId: "LAUNDRY_MANAGEMENT",
    typeId: "laundry_complete",
  });
  const dodineSales = template("opaque-sales", {
    menuId: "SALES_MANAGEMENT",
    typeId: "dodine_sales",
  });
  const reservationReport = template("opaque-report", {
    menuId: "WORK_REPORT",
    typeId: "reservation_report",
  });

  assert.deepEqual(filterTemplatesForMenu("LAUNDRY_MANAGEMENT", [laundry]), [laundry]);
  assert.deepEqual(filterTemplatesForMenu("CUSTOMER_NOTICE", [laundry]), []);
  assert.equal(matchesTemplateTab("SALES_MANAGEMENT", "dodine", dodineSales), true);
  assert.equal(matchesTemplateTab("WORK_REPORT", "reservation", reservationReport), true);
  assert.equal(matchesTemplateTab("WORK_REPORT", "daily", reservationReport), false);
});

test("user-facing operations labels keep current business terms", () => {
  assert.equal(getMenu("SALES_MANAGEMENT").title, "매지출 관리");
  assert.equal(getMenu("ROOM_REMARK_MEMO").title, "객실 정보 메모");
});
