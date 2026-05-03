import {
  fetchActiveOtaPayload,
  fillActiveWingsReservationForm,
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
    return chrome.storage.local.get(keys);
  },
  set(values) {
    return chrome.storage.local.set(values);
  },
});

const browserPmsFetch: PmsFetch = (input, init) => fetch(input, init);

export const browserSidePanelDependencies: SidePanelControllerDependencies = Object.freeze({
  clipboard: Object.freeze({
    writeText(text: string) {
      return navigator.clipboard.writeText(text);
    },
  }),
  extensionState: Object.freeze({
    readWithRecovery() {
      return readExtensionStateWithRecovery(chromeLocalStorageArea);
    },
    setLastBranchId(branchId: BranchId) {
      return setLastBranchId(branchId, chromeLocalStorageArea);
    },
    write(state: StoredExtensionState) {
      return writeExtensionState(state, chromeLocalStorageArea);
    },
  }),
  laundry: Object.freeze({
    storageArea: chromeLocalStorageArea,
  }),
  ota: Object.freeze({
    fetchPayload: fetchActiveOtaPayload,
    fillForm: fillActiveWingsReservationForm,
  }),
  pms: Object.freeze({
    fetchImpl: browserPmsFetch,
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
