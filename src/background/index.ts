import { EXTENSION_CONFIG } from "../config/app-config.js";
import {
  getDefaultSidePanelOptions,
  getDefaultSidePanelBehavior,
} from "./side-panel-policy.js";

function reportSidePanelSetupError(error: unknown): void {
  console.error(EXTENSION_CONFIG.sidePanelSetupErrorMessage, error);
}

function runSidePanelSetup(setup: Promise<void>): void {
  setup.catch(reportSidePanelSetupError);
}

async function ensureSidePanelOptions(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior(getDefaultSidePanelBehavior());
  await chrome.sidePanel.setOptions(getDefaultSidePanelOptions());
}

runSidePanelSetup(ensureSidePanelOptions());

if (chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log(EXTENSION_CONFIG.installLogMessage);
    runSidePanelSetup(ensureSidePanelOptions());
  });
}
