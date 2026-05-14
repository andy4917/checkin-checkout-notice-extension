import {
  fetchActiveOtaPayload,
  fillActiveWingsReservationForm,
  readActiveWingsRemark,
  writeActiveWingsRemark,
} from "../platform/active-tab-automation.js";
import {
  readExtensionStateWithRecovery,
  setLastBranchId,
  writeExtensionState,
  type ChromeStorageArea,
} from "../platform/chrome-storage.js";
import { getActiveTabContext } from "../platform/tab-context.js";
import type { StoredExtensionState } from "../catalog/template-types.js";
import type { BranchId, PmsFetch } from "../types.js";
import type { SidePanelControllerDependencies } from "./side-panel-controller.svelte.js";

const chromeLocalStorageArea: ChromeStorageArea = Object.freeze({
  get(keys) {
    return requireChromeLocalStorage().get(keys);
  },
  set(values) {
    return requireChromeLocalStorage().set(values);
  },
});

const browserPmsFetch: PmsFetch = (input, init) => fetch(input, init);
const runtimeStorageArea = chromeLocalStorageArea;

export const browserSidePanelDependencies: SidePanelControllerDependencies = Object.freeze({
  clipboard: Object.freeze({
    writeText(text: string) {
      return navigator.clipboard.writeText(text);
    },
  }),
  extensionState: Object.freeze({
    readWithRecovery() {
      return readExtensionStateWithRecovery(runtimeStorageArea);
    },
    setLastBranchId(branchId: BranchId) {
      return setLastBranchId(branchId, runtimeStorageArea);
    },
    write(state: StoredExtensionState) {
      return writeExtensionState(state, runtimeStorageArea);
    },
  }),
  laundry: Object.freeze({
    storageArea: runtimeStorageArea,
  }),
  ota: Object.freeze({
    fetchPayload: fetchActiveOtaPayload,
    fillForm: fillActiveWingsReservationForm,
  }),
  pms: Object.freeze({
    fetchImpl: browserPmsFetch,
  }),
  wingsRemark: Object.freeze({
    readRemark: readActiveWingsRemark,
    writeRemark: writeActiveWingsRemark,
  }),
  tabContext: Object.freeze({
    getActiveTabContext,
  }),
  viewport: Object.freeze({
    scrollToTop() {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    },
  }),
});

function requireChromeLocalStorage(): chrome.storage.LocalStorageArea {
  if (!globalThis.chrome?.storage?.local) {
    throw new Error("Chrome storage dependency is not available.");
  }
  return chrome.storage.local;
}
