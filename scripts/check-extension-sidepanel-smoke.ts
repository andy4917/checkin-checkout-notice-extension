import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createServer } from "node:net";

import manifest from "../dist/manifest.json" with { type: "json" };
import { getExtensionIdFromManifestKey } from "./extension-id.js";

type DevtoolsTarget = {
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

type CdpResponse = {
  id?: number;
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

type SmokeResult = {
  href: string;
  initialHasHome: boolean;
  bannedInitial: boolean;
  steps: Array<Record<string, unknown>>;
  menuState?: unknown;
  pmsStatus?: string;
  noHorizontalPageOverflow: boolean;
  overflowItems: unknown[];
  bannedFinal: boolean;
  ok: boolean;
};

const rootDir = resolve(import.meta.dirname, "..");
const distDir = resolve(rootDir, "dist");
const expectedExtensionId = getExtensionIdFromManifestKey(manifest.key);

async function runSmoke() {
  const browserPath = findBrowserPath();
  const debuggingPort = await getFreePort();
  const profileDir = await mkdtemp(join(tmpdir(), "sidepanel-extension-smoke-"));
  let browserProcess: ChildProcess | null = null;

  try {
  validateDistManifest();
  browserProcess = launchBrowser(browserPath, debuggingPort, profileDir);
  const targets = await waitForExtensionTargets(debuggingPort);
  const worker = targets.find(
    (target) => target.url === `chrome-extension://${expectedExtensionId}/assets/background.js`,
  );
  if (!worker) {
    throw new Error(
      [
        `Built extension worker was not loaded for ${expectedExtensionId}.`,
        "This usually means the selected browser rejected --load-extension or loaded a different extension.",
        `Browser: ${browserPath}`,
        `Targets: ${JSON.stringify(summarizeTargets(targets))}`,
      ].join("\n"),
    );
  }

  const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`No debuggable page target was available. Targets: ${JSON.stringify(summarizeTargets(targets))}`);
  }

  const session = await CdpSession.connect(page.webSocketDebuggerUrl);
  try {
    await session.send("Page.enable");
    await session.send("Runtime.enable");
    const extensionUrl = `chrome-extension://${expectedExtensionId}/sidepanel.html`;
    await session.send("Page.navigate", { url: extensionUrl });
    await delay(1_000);

    const smokeResponse = await session.send("Runtime.evaluate", {
      expression: smokeExpression(),
      awaitPromise: true,
      returnByValue: true,
    });
    const exceptionDetails =
      smokeResponse.exceptionDetails ||
      smokeResponse.result?.exceptionDetails ||
      smokeResponse.result?.result?.exceptionDetails;
    if (exceptionDetails) {
      throw new Error(`Extension smoke evaluation failed: ${JSON.stringify(exceptionDetails)}`);
    }

    const rawResult = smokeResponse.result?.result?.value;
    if (typeof rawResult !== "string") {
      throw new Error(`Extension smoke returned non-string result: ${JSON.stringify(smokeResponse)}`);
    }

    const smoke = JSON.parse(rawResult) as SmokeResult;
    const screenshot = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFailureScreenshotIfNeeded(smoke, screenshot);
    assertSmokeResult(smoke, extensionUrl);

    console.log(
      JSON.stringify(
        {
          browser: browserPath,
          extensionId: expectedExtensionId,
          targetUrl: extensionUrl,
          checkedSteps: smoke.steps.map((step) => step.step),
          menuState: smoke.menuState,
          pmsStatus: smoke.pmsStatus,
          overflowItems: smoke.overflowItems.length,
          passed: true,
        },
        null,
        2,
      ),
    );
  } finally {
    session.close();
  }
  } finally {
    if (browserProcess && !browserProcess.killed) {
      browserProcess.kill();
      await waitForProcessExit(browserProcess);
    }
    await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  }
}

function validateDistManifest() {
  if (!existsSync(join(distDir, "manifest.json")) || !existsSync(join(distDir, "sidepanel.html"))) {
    throw new Error("dist is missing manifest.json or sidepanel.html. Run npm run build first.");
  }
  if (manifest.manifest_version !== 3) {
    throw new Error("dist manifest is not MV3.");
  }
  if (manifest.background?.service_worker !== "assets/background.js") {
    throw new Error("dist manifest background service worker must be assets/background.js.");
  }
  if (manifest.side_panel?.default_path !== "sidepanel.html") {
    throw new Error("dist manifest side_panel.default_path must be sidepanel.html.");
  }
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

  throw new Error(
    "No extension automation browser found. Set CHROME_EXTENSION_SMOKE_BROWSER to a Chromium or Chrome for Testing chrome.exe that supports --load-extension.",
  );
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
): ChildProcess {
  const args = [
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    `--disable-extensions-except=${distDir}`,
    `--load-extension=${distDir}`,
    "--window-size=420,950",
    "about:blank",
  ];
  return spawn(executablePath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function waitForExtensionTargets(port: number): Promise<DevtoolsTarget[]> {
  let lastTargets: DevtoolsTarget[] = [];
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await requestJson<DevtoolsTarget[]>(`http://127.0.0.1:${port}/json/list`);
      lastTargets = targets;
      if (
        targets.some(
          (target) => target.url === `chrome-extension://${expectedExtensionId}/assets/background.js`,
        )
      ) {
        return targets;
      }
    } catch {
      // Chrome may take a moment to publish extension targets.
    }
    await delay(250);
  }
  return lastTargets;
}

function summarizeTargets(targets: DevtoolsTarget[]) {
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
  private pending = new Map<number, (value: CdpResponse) => void>();

  private constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      if (!raw) return;
      const message = JSON.parse(raw) as CdpResponse;
      if (!message.id) return;
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      resolver(message);
    });
  }

  static async connect(url: string): Promise<CdpSession> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolvePromise, rejectPromise) => {
      socket.addEventListener("open", () => resolvePromise(), { once: true });
      socket.addEventListener("error", () => rejectPromise(new Error("Failed to connect to Chrome DevTools WebSocket")), {
        once: true,
      });
    });
    return new CdpSession(socket);
  }

  async send(method: string, params?: Record<string, unknown>): Promise<CdpResponse> {
    const id = this.nextId;
    this.nextId += 1;
    const response = new Promise<CdpResponse>((resolvePromise) => {
      this.pending.set(id, resolvePromise);
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  close() {
    this.socket.close();
  }
}

function smokeExpression(): string {
  return String.raw`
(async()=> {
 const runtimeErrors=[];
 try {
 window.addEventListener("error",(event)=>runtimeErrors.push(event.message || String(event.error || "error")));
 window.addEventListener("unhandledrejection",(event)=>runtimeErrors.push(String(event.reason || "unhandled rejection")));
 const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
 const waitFor=async(predicate,label,timeout=7000)=>{
   const start=performance.now();
   while(performance.now()-start<timeout){
     const value=predicate();
     if(value) return value;
     await sleep(100);
   }
   throw new Error("Timed out waiting for "+label);
 };
 const click=async(element,label)=>{
   if(!element) throw new Error("Missing "+label);
   element.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));
   element.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));
   element.click();
   await sleep(180);
 };
 const text=()=>document.body?.innerText || "";
 const byText=(label)=>[...document.querySelectorAll("button,summary")].find((node)=>(node.innerText || "").includes(label));
 const byRootText=(label)=>[...document.querySelectorAll(".root-panel button")]
   .find((node)=>(node.innerText || "").includes(label));
 const byDetailText=(label)=>[...document.querySelectorAll(".detail-panel button,.detail-panel summary")]
   .find((node)=>(node.innerText || "").includes(label));
 const buttonStates=(selector)=>[...document.querySelectorAll(selector)].map((node)=>({
   text:(node.innerText || "").trim(),
   disabled:Boolean(node.disabled)
 }));
 const visibleRootItems=()=>[...document.querySelectorAll(".root-panel .home-nav-root-item")]
   .map((node)=>(node.innerText || "").trim())
   .filter(Boolean);
 const visibleDetailItems=()=>[...document.querySelectorAll(".detail-panel .home-submenu-item")]
   .map((node)=>(node.innerText || "").trim())
   .filter(Boolean);
 const inputPlaceholders=()=>[...document.querySelectorAll(".work-surface input[placeholder],.work-surface textarea[placeholder]")]
   .map((node)=>node.getAttribute("placeholder") || "")
   .filter(Boolean);
 const clippedLabels=()=>[...document.querySelectorAll(".work-surface strong,.work-surface button,.work-surface span")]
   .filter((node)=>{
     const style=getComputedStyle(node);
     return style.overflow !== "visible" && node.scrollWidth > node.clientWidth + 1;
   })
   .map((node)=>(node.innerText || node.getAttribute("aria-label") || "").trim())
   .filter(Boolean)
   .slice(0,10);
 const workSurfaceState=(step)=> {
   const workText=document.querySelector(".work-surface")?.innerText || "";
   const placeholders=inputPlaceholders();
   return {
     step,
     noInputPlaceholders: placeholders.length === 0,
     placeholders,
     noLiteralEmptyData: !/(^|\n)\s*없음\s*($|\n)/.test(workText),
     noStorageCorruptionBanner: !/저장된 데이터 손상이 발견되었습니다/.test(workText),
     noLegacyPlaceholderText: !/YYYY\.MM\.DD|HH:MM|현재 설정 항목 없음/.test(workText),
     noClippedLabels: clippedLabels().length === 0,
     clippedLabels: clippedLabels()
   };
 };
 const homeRootVisible=()=>document.querySelector(".root-panel") && !document.querySelector(".home-navigation-viewport.submenu-active") && /고객 서비스 관리/.test(text());
 const ensureHomeRoot=async()=> {
   for(let attempt=0; attempt<6 && !homeRootVisible(); attempt+=1){
     const back=document.querySelector("[aria-label$='뒤로가기']");
     if(!back) break;
     await click(back,"back to home root");
     await sleep(220);
   }
   await waitFor(()=>homeRootVisible(),"home root");
 };
 const openHomeWorkItem=async(groupLabel,itemLabel)=> {
   await ensureHomeRoot();
   await click(byRootText(groupLabel),groupLabel+" root");
   await waitFor(()=>document.querySelector(".home-navigation-viewport.submenu-active"),groupLabel+" detail");
   await sleep(320);
   await click(byDetailText(itemLabel),itemLabel+" item");
   await waitFor(()=>document.querySelector(".work-surface") && text().includes(itemLabel),itemLabel+" work surface");
   await sleep(260);
 };
 const openSubmenu=async(label)=>{
   await waitFor(()=>byText(label), label+" root");
   await click(byText(label), label);
   await waitFor(()=>document.querySelector(".home-navigation-viewport.submenu-active"), label+" detail");
   await sleep(260);
   const detail=document.querySelector(".detail-panel");
   const state={
     label,
     items: visibleDetailItems(),
     languageVisible: Boolean(detail?.querySelector(".home-language-strip")),
     copyButtons: detail?.querySelectorAll(".home-template-copy").length || 0
   };
   await click(detail?.querySelector("[aria-label$='뒤로가기']"), label+" back");
   await waitFor(()=>!document.querySelector(".home-navigation-viewport.submenu-active"), label+" root return");
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
 const pmsBottomLabels=["체크인 목록","체크아웃 목록","객실 선택"];
 const initial=text();
 const result={
   href: location.href,
   initialHasHome: expectedRoot.every((label)=>initial.includes(label)),
   bannedInitial: /현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|The Gangnan|dropdown|복사되었습니다\.|YYYY\.MM\.DD|HH:MM/.test(initial),
   steps: [],
   menuState: {
     root: visibleRootItems(),
     bottomBeforeBranch: buttonStates(".home-fixed-bottom-bar button"),
     bottomAfterBranch: [],
     groups: [],
     pms: null
   },
   runtimeErrors,
   pmsStatus: ""
 };
 result.steps.push({
   step:"home-root-state",
   hasFiveRootGroups: result.menuState.root.length === 5,
   rootLabelsMatchContract: expectedRoot.every((label,index)=>result.menuState.root[index] === label)
 });
 await click(document.querySelector("[aria-label='지점 선택']"),"branch trigger");
 await waitFor(()=>document.querySelector("#branch-selection-popup"),"branch popup");
 const popupText=text();
 result.steps.push({ step:"branch-popup-open", hasThreeBranches:["The Coex","The Gangnam","The Seolleung"].every((label)=>popupText.includes(label)) });
 await click(byText("The Gangnam"),"The Gangnam branch");
 await waitFor(()=>!document.querySelector("#branch-selection-popup"),"branch popup closed");
 const logoAlt=document.querySelector(".header-logo-mark img")?.getAttribute("alt") || "";
 result.menuState.bottomAfterBranch=buttonStates(".home-fixed-bottom-bar button");
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
   result.menuState.groups.push(await openSubmenu(label));
 }
 result.steps.push({
   step:"full-menu-state",
   capturedAllRootGroups: result.menuState.groups.length === expectedRoot.length,
   allSubmenusHaveItems: result.menuState.groups.every((group)=>group.items.length > 0),
   accordionGroupsHaveLanguage: result.menuState.groups
     .filter((group)=>["고객 안내문","빠른 문의 답변"].includes(group.label))
     .every((group)=>group.languageVisible && group.copyButtons > 0),
   workGroupsDoNotShowLanguage: result.menuState.groups
     .filter((group)=>!["고객 안내문","빠른 문의 답변"].includes(group.label))
     .every((group)=>!group.languageVisible && group.copyButtons === 0)
 });
 await click(byText("설정"),"settings footer");
 await waitFor(()=>/템플릿 편집/.test(text()) && /양식 편집/.test(text()),"settings hub");
 const settingsText=text();
 result.steps.push({ step:"settings-hub", hasTemplateEdit:settingsText.includes("템플릿 편집"), hasFormEdit:settingsText.includes("양식 편집"), noEmptyPlaceholder:!settingsText.includes("현재 설정 항목 없음") });
 await click(byText("템플릿 편집"),"template settings route");
 await waitFor(()=>/템플릿 설정 초기화/.test(text()),"template settings");
 result.steps.push({ ...workSurfaceState("template-settings"), hasReset:text().includes("템플릿 설정 초기화") });
 await click(document.querySelector("[aria-label$='뒤로가기']"),"back from template settings");
 await waitFor(()=>/고객 서비스 관리/.test(text()),"home after template settings");
 await click(byText("설정"),"settings footer for form settings");
 await waitFor(()=>/템플릿 편집/.test(text()) && /양식 편집/.test(text()),"settings hub for form");
 await click(byText("양식 편집"),"form settings route");
 await waitFor(()=>/양식 편집/.test(text()),"form settings");
 result.steps.push({ ...workSurfaceState("form-settings"), hasFormSurface:/양식 편집/.test(text()) });
 for (let attempt=0; attempt<3 && !/고객 서비스 관리/.test(text()); attempt+=1) {
   await click(document.querySelector("[aria-label$='뒤로가기']"),"back toward home");
 }
 await waitFor(()=>/고객 서비스 관리/.test(text()),"home after back");
 await click(byText("고객 서비스 관리"),"customer service group");
 await waitFor(()=>/세탁물 관리/.test(text()) && /공항밴 관리/.test(text()),"customer service submenu");
 result.steps.push({ step:"customer-service-submenu", hasLaundry:text().includes("세탁물 관리"), hasAirportVan:text().includes("공항밴 관리"), hasBack:Boolean(document.querySelector("[aria-label$='뒤로가기']")) });
 await openHomeWorkItem("고객 서비스 관리","세탁물 관리");
 result.steps.push({
   ...workSurfaceState("laundry-work-surface"),
   hasRunningBoard:/진행 중/.test(text()),
   hasAddControl:/세탁 서비스 신청 객실 입력/.test(text()),
   hasScheduled:/세탁 예정/.test(text())
 });
 await openHomeWorkItem("고객 서비스 관리","매지출 관리");
 result.steps.push({
   ...workSurfaceState("sales-work-surface"),
   hasAmountInput:Boolean(document.querySelector(".sales-amount-panel input")),
   hasCategoryControls:document.querySelectorAll(".sales-category-panel button").length >= 4,
   hasSaveAction:/저장하기|저장됨/.test(text())
 });
 await openHomeWorkItem("고객 서비스 관리","공항밴 관리");
 result.steps.push({
   ...workSurfaceState("airport-van-work-surface"),
   hasRideSegment:/픽업/.test(text()) && /샌딩/.test(text()),
   hasRouteCard:Boolean(document.querySelector(".airport-route-card")),
   hasCopyActions:/업무 기록 복사/.test(text()) && /고객 전달 복사/.test(text())
 });
 await openHomeWorkItem("업무 관리","객실 정보 메모");
 result.steps.push({
   ...workSurfaceState("room-remark-work-surface"),
   hasRoomContext:/객실 선택|선택됨|미선택/.test(text()),
   hasInventoryControls:Boolean(document.querySelector(".room-inventory-grid")),
   hasSingleRemarkDock:document.querySelectorAll(".room-memo-console > .work-dock .primary-action").length === 1
 });
 await openHomeWorkItem("업무 관리","NAVER / STATION 예약입력");
 result.steps.push({
   ...workSurfaceState("ota-work-surface"),
   hasSourceSegment:/NAVER/.test(text()) && /STATION/.test(text()),
   hasFetchCard:Boolean(document.querySelector(".ota-fetch-card")),
   hasExtractAction:/예약정보 가져오기/.test(text())
 });
 await click(document.querySelector("[aria-label$='뒤로가기']"),"back to home before pms");
 await waitFor(()=>/체크인 목록/.test(text()),"home before pms");
 await click(byText("체크인 목록"),"checkin pms panel");
 await waitFor(()=>/체크인 목록/.test(text()),"pms panel");
 await waitFor(
   ()=>/PMS 조회 중|PMS 조회에 실패했습니다|PMS 조회 실패|현재 등록된 PMS 기록 없음/.test(text()) || byText("새로고침")?.disabled === true || document.querySelector(".pms-record-row"),
   "pms loading or resolved state"
 );
 const pmsLoadingLabel=document.querySelector(".work-empty")?.innerText.trim() || "";
 await waitFor(()=>byText("새로고침")?.disabled === false,"pms loading finished",15000);
 await waitFor(
   ()=>/PMS 조회에 실패했습니다|PMS 조회 실패|현재 등록된 PMS 기록 없음/.test(text()) || document.querySelector(".pms-record-row"),
   "pms result",
   10000
 );
 const pmsText=text();
 const pmsRecords=[...document.querySelectorAll(".pms-record-row")].map((node)=>(node.innerText || "").trim()).slice(0,5);
 result.pmsStatus=document.querySelector(".work-status")?.innerText.trim() || "";
 result.menuState.pms={
   panelTitleVisible:/체크인 목록/.test(pmsText),
   loadingLabel: pmsLoadingLabel,
   status: result.pmsStatus,
   emptyLabel: document.querySelector(".work-empty")?.innerText.trim() || "",
   recordCount: pmsRecords.length,
   records: pmsRecords
 };
 result.steps.push({
   step:"pms-backend-state-visible",
   hasPmsPanel: result.menuState.pms.panelTitleVisible,
   hasLoadingOrResolvedState:
     /PMS 조회 중/.test(result.menuState.pms.loadingLabel) ||
     /PMS 조회에 실패했습니다/.test(result.menuState.pms.status) ||
     /PMS 조회 실패|현재 등록된 PMS 기록 없음/.test(result.menuState.pms.emptyLabel) ||
     result.menuState.pms.recordCount > 0,
   hasResolvedBackendState:
     /PMS 조회에 실패했습니다/.test(result.menuState.pms.status) ||
     /PMS 조회 실패|현재 등록된 PMS 기록 없음/.test(result.menuState.pms.emptyLabel) ||
     result.menuState.pms.recordCount > 0,
   noFakePmsRecordText: !/N\/A/.test(pmsText)
 });
 const finalText=text();
 result.noHorizontalPageOverflow=document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.body.scrollWidth <= document.documentElement.clientWidth + 1;
 result.overflowItems=overflow();
 result.bannedFinal=/현재 설정 항목 없음|저장된 데이터 손상이 발견되었습니다|The Gangnan|복사되었습니다\.|YYYY\.MM\.DD|HH:MM/.test(finalText);
 result.ok=result.initialHasHome && !result.bannedInitial && result.noHorizontalPageOverflow && !result.bannedFinal && result.steps.every((step)=>Object.entries(step).every(([key,value])=>key === "logoAlt" || typeof value !== "boolean" || value));
 return JSON.stringify(result);
 } catch (error) {
   return JSON.stringify({
     href: location.href,
     ok: false,
     error: error instanceof Error ? error.message : String(error),
     text: (document.body?.innerText || "").slice(0,1200),
     html: (document.body?.innerHTML || "").slice(0,800),
     runtimeErrors,
     initialHasHome: false,
     bannedInitial: false,
     steps: [],
     menuState: null,
     pmsStatus: "",
     noHorizontalPageOverflow: false,
     overflowItems: [],
     bannedFinal: false
   });
 }
})()
`;
}

async function writeFailureScreenshotIfNeeded(smoke: SmokeResult, screenshot: CdpResponse) {
  if (smoke.ok || typeof screenshot.result?.data !== "string") {
    return;
  }
  const failurePath = join(tmpdir(), "sidepanel-extension-smoke-failure.png");
  await writeFile(failurePath, Buffer.from(screenshot.result.data, "base64"));
  console.error(`Failure screenshot: ${failurePath}`);
}

function assertSmokeResult(smoke: SmokeResult, extensionUrl: string) {
  const failures: string[] = [];
  if (smoke.href !== extensionUrl) failures.push(`expected ${extensionUrl}, got ${smoke.href}`);
  if (!smoke.initialHasHome) failures.push("home navigation labels were not visible");
  if (!smoke.menuState) failures.push("full menu state was not captured");
  if (smoke.bannedInitial) failures.push("banned legacy/placeholder text appeared on initial view");
  if (!smoke.noHorizontalPageOverflow) failures.push("page-level horizontal overflow was detected");
  if (smoke.overflowItems.length > 0) failures.push(`element overflow was detected: ${JSON.stringify(smoke.overflowItems)}`);
  if (smoke.bannedFinal) failures.push("banned legacy/placeholder text appeared after navigation");
  const failedSteps = smoke.steps.filter((step) =>
    Object.entries(step).some(([key, value]) => key !== "logoAlt" && typeof value === "boolean" && !value),
  );
  if (failedSteps.length > 0) failures.push(`failed interaction steps: ${JSON.stringify(failedSteps)}`);
  if (!smoke.ok) failures.push(`smoke result was not ok: ${JSON.stringify(smoke)}`);
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
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
