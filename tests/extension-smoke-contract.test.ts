import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REQUIRED_PMS_RELEASE_STEPS,
  createExtensionPageTargetExecutionSurface,
  hasConnectedPmsReleaseEvidence,
  isConnectedPmsResponseEvidence,
  isReleaseGatePassed,
  releaseGateFailureMessages,
  shouldWriteReleaseGateFailureEvidence,
  type PmsReleaseNetworkResponseEvidence,
  type ReleaseGateSmokeSnapshot,
  type SmokeExecutionSurface,
} from "../scripts/extension-smoke-release-gate.js";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function actualSidePanelSurface(targetUrl: string): SmokeExecutionSurface {
  return {
    kind: "actual-user-chrome-side-panel",
    browserAttachment: "user-chrome-profile",
    actualUserChromeSidePanelProof: true,
    fullTabBoundedLayoutOnly: false,
    shortProbeEmulatesViewportOnly: false,
    requiredActualChromeSidePanelUrl: targetUrl,
    observedActualChromeSidePanelUrl: targetUrl,
  } as unknown as SmokeExecutionSurface;
}

function pmsResponseEvidence(
  surfaceStep: string,
  requestId: string,
  overrides: Partial<PmsReleaseNetworkResponseEvidence> = {},
): PmsReleaseNetworkResponseEvidence {
  const endpoint = "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do";
  return {
    requestId,
    endpoint,
    url: endpoint,
    requestUrl: endpoint,
    requestMethod: "POST",
    requestPostDataPresent: true,
    requestPostDataLength: 94,
    endpointMatches: true,
    surfaceStep,
    status: 200,
    mimeType: "application/json",
    contentType: "application/json;charset=utf-8",
    jsonRowsObserved: true,
    jsonRowCount: 1,
    hasSamlForm: false,
    connected: true,
    ...overrides,
  };
}

function pmsStep(stepId: string, requestId: string): Record<string, unknown> {
  return {
    step: stepId,
    pmsBackendState: "rows",
    pmsFetchEvidenceConnected: true,
    pmsFetchEvidenceRequestId: requestId,
    pmsFetchEvidenceEndpoint: "https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do",
    pmsFetchEvidenceRequestMethod: "POST",
    pmsFetchEvidencePostDataPresent: true,
    state: {
      pmsBackendConnected: true,
      rowEvidenceKind: "network-json-rows",
    },
  };
}

function connectedReleaseSmoke(
  responseOverrides: Partial<PmsReleaseNetworkResponseEvidence> = {},
): ReleaseGateSmokeSnapshot {
  const responses = REQUIRED_PMS_RELEASE_STEPS.map((stepId, index) =>
    pmsResponseEvidence(stepId, `pms-${index + 1}`, responseOverrides),
  );
  return {
    ok: true,
    pmsBackendConnected: true,
    pmsNetworkEvidence: {
      endpoint: responses[0].endpoint,
      responseCount: responses.length,
      jsonRowsResponseCount: responses.length,
      jsonRowCount: responses.length,
      hasSamlForm: false,
      connected: true,
      failureReason: "",
      responses,
    },
    steps: REQUIRED_PMS_RELEASE_STEPS.map((stepId, index) => pmsStep(stepId, `pms-${index + 1}`)),
  };
}

test("extension smoke validates actual Chrome profile path and built dist manifest", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  const releaseGate = read("scripts/extension-smoke-release-gate.ts");

  assert.match(smoke, /readActualChromeExtensionInstall/);
  assert.match(smoke, /Secure Preferences/);
  assert.match(smoke, /Actual Chrome profile loads a different path/);
  assert.match(smoke, /validateDistManifest\(\)/);
  assert.match(smoke, /copyAutomationExtensionDist/);
  assert.match(smoke, /automationExtensionPath/);
  assert.match(smoke, /findNewestPlaywrightChromium/);
  assert.match(smoke, /if \(playwrightChromium\) \{/);
  assert.match(smoke, /Google", "Chrome", "Application", "chrome\.exe"/);
  assert.match(smoke, /const googleChrome = googleChromeCandidates\.find/);
  assert.match(smoke, /waitForDebuggableTargets/);
  assert.match(smoke, /browserTargetsBeforeNavigate/);
  assert.match(smoke, /"--window-size=1200,950"/);
  assert.doesNotMatch(smoke, /Built extension worker was not loaded/);
  assert.match(smoke, /distManifest\.minimum_chrome_version !== "120"/);
  assert.match(smoke, /expectedExtensionId = getExtensionIdFromManifestKey/);
  assert.match(smoke, /ACTUAL_CHROME_EXTENSION_ID = "jeidoobjhbnnicfkcdfncheimgdnhmjk"/);
  assert.match(smoke, /ACTUAL_CHROME_EXTENSION_URL = `chrome-extension:\/\/\$\{ACTUAL_CHROME_EXTENSION_ID\}\/sidepanel\.html`/);
  assert.match(smoke, /expectedExtensionId !== ACTUAL_CHROME_EXTENSION_ID/);
  assert.match(smoke, /const extensionUrl = ACTUAL_CHROME_EXTENSION_URL/);
  assert.match(smoke, /GOOGLE_CHROME_LOAD_EXTENSION_UNSUPPORTED_MESSAGE/);
  assert.match(smoke, /assertBrowserSupportsUnpackedExtensionLoad\(browserPath\)/);
  assert.match(smoke, /isGoogleChromeStablePath/);
  assert.match(smoke, /`--load-extension` is not allowed in Google Chrome/);
  assert.match(smoke, /getAttachedChromeCdpBaseUrl/);
  assert.match(smoke, /CHROME_EXTENSION_SMOKE_CDP_URL/);
  assert.match(smoke, /CHROME_EXTENSION_SMOKE_CDP_PORT/);
  assert.match(smoke, /CHROME_EXTENSION_REAL_CHROME_CDP_URL/);
  assert.match(smoke, /already-installed-real-chrome-profile/);
  assert.match(smoke, /waitForDebuggableTargetsFromBaseUrl/);
  assert.match(smoke, /createExtensionPageTargetExecutionSurface/);
  assert.doesNotMatch(smoke, /createActualUserChromeSidePanelExecutionSurface/);
  assert.doesNotMatch(smoke, /ACTUAL_CHROME_SIDEPANEL_PROOF_PATH_ENV_KEYS/);
  assert.doesNotMatch(smoke, /CHROME_EXTENSION_ACTUAL_SIDEPANEL_PROOF_PATH/);
  assert.doesNotMatch(smoke, /ACTUAL_CHROME_SIDEPANEL_PROOF_PATH/);
  assert.doesNotMatch(smoke, /readActualChromeSidePanelCoordinateProof/);
  assert.doesNotMatch(smoke, /actualChromeSidePanelProofPath/);
  assert.match(smoke, /shouldWriteReleaseGateFailureEvidence/);
  assert.match(releaseGate, /type SmokeExecutionSurface/);
  assert.match(releaseGate, /kind: "extension-url-page-target"/);
  assert.doesNotMatch(releaseGate, /export function createActualUserChromeSidePanelExecutionSurface/);
  assert.match(releaseGate, /MAX_ACTUAL_CHROME_SIDEPANEL_COORDINATE_DELTA_PX = 2/);
  assert.match(releaseGate, /footerContainedInAppShell/);
  assert.match(releaseGate, /stageDoesNotUnderlapFooter/);
  assert.match(releaseGate, /salesCategoryChipsVisibleBeforeScroll/);
  assert.match(releaseGate, /matchesMaxHeightFlag/);
  assert.match(releaseGate, /actualChromeSidePanelCoordinatesStayStable/);
  assert.match(releaseGate, /actualUserChromeSidePanelProof: false/);
  assert.match(releaseGate, /fullTabBoundedLayoutOnly: true/);
  assert.match(releaseGate, /shortProbeEmulatesViewportOnly: true/);
  assert.match(smoke, /const releaseGatePassed = isReleaseGatePassed\(smoke, executionSurface\)/);
  assert.match(smoke, /passed: releaseGatePassed/);
  assert.match(smoke, /writeSmokeReport\(report, smoke, screenshot, shouldWriteReleaseGateFailureEvidence\(smoke, executionSurface\)\)/);
  assert.match(releaseGate, /function isReleaseGatePassed/);
  assert.match(releaseGate, /smoke\.pmsBackendConnected === true/);
  assert.match(releaseGate, /hasConnectedPmsReleaseEvidence\(smoke\)/);
  assert.match(releaseGate, /kind: "actual-user-chrome-side-panel"/);
  assert.match(releaseGate, /Extension URL page targets are ineligible for release-gate pass/);
  assert.match(smoke, /if \(writeFailureEvidence\)/);
  assert.match(releaseGate, /Actual user Chrome side panel proof is missing/);
  assert.match(releaseGate, /400px bounded layout and 400x520 extension-page viewport probe are only tab\/page-target evidence/);
});

test("extension smoke release gate requires both PMS rows and actual Chrome side-panel proof", () => {
  const targetUrl = "chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html";
  const pageTargetSurface = createExtensionPageTargetExecutionSurface(false, targetUrl);
  const attachedPageTargetSurface = createExtensionPageTargetExecutionSurface(true, targetUrl);
  const pmsConnectedSmoke = connectedReleaseSmoke();

  assert.deepEqual(
    {
      kind: pageTargetSurface.kind,
      browserAttachment: pageTargetSurface.browserAttachment,
      actualUserChromeSidePanelProof: pageTargetSurface.actualUserChromeSidePanelProof,
      fullTabBoundedLayoutOnly: pageTargetSurface.fullTabBoundedLayoutOnly,
      shortProbeEmulatesViewportOnly: pageTargetSurface.shortProbeEmulatesViewportOnly,
    },
    {
      kind: "extension-url-page-target",
      browserAttachment: "bundled-automation-profile",
      actualUserChromeSidePanelProof: false,
      fullTabBoundedLayoutOnly: true,
      shortProbeEmulatesViewportOnly: true,
    },
  );
  assert.equal(attachedPageTargetSurface.browserAttachment, "attached-cdp-profile");

  assert.equal(isReleaseGatePassed(pmsConnectedSmoke, pageTargetSurface), false);
  assert.equal(shouldWriteReleaseGateFailureEvidence(pmsConnectedSmoke, pageTargetSurface), true);
  assert.deepEqual(releaseGateFailureMessages(pmsConnectedSmoke, pageTargetSurface), [
    [
      "Actual user Chrome side panel proof is missing.",
      "This smoke used extension-url-page-target, so its 400px bounded layout and 400x520 extension-page viewport probe are only tab/page-target evidence.",
      "Extension URL page targets are ineligible for release-gate pass.",
      "Required coordinate proof: live app-shell-relative appShellRect, screenStageRect, rootPanelRect, menuBlockRect, footerRect, visualViewportHeight, documentElementClientHeight, max-height media matches, footer containment, stage/footer separation, root rows, service rows, and sales category chips from non-fullscreen, fullscreen, and tab-switch-or-reopen Chrome side-panel states.",
      `Required surface remains ${targetUrl}.`,
    ].join(" "),
  ]);

  const forgedPageTargetSurface = {
    ...pageTargetSurface,
    actualUserChromeSidePanelProof: true,
  } as unknown as SmokeExecutionSurface;
  assert.equal(isReleaseGatePassed(pmsConnectedSmoke, forgedPageTargetSurface), false);
  assert.equal(shouldWriteReleaseGateFailureEvidence(pmsConnectedSmoke, forgedPageTargetSurface), true);

  const actualSurface = actualSidePanelSurface(targetUrl);
  assert.equal(hasConnectedPmsReleaseEvidence(pmsConnectedSmoke), true);
  assert.equal(isReleaseGatePassed(pmsConnectedSmoke, actualSurface), false);
  assert.equal(shouldWriteReleaseGateFailureEvidence(pmsConnectedSmoke, actualSurface), true);
  assert.deepEqual(releaseGateFailureMessages(pmsConnectedSmoke, actualSurface), [
    [
      "Actual user Chrome side panel proof is missing.",
      "The supplied actual side-panel surface is not a branded verifier artifact from a real user Chrome side-panel capture.",
      "Extension URL page targets are ineligible for release-gate pass.",
      "Required coordinate proof: live app-shell-relative appShellRect, screenStageRect, rootPanelRect, menuBlockRect, footerRect, visualViewportHeight, documentElementClientHeight, max-height media matches, footer containment, stage/footer separation, root rows, service rows, and sales category chips from non-fullscreen, fullscreen, and tab-switch-or-reopen Chrome side-panel states.",
      `Required surface remains ${targetUrl}.`,
    ].join(" "),
  ]);

  const inconsistentSmoke: ReleaseGateSmokeSnapshot = {
    ok: true,
    pmsBackendConnected: false,
    pmsNetworkEvidence: {
      ...pmsConnectedSmoke.pmsNetworkEvidence!,
      connected: false,
      failureReason: "PMS JSON rows were not connected to surface steps: pms-checkin-list.",
      responses: pmsConnectedSmoke.pmsNetworkEvidence!.responses.slice(1),
    },
    steps: pmsConnectedSmoke.steps,
  };
  assert.equal(isReleaseGatePassed(inconsistentSmoke, actualSurface), false);
  assert.equal(shouldWriteReleaseGateFailureEvidence(inconsistentSmoke, actualSurface), true);

  const pmsSamlFailureSmoke: ReleaseGateSmokeSnapshot = {
    ok: false,
    pmsBackendConnected: false,
    pmsNetworkEvidence: {
      endpoint: pmsConnectedSmoke.pmsNetworkEvidence!.endpoint,
      responseCount: 1,
      jsonRowsResponseCount: 0,
      jsonRowCount: 0,
      hasSamlForm: true,
      connected: false,
      failureReason: "PMS returned SAML HTML instead of JSON rows.",
      responses: [
        pmsResponseEvidence("pms-checkin-list", "pms-saml", {
          contentType: "text/html;charset=utf-8",
          mimeType: "text/html",
          jsonRowsObserved: false,
          jsonRowCount: 0,
          hasSamlForm: true,
          connected: false,
        }),
      ],
    },
    steps: [],
  };
  assert.equal(isReleaseGatePassed(pmsSamlFailureSmoke, actualSurface), false);
  assert.deepEqual(releaseGateFailureMessages(pmsSamlFailureSmoke, actualSurface), [
    [
      "PMS backend did not return connected JSON rows for every PMS surface.",
      "Required PMS surfaces: pms-checkin-list, pms-checkout-list, pms-room-select.",
      "Reason: PMS returned SAML HTML instead of JSON rows.",
    ].join(" "),
    "PMS backend-connected success was not proven by per-surface PMS network JSON rows.",
    [
      "Actual user Chrome side panel proof is missing.",
      "The supplied actual side-panel surface is not a branded verifier artifact from a real user Chrome side-panel capture.",
      "Extension URL page targets are ineligible for release-gate pass.",
      "Required coordinate proof: live app-shell-relative appShellRect, screenStageRect, rootPanelRect, menuBlockRect, footerRect, visualViewportHeight, documentElementClientHeight, max-height media matches, footer containment, stage/footer separation, root rows, service rows, and sales category chips from non-fullscreen, fullscreen, and tab-switch-or-reopen Chrome side-panel states.",
      `Required surface remains ${targetUrl}.`,
    ].join(" "),
  ]);
});

test("attached real Chrome CDP smoke refuses page targets as sidePanel proof", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");

  assert.match(smoke, /waitForDebuggableTargetsFromBaseUrl\(attachedChromeCdpBaseUrl\)/);
  assert.match(smoke, /selectSmokeTarget\(targets, Boolean\(attachedChromeCdpBaseUrl\), extensionUrl\)/);
  assert.match(smoke, /function selectSmokeTarget/);
  assert.doesNotMatch(smoke, /function findActualChromeSidePanelTarget/);
  assert.doesNotMatch(smoke, /target\.url === requiredUrl && Boolean\(target\.webSocketDebuggerUrl\)/);
  assert.match(smoke, /Actual user Chrome sidePanel proof cannot be produced from CDP page targets/);
  assert.match(smoke, /URL equality does not prove the Chrome sidePanel container/);
  assert.match(smoke, /Required target URL: \$\{requiredSidePanelUrl\}/);
  assert.doesNotMatch(smoke, /createActualUserChromeSidePanelExecutionSurface/);
  assert.doesNotMatch(smoke, /ACTUAL_CHROME_SIDEPANEL_PROOF_PATH/);
  assert.doesNotMatch(smoke, /CHROME_EXTENSION_ACTUAL_SIDEPANEL_PROOF_PATH/);
  assert.doesNotMatch(smoke, /readActualChromeSidePanelCoordinateProof/);

  const runSmokeStart = smoke.indexOf("async function runSmoke");
  const runSmokeEnd = smoke.indexOf("async function pollSmokeResult");
  assert.ok(runSmokeStart >= 0 && runSmokeEnd > runSmokeStart, "runSmoke must be inspectable");
  const runSmokeBody = smoke.slice(runSmokeStart, runSmokeEnd);
  assert.ok(
    runSmokeBody.indexOf("selectSmokeTarget(targets, Boolean(attachedChromeCdpBaseUrl), extensionUrl)") <
      runSmokeBody.indexOf("readActualChromeExtensionInstall()"),
    "attached mode target selection must run before Chrome profile validation can mask a missing sidePanel target",
  );

  const selectorStart = smoke.indexOf("function selectSmokeTarget");
  const selectorEnd = smoke.indexOf("function summarizeTargets");
  assert.ok(selectorStart >= 0 && selectorEnd > selectorStart, "selectSmokeTarget must be inspectable");
  const selectorBody = smoke.slice(selectorStart, selectorEnd);
  const attachedBranch = selectorBody.slice(
    selectorBody.indexOf("if (attachedChromeCdp)"),
    selectorBody.indexOf("const page = targets.find"),
  );
  assert.match(attachedBranch, /throw new Error/);
  assert.doesNotMatch(attachedBranch, /targets\.find\(\(target\) => target\.type === "page"/);
  assert.doesNotMatch(attachedBranch, /session\.send\("Page\.navigate"/);
  assert.match(selectorBody, /const page = targets\.find\(\(target\) => target\.type === "page" && target\.webSocketDebuggerUrl\)/);
});

test("extension smoke release gate rejects malformed or uncorrelated PMS row evidence", () => {
  const targetUrl = "chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html";
  const actualSurface = actualSidePanelSurface(targetUrl);
  const goodSmoke = connectedReleaseSmoke();
  const endpoint = goodSmoke.pmsNetworkEvidence!.endpoint;

  assert.equal(hasConnectedPmsReleaseEvidence(goodSmoke), true);
  assert.equal(isReleaseGatePassed(goodSmoke, actualSurface), false);
  assert.equal(isConnectedPmsResponseEvidence(goodSmoke.pmsNetworkEvidence!.responses[0], endpoint), true);

  const missingStepEvidence: ReleaseGateSmokeSnapshot = {
    ...goodSmoke,
    pmsNetworkEvidence: {
      ...goodSmoke.pmsNetworkEvidence!,
      responses: goodSmoke.pmsNetworkEvidence!.responses.filter((response) => response.surfaceStep !== "pms-room-select"),
    },
  };
  assert.equal(hasConnectedPmsReleaseEvidence(missingStepEvidence), false);

  const malformedRequestEvidence = connectedReleaseSmoke({ requestMethod: "GET" });
  assert.equal(isConnectedPmsResponseEvidence(malformedRequestEvidence.pmsNetworkEvidence!.responses[0], endpoint), false);
  assert.equal(hasConnectedPmsReleaseEvidence(malformedRequestEvidence), false);

  const domRowsOnlyEvidence: ReleaseGateSmokeSnapshot = {
    ...goodSmoke,
    pmsNetworkEvidence: {
      ...goodSmoke.pmsNetworkEvidence!,
      connected: true,
      jsonRowsResponseCount: 0,
      jsonRowCount: 0,
      responses: goodSmoke.pmsNetworkEvidence!.responses.map((response) => ({
        ...response,
        jsonRowsObserved: false,
        jsonRowCount: 0,
        connected: false,
      })),
    },
  };
  assert.equal(hasConnectedPmsReleaseEvidence(domRowsOnlyEvidence), false);
});

test("extension smoke covers all critical surfaces and collects runtime evidence", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  const releaseGate = read("scripts/extension-smoke-release-gate.ts");
  for (const surfaceId of [
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
  ]) {
    assert.match(smoke, new RegExp(`"${surfaceId}"`));
  }
  for (const legacySurfaceId of [
    "home-root",
    "branch-picker-header-lock",
    "storage-recovery",
    "customer-guidance",
    "quick-reply",
    "service-management",
    "work-management",
    "template-form-editor-hub",
    "settings-hub",
    "template-settings",
    "form-settings",
    "room-remark-memo",
    "work-report-template-list",
  ]) {
    assert.doesNotMatch(smoke, new RegExp(`"${legacySurfaceId}"`));
  }
  for (const pmsStep of REQUIRED_PMS_RELEASE_STEPS) {
    assert.match(releaseGate, new RegExp(`"${pmsStep}"`));
  }

  assert.match(smoke, /Runtime\.enable/);
  assert.match(smoke, /Log\.enable/);
  assert.match(smoke, /collectPageErrors/);
  assert.match(smoke, /pageErrors/);
  assert.match(smoke, /pageerror:/);
  assert.match(smoke, /unhandledrejection:/);
  assert.match(smoke, /Network\.enable/);
  assert.match(smoke, /runtimeErrors\.length === 0/);
  assert.match(smoke, /consoleErrors/);
  assert.match(smoke, /input\[placeholder\],textarea\[placeholder\]/);
  assert.match(smoke, /visiblePlaceholderAttributes/);
  assert.match(smoke, /placeholderAttributesAbsent/);
  assert.match(smoke, /logoVisibleWhenLocked/);
  assert.match(smoke, /logoNoFilter/);
  assert.match(smoke, /logoImageNoFilter/);
  assert.match(smoke, /logoVisibleWithoutFilter/);
  assert.match(smoke, /navigationViewportDoesNotMaskContent/);
  assert.match(smoke, /usesContractTransition/);
  assert.match(smoke, /usesRouteMotion/);
  assert.match(smoke, /noStickyOrFixedWorkDock/);
  assert.match(smoke, /overlayDocks/);
  assert.match(smoke, /bottomBarDoesNotMaskContent/);
  assert.match(smoke, /footerLayoutEvidence/);
  assert.match(smoke, /footerContainedInAppShell/);
  assert.match(smoke, /stageDoesNotUnderlapFooter/);
  assert.match(smoke, /visibleSurfaceDoesNotUnderlapFooter/);
  assert.match(smoke, /lastVisibleControlDoesNotUnderlapFooter/);
  assert.match(smoke, /footerEvidence/);
  assert.match(smoke, /sidepanelRootStaysSidepanelFormat/);
  assert.doesNotMatch(smoke, /sidepanelRootFillsFrame/);
  assert.doesNotMatch(smoke, /sidepanelWidthBoundedInFullTab/);
  assert.match(releaseGate, /fullTabBoundedLayoutOnly/);
  assert.match(releaseGate, /shortProbeEmulatesViewportOnly/);
  assert.match(smoke, /runShortExtensionPageViewportProbe/);
  assert.match(smoke, /ShortExtensionPageViewportProbe/);
  assert.match(smoke, /runReferenceWidthDriftProbe/);
  assert.match(smoke, /ReferenceWidthDriftProbe/);
  assert.match(smoke, /Emulation\.setDeviceMetricsOverride/);
  assert.match(smoke, /height:\s*520/);
  assert.match(smoke, /width:\s*440/);
  assert.match(smoke, /screenWidth:\s*440/);
  assert.match(smoke, /shortExtensionPageViewportProbe/);
  assert.match(smoke, /referenceWidthDriftProbe/);
  assert.match(smoke, /bodyWidthStaysReferenceInWideFrame/);
  assert.match(smoke, /appRootWidthStaysReferenceInWideFrame/);
  assert.match(smoke, /appShellWidthStaysReferenceInWideFrame/);
  assert.match(smoke, /productSurfaceDoesNotFillWideFrame/);
  assert.doesNotMatch(smoke, /runShortSidePanelProbe|ShortSidePanelProbe|shortSidePanelProbe/);
  assert.match(smoke, /computedRuntimePanelHeight/);
  assert.match(smoke, /expectedRuntimePanelHeight/);
  assert.match(smoke, /runtimePanelHeightMatchesViewport/);
  assert.match(smoke, /runtimePanelHeightMatchesPanelRoot/);
  assert.match(smoke, /appRootHeightMatchesViewport/);
  assert.match(smoke, /appShellHeightMatchesViewport/);
  assert.match(smoke, /appShellWidthMatchesPanelRoot/);
  assert.match(smoke, /appRootHeight/);
  assert.match(smoke, /appRootWidth/);
  assert.match(smoke, /appShellHeight/);
  assert.match(smoke, /appShellWidth/);
  assert.match(smoke, /shellLayoutEvidence/);
  assert.match(smoke, /window\.visualViewport\?\.height \|\| window\.innerHeight \|\| document\.documentElement\.clientHeight/);
  assert.match(smoke, /Math\.abs\(runtimePanelHeight - expectedRuntimePanelHeight\) <= 1/);
  assert.match(smoke, /Math\.abs\(datasetRuntimePanelHeight - expectedRuntimePanelHeight\) <= 1/);
  assert.match(smoke, /appShellRect\?\.bottom \?\? stageRect\.bottom/);
  assert.doesNotMatch(smoke, /visibleBottom=Math\.min\(stageRect\.bottom,window\.innerHeight/);
  assert.match(smoke, /getComputedStyle\(document\.body\)\.getPropertyValue\("--runtime-panel-height"\)/);
  assert.match(smoke, /exactRootRowCount/);
  assert.match(smoke, /allRootRowsFullyVisible/);
  assert.match(smoke, /rootVisibilityForLabels/);
  assert.match(smoke, /allServiceRowsFullyVisible/);
  assert.match(smoke, /amountLabelVisibleBeforeScroll/);
  assert.match(smoke, /amountInputVisibleBeforeScroll/);
  assert.match(smoke, /categoryLabelVisibleBeforeScroll/);
  assert.match(smoke, /categoryHeaderVisibleBeforeScroll/);
  assert.match(smoke, /categoryControlsVisibleBeforeScroll/);
  assert.match(smoke, /categoryChipsVisibleBeforeScroll/);
  assert.match(smoke, /visibilityForLabels/);
  assert.match(smoke, /allFullyVisibleInStage/);
  assert.match(smoke, /overflowItems/);
  assert.match(smoke, /expectedSurfaceIds/);
  assert.match(smoke, /coveredSurfaceIds/);
  assert.match(smoke, /missingSurfaceIds/);
  assert.match(smoke, /smoke did not cover product surfaces/);
  assert.match(smoke, /Chrome blocked the extension URL before the side panel app loaded/);
  assert.match(smoke, /ERR_BLOCKED_BY_CLIENT/);
  assert.match(smoke, /visible placeholder attributes were detected/);
  assert.match(smoke, /extension-smoke-result\.json/);
  assert.match(smoke, /EXTENSION_SMOKE_REPORT_DIR/);
  assert.match(smoke, /checkin-checkout-extension-smoke-/);
  assert.match(smoke, /tmpdir\(\)/);
  assert.doesNotMatch(smoke, /resolve\(rootDir,\s*"reports"\)/);
});

test("extension smoke requires explicit owner evidence for smoke-required leaf surfaces", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  const sidePanelView = read("src/ui/components/SidePanelView.svelte");

  assert.match(smoke, /surfaceCovered === true/);
  assert.match(smoke, /productSurfaceCoverageSteps/);
  assert.doesNotMatch(smoke, /surfaceCovered !== false/);

  for (const collector of [
    "collectLaundryOwnerEvidence",
    "collectSalesOwnerEvidence",
    "collectAirportVanOwnerEvidence",
    "collectRoomRemarkOwnerEvidence",
    "collectOtaOwnerEvidence",
    "collectTemplateEditorOwnerEvidence",
    "collectWorkFormEditorOwnerEvidence",
    "collectWorkReportOwnerEvidence",
  ]) {
    assert.match(smoke, new RegExp(`const ${collector}=`));
  }

  for (const owner of [
    "laundryOwnerEvidence",
    "salesOwnerEvidence",
    "airportVanOwnerEvidence",
    "roomRemarkOwnerEvidence",
    "otaOwnerEvidence",
    "templateEditorOwnerEvidence",
    "workFormEditorOwnerEvidence",
    "workReportOwnerEvidence",
  ]) {
    assert.match(smoke, new RegExp(`ownerInteractionEvidenceObserved:${owner}\\.ok|editableOwnerEvidenceObserved:${owner}\\.ok`));
    assert.match(smoke, new RegExp(`surfaceCovered:${owner}\\.ok`));
  }

  assert.match(smoke, /installClipboardBoundaryProbe/);
  assert.match(smoke, /chromeStorageGet/);
  assert.match(smoke, /finally \{\s*if\(beforeStorage\.available && storageWriteObserved\)/);
  assert.match(smoke, /finally \{\s*if\(beforeStorage\.available && storagePersisted\)/);
  assert.match(smoke, /storageWriteObserved/);
  assert.match(smoke, /copyBoundaryCalled/);
  assert.match(smoke, /copyBoundaryContainsTemplateOwnerEvidence/);
  assert.match(smoke, /collectInlineCopyOwnerEvidence/);
  assert.match(smoke, /copyOwnerEvidence/);
  assert.match(smoke, /requiredValueFailureObserved/);
  assert.match(smoke, /data-hidden-failure-kind/);
  assert.match(sidePanelView, /data-hidden-failure-kind=\{controller\.hiddenFailureEvidence\?\.kind \|\| undefined\}/);
  assert.match(sidePanelView, /data-hidden-failure-source=\{controller\.hiddenFailureEvidence\?\.source \|\| undefined\}/);
  assert.match(smoke, /renderedBodyEvidencePattern/);
  assert.match(smoke, /formStoragePersisted/);
  assert.match(smoke, /storagePersisted/);
  assert.match(smoke, /dependencyFailureVisible/);
  assert.match(smoke, /previewObserved/);
  assert.doesNotMatch(smoke, /const otaSurfaceCovered=Boolean/);
  assert.match(smoke, /preSelectionDisabledDependencyProof/);
  assert.match(smoke, /postSelectionWingsOrUpsertProof/);
  assert.match(smoke, /missingPostSelectionProofReason/);
  assert.doesNotMatch(
    smoke,
    /surfaceCovered:\s*text\(\)\.includes\((?:"세탁물 관리"|"매지출 관리"|"공항밴 관리"|"객실 정보 리마크"|"업무보고 양식"|"안내문 편집 \/ 빠른답변 편집"|"업무 양식 편집")\)/,
  );
  assert.doesNotMatch(
    smoke,
    /surfaceCovered:\s*text\(\)\.includes\(leaf\.label\)/,
  );
});

test("actual Chrome side-panel proof separates script completion from product exercise verdicts", () => {
  const proof = read("scripts/capture-actual-chrome-sidepanel-proof.ps1");

  assert.match(proof, /\$State -ne "non-fullscreen"/);
  assert.match(proof, /Do not relabel the current Chrome layout as fullscreen or tab-switch-or-reopen proof/);
  assert.match(proof, /postAction = ""/);
  assert.match(proof, /notRequired = \[string\]::IsNullOrWhiteSpace\(\$contract\.postAction\)/);
  assert.match(proof, /ok = \[string\]::IsNullOrWhiteSpace\(\$contract\.postAction\)/);
  assert.match(proof, /scriptCompleted = \$true/);
  assert.match(proof, /actualChromeSubmenuExercisePassed = if \(\$ExerciseSubmenus\) \{ \[bool\]\$submenuExercise\.ok \} else \{ \$null \}/);
  assert.match(proof, /actualChromeLeafPageExercisePassed = if \(\$ExerciseLeafPages\) \{ \[bool\]\$leafExercise\.ok \} else \{ \$null \}/);
  assert.match(proof, /\$targetOk[\s\S]*\$workSurfaceFrameStartsInStage[\s\S]*\$requiredFirstViewportMarkersOk[\s\S]*\$postActionEvidence\.ok/);
  assert.match(proof, /workSurfaceWholeRectFitsBeforeFooterDiagnostic/);
  assert.doesNotMatch(proof, /\$targetOk[\s\S]*\$workSurfaceWholeRectFitsBeforeFooterDiagnostic[\s\S]*-not \$workSurfaceExtendsBelowViewportDiagnostic/);
  assert.doesNotMatch(proof, /actualChromeLeafPageExercisePassed -ne \$true[\s\S]*exit 1/);
});

test("extension smoke uses visible scoped interactions rather than PASS strings or hidden-root shortcuts", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");

  assert.doesNotMatch(smoke, /result:\s*"PASS"/);
  assert.match(smoke, /byRootText/);
  assert.match(smoke, /byDetailText/);
  assert.match(smoke, /elementVisible/);
  assert.match(smoke, /const nodeText=\(node\)=> \{\s*const inner=\(node\?\.innerText \|\| ""\)\.trim\(\);\s*return inner \|\| \(node\?\.textContent \|\| ""\)\.trim\(\);\s*\};/);
  assert.match(smoke, /const sleep=\(ms\)=>ms <= 0 \? Promise\.resolve\(\) : new Promise\(\(resolve\)=>setTimeout\(resolve,ms\)\)/);
  assert.match(smoke, /interactiveIn=\(scope,label\)=>scope \? \[\.\.\.scope\.querySelectorAll\("button,summary"\)\]/);
  assert.match(smoke, /visibleInteractiveIn/);
  assert.match(smoke, /visibleButtonByAriaSuffix/);
  assert.match(smoke, /const back=visibleButtonByAriaSuffix\("뒤로가기"\)/);
  assert.match(smoke, /currentDetailBackButton=\(\)=>currentDetailPanel\(\)\?\.querySelector\("\.home-nav-back"\) \|\| null/);
  assert.match(smoke, /currentStageBackButton=\(\)=>document\.querySelector\("\.screen-stage \.work-surface \.home-nav-back, \.screen-stage \.pms-panel \.home-nav-back"\) \|\| null/);
  assert.match(smoke, /currentNavigationBackButton=\(\)=>currentDetailBackButton\(\) \|\| currentStageBackButton\(\)/);
  assert.match(smoke, /visibleOne/);
  assert.match(smoke, /visibleWorkSurface/);
  assert.match(smoke, /visibleWorkSurfaceByLabel/);
  assert.match(smoke, /visiblePmsPanel/);
  assert.match(smoke, /homeNavigationSurfaceVisible=\(\)=>Boolean\(document\.querySelector\("\.home-navigation-viewport"\)\)/);
  assert.match(smoke, /currentDetailPanel/);
  assert.match(smoke, /waitForStableTransition/);
  assert.doesNotMatch(smoke, /maxFiniteTransitionSettleMs/);
  assert.doesNotMatch(smoke, /isFiniteTransitionSettleBlocker/);
  assert.doesNotMatch(smoke, /effect\.getTiming/);
  assert.doesNotMatch(smoke, /animation\.currentTime/);
  assert.doesNotMatch(smoke, /\.filter\(\(animation\)=>animation\.playState === "running" \|\| animation\.pending\)/);
  assert.match(smoke, /root && elementVisible\(root\) && byRootText\("고객 서비스 관리"\)/);
  assert.match(smoke, /footerButton/);
  assert.match(smoke, /Click failure: missing visible target/);
  assert.match(smoke, /Click failure: hidden or offscreen target/);
  assert.match(smoke, /assertNoRenderErrors\("while waiting for "\+label\)/);
  assert.match(smoke, /await ensureHomeRoot\(\);\s*await waitFor\(\(\)=>byRootText\(label\)/);
  assert.match(smoke, /home root or navigation back/);
  assert.match(smoke, /await sleep\(320\)/);
  assert.match(smoke, /const byDetailText=\(label\)=>interactiveIn\(currentDetailPanel\(\),label\)/);
  assert.match(smoke, /waitForStableTransition\(label\+" detail",\(\)=>visibleDetailItems\(\)\.length > 0\)/);
  assert.match(smoke, /waitForStableTransition\(groupLabel\+" detail",\(\)=>Boolean/);
  assert.match(smoke, /waitForStableTransition\(groupLabel\+" detail",\(\)=>Boolean\(detailItemButton\(itemLabel\)\)\)/);
  assert.match(smoke, /group\.items\.every\(\(item\)=>interactiveIn\(currentDetailPanel\(\),item\)\)/);
  assert.match(smoke, /waitFor\(\(\)=>visibleWorkSurface\(\) && text\(\)\.includes\(itemLabel\)/);
  assert.match(smoke, /waitFor\(\(\)=>homeNavigationSurfaceVisible\(\),"home navigation after work back",3000\)/);
  assert.match(smoke, /waitFor\(\(\)=>visibleWorkSurfaceByLabel\("업무 양식 편집"\),"form settings"\)/);
  assert.match(smoke, /await click\(footerButton\("체크인 목록"\),"checkin pms panel"\)/);
  assert.match(smoke, /await click\(footerButton\(label\),label\+" pms panel"\)/);
  assert.match(smoke, /pms-checkin-list/);
  assert.match(smoke, /pms-checkout-list/);
  assert.match(smoke, /pms-room-select/);
});

test("extension smoke cannot count PMS failure copy as backend success", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");
  const releaseGate = read("scripts/extension-smoke-release-gate.ts");

  assert.match(smoke, /pmsBackendConnected/);
  assert.match(smoke, /PMS_SEARCH_ENDPOINT/);
  assert.match(smoke, /collectPmsNetworkEvidence/);
  assert.match(smoke, /Network\.getResponseBody/);
  assert.match(smoke, /jsonRowsObserved/);
  assert.match(smoke, /collectPmsRequestEvidence/);
  assert.match(smoke, /requestId\?: string/);
  assert.match(smoke, /requestOrdinal\?: number/);
  assert.match(smoke, /evidence\.requestId === requestId/);
  assert.match(smoke, /evidence\.requestOrdinal === requestOrdinal/);
  assert.match(smoke, /requestPostDataPresent/);
  assert.match(smoke, /requestPostDataLength/);
  assert.match(smoke, /surfaceStep/);
  assert.match(smoke, /mapPmsResponseEvidenceByStep/);
  assert.match(smoke, /REQUIRED_PMS_RELEASE_STEPS/);
  assert.match(smoke, /pmsNetworkEvidenceConnected/);
  assert.match(smoke, /pmsFetchEvidenceConnected/);
  assert.match(smoke, /rowEvidenceKind/);
  assert.match(smoke, /attachPmsStepNetworkEvidence/);
  assert.match(smoke, /recomputeSmokeOk/);
  assert.match(smoke, /PMS DOM rows were observed without network JSON rows/);
  assert.match(smoke, /smoke\.pmsBackendConnected === true/);
  assert.match(releaseGate, /PMS backend did not return connected JSON rows/);
  assert.match(releaseGate, /PMS backend-connected success was not proven by per-surface PMS network JSON rows/);
  assert.match(smoke, /pmsFailurePattern=\/PMS 조회에 실패했습니다\|PMS 연결 확인 필요\|PMS 연결 실패\|PMS 응답 오류\|Error:\//);
  assert.doesNotMatch(smoke, /pmsBackendConnected=realRecordCount > 0 && !backendFailure/);
  assert.doesNotMatch(smoke, /stateKind=pmsBackendConnected \? "rows"/);
  assert.match(smoke, /pmsFailureTextDoesNotCountAsBackendSuccess/);
  assert.match(smoke, /const evidence=requestUrl === pmsEndpoint \? \{/);
  assert.match(smoke, /status:null/);
  assert.match(smoke, /pmsSurfaceFetchEvidence\.push\(evidence\);\s*\}/);
  assert.match(smoke, /const response=await originalFetch\(input,init\)/);
  assert.match(smoke, /evidence\.status=response\.status/);
  assert.match(smoke, /pmsEvidenceForStep=\(stepName\)=>pmsSurfaceFetchEvidence/);
  assert.match(smoke, /pmsRequestForStep=\(stepName\)=>pmsSurfaceFetchEvidence/);
  assert.match(smoke, /Boolean\(pmsEvidenceForStep\(stepName\)\)/);
  assert.match(smoke, /requestObservedUnresolved/);
  assert.match(smoke, /pmsObservationTimedOut:true/);
  assert.match(smoke, /pmsRequestEvidenceObserved:Boolean\(pmsRequestForStep\(stepName\)\)/);
  assert.doesNotMatch(smoke, /\.finally\(\(\)=>pmsSurfaceFetchEvidence\.push\(evidence\)\)/);
  assert.doesNotMatch(smoke, /label\+" pms resolved state",30000/);
  assert.match(smoke, /finally \{\s*activePmsSurfaceStep="";\s*\}/);
  assert.match(smoke, /noInputPlaceholders: inputPlaceholders\(visiblePmsPanel\("체크인 목록"\) \|\| document\)\.length === 0/);
  assert.match(smoke, /pmsBackendState: checkinPmsState\.stateKind/);
  assert.match(smoke, /pmsBackendState: pmsState\.stateKind/);
  assert.doesNotMatch(smoke, /pmsBackendConnected: checkinPmsState\.pmsBackendConnected/);
  assert.doesNotMatch(smoke, /pmsBackendConnected: pmsState\.pmsBackendConnected/);
  assert.match(smoke, /stateKind=backendFailure \? "backendFailure" : empty \? "empty" : loading \? "loading" : records\.length > 0 \? "rowsUnverified" : "unknown"/);
  assert.match(smoke, /bottomBarRect\?\.top/);
  assert.match(smoke, /isInteractionAssertionFailure/);
  assert.match(smoke, /step\.step\.startsWith\("pms-"\) && key === "pmsFetchEvidenceConnected"/);
  assert.doesNotMatch(smoke, /hasResolvedBackendState:\s*\/PMS 조회에 실패했습니다/);
  assert.doesNotMatch(smoke, /hasResolvedBackendState:\s*\/PMS 조회 실패\|현재 등록된 PMS 기록 없음/);
});

test("extension smoke writes a failure report when CDP evaluation fails", () => {
  const smoke = read("scripts/check-extension-sidepanel-smoke.ts");

  assert.match(smoke, /cdpFailure/);
  assert.match(smoke, /SMOKE_EVALUATION_TIMEOUT_MS = 300_000/);
  assert.match(smoke, /SMOKE_WATCHDOG_TIMEOUT_MS = 270_000/);
  assert.match(smoke, /let partialResult=null/);
  assert.match(smoke, /partialResult=result/);
  assert.match(smoke, /const partial=partialResult \|\| \{\}/);
  assert.match(smoke, /const partialSteps=Array\.isArray\(partial\.steps\) \? partial\.steps : \[\]/);
  assert.match(smoke, /coveredSurfaceIds=\[\.\.\.new Set\(partialSteps/);
  assert.match(smoke, /visiblePlaceholderAttributesOnFailure=\[\.\.\.document\.querySelectorAll\("input\[placeholder\],textarea\[placeholder\]"\)\]/);
  assert.match(smoke, /noHorizontalPageOverflowOnFailure=/);
  assert.match(smoke, /placeholderAttributesAbsent: visiblePlaceholderAttributesOnFailure\.length === 0/);
  const smokeExpressionStart = smoke.indexOf("function smokeExpression");
  const smokeExpressionEnd = smoke.indexOf("function watchdogSmokeExpression");
  assert.ok(smokeExpressionStart >= 0 && smokeExpressionEnd > smokeExpressionStart);
  const smokeExpressionBody = smoke.slice(smokeExpressionStart, smokeExpressionEnd);
  assert.doesNotMatch(smokeExpressionBody, /catch \(error\)[\s\S]*steps:\s*\[\],[\s\S]*menuState:\s*null,[\s\S]*coveredSurfaceIds:\s*\[\]/);
  assert.match(smoke, /watchdogSmokeExpression/);
  assert.match(smoke, /backgroundSmokeExpression/);
  assert.match(smoke, /pollSmokeResult/);
  assert.match(smoke, /__EXTENSION_SMOKE_RESULT__/);
  assert.match(smoke, /__EXTENSION_SMOKE_PARTIAL_RESULT__/);
  assert.match(smoke, /const partial=window\.__EXTENSION_SMOKE_PARTIAL_RESULT__ \|\| \{\}/);
  assert.match(smoke, /const partialSteps=Array\.isArray\(partial\.steps\) \? partial\.steps : \[\]/);
  assert.doesNotMatch(smoke, /error: "Extension smoke evaluation watchdog elapsed\."[\s\S]{0,300}steps:\s*\[\]/);
  assert.match(smoke, /Extension smoke evaluation watchdog elapsed/);
  assert.match(smoke, /Page\.captureScreenshot/);
  assert.match(smoke, /writeSmokeReport\(/);
  assert.match(smoke, /Failure screenshot was not captured/);
  assert.match(smoke, /Failure DOM snapshot was not captured/);
  assert.match(smoke, /wroteEvaluationReport = true/);
  assert.match(smoke, /if \(wroteEvaluationReport\) \{\s*throw error;\s*\}/);
  assert.match(smoke, /throw error/);
});
