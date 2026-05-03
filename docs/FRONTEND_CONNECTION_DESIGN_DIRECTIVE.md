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
| Menu inventory | `src/catalog/menu-routing.ts` | Render menu groups, menu items, and tabs from routing/catalog data. Do not add home-only menu contracts. |
| Template catalog | `src/catalog/template-catalog.ts` | Use `UNIFIED_TEMPLATE_CATALOG`, `applyStoredUnifiedTemplateState()`, and `scopeUnifiedTemplateForBranch()`. |
| Template rendering | `src/catalog/template-renderer.ts` | Use renderer output for copy text. Do not interpolate template strings inside components. |
| PMS sync | `src/application/sync-guests.ts`, `src/ui/side-panel-dependencies.ts` | Call `syncGuests({ date, mode, branchId, searchTerm, fetchImpl })` through injected PMS dependencies. |
| Context guard | `src/application/context-guard.ts` | Gate PMS-only or guest-record actions with `guardRequiredContext()`. |
| OTA preview/fill | `src/application/ota-reservation-input.ts`, `src/ui/side-panel-dependencies.ts` | Use `loadOtaReservationPreview(..., otaDependencies)` then `fillWingsReservationFromPreview(..., otaDependencies)` through injected OTA dependencies. |
| Active tab automation | `src/platform/active-tab-automation.ts` | Treat missing reservation window as a blocking error, not as an empty state. |
| Storage | `src/platform/chrome-storage.ts`, `src/ui/side-panel-dependencies.ts` | Use injected extension-state dependencies for mount and saves; do not hide `chrome.storage.local` as a default parameter. |

Any new frontend state should be derived from these contracts or stored explicitly through the existing storage schema. Avoid local shadow constants for branch IDs, menu category membership, OTA field rules, PMS field names, or storage recovery policy.

## Menu UX Structure

The home state is a dense operations menu with no extra explanatory section.

Required top-level groups:

- `고객 커뮤니케이션`
- `운영 관리`
- `보고`
- `설정`

Required menu items are owned by `menuGroups` and `settingsMenu`:

- 고객 안내문
- 빠른 문의 답변
- 세탁물 관리
- 매출 관리
- 객실 리마크 & 메모
- OTA 예약 입력
- 업무보고 생성
- 설정

The frontend may visually arrange the groups, but must not route by title/body text heuristics. All menu membership must come from catalog metadata: `menuId`, `typeId`, `branchScope`, `requiresContext`, and `audience`.

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

- branch select in the persistent header
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

Do not add broad data grids unless there is a direct workflow reason. The side panel should remain quick to scan.

## Template And Copy UX

Template cards are action rows, not content articles.

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
- no large blue/purple theme
- no rounded-full large containers
- no emojis
- no generic placeholder names or sample customer data

Use plain operational Korean labels. Avoid marketing copy and AI-style phrasing.

Icons should be quiet and functional. If the dependency is added later, prefer Radix or Phosphor icons. Until then, use minimal text/symbol controls only where they are already catalog-owned, and avoid decorative iconography.

## Layout Specification

Side panel shell:

- sticky or persistent top header with logo, branch select, and back/menu control when inside a menu
- main content with 12px to 16px side padding
- one primary status surface under the work header
- one active work panel at a time
- avoid nested cards

Home:

- compact title block
- grouped menu grid
- settings entry separated at the bottom
- menu cards should keep stable height and not resize on hover

Work menu:

- header row: menu identity, return action
- secondary controls: language selector, count, tabs when applicable
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

Motion:

- use only opacity and transform
- keep hover/active movement subtle
- no animated background, no bouncing, no loading spectacle

Accessibility:

- all actionable buttons need clear labels or `aria-label`
- status surface uses `aria-live="polite"`
- tabs use `role="tablist"` and `aria-selected`
- branch select has an accessible label
- disabled reasons must be visible through the nearby status or guard message

## Prohibited Frontend Patterns

Do not introduce:

- title/body/category text heuristics for routing
- UI-owned branch/PMS/OTA constants
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
