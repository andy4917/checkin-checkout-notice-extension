import { EXTENSION_CONFIG } from "../config/app-config.js";
import { getDefaultSidePanelBehavior } from "./side-panel-policy.js";

chrome.sidePanel
  .setPanelBehavior(getDefaultSidePanelBehavior())
  .catch((error) =>
    console.error(EXTENSION_CONFIG.sidePanelSetupErrorMessage, error),
  );

if (chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log(EXTENSION_CONFIG.installLogMessage);
  });
}
