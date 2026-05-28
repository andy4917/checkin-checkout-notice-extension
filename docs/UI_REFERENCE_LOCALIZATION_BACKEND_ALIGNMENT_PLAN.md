# UI Reference, Localization, And Backend Alignment

This document is the current alignment contract for the UH Suite side panel. It
replaces older reference-planning notes. Do not use historical reference screens
as permission to add sample dashboards, fake workflow data, broad status panels,
or removed legacy DOM behavior.

## Current Product Surface

- Runtime UI is the Svelte side panel under `src/ui/*`.
- `src/ui/App.svelte` remains a skeleton entry.
- Screen markup belongs in `src/ui/components/*`.
- Menu structure, labels, icons, filters, screen kind, and language-selector scope are owned by `src/catalog/menu-routing.ts`.
- Template copy and source evidence are owned by `src/catalog/workflow-catalog.ts` and `src/catalog/template-catalog.ts`.
- PMS, OTA, WINGS, laundry, airport-van, storage, and error behavior stay in their application/platform/domain owner modules.
- Removed `src/sidepanel/*` DOM code is not a product surface, migration target, or compatibility layer.

## Reference Grammar Kept

- compact side-panel scale
- stable logo/date shell
- link-like home rows with icons, labels, and chevrons
- row hover underline on the visible label text only
- footer icon+label actions with stable fixed dimensions
- submenu slide/drill-down motion
- quiet neutral palette with restrained emphasis

## Reference Grammar Rejected

- landing page, hero, onboarding, or tutorial copy
- fake occupancy, recent inquiry, guest, room, revenue, reservation, or PMS data
- cards for root navigation rows
- nested cards
- generic family landing screens not backed by the current catalog
- persistent success banners after copy actions
- broad log/status panels
- automatic WINGS save or confirmation
- social/legal/reference footer links
- placeholder actions such as light/dark mode or WINGS login without a real owner contract

## Current Home Navigation

The home screen has five catalog-owned groups:

1. 고객 안내문
2. 빠른 문의 답변
3. 고객 서비스 관리
4. 업무 관리
5. 템플릿 / 양식 편집

Customer 안내문 and 빠른 문의 답변 open inline accordion template lists. Multiple
accordion sections can stay open until the user closes them. Customer service,
work management, and template/edit groups open menu screens.

The 4-language selector appears only for template accordion groups. It must not
appear in service/work/template management submenu lists.

## Copy And Status Contract

- Copy success is local to the action button, such as a check icon or copied
  button state.
- Copy success must not create a persistent `복사되었습니다.` shell banner.
- Work-log/customer-message copy actions also must not create global success
  banners.
- Blocking errors and real workflow failures remain operator-visible through the
  status surface.
- Navigation boundaries clear stale status, copied-template, and preview state
  before opening another panel.

## Header And Footer Contract

- The shell header shows branch logo/date/back affordance only.
- Active menu titles are not rendered in the top shell header because stale
  titles can survive shared menu IDs and crowd the layout.
- The bottom bar labels come from catalog-owned bottom navigation items.
- Bottom bar icon+text dimensions are stable and must not resize or animate based
  on the label width.

## Work Surfaces

| Surface | Current owner | UI contract |
| --- | --- | --- |
| Customer notice templates | `CUSTOMER_NOTICE`, catalog templates | grouped template rows with guarded copy |
| Quick replies | `QUICK_REPLY`, catalog templates | accordion/home copy and work-surface copy share renderer policy |
| PMS guest list | `PmsGuestPanel.svelte`, `sync-guests.ts` | explicit bottom navigation, branch-scoped sync, search, selected room context |
| Laundry management | `WorkSurface.svelte`, `laundry-records.ts`, `src/laundry/*` | real storage-backed records only |
| OTA reservation input | `ota-reservation-input.ts`, `src/ota/*`, `reservation-draft.ts` | source detection, preview, WINGS fill, manual save in WINGS |
| Airport van management | `airport-van-form.ts` | form values persisted in extension state, copy output only |
| Room remark memo | `wings-remark.ts`, `domain/remarks.ts` | guarded WINGS remark behavior |
| Template settings | `template-settings.ts`, storage/template schemas | schema-mediated import/export/reset |

## Localization Contract

- Supported template languages are `KO`, `EN`, `JP`, `CN`.
- The visible compact selector labels are `KR`, `EN`, `JP`, `CH`.
- Unsupported language or missing language body fails visibly; no fallback copy is fabricated.
- Manual variables and PMS-required variables are validated by renderer/helper policy, not by component-owned fallback text.

## Backend Alignment Contract

- PMS list/sync uses selected branch and current date filters through PMS owner modules.
- OTA extraction uses actual Naver/Station source detection and normalized payloads.
- WINGS reservation input fills fields only; the user reviews and saves manually.
- WINGS remark behavior is separate from reservation creation fill behavior.
- Laundry records are real extension-storage records.
- Airport-van values are user-entered workflow form values; they are not fake PMS records.

## Verification

Use `npm run verify` for the full local contract. For UI changes, also inspect the
touched side-panel path in the browser when practical.

Current tests that protect this contract include:

- `tests/current-catalog-routing.test.ts`
- `tests/current-extension-boundary.test.ts`
- `tests/current-manual-variable-flow.test.ts`
- `tests/current-data-flows.test.ts`
- `tests/current-storage-settings.test.ts`
- `tests/current-repo-contract.test.ts`

`SKILL_EVIDENCE used: clean-all-slop` applies when this document is used to
remove stale UI/reference residue rather than preserve old plans.
