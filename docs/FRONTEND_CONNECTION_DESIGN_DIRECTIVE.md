# Frontend Connection Design Directive

## Purpose

This Chrome extension is an operations side panel for UH Suite staff. It must reduce repetitive WINGS/PMS work without taking final responsibility away from the user.

The frontend is not a marketing page, not a dashboard demo, and not a generic template library. It is a compact work surface for:

- selecting one of three branches: `coex`, `gangnam`, `seolleung`
- copying branch-scoped guest notices, quick replies, remarks, and work reports
- loading PMS guest records from the active authenticated WINGS session
- reading Naver or Station OTA reservation details from the active authenticated browser tab
- filling available WINGS new-reservation fields, while leaving save/confirmation to a person
- editing template text and custom entries in extension storage

The first screen must be the actual menu/work surface. Do not add a landing page, onboarding hero, tutorial copy, or explanatory placeholder state unless the user explicitly requests it.

## Runtime Surface

The current frontend entrypoint is `src/ui/App.svelte`, mounted by `src/ui/main.ts`. `App.svelte` is a skeleton only: it creates `src/ui/side-panel-controller.svelte.ts`, attaches mount lifecycle, and renders `src/ui/components/SidePanelView.svelte`.

The side panel is a Chrome MV3 extension surface. Assume:

- narrow panel width from roughly 320px upward
- staff will use it repeatedly while WINGS, Naver, and Station tabs are already authenticated
- the extension must never invoke a save endpoint for WINGS reservation creation
- errors must be short and operational
- branch choice is a hard boundary, not a visual preference

The legacy DOM sidepanel path under `src/sidepanel/*` has been removed as a product surface. Do not recreate it; frontend work must connect to the Svelte side panel and catalog/application modules.

## Backend Contracts To Use

Use these modules as the source of truth. Do not duplicate their logic in the frontend.

| Concern | Source | Frontend rule |
| --- | --- | --- |
| Branches | `src/config/branches.ts` | Render options from `getBranchOptions()`. Do not hardcode PMS codes in UI. |
| Menu inventory | `src/catalog/menu-routing.ts` | Render menu groups, menu items, home presentation, and bottom-bar actions from routing/catalog data. Do not add component-owned menu contracts. |
| Template catalog | `src/catalog/template-catalog.ts` | Use `UNIFIED_TEMPLATE_CATALOG`, `applyStoredUnifiedTemplateState()`, and `scopeUnifiedTemplateForBranch()`. |
| Template rendering | `src/catalog/template-renderer.ts` | Use renderer output for copy text. Do not interpolate template strings inside components. |
| PMS sync | `src/application/sync-guests.ts`, `src/ui/side-panel-dependencies.ts` | Call `syncGuests({ date, mode, branchId, searchTerm, fetchImpl })` through injected PMS dependencies. |
| Context guard | `src/application/context-guard.ts` | Gate PMS-only or guest-record actions with `guardRequiredContext()`. |
| OTA preview/fill | `src/application/ota-reservation-input.ts`, `src/ui/side-panel-dependencies.ts` | Use `loadOtaReservationPreview(..., otaDependencies)` then `fillWingsReservationFromPreview(..., otaDependencies)` through injected OTA dependencies. |
| Active tab automation | `src/platform/active-tab-automation.ts` | Treat missing reservation window as a blocking error, not as an empty state. |
| Storage | `src/platform/chrome-storage.ts`, `src/ui/side-panel-dependencies.ts` | Use injected extension-state dependencies for mount and saves; do not hide `chrome.storage.local` as a default parameter. |

Any new frontend state should be derived from these contracts or stored explicitly through the existing storage schema. Avoid local shadow constants for branch IDs, menu category membership, OTA field rules, PMS field names, or storage recovery policy.

## Rooms & Settings Backend Design

`Rooms & Settings` is a persistent bottom-sheet launcher. The current frontend only exposes the minimal settings action; the next backend work must provide a real action model before additional bottom-bar UI is added.

Backend-owned action source:

- define bottom-bar actions in `src/catalog/menu-routing.ts`, not in Svelte components
- keep `HomeQuickAction.menuId` required for direct menu actions
- add a separate discriminated action type before supporting non-menu actions
- never represent unsupported actions with disabled placeholder UI
- do not add `WINGS LOGIN`, light mode, dark mode, or demo actions unless there is a real backend contract

Recommended action model:

```ts
type RoomsSettingsAction =
  | {
      kind: "menu";
      id: string;
      label: string;
      icon: string;
      menuId: MenuId;
    }
  | {
      kind: "command";
      id: string;
      label: string;
      icon: string;
      commandId: RoomsSettingsCommandId;
      requiresBranch?: boolean;
      requiresPmsRecord?: boolean;
    };
```

Command actions must be backed by application functions before appearing in the UI. A command cannot be added as a visual-only stub.

Backend responsibilities for bottom-bar commands:

- resolve available actions from current state: selected branch, active menu, selected PMS record, storage state, and navigation lock
- expose each action's enabled/disabled state and concise disabled reason
- execute commands through `src/ui/side-panel-dependencies.ts` or application modules, not through direct browser/global imports in components
- return operational result messages for the existing status surface
- keep storage mutations explicit through `src/platform/chrome-storage.ts`
- keep WINGS/PMS/OTA side effects behind existing application/platform boundaries
- expose the room-remark WINGS command only after a supported room remark template has been selected

Suggested module split:

| Concern | Owner | Rule |
| --- | --- | --- |
| Action inventory | `src/catalog/menu-routing.ts` | Static labels, icons, menu destinations, command IDs. |
| State availability | `src/ui/rooms-settings-actions.ts` | Pure resolver from controller state to visible actions. |
| Command execution | `src/application/wings-remark.ts` or another focused workflow module | Real behavior only; no fake success and no silent fallback. |
| Dependency access | `src/ui/side-panel-dependencies.ts` | All Chrome, clipboard, storage, active-tab, and fetch access enters here. |
| UI rendering | `src/ui/components/RoomsSettingsBar.svelte` | Render provided actions and invoke callbacks only. |

Required backend validation before adding bottom-bar features:

- `npm run typecheck`
- `npm test`
- a contract test proving unsupported actions are absent
- a failure-path test for each command's missing requirement, such as no branch or no selected PMS record
- a UI contract test proving the bottom bar does not contain placeholder text such as `연결된 동작 없음`, `대기`, `Light`, `Dark`, or `Wings Login`

## Menu UX Structure

The home state is a dense operations menu with no extra explanatory section.

Required top-level groups:

- `고객 커뮤니케이션`
- `고객 서비스 관리`
- `업무 관리`
- `설정`

Required menu items are owned by `menuGroups` and `settingsMenu`:

1.
- 고객 안내문
- 빠른 문의 답변
2.
- 세탁물 관리
- 공항밴 관리
- 매지출 관리
3.
- 객실 정보 메모
- OTA 예약 입력
- 업무 관리
4.
- 설정

The frontend may visually arrange the groups, but must not route by title/body text heuristics. All menu membership must come from catalog metadata: `menuId`, `typeId`, `branchScope`, `requiresContext`, and `audience`.

Menu-internal filtering tabs are not part of the current product contract. Do not reintroduce `전체`, `안내문`, `WINGS`, or similar tab filters unless a backend-owned action/filter model is added first.

## OTA Reservation Input UX

This menu is a browser-session-only tool. It should be available only as a work action, not as a broad import workflow.

Required flow:

1. User selects branch.
2. User opens a Naver or Station reservation detail tab.
3. User clicks `예약정보 가져오기`.
4. Frontend calls `loadOtaReservationPreview(selectedBranchId, otaDependencies)`.
5. Frontend shows only actual preview values that are present.
6. User opens WINGS reservation creation window.
7. User clicks `WINGS에 입력`.
8. Frontend calls `fillWingsReservationFromPreview(otaPreview, otaDependencies)`.
9. User reviews and saves manually inside WINGS.

Required fail-fast behavior:

- no branch: `지점을 선택해주세요.`
- OTA branch mismatch: `올바른 지점이 아닙니다.`
- WINGS creation form missing: `WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.`
- storage recovery: `저장소 데이터 손상으로 설정을 초기화했습니다. 다시 설정해주세요.`

Do not add:

- automatic WINGS save
- retry loops from the UI
- polling
- repeated API refresh buttons that bypass `otaPayloadRequestGuard`
- placeholder guest names, fake room types, fake prices, or fake reservation IDs
- log-style status panels

The preview should be compact. It may show:

- source: 네이버 or 스테이션
- reservation number
- guest name
- date range
- room type if present
- field count
- room rate if calculated
- account label if present

Do not show missing values as descriptive filler.

## PMS Guest Data UX

PMS data exists to support copy/remark workflows. It is not a full PMS browser.

Required controls:

- branch trigger in the persistent header, opening the branch picker sheet
- arrival/departure segmented control
- search input
- sync button

Required behavior:

- call `syncGuests()` only after branch selection
- clear record list when branch is cleared
- keep errors concise in the status surface
- list actual records only
- do not invent empty-state helper copy

Each PMS record row should prioritize:

- room display
- guest name if present
- status if present
- departure date if present

For PMS-backed menu screens, the work header may show a compact `WINGS` status dot:

- green when the current active tab is a WINGS PMS or reservation record context
- red when the current active tab is not a WINGS PMS context
- no card, pill surface, debug text, logs, or explanatory status panel

When a PMS record is selected, the default language should follow guest nationality. Supported nationalities map to `KO`, `EN`, `JP`, or `CN`; unsupported or missing nationalities default to `EN`, with existing template-language availability fallback still applied.

Do not add broad data grids unless there is a direct workflow reason. The side panel should remain quick to scan.

## Airport Van And Sales Management

Airport van and sales management are copy-form workflows, not browser automation workflows.

- do not add WINGS, PMS, OTA, or external-system automatic input for these menus
- airport van may display lightweight PMS-derived badges only: `체크인 공항 픽업` for arrival mode and `내일 체크아웃 공항 샌딩` for departure mode
- sales management remains template-copy only until a real storage/application contract is added

## Room Remark Input

Room information memo supports WINGS remark upsert only through the active WINGS reservation information window.

- use `src/domain/remarks.ts` for remark line formatting and upsert rules
- use `src/application/wings-remark.ts` for the read/upsert/write workflow
- use `src/platform/active-tab-automation.ts` through `src/ui/side-panel-dependencies.ts` for active-tab scripting
- when the active tab is not the WINGS reservation information window, fail with `WINGS 예약정보창을 연 뒤 다시 실행해주세요.`
- do not call reservation creation fill logic or WINGS save behavior for room remarks

## Template And Copy UX

Template cards are action rows, not content articles.

Customer guidance is a distinct copy workflow, not a generic template editor view. It should use the `customer_guidance_refined_style` reference structure:

- fixed work topbar from the shared shell
- compact pill-style language segmented control with fully rounded ends
- guidance cards using actual catalog templates and summaries, not reference dummy labels
- neutral card surfaces by default; selected card gets the only color emphasis
- copy action remains connected to `copyTemplate()`
- no inline variable inputs inside the guidance card list unless a backend-owned workflow explicitly provides that form
- no broad metadata rows, body previews, or tutorial text inside each guidance card

Each template card should show:

- type label
- branch scope
- available languages
- template title
- short actual summary derived from the selected language
- copy button

Disable copy when:

- `guardRequiredContext()` fails
- selected language is unavailable

For unavailable language, keep the message short. Do not add long explanations or tutorial copy.

Template body preview must not become the source of routing. It is display only.

## Settings UX

Settings is for operational text ownership, not broad system configuration.

Required editing capabilities:

- select existing built-in or custom template
- select language
- edit title
- edit body
- edit branch scope
- save
- cancel
- reset built-in template or delete custom template
- add custom template with category, audience, context, branch scope, title, and body

Required constraints:

- use `validateTemplateDefinitionForSave()`
- use `normalizeBranchScope()`
- block navigation while there is an unsaved settings draft
- storage schema errors must be visible; do not silently swallow them
- storage root corruption recovery may reset to defaults only through `readExtensionStateWithRecovery()`

Do not add a generic JSON editor or advanced schema panel.

## Visual Direction

Apply the `minimalist-ui` direction as a compact operational variant:

- warm monochrome base: `#FFFFFF`, `#FBFBFA`, `#F7F6F3`
- text: off-black `#111111` or charcoal `#2F3437`
- secondary text: `#787774`
- borders: `1px solid #EAEAEA`
- surface radius: 8px maximum for cards and panels
- controls radius: 4px to 6px
- no gradients
- no heavy shadows
- no large purple theme
- no rounded-full large containers
- no emojis
- no generic placeholder names or sample customer data

Use plain operational Korean labels. Avoid marketing copy and AI-style phrasing.

Icons should be quiet and functional. Use Material Symbols through the shared icon component, and avoid per-menu custom SVGs or decorative iconography.

## Frontend Unity And UX Rules

Use the current home screen as the visual baseline for all menus.

Shared interaction rules:

- card default state is neutral; selection state receives the color emphasis
- hover may darken the surface slightly, but must not add or emphasize a border
- card hover must not change layout size
- hover and press states must be visible enough for day-to-day use, through surface shade, shadow, transform, or icon motion
- press feedback uses subtle `scale(0.96)` for buttons and compact controls
- screen changes use a short opacity/translate transition
- enter/exit motion uses only `opacity` and `transform`
- pull-up and popup surfaces use short, interruptible transitions
- do not use `transition: all`
- use `will-change` only for `transform` and `opacity`
- loading states use the shared loading image component instead of text-only ad hoc loading labels
- text surfaces do not opt into drag/text selection; template/content input areas are the only text-selection exceptions

Shared surface rules:

- cards and popup surfaces use consistent radius and spacing
- menu cards are separate cards with compact gaps; do not merge several menu actions into one parent card
- icon buttons are at least 40px by 40px and center icons with grid/place-items
- Material Symbols icons must be rendered through the shared icon component
- do not create per-menu custom icons or ad hoc SVGs
- shadows are light and functional; do not create heavy floating panels
- do not put cards inside cards

Shared navigation rules:

- menu screens use the same compact topbar with small back and home icon buttons
- top header keeps center breathing room; the menu title appears once with its catalog icon beside it
- the lower context row owns PMS room context and stays centered below the menu title
- selected PMS room identity is not rendered in a separate bottom bar; show room number, reserver name, and nationality only in the centered context row
- when no PMS room is selected, the room context text is `객실 미선택` in a muted gray tone
- branch selection opens a selection sheet/popup, not a dropdown
- language selection is a segmented bar, not a dropdown; its container and active segment must be pill-shaped with rounded ends
- settings may keep data-management selects for template/category/audience/context, but language must remain segmented

Shared copy rules:

- use operational Korean labels
- do not add explanatory tutorial copy inside the app
- `Rooms & Settings` remains the only persistent bottom-bar product label
- the `Rooms & Settings` trigger hides while the bottom sheet is open and reappears after the sheet closes
- WINGS text appears only where the workflow actually touches WINGS/PMS/OTA behavior
- do not add placeholder guest, room, branch, action, or command labels

## Layout Specification

Side panel shell:

- sticky or persistent top header with logo, branch trigger, and back/menu control when inside a menu
- main content with 12px to 16px side padding
- status text appears only for real operation results or blocking errors, and must not be rendered as a card
- one active work panel at a time
- avoid nested cards

Home:

- compact title block
- grouped menu grid
- settings entry separated at the bottom
- menu cards should keep stable height and not resize on hover

Work menu:

- header row: menu identity, return action
- compact context row only; do not add a large menu-introduction card or generic explanation copy
- secondary controls: language selector and count when applicable
- work-specific panel: PMS list or OTA preview
- template list below for template menus

Small width behavior:

- controls collapse to one column below 390px
- buttons keep fixed minimum height
- long Korean or English text wraps without overflow
- no horizontal page scroll

## Interaction Rules

Buttons:

- primary action: dark charcoal background, white text
- secondary action: white background, border, charcoal text
- destructive action only in settings delete/reset contexts, and still understated
- disabled state must be obvious but not hidden

Status:

- one short line or compact block
- no persistent debug logs
- no trace details unless the user explicitly asks for diagnostics
- no details of what this menu or options do.

Motion:

- use only opacity and transform
- keep hover/active movement subtle
- no animated background, no bouncing, no loading spectacle

Accessibility:

- all actionable buttons need clear labels or `aria-label`
- status surface uses `aria-live="polite"`
- segmented controls use `aria-pressed` or equivalent selected-state semantics
- branch trigger and branch picker have accessible labels
- disabled reasons must be visible through the nearby status or guard message

## Prohibited Frontend Patterns

Do not introduce:

- title/body/category text heuristics for routing
- component-local icon heuristics or `id.includes(...)` UI matching
- UI-owned branch/PMS/OTA constants
- UI-owned business workflow state; UI may only render controller/backend-owned state and hold transient presentation state
- fake fallback values
- silent storage fallback
- save endpoint calls for WINGS reservation creation
- large explanatory placeholder cards
- log streams in normal UI
- landing page, hero, or product marketing section
- duplicate legacy sidepanel runtime behavior
- hardcoded PMS field names inside Svelte components
- direct Chrome OTA automation imports outside the explicit side-panel dependency container
- hidden defaults for `fetch`, `chrome.storage.local`, `navigator.clipboard`, or `window` in UI/application workflows
- auto-generated sample guest data

## Done-When For Frontend Implementation

A frontend implementation following this directive is done only when:

- `npm run typecheck` passes
- `npm test` passes
- `npm run build` passes
- `npm run verify` passes when package state allows it
- the changed UI path is exercised through the actual Svelte side panel entrypoint
- OTA branch mismatch still fails with `올바른 지점이 아닙니다.`
- missing WINGS reservation creation form still fails with `WINGS 예약생성창을 생성한 뒤 다시 실행해주세요.`
- storage root corruption recovery still displays `저장소 데이터 손상으로 설정을 초기화했습니다. 다시 설정해주세요.`
- no banned placeholder strings are present in `src`, `dist`, or `tests`

Use direct file, build, and test evidence from the current worktree. Passing scripts are evidence only; they do not replace checking the touched product path and observable failure behavior.
