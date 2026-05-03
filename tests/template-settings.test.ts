import test from "node:test";
import assert from "node:assert/strict";

import {
  clearTemplateSettings,
  exportTemplateSettings,
  importTemplateSettings,
  resetAllTemplateSettings,
  resetOneTemplateOverride,
} from "../src/application/template-settings.js";
import { createCustomTemplateDefinition } from "../src/catalog/template-schema.js";
import { applyStoredTemplateState } from "../src/catalog/workflow-catalog.js";
import { STORAGE_KEY, StorageSchemaError, normalizeStoredExtensionState } from "../src/platform/storage-schema.js";

test("template settings export, import, and reset preserve only editable catalog state", () => {
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
        id: "custom-settings-entry",
        category: "QUICK_REPLY",
        audience: "guest",
        title: "사용자 답변",
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
  const imported = importTemplateSettings(
    { schemaVersion: 1, templateOverrides: {}, customTemplates: [], ui: {} },
    exported,
  );

  assert.equal(imported.templateOverrides["quick-room-upgrade"].languages?.KO, "수정된 답변");
  assert.equal(imported.customTemplates[0].id, "custom-settings-entry");
  assert.equal(
    resetOneTemplateOverride(imported, "quick-room-upgrade").templateOverrides["quick-room-upgrade"],
    undefined,
  );
  assert.deepEqual(resetAllTemplateSettings(imported).customTemplates, []);
});

test("template settings reject branch-scope drift before writing storage", async () => {
  assert.throws(
    () =>
      importTemplateSettings(
        { schemaVersion: 1, templateOverrides: {}, customTemplates: [], ui: {} },
        { schemaVersion: 1, templateOverrides: { bad: { branchScope: ["bad"] } } },
      ),
    /unknown branch/,
  );

  let setCalled = false;
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

test("custom template definitions must be branch scoped before entering the catalog", () => {
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
