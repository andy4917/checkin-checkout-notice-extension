import {
  readExtensionStateWithRecovery,
  setLastBranchId,
  writeExtensionState,
  type ChromeStorageArea,
} from "../platform/chrome-storage.js";
import {
  fetchActiveOtaPayload,
  fillActiveWingsReservationForm,
  readActiveWingsRemark,
  writeActiveWingsRemark,
} from "../platform/active-tab-automation.js";
import type { StoredExtensionState } from "../catalog/template-types.js";
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
      writeState(state: StoredExtensionState) {
        return writeExtensionState(state, chromeLocalStorageArea);
      },
    }),
    clipboard: Object.freeze({
      writeText(text: string) {
        return requireNavigatorClipboard().writeText(text);
      },
    }),
    laundryStorage: chromeLocalStorageArea,
    otaReservation: Object.freeze({
      fetchPayload: fetchActiveOtaPayload,
      fillForm: fillActiveWingsReservationForm,
    }),
    wingsRemark: Object.freeze({
      readRemark: readActiveWingsRemark,
      writeRemark: writeActiveWingsRemark,
    }),
    pmsGuests: Object.freeze({
      fetchImpl: fetchPmsWithHostPermissions,
    }),
    dateSource: Object.freeze({
      today() {
        return new Date();
      },
    }),
  });

function requireChromeLocalStorage(): chrome.storage.LocalStorageArea {
  if (!globalThis.chrome?.storage?.local) {
    throw new Error("Chrome storage dependency is not available.");
  }
  return chrome.storage.local;
}

function requireNavigatorClipboard(): Clipboard {
  if (!globalThis.navigator?.clipboard) {
    throw new Error("Clipboard dependency is not available.");
  }
  return navigator.clipboard;
}

function fetchPmsWithHostPermissions(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return requireGlobalFetch()(input, init);
}

function requireGlobalFetch(): typeof fetch {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("PMS fetch dependency is not available.");
  }
  return globalThis.fetch.bind(globalThis);
}
