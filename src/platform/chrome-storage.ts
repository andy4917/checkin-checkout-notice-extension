import type { BranchId } from "../types.js";
import type { StoredExtensionState } from "../catalog/template-types.js";
import {
  DEFAULT_EXTENSION_STATE,
  STORAGE_KEY,
  isRecoverableStorageCorruption,
  normalizeStoredExtensionState,
} from "./storage-schema.js";

type ChromeStorageArea = Pick<chrome.storage.StorageArea, "get" | "set">;

export const STORAGE_CORRUPTION_RECOVERY_MESSAGE =
  "저장소 데이터 손상으로 설정을 초기화했습니다. 다시 설정해주세요.";

export type ExtensionStateReadResult = {
  state: StoredExtensionState;
  recovered: boolean;
};

export async function readExtensionState(
  storageArea: ChromeStorageArea = chrome.storage.local,
): Promise<StoredExtensionState> {
  const result = await storageArea.get([STORAGE_KEY]);
  return normalizeStoredExtensionState(result[STORAGE_KEY]);
}

export async function readExtensionStateWithRecovery(
  storageArea: ChromeStorageArea = chrome.storage.local,
): Promise<ExtensionStateReadResult> {
  try {
    return {
      state: await readExtensionState(storageArea),
      recovered: false,
    };
  } catch (error) {
    if (!isRecoverableStorageCorruption(error)) throw error;
    const state = { ...DEFAULT_EXTENSION_STATE };
    await writeExtensionState(state, storageArea);
    return { state, recovered: true };
  }
}

export async function writeExtensionState(
  state: StoredExtensionState,
  storageArea: ChromeStorageArea = chrome.storage.local,
): Promise<void> {
  await storageArea.set({ [STORAGE_KEY]: state });
}

export async function setLastBranchId(
  branchId: BranchId,
  storageArea: ChromeStorageArea = chrome.storage.local,
): Promise<void> {
  const state = await readExtensionState(storageArea);
  await writeExtensionState({ ...state, lastBranchId: branchId }, storageArea);
}
