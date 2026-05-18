import test from "node:test";
import assert from "node:assert/strict";

import {
  exportTemplateSettings,
  importTemplateSettings,
  resetAllTemplateSettings,
} from "../src/application/template-settings.js";
import {
  DEFAULT_EXTENSION_STATE,
  StorageSchemaError,
  isRecoverableStorageCorruption,
  normalizeStoredExtensionState,
} from "../src/platform/storage-schema.js";

test("stored extension state accepts only schema-valid branch and template settings", () => {
  assert.deepEqual(normalizeStoredExtensionState(undefined), DEFAULT_EXTENSION_STATE);
  assert.equal(normalizeStoredExtensionState({ lastBranchId: "coex" }).lastBranchId, "coex");
  assert.throws(() => normalizeStoredExtensionState({ lastBranchId: "unknown" }), StorageSchemaError);
  assert.throws(() => normalizeStoredExtensionState("corrupt"), StorageSchemaError);
  assert.equal(isRecoverableStorageCorruption(new StorageSchemaError("Stored extension state must be an object.")), true);
});

test("template settings import/export/reset are schema-mediated, not raw JSON passthrough", () => {
  const state = normalizeStoredExtensionState({
    lastBranchId: "gangnam",
    templateOverrides: {
      "guest-arrival-notice": {
        title: "도착 안내 수정",
        languages: { KO: "안녕하세요 {guestName}" },
      },
    },
    customTemplates: [],
  });

  const exported = exportTemplateSettings(state);
  assert.deepEqual(Object.keys(exported).sort(), ["customTemplates", "schemaVersion", "templateOverrides"]);

  const imported = importTemplateSettings(DEFAULT_EXTENSION_STATE, exported);
  assert.equal(imported.templateOverrides["guest-arrival-notice"]?.title, "도착 안내 수정");
  assert.deepEqual(resetAllTemplateSettings(imported).templateOverrides, {});

  assert.throws(() => importTemplateSettings(DEFAULT_EXTENSION_STATE, { schemaVersion: 999 }), /지원하지 않는 템플릿 설정입니다/);
  assert.throws(
    () =>
      importTemplateSettings(DEFAULT_EXTENSION_STATE, {
        schemaVersion: 1,
        customTemplates: [{ id: "bad template id", title: "bad" }],
      }),
    /languages must include at least one supported language/,
  );
});
