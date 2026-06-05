import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createServer } from "node:net";

import manifest from "../dist/manifest.json" with { type: "json" };
import { EXTENSION_CONFIG, PMS_CONFIG } from "../src/config/app-config.js";
import { getExtensionIdFromManifestKey } from "./extension-id.js";
import {
  REQUIRED_PMS_RELEASE_STEPS,
  createExtensionPageTargetExecutionSurface,
  isReleaseGatePassed,
  isConnectedPmsResponseEvidence,
  releaseGateFailureMessages,
  shouldWriteReleaseGateFailureEvidence,
  type PmsReleaseNetworkEvidence,
  type PmsReleaseNetworkResponseEvidence,
  type SmokeExecutionSurface,
} from "./extension-smoke-release-gate.js";

type DevtoolsTarget = {
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

type CdpResponse = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: {
    result?: {
      type?: string;
      value?: unknown;
      exceptionDetails?: unknown;
    };
    data?: string;
    exceptionDetails?: unknown;
  };
  exceptionDetails?: unknown;
};

type ActualChromeExtensionInstall = {
  id: string;
  path: string;
  location: unknown;
  securePreferencesPath: string;
};

type PendingCdpRequest = {
  resolve: (value: CdpResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  method: string;
};

type SmokeResult = {
  href: string;
  error?: string;
  failureKind?: string;
  progress?: string;
  initialHasHome: boolean;
  bannedInitial: boolean;
  steps: Array<Record<string, unknown>>;
  menuState?: unknown;
  pmsStatus?: string;
  pmsBackendConnected?: boolean;
  pmsNetworkEvidence?: PmsNetworkEvidence;
  pmsSurfaceFetchEvidence?: PmsSurfaceFetchEvidence[];
  pmsSurfaces?: unknown[];
  coveredSurfaceIds?: string[];
  missingSurfaceIds?: string[];
  noHorizontalPageOverflow: boolean;
  overflowItems: unknown[];
  visiblePlaceholderAttributes?: unknown[];
  placeholderAttributesAbsent?: boolean;
  bannedFinal: boolean;
  runtimeErrors?: string[];
  pageErrors?: string[];
  consoleErrors?: string[];
  ok: boolean;
};

type PmsNetworkResponseEvidence = PmsReleaseNetworkResponseEvidence;

type PmsNetworkEvidence = PmsReleaseNetworkEvidence;

type PmsSurfaceFetchEvidence = {
  requestId?: string;
  requestOrdinal?: number;
  surfaceStep: string;
  url: string;
  requestMethod: string;
  requestPostDataPresent: boolean;
  requestPostDataLength: number;
  status: number | null;
  contentType: string;
  jsonRowsObserved: boolean;
  jsonRowCount: number;
  hasSamlForm: boolean;
  parseError?: string;
};

type PmsNetworkRequestEvidence = {
  requestId: string;
  requestOrdinal: number;
  url: string;
  method: string;
  postDataPresent: boolean;
  postDataLength: number;
};

type ShortExtensionPageViewportProbe = {
  viewport: {
    innerHeight: number;
    visualViewportHeight: number | null;
    clientHeight: number;
    clientWidth: number;
    appRootHeight: number;
    appRootWidth: number;
    appShellHeight: number;
    appShellWidth: number;
    expectedRuntimePanelHeight: number;
    computedRuntimePanelHeight: string;
    runtimePanelHeight: string;
    runtimePanelHeightMatchesViewport: boolean;
    runtimePanelHeightMatchesPanelRoot: boolean;
    appRootHeightMatchesViewport: boolean;
    appShellHeightMatchesViewport: boolean;
    appShellWidthMatchesPanelRoot: boolean;
  };
  shell: {
    appShellRect: { top: number; bottom: number; width: number; height: number };
    screenStageRect: { top: number; bottom: number; width: number; height: number };
    rootPanelRect: { top: number; bottom: number; width: number; height: number };
    menuBlockRect: { top: number; bottom: number; width: number; height: number };
    footerRect: { top: number; bottom: number; width: number; height: number };
  };
  root: {
    items: string[];
    exactRootRowCount: boolean;
    labelsMatchContract: boolean;
    allRowsFullyVisible: boolean;
    visibility: Array<{ label: string; fullyVisible: boolean }>;
  };
  groups: Array<{
    label: string;
    items: string[];
    exactRowCount: boolean;
    labelsMatchContract: boolean;
    allRowsFullyVisible: boolean;
    visibility: Array<{ label: string; fullyVisible: boolean }>;
  }>;
  ok: boolean;
};

type ReferenceWidthDriftProbe = {
  viewport: {
    innerWidth: number;
    clientWidth: number;
    sidepanelReferenceWidth: number;
    expectedPanelWidth: number;
    bodyWidth: number;
    appRootWidth: number;
    appShellWidth: number;
    wideFrameObserved: boolean;
    bodyWidthStaysReferenceInWideFrame: boolean;
    appRootWidthStaysReferenceInWideFrame: boolean;
    appShellWidthStaysReferenceInWideFrame: boolean;
    productSurfaceUsesExpectedWidth: boolean;
    productSurfaceDoesNotFillWideFrame: boolean;
  };
  ok: boolean;
};

type ExtensionSmokeManifest = {
  key: string;
  manifest_version?: number;
  minimum_chrome_version?: string;
  background?: {
    service_worker?: string;
  };
  side_panel?: {
    default_path?: string;
  };
};

const rootDir = resolve(import.meta.dirname, "..");
const distDir = resolve(rootDir, "dist");
const smokeRunId = new Date().toISOString().replace(/[:.]/g, "-");
const reportsDir = resolve(
  process.env.EXTENSION_SMOKE_REPORT_DIR ||
    join(tmpdir(), `checkin-checkout-extension-smoke-${smokeRunId}-${process.pid}`),
);
const distManifest = manifest as ExtensionSmokeManifest;
const expectedExtensionId = getExtensionIdFromManifestKey(distManifest.key);
const ACTUAL_CHROME_EXTENSION_ID = "jeidoobjhbnnicfkcdfncheimgdnhmjk";
const ACTUAL_CHROME_EXTENSION_URL = `chrome-extension://${ACTUAL_CHROME_EXTENSION_ID}/sidepanel.html`;
const PMS_SEARCH_ENDPOINT = `${EXTENSION_CONFIG.allowedPmsOrigins[0]}${PMS_CONFIG.endpointPath}`;
const GOOGLE_CHROME_LOAD_EXTENSION_UNSUPPORTED_MESSAGE = [
  "Google Chrome stable cannot be used for this unpacked automation smoke path.",
  "`--load-extension` is not allowed in Google Chrome and is ignored before the side panel app loads.",
  "Use bundled Chromium or Chrome for Testing for unpacked automation, or run a separate verifier that attaches to the already-installed real Chrome profile.",
].join(" ");
const SMOKE_EVALUATION_TIMEOUT_MS = 300_000;
const SMOKE_WATCHDOG_TIMEOUT_MS = 270_000;
const SMOKE_SURFACE_IDS = Object.freeze([
  "home",
  "customer-checkin-notice",
  "customer-checkout-notice",
  "customer-room-notice",
  "customer-fee-notice",
  "quick-rental-reply",
  "quick-lost-item-reply",
  "quick-room-visit-reply",
  "laundry-management",
  "sales-management",
  "airport-van-management",
  "room-remark",
  "ota-reservation-input",
  "work-report-form",
  "notice-reply-editor",
  "work-form-editor",
]);

async function runSmoke() {
  const attachedChromeCdpBaseUrl = getAttachedChromeCdpBaseUrl();
  const browserPath = attachedChromeCdpBaseUrl ? `attached:${attachedChromeCdpBaseUrl}` : findBrowserPath();
  const extensionUrl = ACTUAL_CHROME_EXTENSION_URL;
  const executionSurface = createExtensionPageTargetExecutionSurface(
    Boolean(attachedChromeCdpBaseUrl),
    extensionUrl,
  );
  if (!attachedChromeCdpBaseUrl) {
    assertBrowserSupportsUnpackedExtensionLoad(browserPath);
  }
  const debuggingPort = attachedChromeCdpBaseUrl ? null : await getFreePort();
  const profileDir = attachedChromeCdpBaseUrl ? null : await mkdtemp(join(tmpdir(), "sidepanel-extension-smoke-"));
  const automationExtensionParentDir = attachedChromeCdpBaseUrl
    ? null
    : await mkdtemp(join(tmpdir(), "sidepanel-extension-dist-"));
  const automationExtensionDir = automationExtensionParentDir
    ? join(automationExtensionParentDir, "dist")
    : "already-installed-real-chrome-profile";
  let browserProcess: ChildProcess | null = null;

  try {
  validateDistManifest();
  if (!attachedChromeCdpBaseUrl && automationExtensionParentDir && profileDir && debuggingPort !== null) {
    await copyAutomationExtensionDist(automationExtensionDir);
  }
  let targets: DevtoolsTarget[];
  if (attachedChromeCdpBaseUrl) {
    targets = await waitForDebuggableTargetsFromBaseUrl(attachedChromeCdpBaseUrl);
  } else {
    if (debuggingPort === null || profileDir === null) {
      throw new Error("Internal smoke setup error: launch mode is missing a debugging port or profile directory.");
    }
    browserProcess = launchBrowser(browserPath, debuggingPort, profileDir, automationExtensionDir);
    targets = await waitForDebuggableTargets(debuggingPort);
  }

  const smokeTarget = selectSmokeTarget(targets, Boolean(attachedChromeCdpBaseUrl), extensionUrl);
  const actualChromeInstall = readActualChromeExtensionInstall();
  const session = await CdpSession.connect(smokeTarget.webSocketDebuggerUrl!);
  let wroteEvaluationReport = false;
  try {
    await session.send("Page.enable");
    await session.send("Runtime.enable");
    await session.send("Network.enable", { maxPostDataSize: 65_536 });
    await session.send("Log.enable");
    const shortExtensionPageViewportProbe = await runShortExtensionPageViewportProbe(session, extensionUrl);
    const referenceWidthDriftProbe = await runReferenceWidthDriftProbe(session, extensionUrl);
    await session.send("Emulation.clearDeviceMetricsOverride", {}, 10_000);
    await session.send("Page.navigate", { url: extensionUrl });
    await delay(1_000);

    await session.send("Runtime.evaluate", {
      expression: backgroundSmokeExpression(),
      returnByValue: true,
    }, 10_000);
    const rawResult = await pollSmokeResult(session);
    const exceptionDetails = rawResult.startsWith("__EXCEPTION__:")
      ? rawResult.slice("__EXCEPTION__:".length)
      : null;
    if (exceptionDetails) {
      throw new Error(`Extension smoke evaluation failed: ${exceptionDetails}`);
    }

    const smoke = JSON.parse(rawResult) as SmokeResult;
    smoke.pageErrors = collectPageErrors(session.events);
    smoke.consoleErrors = collectConsoleErrors(session.events);
    const pmsNetworkEvidence = await collectPmsNetworkEvidence(session, smoke.pmsSurfaceFetchEvidence || []);
    applyPmsNetworkEvidence(smoke, pmsNetworkEvidence);
    const releaseGatePassed = isReleaseGatePassed(smoke, executionSurface);
    if (!releaseGatePassed) {
      const domSnapshot = await session
        .send("Runtime.evaluate", {
          expression: "document.documentElement ? document.documentElement.outerHTML : ''",
          returnByValue: true,
        }, 10_000)
        .catch(() => ({ result: {} }) as CdpResponse);
      const domSnapshotValue = domSnapshot.result?.result?.value;
      (smoke as { html?: string }).html =
        typeof domSnapshotValue === "string" ? domSnapshotValue.slice(0, 50_000) : "";
    }
    const screenshot = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const report = {
      browser: browserPath,
      extensionId: expectedExtensionId,
      actualExtensionUrl: ACTUAL_CHROME_EXTENSION_URL,
      actualChromeExtension: actualChromeInstall,
      executionSurface,
      actualUserChromeSidePanelProof: executionSurface.actualUserChromeSidePanelProof,
      distPath: distDir,
      automationExtensionPath: automationExtensionDir,
      distManifestPath: join(distDir, "manifest.json"),
      targetUrl: extensionUrl,
      smokeSurfaceIds: SMOKE_SURFACE_IDS,
      browserTargetsBeforeNavigate: summarizeTargets(targets),
      shortExtensionPageViewportProbe,
      referenceWidthDriftProbe,
      checkedSteps: smoke.steps.map((step) => step.step),
      coveredSurfaceIds: smoke.coveredSurfaceIds || [],
      missingSurfaceIds: smoke.missingSurfaceIds || [],
      menuState: smoke.menuState,
      pmsStatus: smoke.pmsStatus,
      pmsBackendConnected: Boolean(smoke.pmsBackendConnected),
      pmsNetworkEvidence: smoke.pmsNetworkEvidence,
      pmsSurfaceFetchEvidence: smoke.pmsSurfaceFetchEvidence || [],
      pmsSurfaces: smoke.pmsSurfaces || [],
      overflowItems: smoke.overflowItems.length,
      visiblePlaceholderAttributes: smoke.visiblePlaceholderAttributes || [],
      placeholderAttributesAbsent: Boolean(smoke.placeholderAttributesAbsent),
      runtimeErrors: smoke.runtimeErrors || [],
      pageErrors: smoke.pageErrors || [],
      consoleErrors: smoke.consoleErrors || [],
      passed: releaseGatePassed,
      smoke,
    };
    await writeSmokeReport(report, smoke, screenshot, shouldWriteReleaseGateFailureEvidence(smoke, executionSurface));
    wroteEvaluationReport = true;
    assertSmokeResult(smoke, extensionUrl, executionSurface);

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (wroteEvaluationReport) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const smoke: SmokeResult = {
      href: extensionUrl,
      error: message,
      initialHasHome: false,
      bannedInitial: false,
      steps: [],
      menuState: null,
      pmsStatus: "",
      pmsBackendConnected: false,
      pmsNetworkEvidence: undefined,
      pmsSurfaceFetchEvidence: [],
      pmsSurfaces: [],
      coveredSurfaceIds: [],
      missingSurfaceIds: [...SMOKE_SURFACE_IDS],
      noHorizontalPageOverflow: false,
      overflowItems: [],
      visiblePlaceholderAttributes: [],
      placeholderAttributesAbsent: false,
      bannedFinal: false,
      runtimeErrors: [],
      pageErrors: collectPageErrors(session.events),
      consoleErrors: collectConsoleErrors(session.events),
      ok: false,
    };
    const screenshot = await session
      .send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 10_000)
      .catch(() => ({ result: {} }) as CdpResponse);
    const domSnapshot = await session
      .send("Runtime.evaluate", {
        expression: "document.documentElement ? document.documentElement.outerHTML : ''",
        returnByValue: true,
      }, 10_000)
      .catch(() => ({ result: {} }) as CdpResponse);
    const domSnapshotValue = domSnapshot.result?.result?.value;
    (smoke as { html?: string }).html = typeof domSnapshotValue === "string" ? domSnapshotValue.slice(0, 50_000) : "";
    await writeSmokeReport(
      {
        browser: browserPath,
        extensionId: expectedExtensionId,
        actualExtensionUrl: ACTUAL_CHROME_EXTENSION_URL,
        actualChromeExtension: actualChromeInstall,
        executionSurface,
        actualUserChromeSidePanelProof: executionSurface.actualUserChromeSidePanelProof,
        distPath: distDir,
        automationExtensionPath: automationExtensionDir,
        distManifestPath: join(distDir, "manifest.json"),
        targetUrl: extensionUrl,
        smokeSurfaceIds: SMOKE_SURFACE_IDS,
        browserTargetsBeforeNavigate: summarizeTargets(targets),
        checkedSteps: [],
        coveredSurfaceIds: [],
        missingSurfaceIds: [...SMOKE_SURFACE_IDS],
        cdpFailure: message,
        runtimeErrors: [],
        pageErrors: smoke.pageErrors || [],
        consoleErrors: smoke.consoleErrors || [],
        visiblePlaceholderAttributes: [],
        placeholderAttributesAbsent: false,
        passed: false,
        smoke,
      },
      smoke,
      screenshot,
      true,
    );
    throw error;
  } finally {
    session.close();
  }
  } finally {
    if (browserProcess && !browserProcess.killed) {
      browserProcess.kill();
      await waitForProcessExit(browserProcess);
    }
    if (profileDir) {
      await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
    if (automationExtensionParentDir) {
      await rm(automationExtensionParentDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
  }
}

async function pollSmokeResult(session: CdpSession): Promise<string> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < SMOKE_EVALUATION_TIMEOUT_MS) {
    const response = await session.send("Runtime.evaluate", {
      expression: "String(window.__EXTENSION_SMOKE_RESULT__ || '')",
      returnByValue: true,
    }, 10_000);
    const value = response.result?.result?.value;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    await delay(1_000);
  }
  throw new Error("Extension smoke result polling timed out.");
}

async function collectPmsNetworkEvidence(
  session: CdpSession,
  surfaceFetchEvidence: readonly PmsSurfaceFetchEvidence[],
): Promise<PmsNetworkEvidence> {
  const requestEvidenceById = collectPmsRequestEvidence(session.events);
  const surfaceFetchQueue = surfaceFetchEvidence
    .filter((evidence) => evidence.url === PMS_SEARCH_ENDPOINT)
    .map((evidence) => ({ ...evidence }));
  const responseEvents = session.events
    .filter((event) => event.method === "Network.responseReceived")
    .map((event) => event.params || {})
    .filter((params): params is Record<string, unknown> => isRecordValue(params))
    .filter((params) => {
      const response = params.response;
      return isRecordValue(response) && response.url === PMS_SEARCH_ENDPOINT;
    });
  const responses: PmsNetworkResponseEvidence[] = [];

  for (const params of responseEvents) {
    const response = params.response as Record<string, unknown>;
    const requestId = typeof params.requestId === "string" ? params.requestId : "";
    const requestEvidence = requestId ? requestEvidenceById.get(requestId) : undefined;
    const status = typeof response.status === "number" ? response.status : null;
    const mimeType = typeof response.mimeType === "string" ? response.mimeType : "";
    const headers = isRecordValue(response.headers) ? response.headers : {};
    const contentType = findHeader(headers, "content-type");
    const url = String(response.url || "");
    const surfaceEvidence = takeSurfaceFetchEvidence(
      surfaceFetchQueue,
      requestId,
      requestEvidence?.requestOrdinal || 0,
      url,
      requestEvidence?.method || "",
      requestEvidence?.postDataLength || 0,
      status,
    );
    const evidence: PmsNetworkResponseEvidence = {
      requestId,
      endpoint: PMS_SEARCH_ENDPOINT,
      url,
      requestUrl: requestEvidence?.url || "",
      requestMethod: requestEvidence?.method || "",
      requestPostDataPresent: requestEvidence?.postDataPresent === true,
      requestPostDataLength: requestEvidence?.postDataLength || 0,
      endpointMatches: url === PMS_SEARCH_ENDPOINT && requestEvidence?.url === PMS_SEARCH_ENDPOINT,
      surfaceStep: surfaceEvidence?.surfaceStep || "",
      status,
      mimeType,
      contentType,
      jsonRowsObserved: false,
      jsonRowCount: 0,
      hasSamlForm: false,
      connected: false,
    };

    if (!requestId) {
      evidence.bodyUnavailable = true;
      evidence.connected = isConnectedPmsResponseEvidence(evidence, PMS_SEARCH_ENDPOINT);
      responses.push(evidence);
      continue;
    }

    try {
      const bodyResponse = await session.send("Network.getResponseBody", { requestId }, 10_000);
      const body = decodeNetworkBody(bodyResponse);
      evidence.hasSamlForm = /identity\/samlsso|samlsso/i.test(body);
      if (looksLikeJsonResponse(contentType, mimeType, body)) {
        const parsed = JSON.parse(body) as unknown;
        if (isRecordValue(parsed) && Array.isArray(parsed.rows)) {
          evidence.jsonRowsObserved = true;
          evidence.jsonRowCount = parsed.rows.length;
        }
      }
    } catch (error) {
      evidence.bodyUnavailable = true;
      evidence.parseError = error instanceof Error ? error.message : String(error);
    }

    evidence.connected = isConnectedPmsResponseEvidence(evidence, PMS_SEARCH_ENDPOINT);
    responses.push(evidence);
  }

  const jsonRowsResponseCount = responses.filter((response) => response.jsonRowsObserved).length;
  const jsonRowCount = responses.reduce((count, response) => count + response.jsonRowCount, 0);
  const hasSamlForm = responses.some((response) => response.hasSamlForm);
  const connected = REQUIRED_PMS_RELEASE_STEPS.every((stepId) =>
    responses.some(
      (response) => response.surfaceStep === stepId && isConnectedPmsResponseEvidence(response, PMS_SEARCH_ENDPOINT),
    ),
  );
  const failureReason = buildPmsNetworkFailureReason(responses, connected, hasSamlForm, jsonRowsResponseCount);

  return {
    endpoint: PMS_SEARCH_ENDPOINT,
    responseCount: responses.length,
    jsonRowsResponseCount,
    jsonRowCount,
    hasSamlForm,
    connected,
    failureReason,
    responses,
  };
}

function collectPmsRequestEvidence(events: readonly CdpResponse[]): Map<string, PmsNetworkRequestEvidence> {
  const requests = new Map<string, PmsNetworkRequestEvidence>();
  let requestOrdinal = 0;
  for (const event of events) {
    if (event.method !== "Network.requestWillBeSent") continue;
    const params = event.params || {};
    if (!isRecordValue(params)) continue;
    const requestId = typeof params.requestId === "string" ? params.requestId : "";
    const request = isRecordValue(params.request) ? params.request : {};
    const url = typeof request.url === "string" ? request.url : "";
    if (!requestId || url !== PMS_SEARCH_ENDPOINT) continue;
    const postData = typeof request.postData === "string" ? request.postData : "";
    requestOrdinal += 1;
    requests.set(requestId, {
      requestId,
      requestOrdinal,
      url,
      method: typeof request.method === "string" ? request.method.toUpperCase() : "",
      postDataPresent: request.hasPostData === true || postData.length > 0,
      postDataLength: postData.length,
    });
  }
  return requests;
}

function takeSurfaceFetchEvidence(
  queue: PmsSurfaceFetchEvidence[],
  requestId: string,
  requestOrdinal: number,
  url: string,
  method: string,
  postDataLength: number,
  status: number | null,
): PmsSurfaceFetchEvidence | null {
  const normalizedMethod = method.toUpperCase();
  const index = queue.findIndex((evidence) => {
    const statusMatches = status === null || evidence.status === null || evidence.status === status;
    const requestIdMatches = Boolean(requestId && evidence.requestId === requestId);
    const ordinalMatches = Boolean(
      requestOrdinal > 0 &&
        evidence.requestOrdinal === requestOrdinal &&
        evidence.requestPostDataLength === postDataLength,
    );
    return (
      (requestIdMatches || ordinalMatches) &&
      evidence.url === url &&
      evidence.requestMethod.toUpperCase() === normalizedMethod &&
      statusMatches
    );
  });
  if (index === -1) return null;
  const [evidence] = queue.splice(index, 1);
  return evidence || null;
}

function buildPmsNetworkFailureReason(
  responses: readonly PmsNetworkResponseEvidence[],
  connected: boolean,
  hasSamlForm: boolean,
  jsonRowsResponseCount: number,
): string {
  if (connected) return "";
  if (responses.length === 0) return "No PMS endpoint response was observed during the smoke run.";
  if (hasSamlForm) return "PMS returned SAML HTML instead of JSON rows.";
  const missingSurfaceSteps = REQUIRED_PMS_RELEASE_STEPS.filter(
    (stepId) =>
      !responses.some(
        (response) => response.surfaceStep === stepId && isConnectedPmsResponseEvidence(response, PMS_SEARCH_ENDPOINT),
      ),
  );
  if (missingSurfaceSteps.length > 0) {
    return `PMS JSON rows were not connected to surface steps: ${missingSurfaceSteps.join(", ")}.`;
  }
  if (responses.some((response) => response.requestMethod !== "POST" || response.requestPostDataLength <= 0)) {
    return "PMS endpoint request evidence did not include POST postData.";
  }
  if (jsonRowsResponseCount > 0) return "PMS returned a JSON rows array with no live rows.";
  return "No PMS JSON rows were observed from the endpoint.";
}

function applyPmsNetworkEvidence(smoke: SmokeResult, evidence: PmsNetworkEvidence): void {
  const responseByStep = mapPmsResponseEvidenceByStep(evidence);
  smoke.pmsNetworkEvidence = evidence;
  smoke.pmsSurfaces = (smoke.pmsSurfaces || []).map((surface) =>
    attachPmsSurfaceNetworkEvidence(surface, responseByStep.get(getPmsSurfaceStepId(surface))),
  );
  smoke.steps = smoke.steps.map((step) =>
    attachPmsStepNetworkEvidence(step, responseByStep.get(typeof step.step === "string" ? step.step : "")),
  );
  smoke.pmsBackendConnected = REQUIRED_PMS_RELEASE_STEPS.every((stepId) => pmsStepConnected(smoke.steps, stepId));
  smoke.pmsNetworkEvidence = {
    ...evidence,
    connected: smoke.pmsBackendConnected,
    failureReason: smoke.pmsBackendConnected
      ? ""
      : buildPmsNetworkFailureReason(evidence.responses, false, evidence.hasSamlForm, evidence.jsonRowsResponseCount),
  };
  smoke.ok = recomputeSmokeOk(smoke);

  if (isRecordValue(smoke.menuState) && isRecordValue(smoke.menuState.pms)) {
    smoke.menuState = {
      ...smoke.menuState,
      pms: attachPmsSurfaceNetworkEvidence(smoke.menuState.pms, responseByStep.get(getPmsSurfaceStepId(smoke.menuState.pms))),
    };
  }
}

function attachPmsSurfaceNetworkEvidence(surface: unknown, responseEvidence: PmsNetworkResponseEvidence | undefined): unknown {
  if (!isRecordValue(surface)) return surface;
  const backendFailure = surface.backendFailure === true;
  const recordCount = typeof surface.recordCount === "number" ? surface.recordCount : 0;
  const responseConnected = isConnectedPmsResponseEvidence(responseEvidence, PMS_SEARCH_ENDPOINT);
  const networkConnected = responseConnected && recordCount > 0 && !backendFailure;
  const currentStateKind = typeof surface.stateKind === "string" ? surface.stateKind : "unknown";
  const stateKind =
    networkConnected
      ? "rows"
      : currentStateKind === "rows" || (recordCount > 0 && !backendFailure && currentStateKind === "unknown")
        ? "rowsUnverified"
        : currentStateKind;
  return {
    ...surface,
    stateKind,
    pmsBackendConnected: networkConnected,
    pmsNetworkEvidenceConnected: networkConnected,
    pmsFetchEvidenceConnected: networkConnected,
    pmsFetchEvidence: responseEvidence ? summarizePmsResponseEvidence(responseEvidence) : null,
    rowEvidenceKind: networkConnected ? "network-json-rows" : "dom-only-unverified",
    noFailureTextCountsAsSuccess: !(backendFailure && networkConnected),
  };
}

function attachPmsStepNetworkEvidence(
  step: Record<string, unknown>,
  responseEvidence: PmsNetworkResponseEvidence | undefined,
): Record<string, unknown> {
  if (typeof step.step !== "string" || !step.step.startsWith("pms-")) return step;
  const state = attachPmsSurfaceNetworkEvidence(step.state, responseEvidence);
  if (!isRecordValue(state)) return step;
  const stateKind = typeof state.stateKind === "string" ? state.stateKind : "unknown";
  const resolved = ["backendFailure", "empty", "rows"].includes(stateKind);
  const networkConnected = state.pmsBackendConnected === true;
  return {
    ...step,
    hasResolvedPmsState: resolved,
    distinguishesPmsState: resolved,
    pmsBackendState: stateKind,
    pmsFetchEvidenceConnected: networkConnected,
    pmsFetchEvidenceRequestId: responseEvidence?.requestId || "",
    pmsFetchEvidenceEndpoint: responseEvidence?.endpoint || "",
    pmsFetchEvidenceRequestMethod: responseEvidence?.requestMethod || "",
    pmsFetchEvidencePostDataPresent: responseEvidence?.requestPostDataPresent === true,
    rowEvidenceKind: state.rowEvidenceKind,
    pmsFailureTextDoesNotCountAsBackendSuccess: state.noFailureTextCountsAsSuccess !== false,
    state,
  };
}

function mapPmsResponseEvidenceByStep(evidence: PmsNetworkEvidence): Map<string, PmsNetworkResponseEvidence> {
  const responseByStep = new Map<string, PmsNetworkResponseEvidence>();
  for (const response of evidence.responses) {
    if (!response.surfaceStep || responseByStep.has(response.surfaceStep)) continue;
    responseByStep.set(response.surfaceStep, response);
  }
  return responseByStep;
}

function getPmsSurfaceStepId(surface: unknown): string {
  return isRecordValue(surface) && typeof surface.surfaceStep === "string" ? surface.surfaceStep : "";
}

function pmsStepConnected(steps: readonly Record<string, unknown>[], stepId: string): boolean {
  const step = steps.find((candidate) => candidate.step === stepId);
  return Boolean(step && step.pmsBackendState === "rows" && step.pmsFetchEvidenceConnected === true);
}

function summarizePmsResponseEvidence(response: PmsNetworkResponseEvidence): Record<string, unknown> {
  return {
    requestId: response.requestId,
    endpoint: response.endpoint,
    surfaceStep: response.surfaceStep,
    status: response.status,
    requestMethod: response.requestMethod,
    requestPostDataPresent: response.requestPostDataPresent,
    requestPostDataLength: response.requestPostDataLength,
    contentType: response.contentType,
    jsonRowsObserved: response.jsonRowsObserved,
    jsonRowCount: response.jsonRowCount,
    hasSamlForm: response.hasSamlForm,
    connected: response.connected,
  };
}

function recomputeSmokeOk(smoke: SmokeResult): boolean {
  return Boolean(
    smoke.initialHasHome &&
      smoke.pmsBackendConnected === true &&
      !smoke.bannedInitial &&
      (smoke.runtimeErrors || []).length === 0 &&
      smoke.noHorizontalPageOverflow &&
      smoke.placeholderAttributesAbsent &&
      (smoke.missingSurfaceIds || []).length === 0 &&
      !smoke.bannedFinal &&
      smoke.steps.every((step) =>
        Object.entries(step).every(([key, value]) => key === "logoAlt" || typeof value !== "boolean" || value),
      ),
  );
}

function decodeNetworkBody(response: CdpResponse): string {
  const result = response.result as { body?: unknown; base64Encoded?: unknown } | undefined;
  const body = typeof result?.body === "string" ? result.body : "";
  return result?.base64Encoded === true ? Buffer.from(body, "base64").toString("utf8") : body;
}

function looksLikeJsonResponse(contentType: string, mimeType: string, body: string): boolean {
  return /json/i.test(`${contentType} ${mimeType}`) || /^\s*[{[]/.test(body);
}

function findHeader(headers: Record<string, unknown>, expectedName: string): string {
  const found = Object.entries(headers).find(([name]) => name.toLowerCase() === expectedName.toLowerCase());
  return typeof found?.[1] === "string" ? found[1] : "";
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDistManifest() {
  if (!existsSync(join(distDir, "manifest.json")) || !existsSync(join(distDir, "sidepanel.html"))) {
    throw new Error("dist is missing manifest.json or sidepanel.html. Run npm run build first.");
  }
  if (expectedExtensionId !== ACTUAL_CHROME_EXTENSION_ID) {
    throw new Error(
      [
        "dist manifest key does not produce the production Chrome extension ID.",
        `Expected: ${ACTUAL_CHROME_EXTENSION_ID}`,
        `Observed: ${expectedExtensionId}`,
      ].join("\n"),
    );
  }
  if (distManifest.manifest_version !== 3) {
    throw new Error("dist manifest is not MV3.");
  }
  if (distManifest.minimum_chrome_version !== "120") {
    throw new Error("dist manifest minimum_chrome_version must be 120.");
  }
  if (distManifest.background?.service_worker !== "assets/background.js") {
    throw new Error("dist manifest background service worker must be assets/background.js.");
  }
  if (distManifest.side_panel?.default_path !== "sidepanel.html") {
    throw new Error("dist manifest side_panel.default_path must be sidepanel.html.");
  }
}

async function copyAutomationExtensionDist(targetDir: string): Promise<void> {
  await cp(distDir, targetDir, { recursive: true, force: true });
}

function readActualChromeExtensionInstall(): ActualChromeExtensionInstall {
  const localAppData = process.env.LOCALAPPDATA || "";
  const securePreferencesPath = join(localAppData, "Google", "Chrome", "User Data", "Default", "Secure Preferences");
  if (!existsSync(securePreferencesPath)) {
    throw new Error(`Chrome Secure Preferences not found: ${securePreferencesPath}`);
  }

  const preferences = JSON.parse(readFileSync(securePreferencesPath, "utf8")) as {
    extensions?: { settings?: Record<string, { path?: string; location?: unknown }> };
  };
  const setting = preferences.extensions?.settings?.[expectedExtensionId];
  if (!setting?.path) {
    throw new Error(`Actual Chrome profile does not list extension ${expectedExtensionId}.`);
  }
  if (resolve(setting.path) !== distDir) {
    throw new Error(
      [
        `Actual Chrome profile loads a different path for ${expectedExtensionId}.`,
        `Expected: ${distDir}`,
        `Observed: ${setting.path}`,
      ].join("\n"),
    );
  }

  return {
    id: expectedExtensionId,
    path: setting.path,
    location: setting.location ?? null,
    securePreferencesPath,
  };
}

function findBrowserPath(): string {
  const explicitPath = process.env.CHROME_EXTENSION_SMOKE_BROWSER;
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`CHROME_EXTENSION_SMOKE_BROWSER does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }

  const localAppData = process.env.LOCALAPPDATA || "";
  const playwrightRoot = join(localAppData, "ms-playwright");
  const playwrightChromium = findNewestPlaywrightChromium(playwrightRoot);
  if (playwrightChromium) {
    return playwrightChromium;
  }

  const chromeForTestingCandidates = [
    join(localAppData, "Google", "Chrome for Testing", "Application", "chrome.exe"),
    join(process.env.PROGRAMFILES || "", "Google", "Chrome for Testing", "Application", "chrome.exe"),
  ];
  const chromeForTesting = chromeForTestingCandidates.find((candidate) => candidate && existsSync(candidate));
  if (chromeForTesting) {
    return chromeForTesting;
  }

  const googleChromeCandidates = [
    join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
  ];
  const googleChrome = googleChromeCandidates.find((candidate) => candidate && existsSync(candidate));
  if (googleChrome) return googleChrome;

  throw new Error(
    "No extension automation browser found. Set CHROME_EXTENSION_SMOKE_BROWSER to Google Chrome or Chromium that supports --load-extension.",
  );
}

function assertBrowserSupportsUnpackedExtensionLoad(browserPath: string): void {
  if (!isGoogleChromeStablePath(browserPath)) return;
  throw new Error(
    [
      GOOGLE_CHROME_LOAD_EXTENSION_UNSUPPORTED_MESSAGE,
      `Browser: ${browserPath}`,
      `Required actual Chrome target remains: ${ACTUAL_CHROME_EXTENSION_URL}`,
    ].join("\n"),
  );
}

function isGoogleChromeStablePath(browserPath: string): boolean {
  const normalized = browserPath.replace(/\\/g, "/").toLowerCase();
  return normalized.endsWith("/google/chrome/application/chrome.exe") &&
    !normalized.includes("/chrome for testing/");
}

function getAttachedChromeCdpBaseUrl(): string | null {
  const explicitUrl = process.env.CHROME_EXTENSION_SMOKE_CDP_URL ||
    process.env.CHROME_EXTENSION_REAL_CHROME_CDP_URL ||
    "";
  if (explicitUrl.trim()) {
    return normalizeCdpBaseUrl(explicitUrl.trim());
  }

  const explicitPort = process.env.CHROME_EXTENSION_SMOKE_CDP_PORT ||
    process.env.CHROME_EXTENSION_REAL_CHROME_CDP_PORT ||
    "";
  if (explicitPort.trim()) {
    if (!/^\d+$/.test(explicitPort.trim())) {
      throw new Error(`Invalid Chrome CDP port: ${explicitPort}`);
    }
    return `http://127.0.0.1:${explicitPort.trim()}`;
  }

  return null;
}

function normalizeCdpBaseUrl(input: string): string {
  const parsed = new URL(input);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Chrome CDP URL must be http or https: ${input}`);
  }
  parsed.pathname = parsed.pathname.replace(/\/json\/list\/?$/, "").replace(/\/json\/version\/?$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function findNewestPlaywrightChromium(playwrightRoot: string): string | null {
  if (!existsSync(playwrightRoot)) {
    return null;
  }
  const candidates = readdirSync(playwrightRoot)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    .map((name) => join(playwrightRoot, name, "chrome-win64", "chrome.exe"));
  const existing = candidates.filter((candidate) => existsSync(candidate));
  existing.sort((a, b) => basename(b).localeCompare(basename(a)));
  return existing[0] || null;
}

function launchBrowser(
  executablePath: string,
  port: number,
  userDataDir: string,
  extensionDir: string,
): ChildProcess {
  const args = [
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--window-size=1200,950",
    "about:blank",
  ];
  return spawn(executablePath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function waitForDebuggableTargets(port: number): Promise<DevtoolsTarget[]> {
  return waitForDebuggableTargetsFromBaseUrl(`http://127.0.0.1:${port}`);
}

async function waitForDebuggableTargetsFromBaseUrl(baseUrl: string): Promise<DevtoolsTarget[]> {
  let lastTargets: DevtoolsTarget[] = [];
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await requestJson<DevtoolsTarget[]>(`${baseUrl}/json/list`);
      lastTargets = targets;
      if (targets.some((target) => target.type === "page" && target.webSocketDebuggerUrl)) {
        return targets;
      }
    } catch {
      // Chrome may take a moment to publish CDP targets.
    }
    await delay(250);
  }
  return lastTargets;
}

function selectSmokeTarget(
  targets: readonly DevtoolsTarget[],
  attachedChromeCdp: boolean,
  requiredSidePanelUrl: string,
): DevtoolsTarget {
  if (attachedChromeCdp) {
    throw new Error(
      [
        "Actual user Chrome sidePanel proof cannot be produced from CDP page targets.",
        "Attached Chrome CDP smoke mode refuses to select or Page.navigate a normal extension URL tab because URL equality does not prove the Chrome sidePanel container.",
        `Required target URL: ${requiredSidePanelUrl}`,
        `Targets: ${JSON.stringify(summarizeTargets(targets))}`,
      ].join(" "),
    );
  }

  const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`No debuggable page target was available. Targets: ${JSON.stringify(summarizeTargets(targets))}`);
  }
  return page;
}

function summarizeTargets(targets: readonly DevtoolsTarget[]) {
  return targets.map((target) => ({
    type: target.type,
    title: target.title,
    url: target.url,
  }));
}

async function requestJson<T>(url: string): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolvePromise(JSON.parse(body) as T);
        } catch (error) {
          rejectPromise(error);
        }
      });
    });
    request.on("error", rejectPromise);
    request.setTimeout(2_000, () => {
      request.destroy(new Error(`Timed out requesting ${url}`));
    });
  });
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolvePromise(address.port);
          return;
        }
        rejectPromise(new Error("Could not allocate a local debugging port."));
      });
    });
    server.on("error", rejectPromise);
  });
}

class CdpSession {
  private nextId = 1;
  private pending = new Map<number, PendingCdpRequest>();
  readonly events: CdpResponse[] = [];

  private constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      if (!raw) return;
      const message = JSON.parse(raw) as CdpResponse;
      if (!message.id) {
        if (message.method) this.events.push(message);
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      pending.resolve(message);
    });
    this.socket.addEventListener("error", () => {
      this.rejectPending(new Error("Chrome DevTools WebSocket error."));
    });
    this.socket.addEventListener("close", () => {
      this.rejectPending(new Error("Chrome DevTools WebSocket closed."));
    });
  }

  static async connect(url: string): Promise<CdpSession> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => rejectPromise(new Error("Timed out connecting to Chrome DevTools WebSocket.")), 10_000);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolvePromise();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        rejectPromise(new Error("Failed to connect to Chrome DevTools WebSocket"));
      }, { once: true });
    });
    return new CdpSession(socket);
  }

  async send(method: string, params?: Record<string, unknown>, timeoutMs = 30_000): Promise<CdpResponse> {
    const id = this.nextId;
    this.nextId += 1;
    const response = new Promise<CdpResponse>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new Error(`Timed out waiting for CDP ${method}.`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
        timer,
        method,
      });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  close() {
    this.rejectPending(new Error("Chrome DevTools session closed."));
    this.socket.close();
  }

  private rejectPending(error: Error) {
    for (const [id, pending] of this.pending.entries()) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(new Error(`${error.message} Pending CDP method: ${pending.method}.`));
    }
  }
}

function collectPageErrors(events: readonly CdpResponse[]): string[] {
  return events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => JSON.stringify(event.params || {}))
    .filter((entry) => /error|exception|unhandled|TypeError|ReferenceError/i.test(entry))
    .slice(0, 20);
}

function collectConsoleErrors(events: readonly CdpResponse[]): string[] {
  return events
    .filter((event) => event.method === "Log.entryAdded" || event.method === "Runtime.consoleAPICalled")
    .map((event) => JSON.stringify(event.params || {}))
    .filter((entry) => /error|exception|unhandled|TypeError|ReferenceError/i.test(entry))
    .slice(0, 20);
}

async function runShortExtensionPageViewportProbe(
  session: CdpSession,
  extensionUrl: string,
): Promise<ShortExtensionPageViewportProbe> {
  await session.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 400,
      height: 520,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 400,
      screenHeight: 520,
    },
    10_000,
  );
  await session.send("Page.navigate", { url: extensionUrl });
  await delay(1_000);
  const result = await session.send(
    "Runtime.evaluate",
    {
      expression: shortExtensionPageViewportProbeExpression(),
      awaitPromise: true,
      returnByValue: true,
    },
    45_000,
  );
  const exceptionDetails = result.result?.result?.exceptionDetails || result.result?.exceptionDetails || result.exceptionDetails;
  if (exceptionDetails) {
    throw new Error(`Short extension page viewport probe failed before returning evidence: ${JSON.stringify(exceptionDetails)}`);
  }
  const value = result.result?.result?.value;
  if (!value || typeof value !== "object") {
    throw new Error(`Short extension page viewport probe returned invalid evidence: ${JSON.stringify(result)}`);
  }
  const probe = value as ShortExtensionPageViewportProbe;
  assertShortExtensionPageViewportProbe(probe);
  return probe;
}

function assertShortExtensionPageViewportProbe(probe: ShortExtensionPageViewportProbe) {
  if (
    !probe.viewport.runtimePanelHeightMatchesViewport ||
    !probe.viewport.runtimePanelHeightMatchesPanelRoot ||
    !probe.viewport.appRootHeightMatchesViewport ||
    !probe.viewport.appShellHeightMatchesViewport ||
    !probe.viewport.appShellWidthMatchesPanelRoot ||
    !probe.ok
  ) {
    throw new Error(`Short extension page viewport rows are clipped or incomplete: ${JSON.stringify(probe)}`);
  }
}

async function runReferenceWidthDriftProbe(
  session: CdpSession,
  extensionUrl: string,
): Promise<ReferenceWidthDriftProbe> {
  await session.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 440,
      height: 820,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 440,
      screenHeight: 820,
    },
    10_000,
  );
  await session.send("Page.navigate", { url: extensionUrl });
  await delay(1_000);
  const result = await session.send(
    "Runtime.evaluate",
    {
      expression: referenceWidthDriftProbeExpression(),
      returnByValue: true,
    },
    10_000,
  );
  const exceptionDetails = result.result?.result?.exceptionDetails || result.result?.exceptionDetails || result.exceptionDetails;
  if (exceptionDetails) {
    throw new Error(`Reference-width drift probe failed before returning evidence: ${JSON.stringify(exceptionDetails)}`);
  }
  const value = result.result?.result?.value;
  if (!value || typeof value !== "object") {
    throw new Error(`Reference-width drift probe returned invalid evidence: ${JSON.stringify(result)}`);
  }
  const probe = value as ReferenceWidthDriftProbe;
  assertReferenceWidthDriftProbe(probe);
  return probe;
}

function assertReferenceWidthDriftProbe(probe: ReferenceWidthDriftProbe) {
  if (!probe.viewport.productSurfaceUsesExpectedWidth || !probe.viewport.productSurfaceDoesNotFillWideFrame || !probe.ok) {
    throw new Error(`Reference-width side panel format drift was detected: ${JSON.stringify(probe)}`);
  }
}

function referenceWidthDriftProbeExpression(): string {
  return String.raw`
(() => {
  const numericPx=(value)=> {
    const match=String(value || "").trim().match(/^([0-9]+(?:\.[0-9]+)?)px$/);
    return match ? Number(match[1]) : 0;
  };
  const roundedWidth=(element)=>Math.round(element?.getBoundingClientRect().width || 0);
  const sidepanelReferenceWidth=numericPx(getComputedStyle(document.body).getPropertyValue("--sidepanel-reference-width")) || 400;
  const clientWidth=document.documentElement.clientWidth;
  const expectedPanelWidth=Math.min(sidepanelReferenceWidth, clientWidth);
  const bodyWidth=roundedWidth(document.body);
  const appRootWidth=roundedWidth(document.querySelector("#app"));
  const appShellWidth=roundedWidth(document.querySelector(".app-shell"));
  const wideFrameObserved=clientWidth > sidepanelReferenceWidth + 1;
  const bodyWidthStaysReferenceInWideFrame=!wideFrameObserved || Math.abs(bodyWidth - sidepanelReferenceWidth) <= 1;
  const appRootWidthStaysReferenceInWideFrame=!wideFrameObserved || Math.abs(appRootWidth - sidepanelReferenceWidth) <= 1;
  const appShellWidthStaysReferenceInWideFrame=!wideFrameObserved || Math.abs(appShellWidth - sidepanelReferenceWidth) <= 1;
  const productSurfaceUsesExpectedWidth=
    bodyWidth > 0 &&
    appRootWidth > 0 &&
    appShellWidth > 0 &&
    Math.abs(bodyWidth - expectedPanelWidth) <= 1 &&
    Math.abs(appRootWidth - expectedPanelWidth) <= 1 &&
    Math.abs(appShellWidth - expectedPanelWidth) <= 1;
  const productSurfaceDoesNotFillWideFrame=
    !wideFrameObserved ||
    (
      bodyWidth < clientWidth - 1 &&
      appRootWidth < clientWidth - 1 &&
      appShellWidth < clientWidth - 1
    );
  return {
    viewport: {
      innerWidth: window.innerWidth,
      clientWidth,
      sidepanelReferenceWidth,
      expectedPanelWidth,
      bodyWidth,
      appRootWidth,
      appShellWidth,
      wideFrameObserved,
      bodyWidthStaysReferenceInWideFrame,
      appRootWidthStaysReferenceInWideFrame,
      appShellWidthStaysReferenceInWideFrame,
      productSurfaceUsesExpectedWidth,
      productSurfaceDoesNotFillWideFrame
    },
    ok:
      wideFrameObserved &&
      bodyWidthStaysReferenceInWideFrame &&
      appRootWidthStaysReferenceInWideFrame &&
      appShellWidthStaysReferenceInWideFrame &&
      productSurfaceUsesExpectedWidth &&
      productSurfaceDoesNotFillWideFrame
  };
})()`;
}

function shortExtensionPageViewportProbeExpression(): string {
  return String.raw`
(async()=> {
 const sleep=(ms)=>ms <= 0 ? Promise.resolve() : new Promise((resolve)=>setTimeout(resolve,ms));
 const expectedRoot=["고객 안내문","빠른 문의 답변","고객 서비스 관리","업무 관리","템플릿 / 양식 편집"];
 const expectedGroups=[
   { label:"고객 서비스 관리", items:["세탁물 관리","매지출 관리","공항밴 관리"] },
   { label:"업무 관리", items:["객실 정보 리마크","NAVER / STATION 예약입력","업무보고 양식"] },
   { label:"템플릿 / 양식 편집", items:["안내문 편집 / 빠른답변 편집","업무 양식 편집"] }
 ];
 const waitFor=async(predicate,label,timeout=9000)=>{
   const start=performance.now();
   while(performance.now()-start<timeout){
     const value=predicate();
     if(value) return value;
     await sleep(100);
   }
   throw new Error("Timed out waiting for short extension page viewport "+label);
 };
 const elementVisible=(element)=>{
   if(!element) return false;
   const style=getComputedStyle(element);
   const rect=element.getBoundingClientRect();
   return style.display !== "none" &&
     style.visibility !== "hidden" &&
     rect.width > 0 &&
     rect.height > 0 &&
     rect.bottom > 0 &&
     rect.right > 0 &&
     rect.top < window.innerHeight &&
     rect.left < window.innerWidth;
 };
 const currentRootPanel=()=>document.querySelector(".home-navigation-viewport:not(.submenu-active) .root-panel") || document.querySelector(".root-panel");
 const currentDetailPanel=()=>document.querySelector(".home-navigation-viewport.submenu-active .detail-panel") || document.querySelector(".detail-panel");
 const nodeText=(node)=> {
   const inner=(node?.innerText || "").trim();
   return inner || (node?.textContent || "").trim();
 };
 const interactiveIn=(scope,label)=>scope ? [...scope.querySelectorAll("button,summary")]
   .find((node)=>nodeText(node).includes(label)) : null;
 const visibleInteractiveIn=(scope,label)=>scope ? [...scope.querySelectorAll("button,summary")]
   .find((node)=>elementVisible(node) && nodeText(node).includes(label)) : null;
 const visibleButtonByAriaSuffix=(suffix)=>[...document.querySelectorAll("button")]
   .find((node)=>elementVisible(node) && (node.getAttribute("aria-label") || "").endsWith(suffix));
  const stageVisibilityEvidence=(target)=> {
    const stage=document.querySelector(".screen-stage");
    if(!target || !stage) {
      return {
        fullyVisible:false,
        displayOk:false,
        visibilityOk:false,
        sizeOk:false,
        topOk:false,
        bottomOk:false,
        leftOk:false,
        rightOk:false,
        element:rectEvidence(target),
        stage:rectEvidence(stage)
      };
    }
    const style=getComputedStyle(target);
    const elementRect=target.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    const bottomBarRect=document.querySelector(".home-fixed-bottom-bar")?.getBoundingClientRect();
    const visibleTop=Math.max(stageRect.top,0);
    const appShellRect=document.querySelector(".app-shell")?.getBoundingClientRect();
    const visibleBottom=Math.min(stageRect.bottom,appShellRect?.bottom ?? stageRect.bottom,bottomBarRect?.top ?? stageRect.bottom);
    const displayOk=style.display !== "none";
    const visibilityOk=style.visibility !== "hidden";
    const sizeOk=elementRect.width > 0 && elementRect.height > 0;
    const topOk=elementRect.top >= visibleTop - 1;
    const bottomOk=elementRect.bottom <= visibleBottom + 1;
    const leftOk=elementRect.left >= stageRect.left - 1;
    const rightOk=elementRect.right <= stageRect.right + 1;
    return {
      fullyVisible:displayOk && visibilityOk && sizeOk && topOk && bottomOk,
      displayOk,
      visibilityOk,
      sizeOk,
      topOk,
      bottomOk,
      leftOk,
      rightOk,
      element:rectEvidence(target),
      stage:rectEvidence(stage),
      visibleBottom:Math.round(visibleBottom)
    };
  };
  const fullyVisibleInStage=(target)=>stageVisibilityEvidence(target).fullyVisible;
 const rootItems=()=>[...(currentRootPanel()?.querySelectorAll(".home-nav-root-item") || [])]
   .filter((node)=>elementVisible(node))
   .map((node)=>nodeText(node))
   .filter(Boolean);
 const detailItems=()=>[...(currentDetailPanel()?.querySelectorAll(".home-submenu-item") || [])]
   .map((node)=>nodeText(node))
   .filter(Boolean);
 const rootVisibility=(labels)=>labels.map((label)=>{
   const element=visibleInteractiveIn(currentRootPanel(),label);
   return { label, fullyVisible:fullyVisibleInStage(element) };
 });
 const detailVisibility=(labels)=>labels.map((label)=>{
   const element=interactiveIn(currentDetailPanel(),label);
   const evidence=stageVisibilityEvidence(element);
   return {
     label,
     fullyVisible:evidence.fullyVisible,
     ...evidence,
     display:element ? getComputedStyle(element).display : "",
     visibility:element ? getComputedStyle(element).visibility : ""
   };
  });
 const labelsMatch=(actual,expected)=>actual.length === expected.length && expected.every((label,index)=>actual[index] === label);
 const computedRuntimePanelHeight=()=>getComputedStyle(document.body).getPropertyValue("--runtime-panel-height").trim();
 const numericPx=(value)=> {
   const match=String(value || "").match(/^([0-9]+(?:\.[0-9]+)?)px$/);
   return match ? Number(match[1]) : 0;
 };
 const rectEvidence=(element)=> {
   const rect=element?.getBoundingClientRect();
   return {
     top:Math.round(rect?.top || 0),
     bottom:Math.round(rect?.bottom || 0),
     width:Math.round(rect?.width || 0),
     height:Math.round(rect?.height || 0)
   };
 };
 const shellLayoutEvidence=()=> {
   const appShell=document.querySelector(".app-shell");
   const screenStage=document.querySelector(".screen-stage");
   const rootPanel=currentRootPanel();
   const menuBlock=rootPanel?.querySelector(".home-nav-root-item");
   const footer=document.querySelector(".home-fixed-bottom-bar");
   return {
     appShellRect:rectEvidence(appShell),
     screenStageRect:rectEvidence(screenStage),
     rootPanelRect:rectEvidence(rootPanel),
     menuBlockRect:rectEvidence(menuBlock),
     footerRect:rectEvidence(footer)
   };
 };
 const click=(element,label)=>{
   if(!element) throw new Error("Short extension page viewport missing target "+label);
   if(!elementVisible(element)) throw new Error("Short extension page viewport hidden target "+label);
   element.scrollIntoView({ block:"nearest", inline:"nearest" });
   element.click();
 };
 const backToRoot=async()=>{
   for(let attempt=0; attempt<4 && document.querySelector(".home-navigation-viewport.submenu-active"); attempt+=1){
     const back=visibleButtonByAriaSuffix("뒤로가기");
     if(!back) break;
     click(back,"home back");
     await sleep(420);
   }
   await waitFor(()=>visibleInteractiveIn(currentRootPanel(),"고객 서비스 관리"),"root");
 };
 await waitFor(()=>document.querySelector(".app-shell"),"app shell");
 await sleep(500);
 const rootActual=rootItems();
 const rootCheck={
   items: rootActual,
   exactRootRowCount: rootActual.length === expectedRoot.length,
   labelsMatchContract: labelsMatch(rootActual, expectedRoot),
   allRowsFullyVisible: rootVisibility(expectedRoot).every((item)=>item.fullyVisible),
   visibility: rootVisibility(expectedRoot)
 };
 const groups=[];
 for (const group of expectedGroups) {
   await backToRoot();
   click(visibleInteractiveIn(currentRootPanel(),group.label),group.label);
   await waitFor(()=>document.querySelector(".home-navigation-viewport.submenu-active"),group.label+" detail");
   await waitFor(()=>group.items.every((item)=>interactiveIn(currentDetailPanel(),item)),group.label+" detail items");
   await sleep(800);
   const actual=detailItems();
   const visibility=detailVisibility(group.items);
   groups.push({
     label: group.label,
     items: actual,
     exactRowCount: actual.length === group.items.length,
     labelsMatchContract: labelsMatch(actual, group.items),
     allRowsFullyVisible: visibility.every((item)=>item.fullyVisible),
     visibility
   });
 }
  await backToRoot();
  const shell=shellLayoutEvidence();
  const runtimePanelHeight=numericPx(computedRuntimePanelHeight());
  const expectedRuntimePanelHeight=Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  const datasetRuntimePanelHeight=Number(document.body.dataset.runtimePanelHeight || 0);
  const sidepanelReferenceWidth=numericPx(getComputedStyle(document.body).getPropertyValue("--sidepanel-reference-width"));
  const expectedPanelWidth=Math.min(sidepanelReferenceWidth || document.documentElement.clientWidth, document.documentElement.clientWidth);
  const appRootHeight=Math.round(document.querySelector("#app")?.getBoundingClientRect().height || 0);
  const appRootWidth=Math.round(document.querySelector("#app")?.getBoundingClientRect().width || 0);
  const appShellHeight=shell.appShellRect.height;
  const appShellWidth=shell.appShellRect.width;
  const ok=rootCheck.exactRootRowCount &&
    rootCheck.labelsMatchContract &&
    rootCheck.allRowsFullyVisible &&
    groups.every((group)=>group.exactRowCount && group.labelsMatchContract && group.allRowsFullyVisible) &&
    runtimePanelHeight > 0 &&
    Math.abs(runtimePanelHeight - expectedRuntimePanelHeight) <= 1 &&
    Math.abs(datasetRuntimePanelHeight - expectedRuntimePanelHeight) <= 1 &&
    Math.abs(runtimePanelHeight - appRootHeight) <= 1 &&
    Math.abs(appShellHeight - appRootHeight) <= 1 &&
    Math.abs(appRootHeight - expectedRuntimePanelHeight) <= 1 &&
    Math.abs(appShellHeight - expectedRuntimePanelHeight) <= 1 &&
    Math.abs(appRootWidth - expectedPanelWidth) <= 1 &&
    Math.abs(appShellWidth - appRootWidth) <= 1 &&
    shell.rootPanelRect.bottom <= shell.footerRect.top + 1 &&
    shell.footerRect.bottom <= shell.appShellRect.bottom + 1;
 return {
   viewport: {
      innerHeight: window.innerHeight,
      visualViewportHeight: window.visualViewport?.height ?? null,
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      appRootHeight,
      appRootWidth,
      appShellHeight,
      appShellWidth,
      expectedRuntimePanelHeight,
      computedRuntimePanelHeight: computedRuntimePanelHeight(),
      runtimePanelHeight: document.body.dataset.runtimePanelHeight || "",
      runtimePanelHeightMatchesViewport:
        runtimePanelHeight > 0 &&
        Math.abs(runtimePanelHeight - expectedRuntimePanelHeight) <= 1 &&
        Math.abs(datasetRuntimePanelHeight - expectedRuntimePanelHeight) <= 1,
      runtimePanelHeightMatchesPanelRoot:
        runtimePanelHeight > 0 &&
        Math.abs(runtimePanelHeight - appRootHeight) <= 1 &&
        Math.abs(datasetRuntimePanelHeight - appRootHeight) <= 1,
      appRootHeightMatchesViewport:
        appRootHeight > 0 &&
        Math.abs(appRootHeight - expectedRuntimePanelHeight) <= 1,
      appShellHeightMatchesViewport:
        appShellHeight > 0 &&
        Math.abs(appShellHeight - expectedRuntimePanelHeight) <= 1,
      appShellWidthMatchesPanelRoot:
        appRootWidth > 0 &&
        Math.abs(appRootWidth - expectedPanelWidth) <= 1 &&
        Math.abs(appShellWidth - appRootWidth) <= 1
    },
    shell,
   root: rootCheck,
   groups,
   ok
 };
})()`;
}

function smokeExpression(): string {
  return String.raw`
(async()=> {
 const expectedSurfaceIds=${JSON.stringify(SMOKE_SURFACE_IDS)};
 const pmsEndpoint=${JSON.stringify(PMS_SEARCH_ENDPOINT)};
 const pmsSurfaceFetchEvidence=[];
  const pendingPmsFetchEvidence=[];
  let activePmsSurfaceStep="";
  let pmsFetchOrdinal=0;
 const runtimeErrors=[];
 let partialResult=null;
 const classifyFailure=(message)=>/^Render failure/.test(message) ? "render" : /^Click failure/.test(message) ? "click" : "smoke";
 const requestBodyLength=(body)=>{
   if(body === undefined || body === null) return 0;
   if(typeof body === "string") return body.length;
   if(body instanceof URLSearchParams) return String(body).length;
   if(body instanceof Blob) return body.size || 0;
   if(body instanceof ArrayBuffer) return body.byteLength;
   if(ArrayBuffer.isView(body)) return body.byteLength || 0;
   return String(body).length;
 };
 const requestUrlOf=(input)=>typeof input === "string" ? input : input && typeof input.url === "string" ? input.url : String(input || "");
 const requestMethodOf=(input,init)=>String(init?.method || input?.method || "GET").toUpperCase();
 const requestBodyOf=(init)=>init && Object.prototype.hasOwnProperty.call(init,"body") ? init.body : undefined;
 const originalFetch=window.fetch.bind(window);
 window.fetch=async(input,init)=>{
   const requestUrl=requestUrlOf(input);
    const requestMethod=requestMethodOf(input,init);
    const requestBody=requestBodyOf(init);
    const requestPostDataLength=requestBodyLength(requestBody);
    const surfaceStep=activePmsSurfaceStep;
    const requestOrdinal=requestUrl === pmsEndpoint ? ++pmsFetchOrdinal : 0;
    const evidence=requestUrl === pmsEndpoint ? {
      requestOrdinal,
      surfaceStep,
      url:requestUrl,
      requestMethod,
      requestPostDataPresent:requestPostDataLength > 0,
      requestPostDataLength,
      status:null,
      contentType:"",
      jsonRowsObserved:false,
      jsonRowCount:0,
      hasSamlForm:false
    } : null;
    if(evidence){
      pmsSurfaceFetchEvidence.push(evidence);
    }
   try {
     const response=await originalFetch(input,init);
     if(evidence){
       evidence.status=response.status;
       evidence.contentType=response.headers?.get("content-type") || "";
       const pending=response.clone().text()
         .then((body)=>{
           evidence.hasSamlForm=/identity\/samlsso|samlsso/i.test(body);
           if(/json/i.test(evidence.contentType) || /^\s*[{[]/.test(body)){
             const parsed=JSON.parse(body);
             if(parsed && typeof parsed === "object" && Array.isArray(parsed.rows)){
               evidence.jsonRowsObserved=true;
               evidence.jsonRowCount=parsed.rows.length;
             }
           }
         })
         .catch((error)=>{
           evidence.parseError=error instanceof Error ? error.message : String(error);
         });
       pendingPmsFetchEvidence.push(pending);
     }
     return response;
   } catch (error) {
     if(evidence){
       evidence.parseError=error instanceof Error ? error.message : String(error);
     }
     throw error;
   }
 };
  try {
  window.addEventListener("error",(event)=>runtimeErrors.push("pageerror:"+(event.message || String(event.error || "error"))));
  window.addEventListener("unhandledrejection",(event)=>runtimeErrors.push("unhandledrejection:"+String(event.reason || "unhandled rejection")));
  const mark=(label)=>{ window.__EXTENSION_SMOKE_PROGRESS__=label; };
  const sleep=(ms)=>ms <= 0 ? Promise.resolve() : new Promise((resolve)=>setTimeout(resolve,ms));
  const renderFailureMessage=(phase)=>runtimeErrors.length ? "Render failure "+phase+": "+JSON.stringify(runtimeErrors) : "";
  const assertNoRenderErrors=(phase)=>{
    const message=renderFailureMessage(phase);
    if(message) throw new Error(message);
  };
  const waitFor=async(predicate,label,timeout=7000)=>{
    mark("wait:"+label);
    const start=performance.now();
    while(performance.now()-start<timeout){
      assertNoRenderErrors("while waiting for "+label);
      const value=predicate();
      if(value) return value;
     await sleep(100);
   }
   throw new Error("Timed out waiting for "+label);
  };
  const waitForAsync=async(predicate,label,timeout=7000)=>{
    mark("wait:"+label);
    const start=performance.now();
    while(performance.now()-start<timeout){
      assertNoRenderErrors("while waiting for "+label);
      const value=await predicate();
      if(value) return value;
      await sleep(100);
    }
    throw new Error("Timed out waiting for "+label);
  };
  const elementVisible=(element)=>{
    if(!element) return false;
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight;
  };
  const nodeText=(node)=> {
    const inner=(node?.innerText || "").trim();
    return inner || (node?.textContent || "").trim();
  };
  const interactiveIn=(scope,label)=>scope ? [...scope.querySelectorAll("button,summary")]
    .find((node)=>nodeText(node).includes(label)) : null;
  const visibleInteractiveIn=(scope,label)=>scope ? [...scope.querySelectorAll("button,summary")]
    .find((node)=>elementVisible(node) && nodeText(node).includes(label)) : null;
  const visibleButtonByAriaSuffix=(suffix)=>[...document.querySelectorAll("button")]
    .find((node)=>{
      const rect=node.getBoundingClientRect();
      return elementVisible(node) &&
        rect.left >= -1 &&
        rect.right <= window.innerWidth + 1 &&
        (node.getAttribute("aria-label") || "").endsWith(suffix);
    });
  const currentRootPanel=()=>document.querySelector(".home-navigation-viewport:not(.submenu-active) .root-panel");
  const currentDetailPanel=()=>document.querySelector('.home-navigation-viewport.submenu-active .detail-panel[aria-hidden="false"]') || document.querySelector(".home-navigation-viewport.submenu-active .detail-panel");
  const currentDetailBackButton=()=>currentDetailPanel()?.querySelector(".home-nav-back") || null;
  const currentStageBackButton=()=>document.querySelector(".screen-stage .work-surface .home-nav-back, .screen-stage .pms-panel .home-nav-back") || null;
  const currentNavigationBackButton=()=>currentDetailBackButton() || currentStageBackButton();
  const navigationDrillEvidence=()=> {
    const viewport=document.querySelector(".home-navigation-viewport");
    const root=currentRootPanel() || document.querySelector(".root-panel");
    const detail=currentDetailPanel() || document.querySelector(".detail-panel");
    const back=currentNavigationBackButton() || document.querySelector(".home-nav-back");
    const rect=(node)=> {
      const box=node?.getBoundingClientRect();
      return {
        top:Math.round(box?.top || 0),
        left:Math.round(box?.left || 0),
        bottom:Math.round(box?.bottom || 0),
        right:Math.round(box?.right || 0),
        width:Math.round(box?.width || 0),
        height:Math.round(box?.height || 0)
      };
    };
    return {
      viewportClass:viewport?.className || "",
      viewportDirection:viewport?.getAttribute("data-motion-direction") || "",
      rootAriaHidden:root?.getAttribute("aria-hidden") || "",
      detailAriaHidden:detail?.getAttribute("aria-hidden") || "",
      backAriaLabel:back?.getAttribute("aria-label") || "",
      backText:nodeText(back),
      rootRect:rect(root),
      detailRect:rect(detail),
      backRect:rect(back),
      bodyText:text().slice(0,360)
    };
  };
  const footerButton=(label)=>visibleInteractiveIn(document.querySelector(".home-fixed-bottom-bar"),label);
  const branchButton=(label)=>visibleInteractiveIn(document.querySelector("#branch-selection-popup"),label);
  const click=async(element,label)=>{
    mark("click:"+label);
    assertNoRenderErrors("before clicking "+label);
    if(!element) throw new Error("Click failure: missing visible target "+label);
    if(!elementVisible(element)) throw new Error("Click failure: hidden or offscreen target "+label);
    element.scrollIntoView({ block:"nearest", inline:"nearest" });
    element.click();
    mark("clicked:"+label);
    assertNoRenderErrors("after clicking "+label);
  };
 const text=()=>document.body?.innerText || "";
 const byText=(label)=>[...document.querySelectorAll("button,summary")].find((node)=>elementVisible(node) && nodeText(node).includes(label));
 const byRootText=(label)=>visibleInteractiveIn(currentRootPanel(),label);
 const byDetailText=(label)=>interactiveIn(currentDetailPanel(),label);
 const detailItemButton=(label)=>byDetailText(label) || byText(label);
 const buttonStates=(selector)=>[...document.querySelectorAll(selector)].map((node)=>({
   text:(node.innerText || "").trim(),
   disabled:Boolean(node.disabled)
 }));
 const visibleRootItems=()=>[...(currentRootPanel()?.querySelectorAll(".home-nav-root-item") || [])]
   .filter((node)=>elementVisible(node))
   .map((node)=>nodeText(node))
   .filter(Boolean);
 const visibleDetailItems=()=>[...(currentDetailPanel()?.querySelectorAll(".home-submenu-item") || [])]
   .filter((node)=>elementVisible(node))
   .map((node)=>nodeText(node))
   .filter(Boolean);
 const visiblePlaceholderAttributes=(scope=document)=>[...scope.querySelectorAll("input[placeholder],textarea[placeholder]")]
   .filter((node)=>elementVisible(node))
   .map((node)=>({
     tag:node.tagName,
     placeholder:node.getAttribute("placeholder") || "",
     ariaLabel:node.getAttribute("aria-label") || "",
     text:(node.closest("label")?.innerText || node.closest(".work-surface,.pms-panel,.detail-panel,.root-panel")?.querySelector("h1,h2,h3,strong")?.textContent || "").trim().slice(0,80)
   }))
   .filter((item)=>item.placeholder);
 const inputPlaceholders=(scope=document)=>visiblePlaceholderAttributes(scope)
   .map((item)=>item.placeholder)
   .filter(Boolean);
  const visibleOne=(selector,scope=document)=>[...scope.querySelectorAll(selector)].find((node)=>elementVisible(node)) || null;
  const visibleWorkSurface=()=>visibleOne(".work-surface");
  const visibleWorkSurfaceByLabel=(label)=>{
    const surface=visibleWorkSurface();
    return surface && ((surface.getAttribute("aria-label") || "").includes(label) || nodeText(surface).includes(label))
      ? surface
      : null;
  };
  const visiblePmsPanel=(label)=>[...document.querySelectorAll(".pms-panel")]
    .find((panel)=>elementVisible(panel) && (!label || (panel.getAttribute("aria-label") || "").includes(label) || (panel.innerText || "").includes(label))) || null;
  const setInputValue=(input,value)=>{
    if(!input) return false;
    input.focus();
    input.value=value;
    input.dispatchEvent(new InputEvent("input",{ bubbles:true, inputType:"insertText", data:value }));
    input.dispatchEvent(new Event("change",{ bubbles:true }));
    return true;
  };
  const visibleInputByAria=(scope,label)=>[...(scope?.querySelectorAll("input,textarea,select") || [])]
    .find((node)=>elementVisible(node) && (node.getAttribute("aria-label") || "").includes(label)) || null;
  const installClipboardBoundaryProbe=()=>{
    window.__EXTENSION_SMOKE_CLIPBOARD_CALLS__=window.__EXTENSION_SMOKE_CLIPBOARD_CALLS__ || [];
    const calls=window.__EXTENSION_SMOKE_CLIPBOARD_CALLS__;
    const clipboard=navigator.clipboard;
    if(!clipboard || typeof clipboard.writeText !== "function") return { installed:false, calls };
    if(window.__EXTENSION_SMOKE_CLIPBOARD_PROBE_INSTALLED__) return { installed:true, calls };
    const original=clipboard.writeText.bind(clipboard);
    try {
      clipboard.writeText=async(value)=>{
        const call={ text:String(value), ok:false };
        calls.push(call);
        try {
          await original(value);
          call.ok=true;
        } catch (error) {
          call.error=error instanceof Error ? error.message : String(error);
          throw error;
        }
      };
      window.__EXTENSION_SMOKE_CLIPBOARD_PROBE_INSTALLED__=true;
      return { installed:true, calls };
    } catch (error) {
      calls.push({ text:"", ok:false, probeInstallError:error instanceof Error ? error.message : String(error) });
      return { installed:false, calls };
    }
  };
  const chromeStorageGet=async(key)=>{
    if(!globalThis.chrome?.storage?.local?.get) {
      return { available:false, value:null, error:"chrome.storage.local.get unavailable" };
    }
    try {
      const maybe=chrome.storage.local.get([key]);
      const value=maybe && typeof maybe.then === "function"
        ? await maybe
        : await new Promise((resolve)=>chrome.storage.local.get([key],resolve));
      return { available:true, value };
    } catch (error) {
      return { available:false, value:null, error:error instanceof Error ? error.message : String(error) };
    }
  };
  const chromeStorageSet=async(values)=>{
    if(!globalThis.chrome?.storage?.local?.set) return false;
    try {
      const maybe=chrome.storage.local.set(values);
      if(maybe && typeof maybe.then === "function") await maybe;
      return true;
    } catch {
      return false;
    }
  };
  const storageJsonIncludes=(snapshot,needle)=>JSON.stringify(snapshot?.value || "").includes(needle);
  const productSurfaceCoverageSteps=()=>result.steps
    .filter((step)=>expectedSurfaceIds.includes(step.step) && step.surfaceCovered === true)
    .map((step)=>step.step);
  const transitionSettleWaitMs=1500;
  const waitForStableTransition=async(label,visibleState=()=>true,timeout=4000)=>{
    mark("stable:"+label);
    await waitFor(()=>Boolean(visibleState()),"visible before stable transition "+label,timeout);
    await sleep(transitionSettleWaitMs);
    assertNoRenderErrors("after stable "+label);
    if(Boolean(visibleState())) return true;
    throw new Error("Stable transition target disappeared "+label);
  };
 const shellVisualState=()=> {
   const logoButton=document.querySelector(".header-logo-mark");
   const logoImage=document.querySelector(".header-logo-mark img");
   const appShell=document.querySelector(".app-shell");
   const viewport=document.querySelector(".home-navigation-viewport");
   const track=document.querySelector(".home-navigation-track");
   const workSurface=document.querySelector(".work-surface");
   const pmsPanel=document.querySelector(".pms-panel");
    const bottomBar=document.querySelector(".home-fixed-bottom-bar");
    const appShellRect=appShell?.getBoundingClientRect();
    const bodyRect=document.body?.getBoundingClientRect();
    const appRootRect=document.querySelector("#app")?.getBoundingClientRect();
   const logoStyle=logoButton ? getComputedStyle(logoButton) : null;
   const logoImageStyle=logoImage ? getComputedStyle(logoImage) : null;
   const viewportStyle=viewport ? getComputedStyle(viewport) : null;
   const trackStyle=track ? getComputedStyle(track) : null;
   const surfaceStyle=workSurface || pmsPanel ? getComputedStyle(workSurface || pmsPanel) : null;
   const bottomBarStyle=bottomBar ? getComputedStyle(bottomBar) : null;
   return {
     logoDisabled:Boolean(logoButton?.disabled),
     logoOpacity:logoStyle?.opacity || "",
     logoFilter:logoStyle?.filter || "",
     logoImageFilter:logoImageStyle?.filter || "",
     logoVisibleWithoutFilter:
       logoStyle?.opacity === "1" &&
       ["", "none"].includes(logoStyle?.filter || "") &&
       ["", "none"].includes(logoImageStyle?.filter || ""),
     logoAlt:logoImage?.getAttribute("alt") || "",
     navigationDirection:viewport?.getAttribute("data-motion-direction") || "",
     navigationMask:viewportStyle?.maskImage || viewportStyle?.webkitMaskImage || "",
     navigationTransition:trackStyle?.transition || "",
     stageMotion:document.querySelector(".screen-stage")?.getAttribute("data-view-motion") || "",
     surfaceAnimationName:surfaceStyle?.animationName || "",
     bottomBarBoxShadow:bottomBarStyle?.boxShadow || "",
      appShellWidth:Math.round(appShellRect?.width || 0),
      appRootWidth:Math.round(appRootRect?.width || 0),
      bodyWidth:Math.round(bodyRect?.width || 0),
      viewportWidth:document.documentElement.clientWidth
    };
  };
 const clippedLabels=(scope=visibleWorkSurface() || document)=>[...scope.querySelectorAll("strong,button,span")]
   .filter((node)=>{
     const style=getComputedStyle(node);
     return style.overflow !== "visible" && node.scrollWidth > node.clientWidth + 1;
   })
   .map((node)=>(node.innerText || node.getAttribute("aria-label") || "").trim())
   .filter(Boolean)
   .slice(0,10);
 const overlayDocks=(scope=visibleWorkSurface() || document)=>[...scope.querySelectorAll(".work-dock")]
   .map((node)=>{
     const style=getComputedStyle(node);
     return {
       text:(node.innerText || "").trim(),
       position:style.position
     };
   })
   .filter((dock)=>dock.position === "sticky" || dock.position === "fixed");
 const rectEvidence=(node)=> {
   const rect=node?.getBoundingClientRect();
   return {
     top:Math.round(rect?.top || 0),
     bottom:Math.round(rect?.bottom || 0),
     width:Math.round(rect?.width || 0),
     height:Math.round(rect?.height || 0)
   };
 };
 const footerLayoutEvidence=(scope=visibleWorkSurface() || document)=> {
   const appShell=document.querySelector(".app-shell");
   const stage=document.querySelector(".screen-stage");
   const footer=document.querySelector(".home-fixed-bottom-bar");
   const shellRect=rectEvidence(appShell);
   const stageRect=rectEvidence(stage);
   const footerRect=rectEvidence(footer);
   const surfaceRect=rectEvidence(scope);
   const stageVisibleBottom=Math.min(stageRect.bottom || 0, footerRect.top || stageRect.bottom || 0);
   const visibleControls=[...scope.querySelectorAll("button,input,textarea,summary,.primary-action,.copy-action,.sales-category-panel button")]
     .filter((node)=>{
       if(!elementVisible(node)) return false;
       const rect=node.getBoundingClientRect();
       return rect.top >= stageRect.top - 1 && rect.bottom <= stageVisibleBottom + 1;
     });
   const lastVisibleControl=visibleControls[visibleControls.length-1] || stage || scope;
   const controlRect=rectEvidence(lastVisibleControl);
   return {
     appShellRect:shellRect,
     stageRect,
     footerRect,
     surfaceRect,
     lastVisibleControlRect:controlRect,
     footerContainedInAppShell:footerRect.bottom <= shellRect.bottom + 1 && footerRect.top >= shellRect.top - 1,
     stageDoesNotUnderlapFooter:stageRect.bottom <= footerRect.top + 1,
     visibleSurfaceDoesNotUnderlapFooter:Math.min(surfaceRect.bottom, stageRect.bottom) <= footerRect.top + 1,
     lastVisibleControlDoesNotUnderlapFooter:controlRect.bottom <= footerRect.top + 1
   };
 };
  const fullyVisibleInStage=(target)=> {
    const element=typeof target === "string" ? document.querySelector(target) : target;
    const stage=document.querySelector(".screen-stage");
    if(!element || !stage) return false;
    const elementRect=element.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    const bottomBarRect=document.querySelector(".home-fixed-bottom-bar")?.getBoundingClientRect();
    const visibleTop=Math.max(stageRect.top,0);
    const appShellRect=document.querySelector(".app-shell")?.getBoundingClientRect();
    const visibleBottom=Math.min(stageRect.bottom,appShellRect?.bottom ?? stageRect.bottom,bottomBarRect?.top ?? stageRect.bottom);
    return elementVisible(element) && elementRect.top >= visibleTop - 1 && elementRect.bottom <= visibleBottom + 1;
  };
 const visibilityForLabels=(labels)=>labels.map((label)=>{
   const element=byDetailText(label);
   return { label, fullyVisible:fullyVisibleInStage(element) };
 });
 const rootVisibilityForLabels=(labels)=>labels.map((label)=>{
   const element=visibleInteractiveIn(currentRootPanel(),label);
   return { label, fullyVisible:fullyVisibleInStage(element) };
 });
 const allFullyVisibleInStage=(selector)=>[...document.querySelectorAll(selector)]
   .filter((node)=>node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
   .every((node)=>fullyVisibleInStage(node));
 const visibleCount=(selector)=>[...document.querySelectorAll(selector)]
   .filter((node)=>node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
   .length;
 const screenStageScrollTop=()=>Math.round(document.querySelector(".screen-stage")?.scrollTop || 0);
  const sidepanelRootStaysSidepanelFormat=()=> {
    const visual=shellVisualState();
    const referenceWidth=Number.parseFloat(getComputedStyle(document.body).getPropertyValue("--sidepanel-reference-width")) || 400;
    const expectedWidth=Math.min(referenceWidth, visual.viewportWidth);
    return visual.bodyWidth > 0 &&
      visual.appRootWidth > 0 &&
      visual.appShellWidth > 0 &&
      Math.abs(visual.bodyWidth - expectedWidth) <= 1 &&
      Math.abs(visual.appRootWidth - expectedWidth) <= 1 &&
      Math.abs(visual.appShellWidth - visual.appRootWidth) <= 1;
  };
 const workSurfaceState=(step)=> {
   const surface=visibleWorkSurface();
   const workText=surface?.innerText || "";
   const placeholders=inputPlaceholders(surface || document);
   const docks=overlayDocks(surface || document);
   const footerEvidence=footerLayoutEvidence(surface || document);
   return {
     step,
     hasVisibleWorkSurface:Boolean(surface),
     noInputPlaceholders: placeholders.length === 0,
     placeholders,
     noLiteralEmptyData: !/(^|\n)\s*없음\s*($|\n)/.test(workText),
     noStorageCorruptionBanner: !/저장된 데이터 손상이 발견되었습니다/.test(workText),
     noLegacyPlaceholderText: !/YYYY\.MM\.DD|HH:MM|현재 설정 항목 없음/.test(workText),
     noClippedLabels: clippedLabels(surface || document).length === 0,
     clippedLabels: clippedLabels(surface || document),
     noStickyOrFixedWorkDock: docks.length === 0,
     overlayDocks: docks,
     bottomBarDoesNotMaskContent:
       footerEvidence.footerContainedInAppShell &&
       footerEvidence.stageDoesNotUnderlapFooter &&
       footerEvidence.visibleSurfaceDoesNotUnderlapFooter &&
       footerEvidence.lastVisibleControlDoesNotUnderlapFooter,
     footerEvidence,
     logoVisible: shellVisualState().logoVisibleWithoutFilter,
     usesRouteMotion:
       ["work-view-enter-forward","work-view-enter-backward","work-view-replace"].includes(shellVisualState().surfaceAnimationName)
   };
 };
 const pmsFailurePattern=/PMS 조회에 실패했습니다|PMS 연결 확인 필요|PMS 연결 실패|PMS 응답 오류|Error:/;
 const pmsRowLooksReal=(rowText)=>rowText.trim().length > 0 && !/N\/A|YYYY\.MM\.DD|HH:MM|PMS 연결 확인 필요|PMS 조회에 실패했습니다|PMS 연결 실패|PMS 응답 오류|표시할 PMS 기록이 없습니다|Error:/.test(rowText);
  const pmsPanelState=(label)=> {
    const panel=visiblePmsPanel(label);
    const panelText=panel?.innerText || "";
    const status=(panel?.querySelector(".work-status")?.innerText || "").trim();
   const emptyLabel=(panel?.querySelector(".work-empty")?.innerText || "").trim();
   const refresh=panel ? visibleInteractiveIn(panel,"새로고침") : null;
   const records=[...(panel?.querySelectorAll(".pms-record-row") || [])]
     .filter((node)=>elementVisible(node))
      .map((node)=>(node.innerText || "").trim())
      .filter(Boolean)
      .slice(0,5);
    const domCandidateRecordCount=records.filter(pmsRowLooksReal).length;
    const loading=/PMS 조회 중/.test(emptyLabel) || Boolean(refresh?.disabled);
    const backendFailure=pmsFailurePattern.test([status,emptyLabel,panelText].join(" "));
    const empty=!backendFailure && /표시할 PMS 기록이 없습니다/.test(emptyLabel);
    const pmsBackendConnected=false;
    const stateKind=backendFailure ? "backendFailure" : empty ? "empty" : loading ? "loading" : records.length > 0 ? "rowsUnverified" : "unknown";
    return {
      label,
     panelVisible:Boolean(panel),
     panelTitleVisible:Boolean(panel && ((panel.getAttribute("aria-label") || "").includes(label) || panelText.includes(label))),
     stateKind,
     loading,
     backendFailure,
     empty,
     status,
      emptyLabel,
      refreshDisabled:Boolean(refresh?.disabled),
      recordCount:records.length,
      realRecordCount:0,
      domCandidateRecordCount,
      records,
      pmsBackendConnected,
      rowEvidenceKind:"dom-only-unverified",
      noFailureTextCountsAsSuccess:!(backendFailure && pmsBackendConnected),
      noFakePmsRecordText:records.every(pmsRowLooksReal)
    };
 };
 const pmsRequestForStep=(stepName)=>pmsSurfaceFetchEvidence
   .find((evidence)=>evidence.surfaceStep === stepName);
 const pmsEvidenceForStep=(stepName)=>pmsSurfaceFetchEvidence
   .find((evidence)=>evidence.surfaceStep === stepName && (evidence.status !== null || evidence.parseError || evidence.hasSamlForm || evidence.jsonRowsObserved));
 const waitForPmsPanelState=async(label,stepName)=> {
   await waitFor(()=>visiblePmsPanel(label),"visible pms panel "+label);
    await waitFor(()=>{
      const state=pmsPanelState(label);
      return state.loading || state.backendFailure || state.empty || state.recordCount > 0 || Boolean(pmsRequestForStep(stepName));
    },label+" pms loading or resolved state");
   const startedAt=performance.now();
   while(performance.now()-startedAt<30000){
     assertNoRenderErrors("while waiting for "+label+" pms resolved state");
     const state=pmsPanelState(label);
     if(state.stateKind !== "loading" && state.stateKind !== "unknown"){
       await waitForStableTransition(label+" pms panel",()=>Boolean(visiblePmsPanel(label)));
       return state;
     }
     if(pmsEvidenceForStep(stepName)){
       await sleep(700);
       const latestState=pmsPanelState(label);
       if(latestState.stateKind !== "loading" && latestState.stateKind !== "unknown"){
         await waitForStableTransition(label+" pms panel",()=>Boolean(visiblePmsPanel(label)));
         return latestState;
       }
       return {
         ...latestState,
         stateKind:"requestObservedUnresolved",
         pmsObservationTimedOut:true,
         pmsRequestEvidenceObserved:Boolean(pmsRequestForStep(stepName)),
         pmsResponseEvidenceObserved:true
       };
     }
     await sleep(100);
   }
   const timedOutState=pmsPanelState(label);
   return {
     ...timedOutState,
     stateKind:"requestObservedUnresolved",
     pmsObservationTimedOut:true,
     pmsRequestEvidenceObserved:Boolean(pmsRequestForStep(stepName)),
     pmsResponseEvidenceObserved:Boolean(pmsEvidenceForStep(stepName))
   };
 };
  const homeNavigationVisible=()=> {
    const root=currentRootPanel();
    return Boolean(root && elementVisible(root) && byRootText("고객 서비스 관리"));
  };
  const waitForHomeAfterBack=async()=> {
    const start=performance.now();
    while(performance.now()-start<1800){
      if(homeNavigationVisible()) return true;
      await sleep(80);
    }
    return false;
  };
  const ensureHomeRoot=async()=> {
    for(let attempt=0; attempt<6 && !homeNavigationVisible(); attempt+=1){
      const backOrHome=await waitFor(
        ()=>homeNavigationVisible() ? "home" : currentNavigationBackButton(),
        "home root or navigation back",
        1800
      ).catch(()=>null);
      if(backOrHome === "home") return;
      const back=backOrHome;
      if(!back) break;
      await click(back,"back to home root");
      if(await waitForHomeAfterBack()) return;
    }
    if(!homeNavigationVisible()){
      throw new Error("Home navigation did not return to root after submenu back clicks: "+JSON.stringify(navigationDrillEvidence()));
    }
  };
 const detailHasItem=(itemLabel)=>Boolean(detailItemButton(itemLabel) || text().includes(itemLabel));
 const homeNavigationSurfaceVisible=()=>Boolean(document.querySelector(".home-navigation-viewport"));
 const returnFromStageIfNeeded=async(itemLabel)=> {
   if(homeNavigationVisible() || detailHasItem(itemLabel)) return;
   const back=currentStageBackButton();
   if(!back) return;
   await click(back,"back to home navigation");
   await waitFor(()=>homeNavigationSurfaceVisible(),"home navigation after work back",3000);
 };
 const openHomeWorkItem=async(groupLabel,itemLabel)=> {
   await returnFromStageIfNeeded(itemLabel);
   if(!detailHasItem(itemLabel)){
     await ensureHomeRoot();
     await click(byRootText(groupLabel),groupLabel+" root");
     await waitFor(()=>document.querySelector(".home-navigation-viewport.submenu-active"),groupLabel+" detail");
     await sleep(320);
   }
   await waitForStableTransition(groupLabel+" detail",()=>Boolean(detailItemButton(itemLabel)));
   await click(detailItemButton(itemLabel),itemLabel+" item");
   await waitFor(()=>visibleWorkSurface() && text().includes(itemLabel),itemLabel+" work surface");
   await sleep(260);
   await waitForStableTransition(itemLabel+" work surface",()=>Boolean(visibleWorkSurface() && text().includes(itemLabel)));
 };
 const collectLaundryOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("세탁물 관리");
   const token="smoke-laundry-"+Date.now();
   const beforeStorage=await chromeStorageGet("laundryRecords:v1");
   let storageWriteObserved=false;
   try {
     const input=visibleInputByAria(surface,"세탁 서비스 신청 객실 입력");
     const createButton=surface?.querySelector(".laundry-add-row button[aria-label='세탁 블록 생성']");
     const inputObserved=Boolean(input);
     const inputSet=inputObserved && setInputValue(input,token);
     const createEnabled=Boolean(createButton && !createButton.disabled);
     if(inputSet && createEnabled) {
       await click(createButton,"laundry create owner action");
     }
     const ownerStateObserved=await waitForAsync(async()=>{
       const latestSurface=visibleWorkSurfaceByLabel("세탁물 관리");
       const latestStorage=await chromeStorageGet("laundryRecords:v1");
       return Boolean((latestSurface?.innerText || "").includes(token) || storageJsonIncludes(latestStorage,token));
     },"laundry owner state or storage evidence",5000).catch(()=>false);
     const afterStorage=await chromeStorageGet("laundryRecords:v1");
     const boardRecordObserved=Boolean((visibleWorkSurfaceByLabel("세탁물 관리")?.innerText || "").includes(token));
     storageWriteObserved=storageJsonIncludes(afterStorage,token);
     return {
       inputObserved,
       inputSet,
       createEnabled,
       ownerStateObserved:Boolean(ownerStateObserved),
       boardRecordObserved,
       storageWriteObserved,
       ok:Boolean(inputObserved && inputSet && createEnabled && (boardRecordObserved || storageWriteObserved))
     };
   } finally {
     if(beforeStorage.available && storageWriteObserved) {
       await chromeStorageSet(beforeStorage.value || { "laundryRecords:v1":[] });
     }
   }
 };
 const collectSalesOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("매지출 관리");
   const clipboardProbe=installClipboardBoundaryProbe();
   const beforeCallCount=clipboardProbe.calls.length;
   const amountInput=visibleInputByAria(surface,"매지출 금액");
   const amountSet=Boolean(amountInput && setInputValue(amountInput,"12345"));
   await sleep(250);
   const amountRendered=Boolean((surface?.innerText || "").includes("12,345"));
   const categoryButton=visibleInteractiveIn(surface,"소모품");
   const categoryClicked=Boolean(categoryButton) && await click(categoryButton,"sales category owner action").then(()=>true).catch(()=>false);
   await sleep(250);
   const categorySelected=Boolean(categoryButton?.classList.contains("active"));
   const copyButton=visibleInteractiveIn(surface,"매지출 보고 복사");
   const copyActionObserved=Boolean(copyButton);
   const copyActionEnabled=Boolean(copyButton && !copyButton.disabled);
   if(copyActionEnabled) {
     await click(copyButton,"sales copy owner boundary").catch(()=>undefined);
   }
   await sleep(350);
   const copyCalls=clipboardProbe.calls.slice(beforeCallCount);
   const copyBoundaryCalled=copyCalls.length > 0;
   const copyBoundaryContainsInput=copyCalls.some((call)=>/12345|12,345|소모품/.test(call.text || ""));
   const noRecentStorageUiClaim=!/최근 지출|저장된 지출|저장 내역|Recent expense/i.test(surface?.innerText || "");
   return {
     amountInputObserved:Boolean(amountInput),
     amountSet,
     amountRendered,
     categoryObserved:Boolean(categoryButton),
     categoryClicked,
     categorySelected,
     copyActionObserved,
     copyActionEnabled,
     copyBoundaryCalled,
     copyBoundaryContainsInput,
     noRecentStorageUiClaim,
     ok:Boolean(amountSet && amountRendered && categorySelected && copyBoundaryCalled && copyBoundaryContainsInput && noRecentStorageUiClaim)
   };
 };
 const collectAirportVanOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("공항밴 관리");
   const beforeStorage=await chromeStorageGet("workAssistantState");
   const clipboardProbe=installClipboardBoundaryProbe();
   const beforeCallCount=clipboardProbe.calls.length;
   const token="A302-smoke-"+Date.now();
   let storagePersisted=false;
   try {
     const pickupButton=visibleInteractiveIn(surface,"픽업");
     const pickupSelected=Boolean(pickupButton) && await click(pickupButton,"airport van ride direction owner action").then(()=>true).catch(()=>false);
     const details=surface?.querySelector("details.work-disclosure");
     if(details) details.open=true;
     const values={
       "탑승일자":"2026. 06. 05",
       "탑승시각":"14:30",
       "고객명":"Smoke Guest",
       "연락처":"010-0000-0000",
       "객실번호":token,
       "공항":"인천공항",
       "터미널":"T1",
       "항공편명":"KE082",
       "항공 시간":"18:00",
       "인원":"2",
       "대형 수하물":"1",
       "소형 수하물":"0"
     };
     const fieldResults=Object.entries(values).map(([label,value])=>{
       const input=visibleInputByAria(surface,label);
       return { label, observed:Boolean(input), set:Boolean(input && setInputValue(input,value)) };
     });
     const paymentButton=visibleInteractiveIn(surface,"카드");
     const paymentSelected=Boolean(paymentButton) && await click(paymentButton,"airport van payment owner action").then(()=>true).catch(()=>false);
     storagePersisted=await waitForAsync(async()=>{
       const latestStorage=await chromeStorageGet("workAssistantState");
       return storageJsonIncludes(latestStorage,token);
     },"airport van form storage evidence",5000).then(()=>true).catch(()=>false);
     const workLogButton=visibleInteractiveIn(surface,"업무 기록 복사");
     if(workLogButton && !workLogButton.disabled) {
       await click(workLogButton,"airport van work log copy boundary").catch(()=>undefined);
     }
     const guestMessageButton=visibleInteractiveIn(surface,"고객 전달 복사");
     if(guestMessageButton && !guestMessageButton.disabled) {
       await click(guestMessageButton,"airport van guest message copy boundary").catch(()=>undefined);
     }
     await sleep(350);
     const copyCalls=clipboardProbe.calls.slice(beforeCallCount);
     const workLogBoundaryCalled=copyCalls.some((call)=>/\* 공항밴 예약보고/.test(call.text || ""));
     const guestMessageBoundaryCalled=copyCalls.some((call)=>/공항밴 예약 요청 정보/.test(call.text || ""));
     return {
       pickupSelected,
       allFieldsObserved:fieldResults.every((field)=>field.observed),
       allFieldsSet:fieldResults.every((field)=>field.set),
       fieldResults,
       paymentSelected,
       formStoragePersisted:storagePersisted,
       workLogBoundaryCalled,
       guestMessageBoundaryCalled,
       ok:Boolean(pickupSelected && fieldResults.every((field)=>field.set) && paymentSelected && storagePersisted && workLogBoundaryCalled && guestMessageBoundaryCalled)
     };
   } finally {
     if(beforeStorage.available && storagePersisted) {
       await chromeStorageSet(beforeStorage.value || {});
     }
   }
 };
 const collectRoomRemarkOwnerEvidence=()=>{
   const surface=visibleWorkSurfaceByLabel("객실 정보 리마크");
   const unselectedRoomContextVisible=/미선택|객실 선택/.test(surface?.innerText || "");
   const selectedRoomContextObserved=/선택됨/.test(surface?.innerText || "");
   const action=surface?.querySelector(".room-remark-action");
   const wingsActionDisabledWithoutRoom=Boolean(action?.disabled && unselectedRoomContextVisible);
    const wingsDependencyFailureVisible=/WINGS 예약정보창|WINGS 브라우저|객실 정보창을 선택/.test(text());
    const ownerUpsertAttemptObserved=Boolean(action && !action.disabled && /WINGS 리마크 입력/.test(nodeText(action)));
   const preSelectionDisabledDependencyProof=Boolean(unselectedRoomContextVisible && wingsActionDisabledWithoutRoom);
   const postSelectionWingsOrUpsertProof=Boolean(selectedRoomContextObserved && (wingsDependencyFailureVisible || ownerUpsertAttemptObserved));
   return {
     unselectedRoomContextVisible,
     selectedRoomContextObserved,
     wingsActionObserved:Boolean(action),
     wingsActionDisabledWithoutRoom,
     preSelectionDisabledDependencyProof,
     wingsDependencyFailureVisible,
     ownerUpsertAttemptObserved,
     postSelectionWingsOrUpsertProof,
     missingPostSelectionProofReason:postSelectionWingsOrUpsertProof ? "" : "smoke has not proven selected room context followed by WINGS dependency failure or owner upsert attempt",
     ok:Boolean(preSelectionDisabledDependencyProof && postSelectionWingsOrUpsertProof)
   };
 };
 const collectOtaOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("NAVER / STATION 예약입력");
   const fetchButton=visibleInteractiveIn(surface,"예약정보 가져오기");
   const fetchActionObserved=Boolean(fetchButton);
   const fetchActionEnabled=Boolean(fetchButton && !fetchButton.disabled);
   const fetchClicked=fetchActionEnabled && await click(fetchButton,"ota fetch owner dependency action").then(()=>true).catch(()=>false);
   const dependencyOrPreviewObserved=fetchClicked
     ? await waitFor(()=>{
       const currentText=text();
       return Boolean(
         document.querySelector(".ota-preview-card") ||
          /올바른 지점 선택|기존 탭을 새로고침|지점 또는 탭|Chrome 탭|활성 탭|권한|WINGS 이동|Reservation 창|예약정보를 가져오지/.test(currentText)
       );
     },"ota preview or dependency failure evidence",7000).then(()=>true).catch(()=>false)
     : false;
   const previewObserved=Boolean(document.querySelector(".ota-preview-card"));
    const dependencyFailureVisible=/올바른 지점 선택|기존 탭을 새로고침|지점 또는 탭|Chrome 탭|활성 탭|권한|WINGS 이동|Reservation 창|예약정보를 가져오지/.test(text());
   return {
     fetchActionObserved,
     fetchActionEnabled,
     fetchClicked,
     dependencyOrPreviewObserved,
     previewObserved,
     dependencyFailureVisible,
     ok:Boolean(fetchClicked && (previewObserved || dependencyFailureVisible))
   };
 };
 const collectTemplateEditorOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("안내문 편집 / 빠른답변 편집");
   const beforeStorage=await chromeStorageGet("workAssistantState");
   const token="Smoke title "+Date.now();
   let storagePersisted=false;
   try {
     const titleInput=visibleInputByAria(surface,"템플릿 제목");
     const bodyInput=visibleInputByAria(surface,"템플릿 본문");
     const titleSet=Boolean(titleInput && setInputValue(titleInput,token));
     const bodySet=Boolean(bodyInput && setInputValue(bodyInput,"Smoke body"));
     const saveButton=visibleInteractiveIn(surface,"저장하기");
     const resetButton=visibleInteractiveIn(surface,"템플릿 설정 초기화");
     const saveClicked=Boolean(saveButton && !saveButton.disabled) && await click(saveButton,"template editor save owner boundary").then(()=>true).catch(()=>false);
     storagePersisted=await waitForAsync(async()=>{
       const latestStorage=await chromeStorageGet("workAssistantState");
       return storageJsonIncludes(latestStorage,token);
     },"template editor storage evidence",5000).then(()=>true).catch(()=>false);
     return {
       titleInputObserved:Boolean(titleInput),
       bodyInputObserved:Boolean(bodyInput),
       titleSet,
       bodySet,
       saveObserved:Boolean(saveButton),
       saveClicked,
       resetObserved:Boolean(resetButton),
       storagePersisted,
       ok:Boolean(titleSet && bodySet && saveClicked && resetButton && storagePersisted)
     };
   } finally {
     if(beforeStorage.available && storagePersisted) {
       await chromeStorageSet(beforeStorage.value || {});
     }
   }
 };
 const collectWorkFormEditorOwnerEvidence=async()=>{
   const surface=visibleWorkSurfaceByLabel("업무 양식 편집");
   const beforeStorage=await chromeStorageGet("workAssistantState");
   const token="15:00-smoke-"+Date.now();
   let storagePersisted=false;
   try {
     const input=[...(surface?.querySelectorAll("input") || [])].find((node)=>elementVisible(node));
     const inputSet=Boolean(input && setInputValue(input,token));
     storagePersisted=await waitForAsync(async()=>{
       const latestStorage=await chromeStorageGet("workAssistantState");
       return storageJsonIncludes(latestStorage,token);
     },"work form editor storage evidence",5000).then(()=>true).catch(()=>false);
     return {
       editableInputObserved:Boolean(input),
       inputSet,
       storagePersisted,
       ok:Boolean(inputSet && storagePersisted)
     };
   } finally {
     if(beforeStorage.available && storagePersisted) {
       await chromeStorageSet(beforeStorage.value || {});
     }
   }
 };
  const collectWorkReportOwnerEvidence=async()=>{
    const surface=visibleWorkSurfaceByLabel("업무보고 양식");
    const clipboardProbe=installClipboardBoundaryProbe();
   const beforeCallCount=clipboardProbe.calls.length;
   const copyButton=[...(surface?.querySelectorAll(".copy-action") || [])].find((node)=>elementVisible(node) && !node.disabled);
   const templateCard=copyButton?.closest(".template-card");
   const templateTitle=(templateCard?.querySelector("strong")?.textContent || "").trim();
   if(copyButton) {
     await click(copyButton,"work report copy owner boundary").catch(()=>undefined);
   }
   await sleep(350);
   const copyCalls=clipboardProbe.calls.slice(beforeCallCount);
   const renderedBodyEvidencePattern=/주간\/야간 보고|코엑스점 일일업무 보고|예약 받은 날짜\s*탑승일자|근무자\s*:|R\/A 대조|공용부 확인 보고/;
   const copyBoundaryContainsTemplateOwnerEvidence=copyCalls.some((call)=>{
     const output=call.text || "";
     return Boolean((templateTitle && output.includes(templateTitle)) || renderedBodyEvidencePattern.test(output));
   });
   return {
     templateListObserved:Boolean(surface?.querySelector(".accordion-stack")),
     enabledCopyActionObserved:Boolean(copyButton),
     templateTitle,
     copyBoundaryCalled:copyCalls.length > 0,
     copyBoundaryHasRenderedText:copyCalls.some((call)=>(call.text || "").trim().length > 0),
     copyBoundaryContainsTemplateOwnerEvidence,
      ok:Boolean(surface?.querySelector(".accordion-stack") && copyButton && copyBoundaryContainsTemplateOwnerEvidence)
    };
  };
  const hiddenFailureState=()=>{
    const shell=document.querySelector(".app-shell");
    return {
      kind:shell?.getAttribute("data-hidden-failure-kind") || "",
      source:shell?.getAttribute("data-hidden-failure-source") || "",
      visible:shell?.getAttribute("data-hidden-failure-visible") || ""
    };
  };
  const collectInlineCopyOwnerEvidence=async(leafLabel)=>{
    const detail=currentDetailPanel();
    const clipboardProbe=installClipboardBoundaryProbe();
    const beforeCallCount=clipboardProbe.calls.length;
    const leafHost=[...(detail?.querySelectorAll(".home-submenu-entry, details") || [])]
      .find((node)=>elementVisible(node) && nodeText(node).includes(leafLabel));
    const details=leafHost?.matches?.("details") ? leafHost : leafHost?.closest?.("details");
    const summary=details?.querySelector("summary");
    let accordionOpened=false;
    if(details && summary && !details.open) {
      await click(summary,leafLabel+" template accordion").then(()=>{ accordionOpened=true; }).catch(()=>undefined);
      await sleep(250);
    }
    const copyButtons=[...(leafHost?.querySelectorAll(".home-template-copy") || [])]
      .filter((node)=>elementVisible(node) && !node.disabled);
    const attemptedButtons=[];
    let clickAttempted=false;
    let clickSucceeded=false;
    let lastFailure=hiddenFailureState();
    for (const copyButton of copyButtons.slice(0,3)) {
      const beforeButtonCallCount=clipboardProbe.calls.length;
      clickAttempted=true;
      attemptedButtons.push(copyButton.getAttribute("aria-label") || nodeText(copyButton));
      const clicked=await click(copyButton,leafLabel+" inline copy owner boundary").then(()=>true).catch(()=>false);
      clickSucceeded=clickSucceeded || clicked;
      await sleep(350);
      lastFailure=hiddenFailureState();
      if(clipboardProbe.calls.length > beforeButtonCallCount) break;
      if(!["requiredVariableMissing","pmsRequiredValueMissing"].includes(lastFailure.kind)) break;
    }
    const copyCalls=clipboardProbe.calls.slice(beforeCallCount);
    const copiedText=copyCalls.map((call)=>call.text || "").join("\\n");
    const copyBoundaryCalled=copyCalls.length > 0;
    const copyBoundaryHasRenderedText=copyCalls.some((call)=>(call.text || "").trim().length > 0);
    const copyBoundaryHasUnresolvedToken=/\\{[a-zA-Z0-9_]+\\}|\\[[^\\]]+\\]|undefined|null/.test(copiedText);
    const requiredValueFailureObserved=!copyBoundaryCalled && ["requiredVariableMissing","pmsRequiredValueMissing"].includes(lastFailure.kind);
    const genericSuccessVisible=/복사되었습니다|복사됨|저장됨|입력됨/.test(text());
    return {
      leafLabel,
      leafLabelVisible:Boolean(leafHost),
      accordionOpened,
      copyActionObserved:copyButtons.length > 0,
      attemptedButtons,
      clickAttempted,
      clickSucceeded,
      copyBoundaryCalled,
      copyBoundaryHasRenderedText,
      copyBoundaryHasUnresolvedToken,
      requiredValueFailureObserved,
      hiddenFailure:lastFailure,
      noGenericSuccessVisible:!genericSuccessVisible,
      noSeparateWorkSurfaceClaim:!document.querySelector(".work-surface"),
      ok:Boolean(
        leafHost &&
        copyButtons.length > 0 &&
        clickAttempted &&
        clickSucceeded &&
        !genericSuccessVisible &&
        !document.querySelector(".work-surface") &&
        (
          (copyBoundaryCalled && copyBoundaryHasRenderedText && !copyBoundaryHasUnresolvedToken) ||
          requiredValueFailureObserved
        )
      )
    };
  };
  const openSubmenu=async(label)=>{
   await ensureHomeRoot();
   await waitFor(()=>byRootText(label), label+" root");
  await click(byRootText(label), label);
  await waitFor(()=>document.querySelector(".home-navigation-viewport.submenu-active"), label+" detail");
  await sleep(260);
  await waitForStableTransition(label+" detail",()=>visibleDetailItems().length > 0);
   const detail=document.querySelector(".detail-panel");
   const visual=shellVisualState();
   const state={
     label,
     items: visibleDetailItems(),
     languageVisible: Boolean(detail?.querySelector(".home-language-strip")),
     copyButtons: detail?.querySelectorAll(".home-template-copy").length || 0,
     logoVisibleWhenLocked: visual.logoDisabled && visual.logoOpacity === "1",
     usesForwardMotion: visual.navigationDirection === "forward",
     usesContractTransition:
       /transform/.test(visual.navigationTransition) &&
       /0\.6s|600ms/.test(visual.navigationTransition) &&
       /cubic-bezier\(0\.54,\s*0\.01,\s*0\.19,\s*0\.93\)/.test(visual.navigationTransition)
   };
    await sleep(120);
    return state;
  };
 const overflow=()=>[...document.querySelectorAll("body *")]
   .filter((element)=>!element.closest("[aria-hidden='true'],.home-navigation-track,.home-navigation-viewport,.visually-hidden"))
   .map((element)=>{
     const rect=element.getBoundingClientRect();
     return {
       tag: element.tagName,
       cls: typeof element.className === "string" ? element.className : "",
       text: (element.innerText || element.getAttribute("aria-label") || "").trim().slice(0,80),
       left: Math.round(rect.left),
       right: Math.round(rect.right),
       width: Math.round(rect.width),
       viewportWidth: document.documentElement.clientWidth
     };
   })
   .filter((item)=>item.width > 0 && (item.left < -1 || item.right > item.viewportWidth + 1))
   .slice(0,20);
 await waitFor(()=>document.querySelector(".app-shell"),"Svelte app shell");
 await sleep(500);
 const expectedRoot=["고객 안내문","빠른 문의 답변","고객 서비스 관리","업무 관리","템플릿 / 양식 편집"];
 const submenuSurfaceByLabel={
   "고객 안내문":"diagnostic-customer-notice-group",
   "빠른 문의 답변":"diagnostic-quick-answer-group",
   "고객 서비스 관리":"diagnostic-customer-service-group",
   "업무 관리":"diagnostic-work-group",
   "템플릿 / 양식 편집":"diagnostic-editor-group"
 };
 const pmsBottomLabels=["체크인 목록","체크아웃 목록","객실 선택"];
  const initial=text();
  const result={
   href: location.href,
   initialHasHome: expectedRoot.every((label)=>initial.includes(label)),
   bannedInitial: /현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|The Gangnan|dropdown|복사되었습니다\.|복사됨|입력됨|저장됨|YYYY\.MM\.DD|HH:MM/.test(initial),
   steps: [],
   menuState: {
     root: visibleRootItems(),
     bottomBeforeBranch: buttonStates(".home-fixed-bottom-bar button"),
     bottomAfterBranch: [],
     groups: [],
     pms: null
   },
   runtimeErrors,
   pmsStatus: "",
   pmsBackendConnected: false,
   pmsSurfaceFetchEvidence: [],
   pmsSurfaces: [],
   visiblePlaceholderAttributes: [],
   placeholderAttributesAbsent: false,
   coveredSurfaceIds: [],
   missingSurfaceIds: [...expectedSurfaceIds]
 };
  partialResult=result;
  window.__EXTENSION_SMOKE_PARTIAL_RESULT__=result;
 result.steps.push({
   step:"home",
   surfaceCovered: true,
   hasFiveRootGroups: result.menuState.root.length === 5,
    exactRootRowCount: result.menuState.root.length === expectedRoot.length,
    rootLabelsMatchContract: expectedRoot.every((label,index)=>result.menuState.root[index] === label),
    allRootRowsFullyVisible: rootVisibilityForLabels(expectedRoot).every((item)=>item.fullyVisible),
    rootVisibility: rootVisibilityForLabels(expectedRoot),
    navigationViewportDoesNotMaskContent: shellVisualState().navigationMask === "none",
    sidepanelRootStaysSidepanelFormat: sidepanelRootStaysSidepanelFormat()
  });
 result.steps.push({
   step:"diagnostic-storage-state",
   noStorageCorruptionBanner: !/저장된 데이터 손상이 발견되었습니다/.test(initial),
   noLegacyRecoveryCopy: !/복구를 시도하여 이전 데이터/.test(initial)
 });
 await click(document.querySelector("[aria-label='지점 선택']"),"branch trigger");
 await waitFor(()=>document.querySelector("#branch-selection-popup"),"branch popup");
 const popupText=text();
 await click(branchButton("The Gangnam"),"The Gangnam branch");
 await waitFor(()=>!document.querySelector("#branch-selection-popup"),"branch popup closed");
 const logoAlt=document.querySelector(".header-logo-mark img")?.getAttribute("alt") || "";
 result.menuState.bottomAfterBranch=buttonStates(".home-fixed-bottom-bar button");
 result.steps.push({
   step:"diagnostic-branch-picker-lock",
   hasThreeBranches:["The Coex","The Gangnam","The Seolleung"].every((label)=>popupText.includes(label)),
   selectedGangnam:/Gangnam/.test(logoAlt),
   logoFullOpacity:shellVisualState().logoOpacity === "1",
   logoNoFilter:shellVisualState().logoFilter === "none" || shellVisualState().logoFilter === "",
   logoImageNoFilter:shellVisualState().logoImageFilter === "none" || shellVisualState().logoImageFilter === "",
   logoVisibleWithoutFilter:shellVisualState().logoVisibleWithoutFilter,
   logoAlt
 });
 result.steps.push({ step:"branch-selected", selectedGangnam:/Gangnam/.test(logoAlt), logoAlt });
 result.steps.push({
   step:"bottom-menu-state",
   pmsDisabledBeforeBranch: result.menuState.bottomBeforeBranch
     .filter((item)=>pmsBottomLabels.includes(item.text))
     .every((item)=>item.disabled),
   settingsEnabledBeforeBranch: result.menuState.bottomBeforeBranch
     .some((item)=>item.text === "설정" && !item.disabled),
   allBottomEnabledAfterBranch: result.menuState.bottomAfterBranch.every((item)=>!item.disabled)
 });
 for (const label of expectedRoot) {
   const groupState=await openSubmenu(label);
   result.menuState.groups.push(groupState);
   const submenuSurfaceId=submenuSurfaceByLabel[label];
   if(submenuSurfaceId){
     const submenuStep={
       step:submenuSurfaceId,
       hasSubmenuItems:groupState.items.length > 0,
       logoVisibleWhenLocked:groupState.logoVisibleWhenLocked,
       usesForwardMotion:groupState.usesForwardMotion,
       usesContractTransition:groupState.usesContractTransition
     };
     if(label === "고객 서비스 관리"){
       const serviceLabels=["세탁물 관리","매지출 관리","공항밴 관리"];
       const serviceVisibility=visibilityForLabels(serviceLabels);
       Object.assign(submenuStep,{
         hasLaundry:groupState.items.includes("세탁물 관리"),
         hasSales:groupState.items.includes("매지출 관리"),
         hasAirportVan:groupState.items.includes("공항밴 관리"),
         exactServiceRowCount:groupState.items.length === serviceLabels.length,
         allServiceRowsFullyVisible:serviceVisibility.every((item)=>item.fullyVisible),
         serviceVisibility
       });
     }
     if(label === "업무 관리"){
      const workLabels=["객실 정보 리마크","NAVER / STATION 예약입력","업무보고 양식"];
       const workVisibility=visibilityForLabels(workLabels);
       Object.assign(submenuStep,{
        hasRoomRemark:groupState.items.includes("객실 정보 리마크"),
         hasOta:groupState.items.includes("NAVER / STATION 예약입력"),
         hasWorkReport:groupState.items.includes("업무보고 양식"),
         exactWorkRowCount:groupState.items.length === workLabels.length,
         allWorkRowsFullyVisible:workVisibility.every((item)=>item.fullyVisible),
         workVisibility
       });
     }
     if(label === "템플릿 / 양식 편집"){
      const editorLabels=["안내문 편집 / 빠른답변 편집","업무 양식 편집"];
       const editorVisibility=visibilityForLabels(editorLabels);
       Object.assign(submenuStep,{
        hasTemplateEdit:groupState.items.includes("안내문 편집 / 빠른답변 편집"),
        hasFormEdit:groupState.items.includes("업무 양식 편집"),
         exactEditorRowCount:groupState.items.length === editorLabels.length,
         allEditorRowsFullyVisible:editorVisibility.every((item)=>item.fullyVisible),
         editorVisibility
       });
     }
     result.steps.push(submenuStep);
   }
   if (label === "고객 안내문") {
     const customerGuidanceLeaves=[
       { step:"customer-checkin-notice", label:"체크인 안내문" },
       { step:"customer-checkout-notice", label:"체크아웃 안내문" },
       { step:"customer-room-notice", label:"객실 관련 안내문" },
       { step:"customer-fee-notice", label:"각종 요금 관련 안내문" }
      ];
      for (const leaf of customerGuidanceLeaves) {
        const copyOwnerEvidence=await collectInlineCopyOwnerEvidence(leaf.label);
        result.steps.push({
          step:leaf.step,
          leafLabelVisible:copyOwnerEvidence.leafLabelVisible,
          hasInlineTemplateRows: document.querySelectorAll(".home-template-row,.home-template-row-direct").length > 0,
          hasCopyActions: document.querySelectorAll(".home-template-copy").length > 0,
          ownerInteractionEvidenceObserved:copyOwnerEvidence.ok,
          copyOwnerEvidence,
          noSeparateWorkSurfaceClaim: copyOwnerEvidence.noSeparateWorkSurfaceClaim,
          surfaceCovered:copyOwnerEvidence.ok
        });
      }
     result.steps.push({
       step:"diagnostic-customer-notice-group",
       hasInlineTemplateRows: document.querySelectorAll(".home-template-row,.home-template-row-direct").length > 0,
       hasCopyActions: document.querySelectorAll(".home-template-copy").length > 0,
       noSeparateWorkSurfaceClaim: !document.querySelector(".work-surface")
     });
   }
   if (label === "빠른 문의 답변") {
     const quickReplyLeaves=[
       { step:"quick-rental-reply", label:"물품 대여 문의" },
       { step:"quick-lost-item-reply", label:"분실물 문의" },
       { step:"quick-room-visit-reply", label:"객실 방문 예정" }
      ];
      for (const leaf of quickReplyLeaves) {
        const copyOwnerEvidence=await collectInlineCopyOwnerEvidence(leaf.label);
        result.steps.push({
          step:leaf.step,
          leafLabelVisible:copyOwnerEvidence.leafLabelVisible,
          hasInlineTemplateRows: document.querySelectorAll(".home-template-row,.home-template-row-direct").length > 0,
          hasCopyActions: document.querySelectorAll(".home-template-copy").length > 0,
          ownerInteractionEvidenceObserved:copyOwnerEvidence.ok,
          copyOwnerEvidence,
          noSeparateWorkSurfaceClaim: copyOwnerEvidence.noSeparateWorkSurfaceClaim,
          surfaceCovered:copyOwnerEvidence.ok
        });
      }
     result.steps.push({
       step:"diagnostic-quick-answer-group",
       hasInlineTemplateRows: document.querySelectorAll(".home-template-row,.home-template-row-direct").length > 0,
       hasCopyActions: document.querySelectorAll(".home-template-copy").length > 0,
       noSeparateWorkSurfaceClaim: !document.querySelector(".work-surface")
     });
   }
   if (label === "고객 서비스 관리") {
     const serviceLabels=["세탁물 관리","매지출 관리","공항밴 관리"];
     const serviceVisibility=visibilityForLabels(serviceLabels);
     result.steps.push({
       step:"diagnostic-customer-service-group",
       hasLaundryRoute: text().includes("세탁물 관리"),
       hasSalesRoute: text().includes("매지출 관리"),
       hasAirportVanRoute: text().includes("공항밴 관리"),
       exactServiceRowCount:groupState.items.length === serviceLabels.length,
       allServiceRowsFullyVisible: serviceVisibility.every((item)=>item.fullyVisible),
       serviceVisibility
     });
   }
   if (label === "업무 관리") {
     const workLabels=["객실 정보 리마크","NAVER / STATION 예약입력","업무보고 양식"];
     const workVisibility=visibilityForLabels(workLabels);
     result.steps.push({
       step:"diagnostic-work-group",
       hasRoomRemarkRoute: text().includes("객실 정보 리마크"),
       hasOtaRoute: text().includes("NAVER / STATION 예약입력"),
       hasWorkReportRoute: text().includes("업무보고 양식"),
       exactWorkRowCount:groupState.items.length === workLabels.length,
       allWorkRowsFullyVisible:workVisibility.every((item)=>item.fullyVisible),
       workVisibility
     });
   }
   if (label === "템플릿 / 양식 편집") {
     const editorLabels=["안내문 편집 / 빠른답변 편집","업무 양식 편집"];
     const editorVisibility=visibilityForLabels(editorLabels);
     result.steps.push({
       step:"diagnostic-editor-group",
       hasTemplateSettingsRoute: text().includes("안내문 편집 / 빠른답변 편집"),
       hasFormSettingsRoute: text().includes("업무 양식 편집"),
       exactEditorRowCount:groupState.items.length === editorLabels.length,
       allEditorRowsFullyVisible:editorVisibility.every((item)=>item.fullyVisible),
       editorVisibility
     });
   }
 }
 result.steps.push({
   step:"full-menu-state",
   capturedAllRootGroups: result.menuState.groups.length === expectedRoot.length,
   allSubmenusHaveItems: result.menuState.groups.every((group)=>group.items.length > 0),
   shellLogoStaysVisibleWhileSubmenuLocked: result.menuState.groups.every((group)=>group.logoVisibleWhenLocked),
   allSubmenusUseForwardMotion: result.menuState.groups.every((group)=>group.usesForwardMotion),
   allSubmenusUseContractTransition: result.menuState.groups.every((group)=>group.usesContractTransition),
   accordionGroupsHaveLanguage: result.menuState.groups
     .filter((group)=>["고객 안내문","빠른 문의 답변"].includes(group.label))
     .every((group)=>group.languageVisible && group.copyButtons > 0),
   workGroupsDoNotShowLanguage: result.menuState.groups
     .filter((group)=>!["고객 안내문","빠른 문의 답변"].includes(group.label))
     .every((group)=>!group.languageVisible && group.copyButtons === 0)
 });
 await click(footerButton("설정"),"settings footer");
 await waitFor(()=>/안내문 편집 \/ 빠른답변 편집/.test(text()) && /업무 양식 편집/.test(text()),"settings utility");
 const settingsText=text();
 result.steps.push({ step:"diagnostic-settings-menu", hasTemplateEdit:settingsText.includes("안내문 편집 / 빠른답변 편집"), hasFormEdit:settingsText.includes("업무 양식 편집"), noEmptyPlaceholder:!settingsText.includes("현재 설정 항목 없음") });
 await click(byText("안내문 편집 / 빠른답변 편집"),"template settings route");
 await waitFor(()=>/템플릿 설정 초기화/.test(text()),"template settings");
 const templateEditorOwnerEvidence=await collectTemplateEditorOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("notice-reply-editor"),
   hasReset:text().includes("템플릿 설정 초기화"),
   editableOwnerEvidenceObserved:templateEditorOwnerEvidence.ok,
   templateEditorOwnerEvidence,
   surfaceCovered:templateEditorOwnerEvidence.ok
 });
 await click(document.querySelector("[aria-label$='뒤로가기']"),"back from template settings");
 await waitFor(()=>/고객 서비스 관리/.test(text()),"home after template settings");
 await click(footerButton("설정"),"settings footer for form settings");
 await waitFor(()=>/안내문 편집 \/ 빠른답변 편집/.test(text()) && /업무 양식 편집/.test(text()),"settings utility for form");
 await click(byText("업무 양식 편집"),"form settings route");
 await waitFor(()=>visibleWorkSurfaceByLabel("업무 양식 편집"),"form settings");
 const workFormEditorOwnerEvidence=await collectWorkFormEditorOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("work-form-editor"),
   hasFormSurface:/업무 양식 편집/.test(text()),
   editableOwnerEvidenceObserved:workFormEditorOwnerEvidence.ok,
   workFormEditorOwnerEvidence,
   surfaceCovered:workFormEditorOwnerEvidence.ok
 });
  const customerServiceGroupState=await openSubmenu("고객 서비스 관리");
  const customerServiceLabels=["세탁물 관리","매지출 관리","공항밴 관리"];
  const customerServiceVisibility=visibilityForLabels(customerServiceLabels);
  result.steps.push({
    step:"customer-service-submenu",
    hasLaundry:customerServiceGroupState.items.includes("세탁물 관리"),
    hasSales:customerServiceGroupState.items.includes("매지출 관리"),
    hasAirportVan:customerServiceGroupState.items.includes("공항밴 관리"),
   allServiceRowsFullyVisible:customerServiceVisibility.every((item)=>item.fullyVisible),
   customerServiceVisibility,
   hasBack:Boolean(document.querySelector("[aria-label$='뒤로가기']"))
 });
 await openHomeWorkItem("고객 서비스 관리","세탁물 관리");
 const laundryOwnerEvidence=await collectLaundryOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("laundry-management"),
   hasRunningBoard:/진행 중/.test(text()),
   hasAddControl:/세탁 서비스 신청 객실 입력/.test(text()),
   hasScheduled:/세탁 예정/.test(text()),
   ownerInteractionEvidenceObserved:laundryOwnerEvidence.ok,
   laundryOwnerEvidence,
   surfaceCovered:laundryOwnerEvidence.ok
 });
 await openHomeWorkItem("고객 서비스 관리","매지출 관리");
 const salesOwnerEvidence=await collectSalesOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("sales-management"),
   firstScreenBeforeScroll:screenStageScrollTop() <= 1,
   hasAmountInput:Boolean(document.querySelector(".sales-amount-panel input")),
   amountLabelVisibleBeforeScroll:fullyVisibleInStage(".sales-amount-panel label"),
   amountInputVisibleBeforeScroll:fullyVisibleInStage(".sales-amount-panel input"),
   hasCategoryControls:document.querySelectorAll(".sales-category-panel button").length >= 4,
   visibleCategoryControls:visibleCount(".sales-category-panel button"),
   categoryLabelVisibleBeforeScroll:fullyVisibleInStage(".sales-category-panel > strong"),
   categoryHeaderVisibleBeforeScroll:fullyVisibleInStage(".sales-category-panel > strong"),
   categoryControlsVisibleBeforeScroll:allFullyVisibleInStage(".sales-category-panel button"),
   categoryChipsVisibleBeforeScroll:allFullyVisibleInStage(".sales-category-panel button"),
    hasCopyAction:/매지출 보고 복사/.test(text()),
    ownerInteractionEvidenceObserved:salesOwnerEvidence.ok,
    salesOwnerEvidence,
    surfaceCovered:salesOwnerEvidence.ok
 });
 await openHomeWorkItem("고객 서비스 관리","공항밴 관리");
 const airportVanOwnerEvidence=await collectAirportVanOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("airport-van-management"),
   hasRideSegment:/픽업/.test(text()) && /샌딩/.test(text()),
   hasRouteCard:Boolean(document.querySelector(".airport-route-card")),
   hasCopyActions:/업무 기록 복사/.test(text()) && /고객 전달 복사/.test(text()),
   ownerInteractionEvidenceObserved:airportVanOwnerEvidence.ok,
   airportVanOwnerEvidence,
   surfaceCovered:airportVanOwnerEvidence.ok
 });
 await openHomeWorkItem("업무 관리","객실 정보 리마크");
 const roomRemarkOwnerEvidence=collectRoomRemarkOwnerEvidence();
 const roomRemarkSurface=visibleWorkSurfaceByLabel("객실 정보 리마크");
 const roomRemarkText=roomRemarkSurface?.innerText || "";
  result.steps.push({
    ...workSurfaceState("room-remark"),
    hasRoomContext:/객실 선택|선택됨|미선택/.test(roomRemarkText),
    hasRoomRemarkHero:Boolean(roomRemarkSurface?.querySelector(".room-remark-hero h1")),
    hasInventoryControls:Boolean(roomRemarkSurface?.querySelector(".room-inventory-grid .inventory-count-stepper")),
    hasBusinessRemarkItems:["제공 카드키","대여물품","메디컬블룸","스톤하우스"].every((label)=>roomRemarkText.includes(label)),
    hasAdditionalRemarksPanel:Boolean(roomRemarkSurface?.querySelector(".room-additional-panel")),
    hasWingsAction:Boolean(roomRemarkSurface?.querySelector(".room-remark-action")),
    noDemoInventoryText:!/Towels|Water|Bedding|Room 402|Occupied/.test(roomRemarkText),
    noInputPlaceholders:inputPlaceholders(roomRemarkSurface || document).length === 0,
    ownerInteractionEvidenceObserved:roomRemarkOwnerEvidence.ok,
    roomRemarkOwnerEvidence,
    surfaceCovered:roomRemarkOwnerEvidence.ok
  });
 await openHomeWorkItem("업무 관리","NAVER / STATION 예약입력");
 const otaOwnerEvidence=await collectOtaOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("ota-reservation-input"),
   hasSourceSegment:/NAVER/.test(text()) && /STATION/.test(text()),
   hasFetchCard:Boolean(document.querySelector(".ota-fetch-card")),
   hasExtractAction:/예약정보 가져오기/.test(text()),
   ownerInteractionEvidenceObserved:otaOwnerEvidence.ok,
   otaOwnerEvidence,
   surfaceCovered:otaOwnerEvidence.ok
 });
 await openHomeWorkItem("업무 관리","업무보고 양식");
 const workReportOwnerEvidence=await collectWorkReportOwnerEvidence();
 result.steps.push({
   ...workSurfaceState("work-report-form"),
   hasTemplateList:Boolean(document.querySelector(".accordion-stack")),
   hasCopyActions:document.querySelectorAll(".copy-action").length > 0,
   ownerInteractionEvidenceObserved:workReportOwnerEvidence.ok,
   workReportOwnerEvidence,
   surfaceCovered:workReportOwnerEvidence.ok
 });
 await click(document.querySelector("[aria-label$='뒤로가기']"),"back to home before pms");
 await waitFor(()=>/체크인 목록/.test(text()),"home before pms");
 activePmsSurfaceStep="pms-checkin-list";
 await click(footerButton("체크인 목록"),"checkin pms panel");
 let checkinPmsState;
 try {
   checkinPmsState={ ...(await waitForPmsPanelState("체크인 목록","pms-checkin-list")), surfaceStep:"pms-checkin-list" };
 } finally {
   activePmsSurfaceStep="";
 }
 result.pmsStatus=checkinPmsState.status;
 result.menuState.pms=checkinPmsState;
 result.pmsSurfaces.push(checkinPmsState);
 result.steps.push({
   step:"pms-checkin-list",
   hasPmsPanel: checkinPmsState.panelTitleVisible,
   hasResolvedPmsState:["backendFailure","empty","rows"].includes(checkinPmsState.stateKind),
   distinguishesPmsState:["backendFailure","empty","rows"].includes(checkinPmsState.stateKind),
   pmsBackendState: checkinPmsState.stateKind,
   pmsFailureTextDoesNotCountAsBackendSuccess: checkinPmsState.noFailureTextCountsAsSuccess,
   noInputPlaceholders: inputPlaceholders(visiblePmsPanel("체크인 목록") || document).length === 0,
   noFakePmsRecordText: checkinPmsState.noFakePmsRecordText,
   state: checkinPmsState
 });
 for (const [label, stepName] of [["체크아웃 목록","pms-checkout-list"],["객실 선택","pms-room-select"]]) {
   await click(document.querySelector("[aria-label$='뒤로가기']"),"back before "+label);
   await waitFor(()=>/체크인 목록/.test(text()),"home before "+label);
   activePmsSurfaceStep=stepName;
   await click(footerButton(label),label+" pms panel");
   let pmsState;
   try {
     pmsState={ ...(await waitForPmsPanelState(label,stepName)), surfaceStep:stepName };
   } finally {
     activePmsSurfaceStep="";
   }
   result.pmsSurfaces.push(pmsState);
   result.steps.push({
     step: stepName,
     hasPmsPanel: pmsState.panelTitleVisible,
     hasResolvedPmsState:["backendFailure","empty","rows"].includes(pmsState.stateKind),
     distinguishesPmsState:["backendFailure","empty","rows"].includes(pmsState.stateKind),
     pmsBackendState: pmsState.stateKind,
     pmsFailureTextDoesNotCountAsBackendSuccess: pmsState.noFailureTextCountsAsSuccess,
     noInputPlaceholders: inputPlaceholders(visiblePmsPanel(label) || document).length === 0,
     noFakePmsRecordText: pmsState.noFakePmsRecordText,
     state: pmsState
   });
 }
 await Promise.allSettled(pendingPmsFetchEvidence);
 result.pmsSurfaceFetchEvidence=pmsSurfaceFetchEvidence;
 result.pmsBackendConnected=result.pmsSurfaces.every((surface)=>surface.pmsBackendConnected === true);
 result.coveredSurfaceIds=[...new Set(productSurfaceCoverageSteps())];
 result.missingSurfaceIds=expectedSurfaceIds.filter((surfaceId)=>!result.coveredSurfaceIds.includes(surfaceId));
 const finalText=text();
 result.visiblePlaceholderAttributes=visiblePlaceholderAttributes(document);
 result.placeholderAttributesAbsent=result.visiblePlaceholderAttributes.length === 0;
 result.noHorizontalPageOverflow=document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.body.scrollWidth <= document.documentElement.clientWidth + 1;
 result.overflowItems=overflow();
 result.bannedFinal=/현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|The Gangnan|복사되었습니다\.|복사됨|입력됨|저장됨|YYYY\.MM\.DD|HH:MM/.test(finalText);
 result.ok=result.initialHasHome && !result.bannedInitial && runtimeErrors.length === 0 && result.noHorizontalPageOverflow && result.placeholderAttributesAbsent && result.missingSurfaceIds.length === 0 && !result.bannedFinal && result.steps.every((step)=>Object.entries(step).every(([key,value])=>key === "logoAlt" || typeof value !== "boolean" || value));
 return JSON.stringify(result);
 } catch (error) {
   const message=error instanceof Error ? error.message : String(error);
   await Promise.allSettled(pendingPmsFetchEvidence);
   const partial=partialResult || {};
   const partialSteps=Array.isArray(partial.steps) ? partial.steps : [];
   const coveredSurfaceIds=[...new Set(partialSteps
     .filter((step)=>expectedSurfaceIds.includes(step.step) && step.surfaceCovered === true)
     .map((step)=>step.step))];
   const missingSurfaceIds=expectedSurfaceIds.filter((surfaceId)=>!coveredSurfaceIds.includes(surfaceId));
   const visiblePlaceholderAttributesOnFailure=[...document.querySelectorAll("input[placeholder],textarea[placeholder]")]
     .filter((element)=>{
       const style=getComputedStyle(element);
       const rect=element.getBoundingClientRect();
       return style.display !== "none" &&
         style.visibility !== "hidden" &&
         rect.width > 0 &&
         rect.height > 0 &&
         rect.bottom > 0 &&
         rect.right > 0 &&
         rect.top < window.innerHeight &&
         rect.left < window.innerWidth;
     })
     .map((element)=>({
       tag:element.tagName.toLowerCase(),
       placeholder:element.getAttribute("placeholder") || "",
       ariaLabel:element.getAttribute("aria-label") || ""
     }));
   const noHorizontalPageOverflowOnFailure=
     document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 &&
     document.body.scrollWidth <= document.documentElement.clientWidth + 1;
   return JSON.stringify({
     href: location.href,
     ok: false,
     error: message,
     failureKind: classifyFailure(message),
     progress: window.__EXTENSION_SMOKE_PROGRESS__ || "",
     text: (document.body?.innerText || "").slice(0,1200),
     html: (document.body?.innerHTML || "").slice(0,800),
     runtimeErrors,
     initialHasHome: partial.initialHasHome === true,
     bannedInitial: partial.bannedInitial === true,
     steps: partialSteps,
     menuState: partial.menuState || null,
     pmsStatus: typeof partial.pmsStatus === "string" ? partial.pmsStatus : "",
     pmsBackendConnected: false,
     pmsSurfaceFetchEvidence,
     pmsSurfaces: Array.isArray(partial.pmsSurfaces) ? partial.pmsSurfaces : [],
     coveredSurfaceIds,
     missingSurfaceIds,
     noHorizontalPageOverflow: noHorizontalPageOverflowOnFailure,
    overflowItems: [],
    visiblePlaceholderAttributes: visiblePlaceholderAttributesOnFailure,
    placeholderAttributesAbsent: visiblePlaceholderAttributesOnFailure.length === 0,
    bannedFinal: false
   });
 }
})()
`;
}

function watchdogSmokeExpression(): string {
  return String.raw`
Promise.race([
  ${smokeExpression()},
  new Promise((resolve) => setTimeout(() => {
    const expectedSurfaceIds=${JSON.stringify(SMOKE_SURFACE_IDS)};
    const partial=window.__EXTENSION_SMOKE_PARTIAL_RESULT__ || {};
    const partialSteps=Array.isArray(partial.steps) ? partial.steps : [];
    const coveredSurfaceIds=[...new Set(partialSteps
      .filter((step)=>expectedSurfaceIds.includes(step.step) && step.surfaceCovered === true)
      .map((step)=>step.step))];
    resolve(JSON.stringify({
      href: location.href,
      error: "Extension smoke evaluation watchdog elapsed.",
      progress: window.__EXTENSION_SMOKE_PROGRESS__ || "",
      initialHasHome: partial.initialHasHome === true,
      bannedInitial: partial.bannedInitial === true,
      steps: partialSteps,
      menuState: partial.menuState || null,
      pmsStatus: typeof partial.pmsStatus === "string" ? partial.pmsStatus : "",
      pmsBackendConnected: false,
      pmsNetworkEvidence: undefined,
      pmsSurfaceFetchEvidence: Array.isArray(partial.pmsSurfaceFetchEvidence) ? partial.pmsSurfaceFetchEvidence : [],
      pmsSurfaces: Array.isArray(partial.pmsSurfaces) ? partial.pmsSurfaces : [],
      coveredSurfaceIds,
      missingSurfaceIds: expectedSurfaceIds.filter((surfaceId)=>!coveredSurfaceIds.includes(surfaceId)),
      noHorizontalPageOverflow: false,
      overflowItems: [],
      visiblePlaceholderAttributes: [],
      placeholderAttributesAbsent: false,
      bannedFinal: false,
      runtimeErrors: [],
      pageErrors: [],
      consoleErrors: [],
      ok: false
    }));
  }, ${SMOKE_WATCHDOG_TIMEOUT_MS}))
])
`;
}

function backgroundSmokeExpression(): string {
  return String.raw`
(() => {
  window.__EXTENSION_SMOKE_RESULT__ = "";
  window.__EXTENSION_SMOKE_PROGRESS__ = "started";
  ${watchdogSmokeExpression()}
    .then((value) => {
      window.__EXTENSION_SMOKE_RESULT__ = String(value);
    })
    .catch((error) => {
      window.__EXTENSION_SMOKE_RESULT__ = "__EXCEPTION__:" + (error instanceof Error ? error.message : String(error));
    });
  return "started";
})()
`;
}

async function writeSmokeReport(
  report: unknown,
  smoke: SmokeResult,
  screenshot: CdpResponse,
  writeFailureEvidence: boolean,
) {
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, "extension-smoke-result.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  if (writeFailureEvidence) {
    if (typeof screenshot.result?.data === "string") {
      const failurePath = join(reportsDir, "extension-smoke-failure.png");
      await writeFile(failurePath, Buffer.from(screenshot.result.data, "base64"));
      console.error(`Failure screenshot: ${failurePath}`);
    } else {
      console.error("Failure screenshot was not captured.");
    }
    const failureHtml = typeof (smoke as { html?: unknown }).html === "string" ? String((smoke as { html?: unknown }).html) : "";
    if (failureHtml.trim()) {
      const snapshotPath = join(reportsDir, "extension-smoke-failure.html");
      await writeFile(snapshotPath, failureHtml);
      console.error(`Failure DOM snapshot: ${snapshotPath}`);
    } else {
      console.error("Failure DOM snapshot was not captured.");
    }
  }
  console.error(`Smoke result JSON: ${reportPath}`);
}

function assertSmokeResult(smoke: SmokeResult, extensionUrl: string, executionSurface: SmokeExecutionSurface) {
  const failures: string[] = [];
  const smokeText = typeof (smoke as { text?: unknown }).text === "string" ? String((smoke as { text?: unknown }).text) : "";
  if (smoke.href === "chrome-error://chromewebdata/" && smokeText.includes("ERR_BLOCKED_BY_CLIENT")) {
    failures.push(
      `Chrome blocked the extension URL before the side panel app loaded: ${extensionUrl} (ERR_BLOCKED_BY_CLIENT)`,
    );
  }
  if (smoke.href !== extensionUrl) failures.push(`expected ${extensionUrl}, got ${smoke.href}`);
  if (!smoke.initialHasHome) failures.push("home navigation labels were not visible");
  if (!smoke.menuState) failures.push("full menu state was not captured");
  if (smoke.bannedInitial) failures.push("banned legacy/placeholder text appeared on initial view");
  if (!smoke.noHorizontalPageOverflow) failures.push("page-level horizontal overflow was detected");
  if (smoke.overflowItems.length > 0) failures.push(`element overflow was detected: ${JSON.stringify(smoke.overflowItems)}`);
  if ((smoke.visiblePlaceholderAttributes || []).length > 0) {
    failures.push(`visible placeholder attributes were detected: ${JSON.stringify(smoke.visiblePlaceholderAttributes)}`);
  }
  if (smoke.placeholderAttributesAbsent === false) failures.push("visible placeholder attributes were not absent");
  if (smoke.bannedFinal) failures.push("banned legacy/placeholder text appeared after navigation");
  if ((smoke.runtimeErrors || []).length > 0) failures.push(`runtime errors were captured: ${JSON.stringify(smoke.runtimeErrors)}`);
  if ((smoke.pageErrors || []).length > 0) failures.push(`page errors were captured: ${JSON.stringify(smoke.pageErrors)}`);
  if ((smoke.consoleErrors || []).length > 0) failures.push(`console errors were captured: ${JSON.stringify(smoke.consoleErrors)}`);
  const coveredSurfaceIds = new Set(
    smoke.steps
      .filter(
        (step) =>
          typeof step.step === "string" &&
          (SMOKE_SURFACE_IDS as readonly string[]).includes(step.step) &&
          step.surfaceCovered === true,
      )
      .map((step) => step.step as string),
  );
  const missingSurfaceIds = SMOKE_SURFACE_IDS.filter((surfaceId) => !coveredSurfaceIds.has(surfaceId));
  if (missingSurfaceIds.length > 0) failures.push(`smoke did not cover product surfaces: ${missingSurfaceIds.join(", ")}`);
  const browserMissingSurfaceIds = smoke.missingSurfaceIds || [];
  if (browserMissingSurfaceIds.length > 0) {
    failures.push(`browser smoke reported missing product surfaces: ${browserMissingSurfaceIds.join(", ")}`);
  }
  const failedSteps = smoke.steps.filter((step) =>
    Object.entries(step).some(([key, value]) => isInteractionAssertionFailure(step, key, value)),
  );
  if (failedSteps.length > 0) failures.push(`failed interaction steps: ${JSON.stringify(failedSteps)}`);
  const unverifiedPmsRows = smoke.steps.filter(
    (step) => typeof step.step === "string" && step.step.startsWith("pms-") && step.pmsBackendState === "rowsUnverified",
  );
  if (unverifiedPmsRows.length > 0) {
    failures.push(`PMS DOM rows were observed without network JSON rows: ${JSON.stringify(unverifiedPmsRows)}`);
  }
  failures.push(...releaseGateFailureMessages(smoke, executionSurface));
  if (!smoke.ok) failures.push(`smoke result was not ok: ${JSON.stringify(smoke)}`);
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

function isInteractionAssertionFailure(step: Record<string, unknown>, key: string, value: unknown): boolean {
  if (key === "logoAlt" || typeof value !== "boolean" || value) return false;
  if (typeof step.step === "string" && step.step.startsWith("pms-") && key === "pmsFetchEvidenceConnected") {
    return false;
  }
  return true;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

async function waitForProcessExit(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null || process.signalCode !== null) {
    return;
  }
  await new Promise<void>((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(), 2_000);
    process.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

await runSmoke();
