import test from "node:test";
import assert from "node:assert/strict";

import {
  STORAGE_KEY,
  StorageSchemaError,
  normalizeStoredExtensionState,
} from "../src/platform/storage-schema.js";
import {
  STORAGE_CORRUPTION_RECOVERY_MESSAGE,
  readExtensionStateWithRecovery,
} from "../src/platform/chrome-storage.js";

test("extension state accepts a valid saved branch and rejects invalid branch data", () => {
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
});

test("extension state rejects corrupt roots and malformed editable settings", () => {
  assert.throws(() => normalizeStoredExtensionState("corrupt"), StorageSchemaError);
  assert.throws(() => normalizeStoredExtensionState({ schemaVersion: 999 }), StorageSchemaError);
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

test("storage recovery resets only high-confidence root corruption", async () => {
  let writtenState: unknown = null;
  const recovered = await readExtensionStateWithRecovery({
    get: async () => ({ [STORAGE_KEY]: "corrupt" }),
    set: async (values: Record<string, unknown>) => {
      writtenState = values[STORAGE_KEY];
    },
  });

  assert.equal(
    STORAGE_CORRUPTION_RECOVERY_MESSAGE,
    "저장소 데이터 손상으로 설정을 초기화했습니다. 다시 설정해주세요.",
  );
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
          throw new Error("must not write");
        },
      }),
    StorageSchemaError,
  );
});
