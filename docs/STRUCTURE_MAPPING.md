# Extension Structure Mapping

## Current Product Structure

The removed DOM side panel is not a source of truth, migration target, or compatibility surface. Current work must start from the Svelte side panel and the owner modules below.

| Owner | Responsibility |
| --- | --- |
| `manifest.json` | MV3 extension declaration, fixed unpacked extension ID key, side panel path, host permission, module service worker |
| `src/background/index.ts` | side panel behavior and PMS-origin tab enablement |
| `sidepanel.html`, `styles/sidepanel.css` | side panel shell and presentation |
| `src/ui/main.ts`, `src/ui/App.svelte` | Svelte entry and skeleton/orchestrator |
| `src/ui/components/*` | screen markup and component composition |
| `src/ui/side-panel-navigation-controller.svelte.ts` | current branch context and home navigation state |
| `src/catalog/workflow-catalog.ts`, `src/catalog/template-catalog.ts`, `src/catalog/template-renderer.ts`, `src/catalog/menu-routing.ts`, `src/catalog/template-groups.ts` | catalog-owned templates, metadata, rendering, language validation, menu routing, screen kind, filtering, and grouping |
| `src/config/app-config.ts`, `src/config/branches.ts`, `src/config/pms-filter-schema.ts`, `src/pms/filter-builder.ts`, `src/pms/client.ts` | PMS origin, endpoint, branch WINGS codes, request defaults, query construction, and fetch client |
| `src/domain/dates.ts`, `src/domain/rooms.ts`, `src/domain/guests.ts`, `src/domain/room-context.ts`, `src/domain/remarks.ts` | pure formatting, filtering, sorting, room-context status, nationality label, and remark-line behavior |
| `src/application/wings-remark.ts`, `src/platform/active-tab-automation.ts`, `src/wings/reservation-draft.ts` | WINGS remark read/upsert/write, active-tab checks, and reservation draft field filling |

## Hardcoding Removed From Runtime Flow

- PMS origin, endpoint path, branch WINGS codes, page defaults, status groups, supported languages, room tower boundary, side panel path, and install/error messages now live in `src/config/*`.
- The manifest keeps `host_permissions` static because Chrome extension permissions must be declared in `manifest.json`.
- The manifest keeps `key` static because Chrome derives the unpacked extension ID from that public key.
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
