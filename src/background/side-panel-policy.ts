import { EXTENSION_CONFIG } from "../config/app-config.js";

export function getDefaultSidePanelBehavior(): chrome.sidePanel.PanelBehavior {
  return { openPanelOnActionClick: true };
}

export function getRuntimeSidePanelPath(
  manifest: chrome.runtime.Manifest = chrome.runtime.getManifest(),
): string {
  const manifestPath = manifest.manifest_version === 3 ? manifest.side_panel?.default_path : undefined;
  return manifestPath || EXTENSION_CONFIG.sidePanelPath;
}

export function getDefaultSidePanelOptions(
  manifest: chrome.runtime.Manifest = chrome.runtime.getManifest(),
): chrome.sidePanel.PanelOptions {
  return {
    path: getRuntimeSidePanelPath(manifest),
    enabled: true,
  };
}
