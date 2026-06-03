# UI Reference, Localization, And Backend Alignment

This document is the current alignment contract for the UH Suite side panel. It
replaces older reference-planning notes. Do not use historical reference screens
as permission to add sample dashboards, fake workflow data, broad status panels,
or removed legacy DOM behavior.

## Reference Boundary

The current contract is based on user-provided Framer sidebar reference intent,
user-provided product screenshots, and user-provided surface references for
airport-van, sales expense, laundry, customer notice/reply template editing,
NAVER/STATION reservation input, and room memo surfaces. These references are
review evidence only; do not store local Codex session paths, generated-image
paths, temp capture paths, or desktop-only artifact paths in product docs or
runtime code.

The invalid 2026-06-02 generated blueprint contact sheet is not design
authority. It was generated from summarized repo docs/catalog prompts instead of
directly using the user-provided screenshots, so it must not be used as a
submenu or work-surface reference.

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
- The shell logo is the branch-selection trigger. It opens a compact branch
  button-group popup from the real branch config; it must not cycle branches or
  render a select/dropdown strip.
- The branch popup closes on selection, Escape, or outside pointer interaction,
  and returns focus to the logo trigger after selection or Escape.
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
| PMS guest list | `PmsGuestPanel.svelte`, `sync-guests.ts` | explicit bottom navigation, branch-scoped sync, search, selected room context, visible loading/failure/empty states, no component-local fake record values |
| Laundry management | `WorkSurface.svelte`, `laundry-records.ts`, `src/laundry/*` | real storage-backed records only |
| OTA reservation input | `ota-reservation-input.ts`, `src/ota/*`, `reservation-draft.ts` | source detection, preview, WINGS fill, manual save in WINGS |
| Airport van management | `airport-van-form.ts` | form values persisted in extension state, copy output only |
| Room remark memo | `wings-remark.ts`, `domain/remarks.ts` | guarded WINGS remark behavior |
| Settings hub | `settingsNavigationItems` in `menu-routing.ts`, `WorkSurface.svelte` | real links to template editing and form editing; no empty settings placeholder |
| Template settings | `template-settings.ts`, storage/template schemas | schema-mediated import/export/reset |

## Localization Contract

- Supported template languages are `KO`, `EN`, `JP`, `CN`.
- The visible compact selector labels are `KR`, `EN`, `JP`, `CH`.
- Unsupported language or missing language body fails visibly; no fallback copy is fabricated.
- Manual variables and PMS-required variables are validated by renderer/helper policy, not by component-owned fallback text.

## Backend Alignment Contract

- PMS list/sync uses selected branch and current date filters through PMS owner modules.
- PMS list UI shows `PMS 조회 중` while loading, then either real records, `PMS 조회 실패`, or the real empty-state label. It must not render `N/A` or other fake field values for missing PMS fields.
- OTA extraction uses actual Naver/Station source detection and normalized payloads.
- WINGS reservation input fills fields only; the user reviews and saves manually.
- WINGS remark behavior is separate from reservation creation fill behavior.
- Laundry records are real extension-storage records.
- Airport-van values are user-entered workflow form values; they are not fake PMS records.

## Verification

Use `npm run verify` for the full local contract. It is the unified closeout gate
for this Chrome extension: typecheck, build, tests, side-panel scale, and actual
unpacked-extension smoke. The smoke target is
`chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html`. It checks
home root state, branch popup, bottom menu enablement, all home submenu groups,
settings hub, template/form settings, all service/work reference routes,
work-report templates, all PMS bottom panels, logo/motion computed style,
placeholder attributes, horizontal overflow, banned placeholder text, fake PMS
fallback text, console errors, and runtime errors.

Vite is build tooling here, not product-surface proof. If Chrome extension
visual automation is blocked, record the exact blocker and leave that proof
unverified instead of substituting a Vite-rendered pass.

Current tests that protect this contract include:

- `tests/product-surface-contract.test.ts`
- `tests/repo-boundary.test.ts`
- `tests/application-domain.test.ts`
- `tests/integration-state.test.ts`
- `tests/extension-smoke-contract.test.ts`

`SKILL_EVIDENCE used: clean-all-slop` applies when this document is used to
remove stale UI/reference residue rather than preserve old plans.
