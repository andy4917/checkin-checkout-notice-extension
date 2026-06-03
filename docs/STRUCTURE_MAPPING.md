# Extension Structure Mapping

## Current Product Structure

The removed DOM side panel is not a source of truth, migration target, or compatibility surface. Current work must start from the Svelte side panel and the owner modules below.

| Owner | Responsibility |
| --- | --- |
| `manifest.json` | MV3 extension declaration, fixed unpacked extension ID key, minimum Chrome runtime, side panel path, host permission, module service worker |
| `src/background/index.ts` | side panel behavior and PMS-origin tab enablement |
| `sidepanel.html`, `styles/sidepanel.css` | side panel shell and presentation |
| `src/ui/main.ts`, `src/ui/App.svelte` | Svelte entry and skeleton/orchestrator |
| `src/ui/components/SidePanelView.svelte`, `ShellHeader.svelte`, `ScreenStage.svelte`, `HomeView.svelte`, `WorkSurface.svelte`, `PmsGuestPanel.svelte`, `MaterialIcon.svelte` | screen markup and component composition |
| `src/ui/side-panel-navigation-controller.svelte.ts`, `src/ui/side-panel-navigation-dependencies.ts`, `src/ui/template-list-state.ts` | current branch context, home/work navigation state, dependency injection, and template-list presentation state |
| `src/catalog/workflow-catalog.ts`, `src/catalog/template-catalog.ts`, `src/catalog/template-renderer.ts`, `src/catalog/menu-routing.ts`, `src/catalog/template-groups.ts`, `src/catalog/template-schema.ts`, `src/catalog/template-types.ts`, `src/catalog/template-variable-mapping.ts` | catalog-owned templates, metadata, rendering, language validation, menu routing, screen kind, filtering, grouping, schema, and variables |
| `src/config/app-config.ts`, `src/config/branches.ts`, `src/config/pms-filter-schema.ts`, `src/pms/filter-builder.ts`, `src/pms/client.ts` | PMS origin, endpoint, branch WINGS codes, request defaults, query construction, and fetch client |
| `src/domain/dates.ts`, `src/domain/rooms.ts`, `src/domain/guests.ts`, `src/domain/room-context.ts`, `src/domain/remarks.ts` | pure formatting, filtering, sorting, room-context status, nationality label, and remark-line behavior |
| `src/application/context-guard.ts`, `operator-error-messages.ts`, `sync-guests.ts`, `template-settings.ts`, `laundry-records.ts`, `ota-reservation-input.ts`, `airport-van-form.ts`, `wings-remark.ts` | user-facing workflow use cases, normalized operator errors, settings, laundry records, OTA reservation input, airport-van form copy, and WINGS remark behavior |
| `src/laundry/*`, `src/ota/*`, `src/wings/*`, `src/platform/active-tab-automation.ts`, `src/platform/tab-context.ts` | storage/domain types, OTA normalization and source detection, WINGS draft field filling, active-tab checks, and tab context |

## Current UI Surface Contract

- Home navigation is rendered by catalog-owned groups in `menu-routing.ts`; Svelte components do not own menu labels, branch codes, route IDs, or PMS/OTA operation values.
- Home root and submenu rows are link-like rows, not cards. Hover underline is bounded to the visible text label, and row sizing must not change on hover.
- Accordion groups are for customer 안내문 and 빠른 문의 답변 template lists. Multiple accordion sections may remain open until the user closes them.
- The home language selector is shown only inside accordion template groups. Work-surface language selectors are additionally gated by `usesWorkLanguageSelector(menu.id)`.
- Copy success is shown only through the copied button state such as a check icon. It must not create a global success banner or persistent shell status.
- Shell/header status is reserved for blocking errors or real workflow state. The work header does not render stale active menu titles.
- The shell logo is the branch-selection trigger and opens the real branch popup from config data. It must not reintroduce branch cycling, branch dropdown strips, or component-owned branch labels.
- The settings bottom action opens the catalog-owned settings hub. `WorkSurface.svelte` must render the hub from `settingsNavigationItems` rather than a generic empty settings state.
- Bottom PMS navigation clears stale status, copied-template, and OTA preview state before opening a PMS list panel.

## Hardcoding Removed From Runtime Flow

- PMS origin, endpoint path, branch WINGS codes, page defaults, status groups, supported languages, room tower boundary, side panel path, and install/error messages now live in `src/config/*`.
- The manifest keeps `minimum_chrome_version` aligned with the Vite Chrome target and runtime API floor.
- The manifest keeps `host_permissions` static because Chrome extension permissions must be declared in `manifest.json`.
- The manifest keeps `key` static because Chrome derives the unpacked extension ID from that public key.
- `docs/CHROME_EXTENSION_PRINCIPLES.md` is the active extension-platform rule set for manifest, permission, owner-module, and verification decisions.
- Message text is isolated as catalog product copy under `src/catalog/*` instead of being mixed with DOM/API logic.
- Do not use historical migration notes as permission to duplicate operation values in UI components or tests.

## Branch Scope

| Branch | BSNS_CODE | PROPERTY_NO | PP_BSNS_CODE | Door password guide source |
| --- | --- | --- | --- | --- |
| `coex` | `13` | `13` | `13` | source-only, runtime asset excluded |
| `gangnam` | `91` | `91` | `91` | disabled |
| `seolleung` | `14` | `14` | `14` | disabled |

The COEX door password guide source must stay COEX-scoped. The current runtime asset catalog excludes the video, so no branch exposes it as an attachment. Gangnam and Seolleung must not show a door password guide template or include a door password guide sentence in check-in messages.

## Verification Authority

- `package.json` now owns local scripts:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
  - `npm run verify`

`npm run build` compiles the TypeScript/Svelte source into the runtime `dist` folder and rewrites the runtime manifest paths. Chrome should load `dist`, not the TypeScript source folder.
