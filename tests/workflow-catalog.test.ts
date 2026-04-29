import test from "node:test";
import assert from "node:assert/strict";

import { guardRequiredContext } from "../src/application/context-guard.js";
import {
  PmsRequiredValueMissingError,
  TemplateLanguageUnavailableError,
  getAvailableTemplateLanguages,
  hasTemplateLanguage,
  renderTemplate,
} from "../src/catalog/template-renderer.js";
import {
  WORKFLOW_TEMPLATE_CATALOG,
  applyStoredTemplateState,
  getWorkflowTemplatesByCategory,
  getWorkflowTemplate,
} from "../src/catalog/workflow-catalog.js";
import {
  TEMPLATE_DUPLICATE_GROUPS as UNIFIED_DUPLICATE_GROUPS,
  UNIFIED_TEMPLATE_CATALOG,
  applyStoredUnifiedTemplateState,
  getUnifiedTemplate,
  getUnifiedTemplatesForBranch,
} from "../src/catalog/template-catalog.js";
import { createCustomTemplateDefinition } from "../src/catalog/template-schema.js";
import {
  exportTemplateSettings,
  importTemplateSettings,
  clearTemplateSettings,
  resetAllTemplateSettings,
  resetOneTemplateOverride,
} from "../src/application/template-settings.js";
import { resolveLanguageFromNationality } from "../src/domain/language.js";
import {
  createRemarkLine,
  getBuiltInRemarkType,
  upsertRemarkLine,
} from "../src/domain/remarks.js";
import { getDefaultSidePanelBehavior } from "../src/background/side-panel-policy.js";
import { getTabContextFromUrl } from "../src/platform/tab-context.js";
import {
  STORAGE_KEY,
  normalizeStoredExtensionState,
  StorageSchemaError,
} from "../src/platform/storage-schema.js";
import {
  STORAGE_CORRUPTION_RECOVERY_MESSAGE,
  readExtensionStateWithRecovery,
} from "../src/platform/chrome-storage.js";

test("side panel policy keeps the extension openable on all pages", () => {
  assert.deepEqual(getDefaultSidePanelBehavior(), {
    openPanelOnActionClick: true,
  });
});

test("PMS context is detected separately from panel availability", () => {
  assert.deepEqual(getTabContextFromUrl("https://example.com"), {
    url: "https://example.com",
    isPmsPage: false,
    isGuestRecord: false,
  });

  const pmsContext = getTabContextFromUrl(
    "https://pms.sanhait.com/pms/biz/ir04_0100X/detail.do?RSVN_NO=1",
  );
  assert.equal(pmsContext.isPmsPage, true);
  assert.equal(pmsContext.isGuestRecord, true);
});

test("PMS-only and guest-record actions block with actionable messages", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: "로그인된 WINGS 페이지를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("guestRecord", { isPmsPage: true, isGuestRecord: false }), {
    ok: false,
    message: "고객정보를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("none", { isPmsPage: false, isGuestRecord: false }), {
    ok: true,
  });
});

test("customer notices and quick replies use the same catalog model", () => {
  const notice = getWorkflowTemplate("guest-arrival-notice");
  const reply = getWorkflowTemplate("quick-room-upgrade");
  const laundry = getWorkflowTemplate("laundry-complete-message");

  assert.equal(notice?.category, "GUEST_NOTICE");
  assert.equal(reply?.category, "QUICK_REPLY");
  assert.equal(laundry?.category, "GUEST_NOTICE");
  assert.equal(Boolean(notice?.languages.KO), true);
  assert.equal(Boolean(reply?.languages.KO), true);
  assert.equal(Boolean(laundry?.languages.KO), true);
  assert.equal(notice?.editable, true);
  assert.equal(reply?.editable, true);
  assert.equal(laundry?.editable, true);
});

test("work report defaults from the desktop template are cataloged", () => {
  const workTemplates = getWorkflowTemplatesByCategory("WORK_TEMPLATE").map(
    (template) => template.id,
  );

  assert.deepEqual(workTemplates.sort(), [
    "report-airport-van",
    "report-coex-daily",
    "report-day-night",
    "report-dodine-sales",
    "report-sales",
  ]);
});

test("missing variable policy keeps manual blanks but rejects missing PMS core values", () => {
  const workTemplate = getWorkflowTemplate("report-airport-van");
  assert.ok(workTemplate);
  assert.match(renderTemplate(workTemplate, "KO", { rideDate: "2026. 04. 27" }), /2026\. 04\. 27/);
  assert.match(renderTemplate(workTemplate, "KO", { rideDate: "2026. 04. 27" }), /\t$/);

  const quickReply = getWorkflowTemplate("quick-room-upgrade");
  assert.ok(quickReply);
  assert.match(renderTemplate(quickReply, "KO", {}), /객실 업그레이드/);

  const guestNotice = getWorkflowTemplate("guest-arrival-notice");
  assert.ok(guestNotice);
  assert.throws(
    () => renderTemplate(guestNotice, "KO", { guestName: "Kim" }),
    PmsRequiredValueMissingError,
  );
});

test("templates disable languages when no translated body exists", () => {
  const salesReport = getWorkflowTemplate("report-sales");
  assert.ok(salesReport);

  assert.deepEqual(getAvailableTemplateLanguages(salesReport), ["KO"]);
  assert.equal(hasTemplateLanguage(salesReport, "EN"), false);
  assert.throws(
    () => renderTemplate(salesReport, "EN", { salesDate: "2026. 04. 29" }),
    TemplateLanguageUnavailableError,
  );

  const customTemplate = createCustomTemplateDefinition({
    id: "custom-ko-only-language",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "한국어 전용",
    branchScope: ["coex"],
    languages: { KO: "한국어 본문" },
    requiresContext: "none",
    defaultValue: "fallback should not activate EN",
  });

  assert.deepEqual(getAvailableTemplateLanguages(customTemplate), ["KO"]);
  assert.throws(() => renderTemplate(customTemplate, "EN"), TemplateLanguageUnavailableError);
});

test("nationality language recommendation only returns supported languages", () => {
  assert.equal(resolveLanguageFromNationality("KOR"), "KO");
  assert.equal(resolveLanguageFromNationality("United States"), "EN");
  assert.equal(resolveLanguageFromNationality("Japan"), "JP");
  assert.equal(resolveLanguageFromNationality("China"), "CN");
  assert.equal(resolveLanguageFromNationality("Brazil"), null);
});

test("remark line generation and upsert preserve prior notes", () => {
  assert.equal(getBuiltInRemarkType("remark-card-keys"), "cardKeys");
  assert.equal(getBuiltInRemarkType("custom-pms-remark"), null);
  assert.equal(createRemarkLine("cardKeys", { count: 2 }), "- 제공 카드키 : 2장");

  const existing = "기존 메모입니다.\n- 대여물품 : 변환기 1개";
  assert.equal(
    upsertRemarkLine(existing, "rentals", { items: "변환기 1개 / 충전기 1개" }),
    "기존 메모입니다.\n- 대여물품 : 변환기 1개 / 충전기 1개",
  );
  assert.equal(
    upsertRemarkLine("기존 메모입니다.", "airportVan", {
      direction: "픽업",
      useDateTime: "2026. 04. 27. 10:00",
      dispatchNo: "A1",
    }),
    "기존 메모입니다.\n\n- 공항 밴 : 픽업 / 이용일 : 2026. 04. 27. 10:00 / 배차번호 : A1",
  );
});

test("storage schema accepts valid branch and rejects invalid branch", () => {
  assert.deepEqual(normalizeStoredExtensionState(undefined), {
    schemaVersion: 1,
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  assert.equal(
    normalizeStoredExtensionState({
      schemaVersion: 1,
      lastBranchId: "coex",
    }).lastBranchId,
    "coex",
  );
  assert.throws(
    () => normalizeStoredExtensionState({ schemaVersion: 1, lastBranchId: "unknown" }),
    StorageSchemaError,
  );
  assert.throws(() => normalizeStoredExtensionState("corrupt"), StorageSchemaError);
  assert.throws(
    () => normalizeStoredExtensionState({ schemaVersion: 999 }),
    StorageSchemaError,
  );
  assert.throws(
    () => normalizeStoredExtensionState({ schemaVersion: 1, templateOverrides: [] }),
    StorageSchemaError,
  );
  assert.throws(
    () => normalizeStoredExtensionState({ schemaVersion: 1, customTemplates: {} }),
    StorageSchemaError,
  );
  assert.throws(
    () => normalizeStoredExtensionState({ schemaVersion: 1, ui: [] }),
    StorageSchemaError,
  );
});

test("extension storage recovery only resets high-confidence corruption", async () => {
  let writtenState: unknown = null;
  const recovered = await readExtensionStateWithRecovery({
    get: async () => ({ [STORAGE_KEY]: "corrupt" }),
    set: async (values: Record<string, unknown>) => {
      writtenState = values[STORAGE_KEY];
    },
  });

  assert.equal(STORAGE_CORRUPTION_RECOVERY_MESSAGE, "저장소 데이터 손상으로 설정을 초기화했습니다. 다시 설정해주세요.");
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.state, {
    schemaVersion: 1,
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  assert.deepEqual(writtenState, recovered.state);

  await assert.rejects(
    () =>
      readExtensionStateWithRecovery({
        get: async () => ({ [STORAGE_KEY]: { schemaVersion: 1, lastBranchId: "unknown" } }),
        set: async () => {
          throw new Error("must not recover");
        },
      }),
    StorageSchemaError,
  );
});

test("stored template overrides and custom entries merge into the catalog", () => {
  const catalog = applyStoredTemplateState({
    schemaVersion: 1,
    templateOverrides: {
      "quick-room-upgrade": {
        title: "업그레이드 안내 수정",
        branchScope: ["coex"],
        languages: { KO: "수정된 답변" },
        defaultValue: "수정된 답변",
      },
    },
    customTemplates: [
      {
        id: "custom-test",
        category: "QUICK_REPLY",
        audience: "guest",
        title: "사용자 답변",
        branchScope: ["coex", "gangnam", "seolleung"],
        languages: { KO: "사용자 답변 내용" },
        variables: [],
        attachments: [],
        requiresContext: "none",
        editable: true,
        defaultValue: "사용자 답변 내용",
      },
    ],
    ui: {},
  });

  assert.equal(catalog.find((template) => template.id === "quick-room-upgrade")?.title, "업그레이드 안내 수정");
  assert.deepEqual(catalog.find((template) => template.id === "quick-room-upgrade")?.branchScope, ["coex"]);
  assert.equal(catalog.find((template) => template.id === "custom-test")?.category, "QUICK_REPLY");
});

test("unified template catalog is the source for menu type and duplicate metadata", () => {
  const arrival = getUnifiedTemplate("guest-arrival-notice");
  const laundry = getUnifiedTemplate("laundry-complete-message");

  assert.equal(arrival?.menuId, "CUSTOMER_NOTICE");
  assert.equal(arrival?.typeId, "arrival_notice");
  assert.equal(arrival?.sourceRefs.some((source) => source.includes("templates.ts::arrival")), true);
  assert.equal(laundry?.menuId, "LAUNDRY_MANAGEMENT");
  assert.equal(laundry?.typeId, "laundry_complete");
  assert.equal(laundry?.duplicateGroupId, "laundry-complete-strong-similar");
  assert.deepEqual(UNIFIED_DUPLICATE_GROUPS["room-upgrade-ko-exact"], [
    "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(한글).txt",
    "CSM.zip::CSM/룸업글 안내문(한글).txt",
  ]);
});

test("unified template catalog filters excluded attachments by branch", () => {
  const coexArrival = getUnifiedTemplatesForBranch("coex").find(
    (template) => template.id === "guest-arrival-notice",
  );
  const gangnamArrival = getUnifiedTemplatesForBranch("gangnam").find(
    (template) => template.id === "guest-arrival-notice",
  );

  assert.equal(
    coexArrival?.attachments.includes("coex-door-password-guide-video"),
    false,
  );
  assert.equal(
    gangnamArrival?.attachments.includes("coex-door-password-guide-video"),
    false,
  );
  assert.deepEqual(getUnifiedTemplatesForBranch("unknown"), []);
});

test("unified catalog applies template overrides and custom entries", () => {
  const customTemplate = createCustomTemplateDefinition({
    id: "custom-unified-test",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "사용자 통합 항목",
    branchScope: ["seolleung"],
    languages: { KO: "사용자 통합 항목" },
    requiresContext: "none",
    defaultValue: "사용자 통합 항목",
  });

  const catalog = applyStoredUnifiedTemplateState({
    schemaVersion: 1,
    templateOverrides: {
      "quick-room-upgrade": {
        title: "수정된 업그레이드",
        languages: { KO: "수정" },
      },
    },
    customTemplates: [customTemplate],
    ui: {},
  });

  assert.equal(catalog.find((template) => template.id === "quick-room-upgrade")?.title, "수정된 업그레이드");
  assert.equal(catalog.find((template) => template.id === "custom-unified-test")?.sourceRefs[0], "custom://custom-unified-test");
  assert.equal(UNIFIED_TEMPLATE_CATALOG.length >= WORKFLOW_TEMPLATE_CATALOG.length, true);
});

test("template settings export import and reset stay schema validated", () => {
  const state = normalizeStoredExtensionState({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {
      "quick-room-upgrade": {
        branchScope: ["coex"],
        languages: { KO: "수정된 답변" },
      },
    },
    customTemplates: [
      {
        id: "custom-settings-test",
        category: "QUICK_REPLY",
        audience: "guest",
        title: "설정 테스트",
        branchScope: ["coex"],
        languages: { KO: "본문" },
        variables: [],
        attachments: [],
        requiresContext: "none",
        editable: true,
        defaultValue: "본문",
      },
    ],
    ui: {},
  });

  const exported = exportTemplateSettings(state);
  const imported = importTemplateSettings({ schemaVersion: 1, templateOverrides: {}, customTemplates: [], ui: {} }, exported);

  assert.equal(imported.templateOverrides["quick-room-upgrade"].languages?.KO, "수정된 답변");
  assert.equal(imported.customTemplates[0].id, "custom-settings-test");
  assert.equal(resetOneTemplateOverride(imported, "quick-room-upgrade").templateOverrides["quick-room-upgrade"], undefined);
  assert.deepEqual(resetAllTemplateSettings(imported).customTemplates, []);
  assert.throws(
    () => importTemplateSettings(state, { schemaVersion: 1, templateOverrides: { bad: { branchScope: ["bad"] } } }),
    /unknown branch/,
  );
});

test("clear template settings fails fast on storage read and schema failures", async () => {
  let setCalled = false;
  await assert.rejects(
    () =>
      clearTemplateSettings({
        get: async () => {
          throw new Error("storage read failed");
        },
        set: async () => {
          setCalled = true;
        },
      }),
    /storage read failed/,
  );
  assert.equal(setCalled, false);

  await assert.rejects(
    () =>
      clearTemplateSettings({
        get: async () => ({ [STORAGE_KEY]: { schemaVersion: 1, lastBranchId: "unknown" } }),
        set: async () => {
          setCalled = true;
        },
      }),
    StorageSchemaError,
  );
  assert.equal(setCalled, false);
});

test("settings catalog schema validates branch-scoped saves", () => {
  assert.throws(
    () =>
      normalizeStoredExtensionState({
        schemaVersion: 1,
        templateOverrides: {
          "quick-room-upgrade": {
            branchScope: ["coex", "unknown"],
            languages: { KO: "잘못된 지점" },
          },
        },
      }),
    StorageSchemaError,
  );

  assert.throws(
    () =>
      createCustomTemplateDefinition({
        category: "QUICK_REPLY",
        audience: "guest",
        title: "지점 없는 항목",
        branchScope: [],
        languages: { KO: "본문" },
        requiresContext: "none",
        defaultValue: "본문",
      }),
    /branchScope must include at least one branch/,
  );

  const customTemplate = createCustomTemplateDefinition({
    id: "custom-coex-only",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "코엑스 전용 안내",
    branchScope: ["coex"],
    languages: { KO: "코엑스 안내" },
    requiresContext: "none",
    defaultValue: "코엑스 안내",
  });

  const catalog = applyStoredTemplateState({
    schemaVersion: 1,
    templateOverrides: {},
    customTemplates: [customTemplate],
    ui: {},
  });

  assert.deepEqual(catalog.find((template) => template.id === "custom-coex-only")?.branchScope, [
    "coex",
  ]);
});

test("workflow catalog starts with the fixed top-level menu inventory", () => {
  assert.equal(WORKFLOW_TEMPLATE_CATALOG.some((template) => template.category === "CUSTOMER_RECORDS"), true);
  assert.equal(WORKFLOW_TEMPLATE_CATALOG.some((template) => template.category === "GUEST_NOTICE"), true);
  assert.equal(WORKFLOW_TEMPLATE_CATALOG.some((template) => template.category === "QUICK_REPLY"), true);
  assert.equal(WORKFLOW_TEMPLATE_CATALOG.some((template) => template.category === "WORK_TEMPLATE"), true);
});
