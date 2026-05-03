import test from "node:test";
import assert from "node:assert/strict";

import {
  filterTemplatesForMenu,
  getHomeMenuSections,
  getMenu,
  homeQuickActions,
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
  assert.deepEqual(filterTemplatesForMenu("LAUNDRY_MANAGEMENT", [laundry]), [laundry]);
  assert.deepEqual(filterTemplatesForMenu("CUSTOMER_NOTICE", [laundry]), []);
});

test("user-facing operations labels keep current business terms", () => {
  assert.equal(getMenu("SALES_MANAGEMENT").title, "매지출 관리");
  assert.equal(getMenu("ROOM_REMARK_MEMO").title, "객실 정보 메모");
  assert.equal(getMenu("AIRPORT_VAN_MANAGEMENT").title, "공항밴 관리");
});

test("home menu presentation comes from routing catalog metadata", () => {
  const sections = getHomeMenuSections();
  const primary = sections.find((section) => section.id === "primary");
  const roomOperations = sections.find((section) => section.id === "room-operations");
  const workForms = sections.find((section) => section.id === "work-forms");
  const otaMenu = workForms?.items.find((item) => item.id === "OTA_RESERVATION_INPUT");

  assert.deepEqual(
    primary?.items.map((item) => item.id),
    ["CUSTOMER_NOTICE", "QUICK_REPLY"],
  );
  assert.deepEqual(
    roomOperations?.items.map((item) => item.id),
    ["LAUNDRY_MANAGEMENT", "AIRPORT_VAN_MANAGEMENT", "SALES_MANAGEMENT"],
  );
  assert.equal(otaMenu?.home?.title, "OTA 예약 입력");
  assert.equal(otaMenu?.home?.icon, "travel_explore");
  assert.deepEqual(
    homeQuickActions.map((action) => action.icon),
    ["settings"],
  );
  assert.deepEqual(
    homeQuickActions.map((action) => action.label),
    ["설정"],
  );
});

test("airport van menu derives templates from catalog type metadata", () => {
  const airportGuide = template("opaque-airport-guide", {
    menuId: "CUSTOMER_NOTICE",
    typeId: "airport_van",
  });
  const laundry = template("opaque-laundry", {
    menuId: "LAUNDRY_MANAGEMENT",
    typeId: "laundry_complete",
  });

  assert.deepEqual(filterTemplatesForMenu("AIRPORT_VAN_MANAGEMENT", [airportGuide, laundry]), [
    airportGuide,
  ]);
});
