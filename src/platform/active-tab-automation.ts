import { EXTENSION_CONFIG } from "../config/app-config.js";
import type { OtaReservationLocator } from "../ota/types.js";
import type { WingsReservationFieldMap } from "../ota/types.js";
import { otaPayloadRequestGuard } from "../ota/request-guard.js";
import { detectOtaReservationLocator } from "../ota/source-detection.js";

export class ActiveTabAutomationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActiveTabAutomationError";
  }
}

export const WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE =
  "WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.";
export const WINGS_REMARK_WINDOW_REQUIRED_MESSAGE =
  "WINGS 예약정보창을 연 뒤 다시 실행해주세요.";
export const WINGS_REMARK_FIELD_REQUIRED_MESSAGE =
  "WINGS 리마크 입력칸을 찾지 못했습니다.";

export async function fetchActiveOtaPayload(): Promise<{
  locator: OtaReservationLocator;
  payload: unknown;
}> {
  const tab = await getActiveTab();
  const locator = detectOtaReservationLocator(tab.url || "");
  return otaPayloadRequestGuard.run(locator.apiUrl, async () => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: requireTabId(tab) },
      world: "MAIN",
      func: fetchJsonInPage,
      args: [locator.apiUrl, locator.source],
    });

    if (!result?.ok) {
      throw new ActiveTabAutomationError(result?.error || "OTA 예약정보를 가져오지 못했습니다.");
    }

    return { locator, payload: result.payload };
  });
}

export async function fillActiveWingsReservationForm(
  fields: WingsReservationFieldMap,
): Promise<{ filled: string[]; missing: string[] }> {
  const tab = await getActiveTab();
  if (!isAllowedPmsUrl(tab.url || "")) {
    throw new ActiveTabAutomationError(WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE);
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: requireTabId(tab) },
    world: "MAIN",
    func: fillFormFieldsInPage,
    args: [fields],
  });

  if (!result?.ok) {
    throw new ActiveTabAutomationError(
      result?.error || WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE,
    );
  }

  return {
    filled: result.filled,
    missing: result.missing,
  };
}

export async function readActiveWingsRemark(): Promise<string> {
  const tab = await getActiveTab();
  if (!isAllowedWingsReservationInfoUrl(tab.url || "")) {
    throw new ActiveTabAutomationError(WINGS_REMARK_WINDOW_REQUIRED_MESSAGE);
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: requireTabId(tab) },
    world: "MAIN",
    func: readRemarkInPage,
  });

  if (!result?.ok) {
    throw new ActiveTabAutomationError(result?.error || WINGS_REMARK_FIELD_REQUIRED_MESSAGE);
  }

  return result.value;
}

export async function writeActiveWingsRemark(nextRemark: string): Promise<void> {
  const tab = await getActiveTab();
  if (!isAllowedWingsReservationInfoUrl(tab.url || "")) {
    throw new ActiveTabAutomationError(WINGS_REMARK_WINDOW_REQUIRED_MESSAGE);
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: requireTabId(tab) },
    world: "MAIN",
    func: writeRemarkInPage,
    args: [nextRemark],
  });

  if (!result?.ok) {
    throw new ActiveTabAutomationError(result?.error || WINGS_REMARK_FIELD_REQUIRED_MESSAGE);
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  if (!chrome.tabs?.query || !chrome.scripting?.executeScript) {
    throw new ActiveTabAutomationError("Chrome 탭 자동입력 권한을 사용할 수 없습니다.");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    throw new ActiveTabAutomationError("활성 탭 URL을 확인하지 못했습니다.");
  }
  return tab;
}

function requireTabId(tab: chrome.tabs.Tab): number {
  if (typeof tab.id !== "number") {
    throw new ActiveTabAutomationError("활성 탭 ID를 확인하지 못했습니다.");
  }
  return tab.id;
}

function isAllowedPmsUrl(tabUrl: string): boolean {
  try {
    const url = new URL(tabUrl);
    return (
      EXTENSION_CONFIG.allowedPmsOrigins.includes(url.origin) &&
      url.pathname.includes("/pms/view/ir01_0310_V03.do")
    );
  } catch (_error) {
    return false;
  }
}

function isAllowedWingsReservationInfoUrl(tabUrl: string): boolean {
  try {
    const url = new URL(tabUrl);
    if (!EXTENSION_CONFIG.allowedPmsOrigins.includes(url.origin)) return false;
    const target = `${url.pathname} ${url.search}`.toLowerCase();
    return (
      target.includes("guest") ||
      target.includes("rsvn") ||
      target.includes("folio") ||
      target.includes("ir04")
    );
  } catch (_error) {
    return false;
  }
}

async function fetchJsonInPage(apiUrl: string, source: "naver" | "station") {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (source === "station") {
      const token = findStationToken();
      if (token) headers.Authorization = token;
    }
    const response = await fetch(apiUrl, {
      method: "GET",
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      return { ok: false, error: `${response.status} ${response.statusText}`.trim() };
    }
    return { ok: true, payload: await response.json() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function findStationToken(): string {
  const stores = [localStorage, sessionStorage];
  for (const store of stores) {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key) continue;
      const value = store.getItem(key) || "";
      if (/^Bearer\s+\S+/.test(value)) return value;
      if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
        return `Bearer ${value}`;
      }
      const nestedToken = findTokenInJson(value);
      if (nestedToken) return nestedToken;
    }
  }
  return "";
}

function findTokenInJson(value: string): string {
  try {
    return findToken(JSON.parse(value));
  } catch (_error) {
    return "";
  }
}

function findToken(value: unknown): string {
  if (typeof value === "string") {
    if (/^Bearer\s+\S+/.test(value)) return value;
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return `Bearer ${value}`;
    }
    return "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findToken(item);
      if (token) return token;
    }
    return "";
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (/token|authorization|access/i.test(key)) {
        const token = findToken(item);
        if (token) return token;
      }
    }
  }
  return "";
}

function fillFormFieldsInPage(fields: WingsReservationFieldMap) {
  if (!hasReservationCreationForm()) {
    return {
      ok: false,
      error: "WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.",
      filled: [],
      missing: Object.keys(fields),
    };
  }

  const filled: string[] = [];
  const missing: string[] = [];

  for (const [name, value] of Object.entries(fields)) {
    const element = findInput(name);
    if (!element) {
      missing.push(name);
      continue;
    }
    setInputValue(element, value);
    filled.push(name);
  }

  return { ok: true, filled, missing };
}

function readRemarkInPage() {
  const element = findRemarkInput();
  if (!element) {
    return { ok: false, error: "WINGS 리마크 입력칸을 찾지 못했습니다.", value: "" };
  }
  return { ok: true, value: element.value || "" };
}

function writeRemarkInPage(nextRemark: string) {
  const element = findRemarkInput();
  if (!element) {
    return { ok: false, error: "WINGS 리마크 입력칸을 찾지 못했습니다." };
  }
  setInputValue(element, nextRemark);
  return { ok: true };
}

function hasReservationCreationForm(): boolean {
  return Boolean(
    findInput("ARRV_DATE") &&
      findInput("DEPT_DATE") &&
      (findInput("RSVN_GEST_NAME") || findInput("INHS_GEST_NAME")),
  );
}

function findInput(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const escaped = cssEscape(name);
  const elements = Array.from(document.querySelectorAll(
    `input[name="${escaped}"], textarea[name="${escaped}"], select[name="${escaped}"], #${escaped}`,
  )) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  return elements.find(isPreferredFillTarget) || elements[0] || null;
}

function findRemarkInput(): HTMLInputElement | HTMLTextAreaElement | null {
  const candidates = Array.from(
    document.querySelectorAll("textarea, input[type='text'], input:not([type])"),
  ) as Array<HTMLInputElement | HTMLTextAreaElement>;
  const preferred = candidates.filter(isPreferredRemarkTarget);
  return (
    preferred.find((element) => isRemarkFieldName(element, true)) ||
    preferred.find((element) => isRemarkFieldName(element, false)) ||
    null
  );
}

function isPreferredRemarkTarget(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (element instanceof HTMLInputElement && element.type === "hidden") return false;
  return !element.disabled && !element.readOnly;
}

function isRemarkFieldName(
  element: HTMLInputElement | HTMLTextAreaElement,
  strict: boolean,
): boolean {
  const source = [
    element.name,
    element.id,
    element.getAttribute("data-field"),
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  if (!source) return false;
  if (strict) {
    return /\b(RSVN_)?(REMARKS?|RMK|MEMO)(_TXT)?\b/.test(source);
  }
  return /REMARK|RMK|MEMO|리마크|메모/.test(source);
}

function isPreferredFillTarget(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): boolean {
  if (element instanceof HTMLInputElement && element.type === "hidden") return false;
  return !element.disabled;
}

function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function cssEscape(value: string): string {
  if ("CSS" in globalThis && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}
