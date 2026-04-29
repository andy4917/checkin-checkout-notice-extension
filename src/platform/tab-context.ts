import { EXTENSION_CONFIG } from "../config/app-config.js";
import type { WorkContext } from "../application/context-guard.js";

export type TabContext = WorkContext & {
  url: string;
};

export const EMPTY_TAB_CONTEXT: TabContext = Object.freeze({
  url: "",
  isPmsPage: false,
  isGuestRecord: false,
});

export function getTabContextFromUrl(tabUrl: string | null | undefined): TabContext {
  if (!tabUrl) return { ...EMPTY_TAB_CONTEXT };

  try {
    const url = new URL(tabUrl);
    const isPmsPage = EXTENSION_CONFIG.allowedPmsOrigins.includes(url.origin);
    return {
      url: tabUrl,
      isPmsPage,
      isGuestRecord: isPmsPage && isGuestRecordPath(url),
    };
  } catch (_error) {
    return { ...EMPTY_TAB_CONTEXT };
  }
}

export async function getActiveTabContext(): Promise<TabContext> {
  if (!globalThis.chrome?.tabs?.query) return { ...EMPTY_TAB_CONTEXT };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return getTabContextFromUrl(tab?.url);
}

function isGuestRecordPath(url: URL): boolean {
  const target = `${url.pathname} ${url.search}`.toLowerCase();
  return (
    target.includes("guest") ||
    target.includes("rsvn") ||
    target.includes("folio") ||
    target.includes("ir04")
  );
}
