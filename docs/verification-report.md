# Verification Report

Date: 2026-06-05

## Status

- This is an evidence ledger, not a completion label.
- Current UI and contract smoke evidence is from the repo automation path.
- Actual user Chrome side-panel proof is still not release-complete because the real installed Chrome profile is not exposed through CDP and the current Chrome plugin runtime health check reports a missing native-host config file.
- A read-only desktop/UI Automation capture did observe the real Google Chrome side panel in a non-fullscreen Chrome window. It is one-state actual Chrome evidence, not the required three-state DOM/CDP release proof.
- Live PMS row success is not verified.

## Chrome Target

- Required target URL: `chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html`
- Current smoke confirmed Chrome profile registration from Secure Preferences:
  `C:\Users\anise\code\Dev-Product\입실퇴실 안내문 생성기\dist`
- Current smoke browser was bundled Playwright Chromium:
  `C:\Users\anise\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe`
- User Chrome side-panel direct visual capture was obtained through desktop `CopyFromScreen`, not through Chrome DOM/CDP.
- Near-maximized actual Chrome visual capture:
  `C:\Users\anise\AppData\Local\Temp\codex-chrome-capture-20260605-093134\desktop.png`
- This near-maximized capture shows the real Chrome side panel on `매지출 관리`; amount/category controls and the category chips are visible above the bottom bar.
- Forced non-full Chrome window visual capture:
  `C:\Users\anise\AppData\Local\Temp\codex-chrome-sidepanel-nonfull-20260605-093224\desktop-nonfull.png`
- This forced non-full capture shows the Chrome side panel partly clipped beyond the right desktop edge. It is visual evidence of the repeated window/side-panel geometry problem, but no DOM coordinate proof was captured from this state.
- Repeated target-confusion root cause: the runnable smoke path attaches to a CDP `page` target and navigates to the extension URL. That is a normal tab/page target, even when the app width is bounded to 400px or the viewport is emulated to 400x520. It does not prove Chrome's actual side-panel container height, side-panel scrollbar behavior, or non-fullscreen Chrome window layout. Any report field named like a side-panel probe was misleading; the source now names this evidence `shortExtensionPageViewportProbe` to keep it classified as extension-page evidence only.
- Chrome plugin health command result: `overall_status=fail`, `failure=chrome_plugin_runtime_health`.
- Latest Chrome plugin health detail: Codex Chrome Extension is installed/enabled and the native-host manifest registry check is correct, but `extension-host-config.json` is missing under
  `C:\Users\anise\.codex\plugins\cache\openai-bundled\chrome\latest\extension-host\windows\x64\`.
- Google Chrome direct smoke command with `CHROME_EXTENSION_SMOKE_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe`
  now fails before navigation because Chrome stable ignores `--load-extension`.
- Root-cause diagnostic observed: `--load-extension is not allowed in Google Chrome, ignoring.`
- Current running Google Chrome command lines do not expose a `--remote-debugging-port`; direct CDP attach is therefore not available from shell evidence.
- The smoke runner now has an attached real-Chrome mode through `CHROME_EXTENSION_SMOKE_CDP_URL` or `CHROME_EXTENSION_SMOKE_CDP_PORT`. It still has not been run successfully against the user's installed Chrome profile.
- Earlier read-only desktop capture did not show the extension side panel.
- Direct desktop capture succeeded through .NET `CopyFromScreen`; it is visual observation only and not DOM/product proof.
- Chrome DevTools MCP screenshot attempt failed with `Transport closed`; the Chrome browser-client setup through the current `node_repl` tool also failed with `Transport closed`. These are tool/runtime failures and are not product UI evidence.
- `repair-chrome-plugin-runtime.ps1 -Mode repair -Json` refused to mutate native-host paths while Chrome extension host processes were running. This preserves evidence and avoids disrupting the user's active Chrome session.
- Latest bundled Chromium smoke result:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-extension-smoke-2026-06-05T01-43-25-522Z-27800\extension-smoke-result.json`
- Earlier read-only desktop capture before the successful Chrome foreground capture:
  `C:\Users\anise\AppData\Local\Temp\codex-desktop-capture-20260605-085424\desktop.png`
- That earlier capture shows Codex Desktop in front of Chrome, not the extension side panel.
- Chrome plugin diagnostics found the Codex Chrome extension installed/enabled and native host manifest correct; the remaining direct-control failure is Chrome plugin runtime health plus current tool transport, not a product UI success.
- The product background worker now restores the original ZIP's PMS-origin tab enablement boundary: `chrome.tabs.onUpdated` detects `https://pms.sanhait.com` tabs and calls `chrome.sidePanel.setOptions({ tabId, path: EXTENSION_CONFIG.sidePanelPath, enabled: true })`.
- Latest actual user Chrome non-fullscreen side-panel proof was captured with Windows UI Automation plus desktop screenshot:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-actual-chrome-sidepanel-20260605-104005\actual-chrome-sidepanel-proof.json`
- Latest actual user Chrome non-fullscreen screenshot:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-actual-chrome-sidepanel-20260605-104005\desktop.png`
- Latest UIA proof observed `state=non-fullscreen`, `source=windows-uia-real-user-chrome-side-panel-capture`, Chrome title `새 탭 - Chrome`, visible side-panel surface `매지출 관리`, and app-shell scale `1.8`.
- Latest UIA app-shell rect was `left=2142 top=320 width=720 height=1366`, which infers the 400 CSS px side-panel contract at DPI scale 1.8.
- Latest UIA checks were true for `appShellObserved`, `sidePanelHeaderObserved`, `footerObserved`, `bottomButtonsObserved`, `categoryChipsObserved`, `appShellWidthMatches400CssAtInferredScale`, `footerContainedInAppShell`, `workSurfaceDoesNotUnderlapFooter`, and `salesCategoryChipsVisibleBeforeFooter`.
- Latest UIA relative coordinates were `workSurfaceTop=100`, `salesCategoryTop=368`, and `footerTop=1262` in UIA/DPI coordinates. This proves the currently visible non-fullscreen `매지출 관리` state has category chips above the bottom bar. It does not prove fullscreen or tab-switch/reopen stability.
- The UIA capture script did not recover a `.screen-stage` accessibility node in this state, so it is not a substitute for the release gate's DOM/CDP-quality coordinate contract.

## Visual Target Evidence

- ImageGen reference target directory:
  `C:\Users\anise\.codex\generated_images\019e914c-3227-7be2-9558-ea7ac197021d`
- This run generated 13 ImageGen concept reference images before implementation.
- Final source visual contract is the deterministic per-surface `target.svg` plus `contract.json` under:
  `docs/product-surface-targets/<surfaceId>/`
- Current product-surface contract directory contains 16 tracked `expected.png`
  images, one per product surface. They are repo-boundary expected-image
  contracts and are not actual Chrome side-panel proof.

## Command Evidence

- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 46/46 tests.
- `npx tsx --test tests/product-surface-contract.test.ts tests/repo-boundary.test.ts`:
  exit 0, 21/21 tests.
- `npx tsx --test tests/repo-boundary.test.ts`: exit 0, 11/11 tests.
- `npm run build`: exit 0.
- `npm run check:sidepanel-scale`: exit 0, failures `[]`.
- `npm run check:extension-smoke`: exit 1. Latest failure reasons are missing
  owner-evidence coverage for several leaf surfaces, PMS SAML HTML instead of
  JSON `rows` on all three PMS bottom surfaces, and missing actual user Chrome
  side-panel proof. Latest smoke report:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-extension-smoke-2026-06-05T06-22-34-666Z-11540\extension-smoke-result.json`
- `npm run verify`: not rerun because `check:extension-smoke` is intentionally non-passing while these release-gate blockers remain.
- `CHROME_EXTENSION_SMOKE_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe npm run check:extension-smoke`: exit 1, Google Chrome stable cannot be used for this unpacked automation smoke path.
- `npm run diagnose:pms -- --date=20260605 --mode=ARRIVAL --branch=coex`: exit 0 as evidence collection; `connected=false`.
- `npm run diagnose:pms -- --original-zip="C:\Users\anise\Downloads\입실퇴실 안내문 생성기 (1).zip" --with-header-variants`: exit 0 as evidence collection; original ZIP POST body comparison matched and all 4 variants returned SAML HTML. Latest report:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-pms-diagnostic-1780618700410\pms-diagnostic-result.json`
- `npm run diagnose:pms -- --date=20260605 --mode=ARRIVAL --branch=coex --require-connected`: exit 1; this is the expected release-gate failure while no live JSON `rows` are observed. Latest report:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-pms-diagnostic-1780618726673\pms-diagnostic-result.json`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture-actual-chrome-sidepanel-proof.ps1 -State non-fullscreen`: exit 0. Latest actual Chrome UIA proof:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-actual-chrome-sidepanel-20260605-104005\actual-chrome-sidepanel-proof.json`
- `powershell.exe -File .\scripts\capture-actual-chrome-sidepanel-proof.ps1 -State non-fullscreen`: exit 1 due Windows PowerShell 5 ANSI parsing of Korean UIA string literals. Use `pwsh`.
- `git diff --check`: exit 0.
- `git diff --check --cached`: exit 0 after trimming a trailing blank line in
  `docs/BACKEND_CONTRACT_REVIEW.md`.

Latest bundled Chromium smoke result path:

  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-extension-smoke-2026-06-05T01-43-25-522Z-27800\extension-smoke-result.json`

## Current Smoke Evidence

- Covered product surfaces in the latest bundled Chromium UI evidence: 9/16
  product surfaces in extension page-target automation only.
- This coverage is not actual Google Chrome side-panel proof.
- Missing surfaces: `customer-checkin-notice`, `customer-fee-notice`,
  `laundry-management`, `sales-management`, `airport-van-management`,
  `room-remark`, `notice-reply-editor`.
- Smoke passed: `false`.
- Failure screenshot/HTML evidence was written under the same temp smoke directory.
- Execution surface: `extension-url-page-target`; `actualUserChromeSidePanelProof=false`. This means the bundled smoke still lacks actual side-panel proof even though the separate UIA capture observed one real non-fullscreen Chrome side-panel state.
- Browser attachment: `bundled-automation-profile`.
- Attached real-Chrome CDP mode now refuses to treat any CDP `page` target as actual side-panel proof. URL equality with `chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html` does not prove the Chrome side-panel container, so this mode fails before mutating a normal Chrome tab.
- The 400px bounded layout and 400x520 extension-page viewport probe are tab/page-target evidence only. They must not be described as the actual user Chrome side panel, and they cannot close the side-panel height issue.
- Smoke JSON now writes `shortExtensionPageViewportProbe`; the old misleading `shortSidePanelProbe` report field is absent in the latest result.
- Horizontal overflow: 0.
- Runtime/page/console errors: 0.
- Visible placeholder attributes: 0.
- Banned generic feedback text (`복사됨`, `입력됨`, `저장됨`, `복사되었습니다.`) was not present in initial or final smoke text.
- Work-surface footer coordinate evidence records `footerContainedInAppShell`,
  `stageDoesNotUnderlapFooter`, `visibleSurfaceDoesNotUnderlapFooter`, and
  `lastVisibleControlDoesNotUnderlapFooter`. Latest extension-page smoke still
  has false work-surface footer evidence on several leaf surfaces; this remains
  a smoke failure and must not be reported as release-complete.
- Short extension-page viewport probe: `innerHeight=520`, `visualViewportHeight=520`, `clientHeight=520`, `appRootHeight=520`, `appShellHeight=520`, `computedRuntimePanelHeight=520px`, `runtimePanelHeightMatchesViewport=true`, `runtimePanelHeightMatchesPanelRoot=true`.
- Wide extension-page width probe: `innerWidth=440`, product surface width remains 400px, `productSurfaceDoesNotFillWideFrame=true`.
- Runtime panel height now uses viewport measurements only (`visualViewport.height`, `innerHeight`, then `documentElement.clientHeight`); self-referential app/document box height fallback is absent. `body`, `#app`, and `.app-shell` apply `min(var(--runtime-panel-height), 100dvh)` so the side-panel root container query is tied to the measured viewport height.
- Short extension-page viewport probe root rows: 5/5 exact labels, all `fullyVisible=true`.
- Short extension-page viewport probe customer-service rows: 세탁물 관리, 매지출 관리, 공항밴 관리, all `fullyVisible=true`.
- Short extension-page viewport probe work-management expected rows are now: 객실 정보 리마크, NAVER / STATION 예약입력, 업무보고 양식.
- Short extension-page viewport probe template/form expected rows are now: 안내문 편집 / 빠른답변 편집, 업무 양식 편집.
- 고객 서비스 관리 submenu rows visible before scroll:
  세탁물 관리, 매지출 관리, 공항밴 관리.
- 업무 관리 submenu rows visible:
  객실 정보 리마크, NAVER / STATION 예약입력, 업무보고 양식.
- 템플릿 / 양식 편집 submenu rows visible:
  안내문 편집 / 빠른답변 편집, 업무 양식 편집.
- Smoke must record exact row count and `fullyVisible=true` for 고객 서비스 관리, 업무 관리, and 템플릿 / 양식 편집 submenu rows using the current 16-surface labels instead of legacy labels or DOM text alone.
- 매지출 first screen includes amount input and 4 category chips before scroll.
- The release gate now treats `extension-url-page-target` as permanently ineligible for pass. A test-forged page-target object with `actualUserChromeSidePanelProof=true` is rejected, and even an unbranded `actual-user-chrome-side-panel` object is rejected because current automation has no real Chrome side-panel capture artifact.
- PMS release success now requires per-surface evidence for `pms-checkin-list`, `pms-checkout-list`, and `pms-room-select`: endpoint match, `POST`, captured postData, JSON `rows`, requestId-correlated surface step, and a visible PMS state connected to the same response evidence.

## PMS Backend Diagnostic

- Diagnostic request matched the original ZIP PMS POST shape:
  `POST https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do`
- Latest original-ZIP comparison diagnostic started at `2026-06-05T00:18:20.538Z` (`2026-06-05 09:18:20 KST`).
- Headers: `Content-Type: application/x-www-form-urlencoded`.
- Product credentials mode: `include`, so an existing PMS browser session can be attached to the host-permission request without adding a WINGS login workflow or reading cookie values.
- The original ZIP `sidepanel.js` fetch shape is retained as a diagnostic comparison variant named `original-no-cookie-post`; it is no longer the product fetch credential mode.
- Original ZIP runtime boundary now records `originalSidePanelEnabledOnPmsTab=true`, `originalPmsFetchLocation=extension-sidepanel`, `originalBackgroundFetchesPms=false`, and `originalWingsLoginRequiredBeforePmsFetch=false`. The original program enabled the side panel from a PMS tab but did not fetch through WINGS or require a WINGS login workflow before PMS lookup.
- POST body entry count: 94, matching the original ZIP. Field-only array filters no longer send empty `value=` entries.
- Observed response: status 200, `text/html;charset=utf-8`.
- Response body started with a SAML form action to `https://idp.sanhait.com/identity/samlsso`.
- Result: no JSON `rows` were observed. This is a PMS backend failure state, not backend success.
- Credentialed header variants with `Accept: application/json` and `X-Requested-With: XMLHttpRequest`, plus the original no-cookie comparison, also returned status 200 `text/html;charset=utf-8` SAML form with `jsonRowsObserved=false`.
- Diagnostic report path for the latest release-gate run:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-pms-diagnostic-1780618726673\pms-diagnostic-result.json`
- Latest extension smoke network evidence observed 3 PMS endpoint responses, one each for `pms-checkin-list`, `pms-checkout-list`, and `pms-room-select`, all status 200 `text/html;charset=utf-8`.
- The smoke page observed PMS surface fetch attempts for all three PMS bottom surfaces, all `POST` with captured postData and SAML HTML bodies.
- The CDP network responses recorded requestIds, endpoint match, `POST`, captured postData, and surface steps for all three PMS bottom surfaces; the release evidence remains disconnected because every observed response is SAML HTML with no JSON `rows`.
- Each response had `jsonRowsObserved=false`, `jsonRowCount=0`, `hasSamlForm=true`, and `connected=false`.
- Latest extension smoke network evidence recorded `responseCount=3`, `jsonRowsResponseCount=0`, `jsonRowCount=0`, `hasSamlForm=true`, `connected=false`.
- PMS backend-connected success now requires observed per-surface PMS endpoint JSON `rows`; DOM row text, PMS failure text, global endpoint rows, or empty state cannot promote backend success, and `check:extension-smoke` must exit nonzero while connected rows are absent.

## Remaining Required Evidence

- Actual user Chrome side-panel capture now exists for one non-fullscreen `매지출 관리` state, but release-complete proof still requires fullscreen and tab-switch/reopen states plus a DOM/CDP-quality app-shell-relative proof path.
- PMS check-in, check-out, and room-select still need live row success evidence from real PMS `rows` if release requires connected backend data.
- PMS failure text must not be counted as record success.
- Docs now state that PMS list fetch remains a direct host-permission POST contract.
