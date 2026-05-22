# UI Reference Localization And Backend Alignment Plan

## Scope

This plan starts the redesign work for the Chrome MV3 side panel using the provided desktop packs:

- `C:\Users\anise\Desktop\UI 레퍼.zip`
- `C:\Users\anise\Desktop\고객 안내형_4개국어_템플릿본.zip`
- `C:\Users\anise\Desktop\빠른 답변형_탬플릿.zip`
- `C:\Users\anise\Desktop\업무_양식_유형별_분리.zip`

The packs were extracted read-only into:

`C:\Users\anise\code\.scratch\Dev-Management\checkin-ui-template-design-20260430-151932`

The implementation target remains the Svelte side panel under `src/ui/App.svelte`, `src/ui/components/*`, and the `src/ui/*-workflow.ts` helper modules, backed by the existing application/catalog/platform modules. `App.svelte` must remain a skeleton entry and must not regain UI/business workflow bodies. Do not recreate the removed legacy `src/sidepanel/*` DOM renderer.

## Product Direction

The current app is an operational UH Suite side panel, not a dashboard, landing page, or sample-data app. The UI reference confirms this direction:

- one narrow Chrome side panel surface
- no nested sidebar navigation
- no debug/log panels
- no fake guest, room, revenue, reservation, or PMS data
- one clear next action per screen
- compact Korean operational labels
- template copy and OTA/WINGS work must stay connected to real backend contracts

## Current Phase Boundary

The frontend reference is a normalization guide for repeated UI elements, especially template lists, action rows, compact controls, and settings rows. It is not authorization in this phase to add new screens, add new workflow groups, or reorganize the existing app structure.

Current phase rules:

1. Keep the current UI structure.
2. Keep current menu groups and routes from `src/catalog/menu-routing.ts`.
3. Do not add or move workflow sections in this phase.
4. Treat the UI reference as highly connected to the current UX/UI; many screens differ mostly by naming and implementation depth.
5. Use the reference to unify repeated row/list/form patterns.
6. Localize labels and repeated controls into Korean where needed, but do not force proper branch names like `The Coex`, `The Gangnam`, or `The Seolleung` into Korean if those are the desired brand-facing names.
7. Keep backend contracts unchanged.

The workflow mapping below is descriptive only. It explains how the existing menus relate to real work; it must not be treated as a frontend restructure plan for this phase.

| Existing workflow area | Current repo surface | Backend/source owner |
| --- | --- | --- |
| Home / branch context | branch select, home menu | `src/config/branches.ts`, `src/ui/components/SidePanelView.svelte`, `src/ui/side-panel-navigation-controller.svelte.ts` |
| Guest communication / Guidance | `CUSTOMER_NOTICE` | template packs, `src/catalog/*`, renderer |
| Guest communication / Inquiry | `QUICK_REPLY` | quick reply pack, `src/catalog/*`, renderer |
| Service records / Room info | `ROOM_REMARK_MEMO` | `src/domain/remarks.ts`, WINGS context |
| Service records / Laundry | `LAUNDRY_MANAGEMENT` | `src/application/laundry-records.ts` |
| Service records / Airport van | customer guide + dispatch guide + report | catalog, work-form templates |
| Work forms / Expenditure | `SALES_MANAGEMENT` | work-form templates |
| Work forms / OTA entry | `OTA_RESERVATION_INPUT` | `src/application/ota-reservation-input.ts` |
| Work forms / Work report | `WORK_REPORT` | work-form templates |
| User settings / Template edit | `SETTINGS` | storage + template schema |
| User settings / Data reset | settings danger action | storage reset policy |

## Workflow Simulation Within Current Structure

These simulations define how the existing structure should behave after repeated UI elements are normalized. They are not requests for new screens or menu reorganization. All real values must come from PMS/OTA/browser context, template variables, or operator input.

### Simulation A: Start Of Shift

1. Staff opens the extension.
2. Home shows UH Suite, branch selector, and today/date context.
3. Staff selects `코엑스`, `강남`, or `선릉`.
4. App saves branch through storage.
5. Home menu becomes immediately actionable.

Expected frontend within current structure:

- no landing copy
- no fake occupancy/recent inquiry
- branch context is visible
- existing menu grouping remains intact

Backend path:

- `getBranchOptions()`
- `setLastBranchId()`
- no PMS call until a workflow needs selected-room context or explicit PMS sync

### Simulation B: Guest Asks For Check-In / Facility Guidance

1. Staff opens `고객 안내문`.
2. Language segmented control defaults to Korean but allows runtime `KO / EN / JP / CN` with visible labels `KR / EN / JP / CH`.
3. Staff selects a template row such as 사전/당일 안내, 셀프 체크인, 주차, 에어컨, 보일러, TV 리모컨.
4. App shows only compact title/summary and a copy icon.
5. Copy output is generated from the selected language and available variables.

Expected frontend within current structure:

- right-side copy icon on every row
- no full body wall of text in the list
- unavailable language is disabled with a short reason
- COEX-only door password content or attachments appear only if the catalog and runtime asset catalog explicitly support that COEX-scoped condition
- same template row component/pattern should be reused by other template menus

Backend path:

- `filterTemplatesForMenu("CUSTOMER_NOTICE")`
- `scopeUnifiedTemplateForBranch()`
- `guardRequiredContext()`
- `renderTemplate()`

### Simulation C: Quick Inquiry During Chat

1. Staff opens `빠른 답변`.
2. Staff chooses a short inquiry template: 물품 대여, 분실물, 객실 방문 예정, 조식, 인보이스, 취소 문의.
3. If a template has a required manual value like `[대여 물품명]`, the UI shows a small input before copy.
4. Staff copies the answer.

Expected frontend within current structure:

- faster than customer guidance
- no PMS panel by default
- no forced guest name/room fields if source template intentionally omits them
- same list-row and copy action pattern as customer guidance

Backend path:

- `filterTemplatesForMenu("QUICK_REPLY")`
- future variable form derived from `TemplateVariable`
- `renderTemplate()`

### Simulation D: Laundry Work

1. Staff opens `세탁 관리`.
2. Staff can add a laundry record from a PMS guest or manual room entry.
3. Staff updates status: received, in progress, ready, picked up.
4. Ready records expose a notify/copy action if backed by a template.

Expected frontend within current structure:

- the current frontend has a record-based first pass; continue refining it against the reference without adding machine state unless the schema supports it
- actual list comes from laundry storage
- status actions call the application layer
- do not add fake machine data; if the reference machine layout is used, it must be backed by real laundry state or deferred

Backend path:

- `createLaundryRecordFromGuest()`
- `addLaundryRecord()`
- `updateLaundryStatus()`
- `queryLaundryRecords()`

### Simulation E: Room Info Memo

1. Staff opens `객실 정보 메모`.
2. The active room context is already known by the program through the selected room model.
3. Card key count uses stepper controls.
4. Rental items use +/- controls and custom item input.
5. Staff sends the final line into WINGS remark or copies it depending active context.

Expected frontend within current structure:

- visible menu is `객실 정보 메모`
- the UI reference shows the intended final frontend structure
- selected-room values come from the backend-owned selected room state and must stay out of the current navigation-only frontend until a work screen is intentionally reintroduced
- WINGS remark formatting remains centralized
- if WINGS guest-record context is missing, show a short blocking reason

Backend path:

- `createRemarkLine()`
- `upsertRemarkLine()`
- `guardRequiredContext("guestRecord")`

### Simulation F: OTA Reservation Entry

1. Staff opens a Naver or Station reservation detail tab.
2. Staff opens `OTA 예약 입력`.
3. Staff clicks `예약정보 가져오기`.
4. App extracts real reservation values from the active tab.
5. Staff opens WINGS reservation creation window.
6. Staff clicks `WINGS에 입력`.
7. Staff reviews and saves manually in WINGS.

Expected frontend within current structure:

- source is detected from actual active tab; no fake source selection result
- summary-only preview is intentional; the human must double-check the real WINGS screen
- button text is Korean and action-oriented
- no save/confirm automation in the extension
- keep the current OTA menu, no history tab or extra bottom navigation

Backend path:

- UI workflow: `loadOtaPreview(selectedBranchId, dependencies.ota)`
- UI workflow: `fillWingsFromOtaPreview(otaPreview, dependencies.ota)`
- Application owner: `loadOtaReservationPreview()` and `fillWingsReservationFromPreview()`
- active tab automation

### Simulation G: Work Forms And Expenditure

1. Staff opens `업무 양식`.
2. Staff selects one of the latest work structures: 매지출, 드오디네 매지출, 주야간 보고, 코엑스 일일업무, 공항밴 예약보고.
3. App presents compact form/list rows.
4. Staff copies generated output.

Expected frontend within current structure:

- no incident/maintenance/housekeeping fake forms from UI reference unless a real template exists
- COEX daily report only appears under COEX
- label should follow operating language: `매지출` if that is the current workflow term
- use the same repeated template row/list treatment as other template menus

Backend path:

- `filterTemplatesForMenu("SALES_MANAGEMENT")`
- `filterTemplatesForMenu("WORK_REPORT")`
- branch-scoped catalog filtering
- `renderTemplate()`

### Simulation H: Template Settings

1. Staff opens `템플릿 설정`.
2. First screen shows families, not every field at once.
3. Staff selects 고객 안내, 빠른 답변, 업무 양식, or 리마크/운영 항목.
4. Staff edits title/body/language/branch scope.
5. Staff saves, resets one template, deletes a custom template, or uses danger reset where allowed.

Expected frontend within current structure:

- keep the current settings screen structure in this phase
- normalize repeated form rows, buttons, and reset/delete presentation
- detail editor still uses existing validators
- unsaved draft blocks navigation
- no JSON editor

Backend path:

- `validateTemplateDefinitionForSave()`
- `normalizeBranchScope()`
- `writeExtensionState()`
- `readExtensionStateWithRecovery()`

## Visual System To Adopt

Use the provided UI reference as the controlling design source. Do not introduce generic GPT design preferences or unrelated "best practice" styling when the reference already answers the layout, density, component shape, action placement, or visual hierarchy question.

| Token | Target |
| --- | --- |
| background | warm off-white, preferably `#F9F9F8` or repo-compatible `#FBFBFA` |
| surface | `#FFFFFF` |
| primary action | charcoal `#333D4B`, not blue |
| primary text | `#131C26` or existing off-black equivalent |
| secondary text | `#8B95A1` / `#787774` class of muted gray |
| border | `#E5E8EB` / `#EAEAEA` |
| danger | muted red surface only for reset/delete |
| radius | cards/panels max 8px in repo style unless a reference control needs a softer 12px container |
| shadow | avoid heavy shadows; use border and tonal layering |

The implemented `styles/sidepanel.css` uses charcoal for primary action and active states. Do not reintroduce blue primary actions unless a future reference explicitly requires it.

Do not reinterpret the reference into a different visual style. The task is to make the current frontend match the reference patterns while preserving the current app structure unless the user separately authorizes structural changes.

## UI Element Inventory

### 1. App Shell And Header

Reference elements:

- fixed or sticky top app bar
- back icon on sub screens
- home icon or menu return action
- compact title
- branch select on home/header only
- date on home reference

Current source:

- `src/ui/App.svelte` owns only entry skeleton and lifecycle wiring. Shell, header, branch select, and menu/back composition live in `src/ui/components/SidePanelView.svelte` with state/actions from `src/ui/side-panel-navigation-controller.svelte.ts`.
- `src/config/branches.ts` owns branch IDs and PMS codes.

Design rule:

- Keep branch options generated from `getBranchOptions()`.
- Show user-facing branch labels in Korean unless the user explicitly wants English labels.
- Keep repeated eyebrow labels only when they add actual workflow clarity; PMS is not exposed as a menu panel.
- Keep status/error output short and contextual; do not keep a full status card on every screen by default.

### 2. Home Menu

Reference elements:

- `home_improved_spacing`: grouped list rows, no large hero, quiet icon row, bottom utility actions.
- `home_branch_selection`: branch selector can be compact, but fake occupancy/recent inquiry data must not be used.

Current source:

- `src/catalog/menu-routing.ts` owns menu groups and menu items.
- `src/ui/components/HomeView.svelte` renders menu cards and settings entry from `src/catalog/menu-routing.ts`.

Design rule:

- Keep top-level groups from `menuGroups` and `settingsMenu`.
- Do not convert the current home structure in this phase.
- Only normalize repeated menu card spacing, labels, action affordance, and color tokens if needed.
- Remove count badges unless a count is necessary for decision-making.
- Keep no fake recent inquiry, occupancy, or customer cards.

Korean labels to use:

- 고객 안내문
- 빠른 답변
- 세탁물 관리
- 공항밴 관리
- 매지출 관리
- 객실 정보 메모
- OTA 예약 입력
- 업무 관리
- 템플릿 설정

### 3. Customer Guidance / Guest Notice

Reference elements:

- compact language segmented control: `KR / EN / JP / CH`
- list rows with icon, title, short subtitle, right copy icon
- no full body preview as the default list state

Template source:

- `고객 안내형_4개국어_템플릿본`
- 36 individual markdown files plus `UH_Suite_실무형_4개국어_템플릿_통합본.md`
- language order is `KO / EN / JP / CN`
- placeholders are Korean bracket tokens such as `[고객명]`, `[지점명]`, `[체크인일]`

Backend mapping:

- `TemplateCategory = "GUEST_NOTICE"`
- `menuId = "CUSTOMER_NOTICE"`
- `languages: Partial<Record<Language, string>>`, where runtime Chinese is `CN` and the UI label is `CH`
- render through `renderTemplate()`, not direct string interpolation in Svelte.

Required work:

- Import the markdown templates into catalog definitions.
- Normalize `CN` versus current `Language` type naming if the app currently uses `CN`.
- Map bracket placeholders to `TemplateVariable` entries.
- Preserve Korean placeholder labels for operator search/replacement.
- Enforce branch scope, especially COEX-only door password content or attachments if they are added to the runtime catalog.

### 4. Quick Inquiry / Quick Reply

Reference elements:

- same language segmented control as customer guidance
- compact row cards with copy icon
- no PMS sync panel needed for generic quick replies

Template source:

- `빠른 답변형_탬플릿`
- dynamic values include `[대여 물품명]`, `[분실 물품명]`, `[방문 예정 시간]`
- several files overlap with customer guidance content.

Backend mapping:

- `TemplateCategory = "QUICK_REPLY"`
- `menuId = "QUICK_REPLY"`
- `requiresContext = "none"` for generic replies unless a future template explicitly needs PMS.

Required work:

- Add quick reply templates as catalog entries.
- Deduplicate only exact or clearly proven duplicates.
- Keep no customer name/room number variable when the source explicitly avoids it.

### 5. Laundry Management

Reference elements:

- active machines summary
- room number input
- washer/dryer segmented control
- assign/start action
- ready list with notify actions
- waiting list
- bottom update/status action

Current backend surface:

- `src/application/laundry-records.ts`
- `src/laundry/storage.ts`
- `src/laundry/types.ts`

Design decision:

- The reference includes machine tracking, but the current backend stores laundry records, statuses, item summary, notes, room/guest linkage, and source PMS guest ID.
- Continue using the current record backend; do not invent machine-state persistence.

Required work:

- Continue UI work around real `LaundryRecord` states.
- Preserve the from-PMS action: create laundry record from selected guest plus item summary.
- Status transitions should use `updateLaundryStatus()` only.
- If machine assignment is required later, add it to `LaundryRecord` and tests first.

### 6. OTA Reservation Input

Reference elements:

- source segmented control: Naver / Station
- extract reservation info button
- extracted summary card
- final action button at bottom
- history/log area appears in reference but should not become a log panel

Current backend surface:

- UI workflow: `loadOtaPreview(selectedBranchId, dependencies.ota)`
- UI workflow: `fillWingsFromOtaPreview(otaPreview, dependencies.ota)`
- Application owner: `loadOtaReservationPreview()` and `fillWingsReservationFromPreview()`
- active tab automation under `src/platform/active-tab-automation.ts`

Design rule:

- Do not add save/confirm automation.
- User manually saves in WINGS.
- Show only actual extracted values.
- Missing WINGS window and branch mismatch must remain blocking errors.
- Korean labels: `예약정보 가져오기`, `WINGS에 입력`, `네이버`, `스테이션`, `추출 정보`.

Required work:

- Redesign the view to match the reference flow while preserving existing function calls.
- Remove fake `pending/history preview` concepts unless backed by real storage.
- Keep the source display derived from the detected OTA payload, not a UI-only source selector.

### 7. Room Info Memo

Reference elements:

- card key stepper
- rental item list with +/- controls
- add custom item
- bottom action: input to remark

Current backend surface:

- `src/domain/remarks.ts`
- current built-in remark types: card keys, rentals, medical bloom, stone house
- `createRemarkLine()` and `upsertRemarkLine()` own formatting.

Design rule:

- Use interactive controls for card key count and rental item quantity where possible.
- Keep final output through `createRemarkLine()` / `upsertRemarkLine()`.
- Do not hardcode remark text in the Svelte component.
- User-facing name should be `객실 정보 메모`.
- The program should know the currently selected room; missing selected-room backend state is a backend gap, not a user-input expectation.

Required work:

- Keep the existing `ROOM_REMARK_MEMO` route.
- In this phase, do not add a dedicated new workflow screen.
- Normalize row/card presentation with the reference.
- Add or plan backend selected-room support before treating card key/rental values as user-only manual blanks.

### 8. Airport Van Service

Reference elements:

- pickup/sending segmented control
- origin/destination fields
- date/time/flight
- payment method
- copy booking info CTA

Template source:

- customer guidance pack has airport van request/rate guide and dispatch complete guide.
- work forms pack has airport van reservation report.

Backend mapping:

- customer-facing guide templates: `GUEST_NOTICE` or `QUICK_REPLY` depending intent
- internal reservation report: `WORK_TEMPLATE` with `typeId = "reservation_report"`
- airport van is not a remark line; it is handled through customer-facing guide/dispatch templates and the internal reservation report

Design rule:

- Airport van is not absent from the backend.
- Current backend already has:
  - `report-airport-van` work report template
  - imported customer 안내/배차 완료 templates
  - regression tests that keep airport van out of remark formatting
- The missing future enhancement is richer airport van-specific form controls beyond the generic variable input grid.
- Treat the reference as the intended frontend form/list pattern for this existing backend slice.

Required work:

- Keep the current app structure, but make airport van visible where the current routes already support it:
  - customer 안내/요금/요청 양식 through imported templates
  - 배차 완료 안내 through imported templates
  - 내부 예약보고 through `report-airport-van`
  - no WINGS/객실 정보 메모 airport-van remark path

### 9. Work Forms / Reports

Reference elements:

- grouped work form list
- copy icon per form
- no fake incident/maintenance forms unless backed by provided templates

Template source:

- `업무_양식_유형별_분리`
- 주야간 업무 보고
- 코엑스점 일일업무 보고
- 매지출 보고
- 매지출 드오디네 보고
- 공항밴 예약보고

Backend mapping:

- `TemplateCategory = "WORK_TEMPLATE"`
- `menuId = "WORK_REPORT"` for reports
- `menuId = "SALES_MANAGEMENT"` for 매지출 forms
- branch scope: 코엑스 일일업무 보고 is COEX-only.

Required work:

- Existing `매출` labels are renamed to `매지출`.
- Keep COEX-only daily report scoped to `["coex"]`.
- Use actual provided work forms only; do not add housekeeping/incident/maintenance samples from the UI reference unless templates are provided.

### 10. Settings / Template Edit

Reference elements:

- settings landing list by template family
- danger zone reset
- one save action

Current backend surface:

- `readExtensionStateWithRecovery()`
- `writeExtensionState()`
- `validateTemplateDefinitionForSave()`
- `normalizeBranchScope()`
- built-in overrides and custom templates

Design rule:

- Keep the current settings structure in this phase.
- Do not add a family landing screen yet.
- Normalize repeated label/input/button rows and Korean action text.
- Keep unsaved-draft navigation lock.
- Do not add JSON editor or advanced schema panel.

## Template Import Rules

1. Read markdown files as source evidence.
2. Parse language blocks into `KO`, `EN`, `JP`, `CN`.
3. Convert bracket placeholders `[고객명]` into renderer variables.
4. Preserve policy text as fixed copy.
5. Do not over-variable static policy phrases.
6. Deduplicate only with strong evidence:
   - exact same text
   - exact same source purpose with minor known revision
   - documented duplicate group
7. Keep source refs in catalog metadata so future edits can trace origin.
8. Keep non-text assets as attachments only when the source pack or current asset catalog proves them.

## Backend Alignment Rules

| Concern | Must use | Must not do |
| --- | --- | --- |
| branch choice | `getBranchOptions()`, `requireBranch()` | hardcode PMS codes in UI |
| PMS list | `loadPmsGuestRecords(..., dependencies.pms)` -> `syncGuests(..., injected fetchImpl)` | query PMS from Svelte directly |
| OTA extraction | `loadOtaPreview(..., dependencies.ota)` -> `loadOtaReservationPreview(...)` | create fake preview records |
| WINGS fill | `fillWingsFromOtaPreview(..., dependencies.ota)` -> `fillWingsReservationFromPreview(...)` | auto-save reservation |
| template copy | `renderTemplate()` | interpolate templates in UI component |
| context gating | `guardRequiredContext()` | enable PMS-only copy everywhere |
| settings save | schema validators + storage adapter | write arbitrary JSON |
| laundry | laundry application/storage modules | invent machine records without schema |
| remarks | `createRemarkLine()`, `upsertRemarkLine()` | duplicate remark formatting |

The current Svelte UI receives navigation storage dependencies through `src/ui/side-panel-navigation-dependencies.ts`. Do not hide `fetch`, `chrome.storage.local`, `navigator.clipboard`, or `window` access as default parameters in UI/application workflows.

## Implementation Slices

### Slice 1: Design Tokens And Repeated Elements

- Replace blue primary action with charcoal.
- Keep current shell and menu structure.
- Normalize repeated template rows, action buttons, labels, tabs, and form controls.
- Remove or shorten repeated eyebrows only where the existing structure already contains them.
- Keep branch select and menu state behavior unchanged.
- Verify with build and side-panel screenshot.

### Slice 2: Template Catalog Import

- Add importer or manually structured catalog entries from the three template packs.
- Do not add module-unit tests as the closeout strategy. Final-stage checks must exercise the built Svelte entry and an observable failure path.
- Expand `TemplateTypeId` only for real template families.
- Verify `npm test` plus direct renderer calls.

### Slice 3: Template List UX

- Redesign customer guidance and quick reply list rows.
- Replace large copy buttons with right-side icon buttons.
- Use compact language segmented control.
- Keep disabled reason short.
- Verify copy output with `renderTemplate()`.

### Slice 4: OTA Entry UX

- Match extract-summary-action flow from the reference.
- Keep detected source and actual preview values only.
- Preserve branch-required and WINGS-missing errors.
- Final-stage checks may call the UI workflow wrappers or the application OTA functions only when proving the real touched OTA path or a visible failure condition.

### Slice 5: Room Info Memo UX

- Keep current route and current data flow.
- Rename visible menu to `객실 정보 메모`.
- Normalize repeated rows/actions against the reference.
- Add selected-room backend design before assuming values are manual blanks.

### Slice 6: Laundry UX

- Build UI on existing `LaundryRecord` model.
- Add create-from-guest and status update controls.
- Avoid machine assignment until schema exists.
- Verify storage-backed add/update/query functions.

### Slice 7: Settings UX

- Keep existing detailed editor.
- Normalize repeated settings rows/buttons.
- Do not add family landing or new danger-zone structure in this phase.
- Verify unsaved draft lock and storage corruption message.

## Current Gaps To Resolve Before Coding

- The UI reference is strongly connected to the current UX/UI; implementation must preserve the reference component patterns while replacing names/data with real product labels and real backend values.
- Runtime language type uses `CN`; the current UI maps it to the visible label `CH`.
- The current template catalog has far fewer templates than the provided packs.
- Laundry has a record-based frontend/backend path; machine assignment remains deferred until schema-backed.
- Airport van backend exists through customer 안내/배차 완료 templates and the internal reservation report; it must stay out of WINGS/객실 정보 메모 remark formatting.
- Settings reference includes broad service menu editing; current storage supports templates and custom templates, not arbitrary service pricing structures.
- PMS list/sync as a menu panel is not the target UX. Do not add a persistent floating launcher; selected room context appears in the centered header context row with room number, reserver name, and nationality, and that room context becomes the default for templates and forms. If no room is selected, the UI renders the domain-owned English status message `Room not selected` instead of a component-owned fallback label.
- Work-screen branch logos keep the home logo display width and use source assets no taller than about 125% of the base logo source height, so the top header remains aligned with the home baseline.
- Template grouping must come from catalog metadata (`typeId`) rather than title text. Customer notices and generic template lists separate groups with light dividers for families such as check-in, check-out, room-related, rate-related, and work forms.
- Menu screens are resolved from catalog-owned `screenKind` and `templateFilter`; Svelte components must not route by raw menu ID strings.
- Room remark command labels, confirmation labels, and visibility requirements are catalog-owned. Unknown commands must be observable failures, not silent no-ops.
- Contract tests must not pin implementation strings as expected source text when the real requirement is an exported catalog or application behavior.

## Verification Plan

- `npm run typecheck`
- `npm test`
- `npm run build`
- targeted `tsx` harnesses for:
  - template import/render output
  - placeholder extraction
  - branch-scoped COEX-only content
  - OTA preview/fill with injected dependencies
  - laundry add/update/query
  - remark line generation/upsert
- browser or screenshot verification after UI implementation.

## Next Coding Batch

Continue with the least risky repeated-element normalization:

1. Keep the stable UI token layer in `styles/sidepanel.css`.
2. Keep `src/ui/App.svelte` as a skeleton entry and continue normalizing repeated template-list rows/actions in `src/ui/components/*`.
3. Add a template-pack parsing harness under `scripts/` or `tests/fixtures/` before importing all template bodies.
4. Use final-stage app-path checks, not module-unit tests, when parser behavior is part of the touched workflow.

Done when repeated template/list/form elements match the reference density and behavior, while the current screen/menu structure and existing PMS/OTA/template tests still pass.
