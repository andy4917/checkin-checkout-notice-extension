import {
  readExtensionStateWithRecovery,
  setLastBranchId,
  type ChromeStorageArea,
} from "../platform/chrome-storage.js";
import type { BranchId } from "../types.js";
import type { SidePanelNavigationControllerDependencies } from "./side-panel-navigation-controller.svelte.js";

const chromeLocalStorageArea: ChromeStorageArea = Object.freeze({
  get(keys) {
    return requireChromeLocalStorage().get(keys);
  },
  set(values) {
    return requireChromeLocalStorage().set(values);
  },
});

export const browserSidePanelNavigationDependencies: SidePanelNavigationControllerDependencies =
  Object.freeze({
    extensionState: Object.freeze({
      readWithRecovery() {
        return readExtensionStateWithRecovery(chromeLocalStorageArea);
      },
      setLastBranchId(branchId: BranchId) {
        return setLastBranchId(branchId, chromeLocalStorageArea);
      },
    }),
  });

function requireChromeLocalStorage(): chrome.storage.LocalStorageArea {
  if (!globalThis.chrome?.storage?.local) {
    throw new Error("Chrome storage dependency is not available.");
  }
  return chrome.storage.local;
}
