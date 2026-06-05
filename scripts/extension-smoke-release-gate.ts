export const REQUIRED_PMS_RELEASE_STEPS = [
  "pms-checkin-list",
  "pms-checkout-list",
  "pms-room-select",
] as const;

const actualSidePanelProofBrand: unique symbol = Symbol("actual-user-chrome-side-panel-proof");
const MAX_ACTUAL_CHROME_SIDEPANEL_COORDINATE_DELTA_PX = 2;

export type PmsReleaseStepId = (typeof REQUIRED_PMS_RELEASE_STEPS)[number];

export type ActualChromeSidePanelState = "non-fullscreen" | "fullscreen" | "tab-switch-or-reopen";

export type ChromeRectEvidence = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type ActualChromeSidePanelCoordinateMeasurement = {
  state: ActualChromeSidePanelState;
  observedActualChromeSidePanelUrl: string;
  windowInnerHeight: number;
  visualViewportHeight: number | null;
  documentElementClientHeight: number;
  maxHeight700Matches: boolean;
  maxHeight540Matches: boolean;
  appShellRect: ChromeRectEvidence;
  screenStageRect: ChromeRectEvidence;
  rootPanelRect: ChromeRectEvidence;
  menuBlockRect: ChromeRectEvidence;
  footerRect: ChromeRectEvidence;
  cardTopRelativeToAppShell: number;
  menuTopRelativeToAppShell: number;
  footerTopRelativeToAppShell: number;
  footerContainedInAppShell: boolean;
  stageDoesNotUnderlapFooter: boolean;
  rootRowsFullyVisible: boolean;
  serviceRowsFullyVisible: boolean;
  salesCategoryChipsVisibleBeforeScroll: boolean;
};

export type ActualChromeSidePanelCoordinateProof = {
  source: "real-user-chrome-side-panel-capture";
  coordinateSpace: "app-shell-relative";
  requiredStates: readonly ActualChromeSidePanelState[];
  measurements: readonly ActualChromeSidePanelCoordinateMeasurement[];
  maxCoordinateDeltaPx: number;
  appShellWidthContractPx: 400;
};

export type ExtensionUrlPageTargetExecutionSurface = {
  kind: "extension-url-page-target";
  browserAttachment: "bundled-automation-profile" | "attached-cdp-profile";
  actualUserChromeSidePanelProof: false;
  actualSidePanelCoordinateProof: null;
  fullTabBoundedLayoutOnly: true;
  shortProbeEmulatesViewportOnly: true;
  requiredActualChromeSidePanelUrl: string;
};

export type ActualUserChromeSidePanelExecutionSurface = {
  kind: "actual-user-chrome-side-panel";
  browserAttachment: "user-chrome-profile";
  actualUserChromeSidePanelProof: true;
  actualSidePanelCoordinateProof: ActualChromeSidePanelCoordinateProof;
  fullTabBoundedLayoutOnly: false;
  shortProbeEmulatesViewportOnly: false;
  requiredActualChromeSidePanelUrl: string;
  observedActualChromeSidePanelUrl: string;
  readonly [actualSidePanelProofBrand]: true;
};

export type SmokeExecutionSurface =
  | ExtensionUrlPageTargetExecutionSurface
  | ActualUserChromeSidePanelExecutionSurface;

export type PmsReleaseNetworkResponseEvidence = {
  requestId: string;
  endpoint: string;
  url: string;
  requestUrl: string;
  requestMethod: string;
  requestPostDataPresent: boolean;
  requestPostDataLength: number;
  endpointMatches: boolean;
  surfaceStep: string;
  status: number | null;
  mimeType: string;
  contentType: string;
  jsonRowsObserved: boolean;
  jsonRowCount: number;
  hasSamlForm: boolean;
  connected: boolean;
  bodyUnavailable?: boolean;
  parseError?: string;
};

export type PmsReleaseNetworkEvidence = {
  endpoint: string;
  responseCount: number;
  jsonRowsResponseCount: number;
  jsonRowCount: number;
  hasSamlForm: boolean;
  connected: boolean;
  failureReason: string;
  responses: PmsReleaseNetworkResponseEvidence[];
};

export type ReleaseGateSmokeSnapshot = {
  ok: boolean;
  pmsBackendConnected?: boolean;
  pmsNetworkEvidence?: PmsReleaseNetworkEvidence;
  steps?: Array<Record<string, unknown>>;
};

export function createExtensionPageTargetExecutionSurface(
  attachedChromeCdpProfile: boolean,
  requiredActualChromeSidePanelUrl: string,
): SmokeExecutionSurface {
  return {
    kind: "extension-url-page-target",
    browserAttachment: attachedChromeCdpProfile ? "attached-cdp-profile" : "bundled-automation-profile",
    actualUserChromeSidePanelProof: false,
    actualSidePanelCoordinateProof: null,
    fullTabBoundedLayoutOnly: true,
    shortProbeEmulatesViewportOnly: true,
    requiredActualChromeSidePanelUrl,
  };
}

export function isReleaseGatePassed(
  smoke: ReleaseGateSmokeSnapshot,
  executionSurface: SmokeExecutionSurface,
): boolean {
  return Boolean(
    smoke.ok &&
      smoke.pmsBackendConnected === true &&
      hasConnectedPmsReleaseEvidence(smoke) &&
      isActualUserChromeSidePanelExecutionSurface(executionSurface),
  );
}

export function shouldWriteReleaseGateFailureEvidence(
  smoke: ReleaseGateSmokeSnapshot,
  executionSurface: SmokeExecutionSurface,
): boolean {
  return !isReleaseGatePassed(smoke, executionSurface);
}

export function releaseGateFailureMessages(
  smoke: ReleaseGateSmokeSnapshot,
  executionSurface: SmokeExecutionSurface,
): string[] {
  const failures: string[] = [];
  if (!hasConnectedPmsReleaseEvidence(smoke)) {
    const reason = smoke.pmsNetworkEvidence?.failureReason || "PMS network JSON rows were not observed.";
    failures.push(
      [
        "PMS backend did not return connected JSON rows for every PMS surface.",
        `Required PMS surfaces: ${REQUIRED_PMS_RELEASE_STEPS.join(", ")}.`,
        `Reason: ${reason}`,
      ].join(" "),
    );
  }
  if (smoke.pmsBackendConnected !== true) {
    failures.push("PMS backend-connected success was not proven by per-surface PMS network JSON rows.");
  }
  if (!isActualUserChromeSidePanelExecutionSurface(executionSurface)) {
    const surfaceReason =
      executionSurface.kind === "extension-url-page-target"
        ? `This smoke used ${executionSurface.kind}, so its 400px bounded layout and 400x520 extension-page viewport probe are only tab/page-target evidence.`
        : "The supplied actual side-panel surface is not a branded verifier artifact from a real user Chrome side-panel capture.";
    failures.push(
      [
        "Actual user Chrome side panel proof is missing.",
        surfaceReason,
        "Extension URL page targets are ineligible for release-gate pass.",
        "Required coordinate proof: live app-shell-relative appShellRect, screenStageRect, rootPanelRect, menuBlockRect, footerRect, visualViewportHeight, documentElementClientHeight, max-height media matches, footer containment, stage/footer separation, root rows, service rows, and sales category chips from non-fullscreen, fullscreen, and tab-switch-or-reopen Chrome side-panel states.",
        `Required surface remains ${executionSurface.requiredActualChromeSidePanelUrl}.`,
      ].join(" "),
    );
  }
  return failures;
}

export function hasConnectedPmsReleaseEvidence(smoke: ReleaseGateSmokeSnapshot): boolean {
  const evidence = smoke.pmsNetworkEvidence;
  if (!evidence || evidence.connected !== true || !Array.isArray(evidence.responses)) return false;
  return REQUIRED_PMS_RELEASE_STEPS.every((stepId) => hasConnectedPmsSurfaceStepEvidence(smoke, evidence, stepId));
}

export function isConnectedPmsResponseEvidence(
  response: unknown,
  expectedEndpoint: string,
): response is PmsReleaseNetworkResponseEvidence {
  if (!isRecordValue(response)) return false;
  const status = typeof response.status === "number" ? response.status : null;
  return Boolean(
    typeof response.requestId === "string" &&
      response.requestId.trim() &&
      response.endpoint === expectedEndpoint &&
      response.url === expectedEndpoint &&
      response.requestUrl === expectedEndpoint &&
      response.endpointMatches === true &&
      typeof response.surfaceStep === "string" &&
      response.surfaceStep.trim() &&
      typeof response.requestMethod === "string" &&
      response.requestMethod.toUpperCase() === "POST" &&
      response.requestPostDataPresent === true &&
      typeof response.requestPostDataLength === "number" &&
      response.requestPostDataLength > 0 &&
      status !== null &&
      status >= 200 &&
      status < 300 &&
      response.jsonRowsObserved === true &&
      typeof response.jsonRowCount === "number" &&
      response.jsonRowCount > 0 &&
      response.hasSamlForm !== true &&
      response.connected === true,
  );
}

function hasConnectedPmsSurfaceStepEvidence(
  smoke: ReleaseGateSmokeSnapshot,
  evidence: PmsReleaseNetworkEvidence,
  stepId: PmsReleaseStepId,
): boolean {
  const step = smoke.steps?.find((candidate) => candidate.step === stepId);
  if (!step) return false;
  const response = evidence.responses.find(
    (candidate) => candidate.surfaceStep === stepId && isConnectedPmsResponseEvidence(candidate, evidence.endpoint),
  );
  if (!response) return false;
  const state = isRecordValue(step.state) ? step.state : {};
  return Boolean(
    step.pmsBackendState === "rows" &&
      step.pmsFetchEvidenceConnected === true &&
      step.pmsFetchEvidenceRequestId === response.requestId &&
      step.pmsFetchEvidenceEndpoint === evidence.endpoint &&
      step.pmsFetchEvidenceRequestMethod === "POST" &&
      step.pmsFetchEvidencePostDataPresent === true &&
      state.pmsBackendConnected === true &&
      state.rowEvidenceKind === "network-json-rows",
  );
}

function isActualUserChromeSidePanelExecutionSurface(
  executionSurface: SmokeExecutionSurface,
): executionSurface is ActualUserChromeSidePanelExecutionSurface {
  return Boolean(
    executionSurface.kind === "actual-user-chrome-side-panel" &&
      executionSurface.browserAttachment === "user-chrome-profile" &&
      executionSurface.actualUserChromeSidePanelProof === true &&
      hasActualChromeSidePanelCoordinateProof(executionSurface.actualSidePanelCoordinateProof) &&
      executionSurface.fullTabBoundedLayoutOnly === false &&
      executionSurface.shortProbeEmulatesViewportOnly === false &&
      executionSurface.observedActualChromeSidePanelUrl === executionSurface.requiredActualChromeSidePanelUrl &&
      (executionSurface as Partial<ActualUserChromeSidePanelExecutionSurface>)[actualSidePanelProofBrand] === true,
  );
}

function hasActualChromeSidePanelCoordinateProof(
  proof: unknown,
): proof is ActualChromeSidePanelCoordinateProof {
  if (!isRecordValue(proof)) return false;
  const candidate = proof as Partial<ActualChromeSidePanelCoordinateProof>;
  if (
    candidate.source !== "real-user-chrome-side-panel-capture" ||
    candidate.coordinateSpace !== "app-shell-relative"
  ) {
    return false;
  }
  const maxCoordinateDeltaPx = candidate.maxCoordinateDeltaPx;
  if (
    candidate.appShellWidthContractPx !== 400 ||
    typeof maxCoordinateDeltaPx !== "number" ||
    !Number.isFinite(maxCoordinateDeltaPx) ||
    maxCoordinateDeltaPx > MAX_ACTUAL_CHROME_SIDEPANEL_COORDINATE_DELTA_PX ||
    !Array.isArray(candidate.requiredStates) ||
    !Array.isArray(candidate.measurements)
  ) {
    return false;
  }
  if (!REQUIRED_ACTUAL_CHROME_SIDEPANEL_STATES.every((state) => candidate.requiredStates?.includes(state))) return false;
  const measurementsByState = REQUIRED_ACTUAL_CHROME_SIDEPANEL_STATES
    .map((state) =>
      candidate.measurements?.find((measurement) =>
        actualChromeSidePanelMeasurementLooksValid(measurement, state, 400, maxCoordinateDeltaPx),
      ),
    )
    .filter((measurement): measurement is ActualChromeSidePanelCoordinateMeasurement => Boolean(measurement));
  if (measurementsByState.length !== REQUIRED_ACTUAL_CHROME_SIDEPANEL_STATES.length) return false;
  return actualChromeSidePanelCoordinatesStayStable(measurementsByState, maxCoordinateDeltaPx);
}

const REQUIRED_ACTUAL_CHROME_SIDEPANEL_STATES: ActualChromeSidePanelState[] = [
  "non-fullscreen",
  "fullscreen",
  "tab-switch-or-reopen",
];

function actualChromeSidePanelCoordinatesStayStable(
  measurements: readonly ActualChromeSidePanelCoordinateMeasurement[],
  maxCoordinateDeltaPx: number,
): boolean {
  const [first] = measurements;
  if (!first) return false;
  return REQUIRED_ACTUAL_CHROME_SIDEPANEL_STATES.every((state) =>
    measurements.some((measurement) => measurement.state === state),
  ) && measurements.every(
    (measurement) =>
      Math.abs(measurement.cardTopRelativeToAppShell - first.cardTopRelativeToAppShell) <= maxCoordinateDeltaPx &&
      Math.abs(measurement.menuTopRelativeToAppShell - first.menuTopRelativeToAppShell) <= maxCoordinateDeltaPx &&
      Math.abs(measurement.footerRect.height - first.footerRect.height) <= maxCoordinateDeltaPx,
  );
}

function actualChromeSidePanelMeasurementLooksValid(
  measurement: unknown,
  expectedState: ActualChromeSidePanelState,
  appShellWidthContractPx: 400,
  maxCoordinateDeltaPx: number,
): measurement is ActualChromeSidePanelCoordinateMeasurement {
  if (!isRecordValue(measurement)) return false;
  const appShellRect = measurement.appShellRect;
  const screenStageRect = measurement.screenStageRect;
  const rootPanelRect = measurement.rootPanelRect;
  const menuBlockRect = measurement.menuBlockRect;
  const footerRect = measurement.footerRect;
  const cardTopRelativeToAppShell = measurement.cardTopRelativeToAppShell;
  const menuTopRelativeToAppShell = measurement.menuTopRelativeToAppShell;
  const footerTopRelativeToAppShell = measurement.footerTopRelativeToAppShell;
  if (
    !(
      measurement.state === expectedState &&
      typeof measurement.observedActualChromeSidePanelUrl === "string" &&
      measurement.observedActualChromeSidePanelUrl.trim() &&
      Number.isFinite(measurement.windowInnerHeight) &&
      (measurement.visualViewportHeight === null || Number.isFinite(measurement.visualViewportHeight)) &&
      Number.isFinite(measurement.documentElementClientHeight) &&
      rectLooksMeasured(appShellRect, appShellWidthContractPx) &&
      rectLooksMeasured(screenStageRect) &&
      rectLooksMeasured(rootPanelRect) &&
      rectLooksMeasured(menuBlockRect) &&
      rectLooksMeasured(footerRect) &&
      typeof cardTopRelativeToAppShell === "number" &&
      Number.isFinite(cardTopRelativeToAppShell) &&
      typeof menuTopRelativeToAppShell === "number" &&
      Number.isFinite(menuTopRelativeToAppShell) &&
      typeof footerTopRelativeToAppShell === "number" &&
      Number.isFinite(footerTopRelativeToAppShell) &&
      measurement.footerContainedInAppShell === true &&
      measurement.stageDoesNotUnderlapFooter === true &&
      measurement.rootRowsFullyVisible === true &&
      measurement.serviceRowsFullyVisible === true &&
      measurement.salesCategoryChipsVisibleBeforeScroll === true &&
      matchesMaxHeightFlag(measurement.maxHeight700Matches, appShellRect.height, 700) &&
      matchesMaxHeightFlag(measurement.maxHeight540Matches, appShellRect.height, 540)
    )
  ) {
    return false;
  }

  const screenStageBottomRelativeToAppShell = screenStageRect.bottom - appShellRect.top;
  const footerBottomRelativeToAppShell = footerTopRelativeToAppShell + footerRect.height;
  return Boolean(
    screenStageBottomRelativeToAppShell <= footerTopRelativeToAppShell + maxCoordinateDeltaPx &&
      footerBottomRelativeToAppShell <= appShellRect.height + maxCoordinateDeltaPx &&
      Math.abs(appShellRect.height - footerBottomRelativeToAppShell) <= maxCoordinateDeltaPx,
  );
}

function matchesMaxHeightFlag(flag: unknown, appShellHeight: number, thresholdPx: number): boolean {
  return typeof flag === "boolean" && flag === appShellHeight <= thresholdPx + 1;
}

function rectLooksMeasured(rect: unknown, expectedWidth?: number): rect is ChromeRectEvidence {
  if (!isRecordValue(rect)) return false;
  const width = rect.width;
  const height = rect.height;
  return Boolean(
    Number.isFinite(rect.top) &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.right) &&
      Number.isFinite(rect.bottom) &&
      typeof width === "number" &&
      Number.isFinite(width) &&
      width > 0 &&
      (expectedWidth === undefined || Math.abs(width - expectedWidth) <= 1) &&
      typeof height === "number" &&
      Number.isFinite(height) &&
      height > 0,
  );
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
