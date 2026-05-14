import test from "node:test";
import assert from "node:assert/strict";

import { guardRequiredContext } from "../src/application/context-guard.js";
import {
  filterTemplatesForMenu,
  getHomeMenuSections,
  getMenu,
  getRoomsSettingsCommand,
} from "../src/catalog/menu-routing.js";
import {
  ManualRequiredValueMissingError,
  PmsRequiredValueMissingError,
  TemplateLanguageUnavailableError,
  getAvailableTemplateLanguages,
  renderTemplate,
} from "../src/catalog/template-renderer.js";
import { getUnifiedTemplatesForBranch, UNIFIED_TEMPLATE_CATALOG } from "../src/catalog/template-catalog.js";
import type { TemplateDefinition } from "../src/catalog/template-types.js";

const allBranches = ["coex", "gangnam", "seolleung"] as const;

test("home and customer guidance routing are catalog-owned current contracts", () => {
  const sections = getHomeMenuSections();
  const primary = sections.find((section) => section.id === "primary");
  const customerNotice = getMenu("CUSTOMER_NOTICE");

  assert.equal(primary?.title, "고객 커뮤니케이션");
  assert.equal(primary?.items[0]?.id, "CUSTOMER_NOTICE");
  assert.equal(customerNotice.title, "고객 안내문");
  assert.equal(customerNotice.screenKind, "customerGuidance");
  assert.deepEqual(customerNotice.templateFilter, { kind: "menu" });
});

test("template filtering uses catalog metadata, branch scope, and attachment exclusion", () => {
  const airportMenu = getMenu("AIRPORT_VAN_MANAGEMENT");
  const airportTemplates = filterTemplatesForMenu("AIRPORT_VAN_MANAGEMENT", UNIFIED_TEMPLATE_CATALOG);
  const customerTemplates = filterTemplatesForMenu("CUSTOMER_NOTICE", UNIFIED_TEMPLATE_CATALOG);

  assert.deepEqual(airportMenu.templateFilter, { kind: "type", typeId: "airport_van" });
  assert.equal(airportTemplates.every((template) => template.typeId === "airport_van"), true);
  assert.equal(customerTemplates.every((template) => template.menuId === "CUSTOMER_NOTICE"), true);
  for (const branchId of allBranches) {
    assert.equal(
      getUnifiedTemplatesForBranch(branchId).some((template) =>
        template.attachments.includes("coex-door-password-guide-video"),
      ),
      false,
    );
  }
});

test("renderer fails required PMS/manual values and unavailable languages instead of producing fake success", () => {
  const pmsTemplate = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "guest-arrival-notice");
  assert.ok(pmsTemplate);
  assert.throws(() => renderTemplate(pmsTemplate, "KO", { roomNo: "A302" }), PmsRequiredValueMissingError);

  const manualRequiredTemplate: TemplateDefinition = {
    id: "manual-required-contract",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "manual required",
    branchScope: ["coex"],
    languages: { KO: "{guestName}" },
    variables: [{ name: "guestName", label: "고객명", kind: "manualRequired" }],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "{guestName}",
  };
  assert.throws(() => renderTemplate(manualRequiredTemplate, "KO", {}), ManualRequiredValueMissingError);

  const salesReport = UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === "report-sales");
  assert.ok(salesReport);
  assert.deepEqual(getAvailableTemplateLanguages(salesReport), ["KO"]);
  assert.throws(() => renderTemplate(salesReport, "EN"), TemplateLanguageUnavailableError);
});

test("context and rooms command contracts surface operator-visible failure paths", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: "로그인된 WINGS 페이지를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("guestRecord", { isPmsPage: true, isGuestRecord: false }), {
    ok: false,
    message: "고객정보를 열어주십시오",
  });

  const remarkCommand = getRoomsSettingsCommand("UPSERT_WINGS_REMARK");
  assert.equal(remarkCommand.visibleWhenSelectedTemplateAudience, "pmsRemark");
  assert.equal(remarkCommand.requiresPmsRecord, true);
  assert.equal(remarkCommand.requiresWingsReservationWindow, true);
});
