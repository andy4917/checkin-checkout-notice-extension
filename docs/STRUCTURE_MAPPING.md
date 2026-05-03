# Extension Structure Mapping

## Source To Skeleton

| Previous file | New owner | Responsibility |
| --- | --- | --- |
| `manifest.json` | `manifest.json` | MV3 extension declaration, fixed unpacked extension ID key, side panel path, host permission, module service worker |
| `background.js` | `src/background/index.ts` | side panel behavior and PMS-origin tab enablement |
| `sidepanel.html` inline CSS | `styles/sidepanel.css` | side panel presentation |
| `sidepanel.js` global state | `src/ui/App.svelte`, `src/ui/components/SidePanelView.svelte`, `src/ui/side-panel-controller.svelte.ts`, `src/ui/*-workflow.ts` | Svelte entry skeleton, side-panel view composition, menu switching, room context, template actions |
| `sidepanel.js` templates | `src/catalog/workflow-catalog.ts`, `src/catalog/template-catalog.ts` | catalog-owned template bodies, metadata, branch scope, and source evidence |
| `sidepanel.js` template dispatch | `src/catalog/template-renderer.ts`, `src/catalog/menu-routing.ts` | message rendering, language validation, and menu routing |
| `sidepanel.js` PMS URL/filter literals | `src/config/app-config.ts`, `src/config/branches.ts`, `src/config/pms-filter-schema.ts`, `src/pms/filter-builder.ts`, `src/pms/client.ts` | PMS endpoint, branch WINGS codes, request defaults, query construction, fetch client |
| `sidepanel.js` room/date helpers | `src/domain/dates.ts`, `src/domain/rooms.ts`, `src/domain/guests.ts` | pure formatting, filtering, sorting, and status mapping |

## Hardcoding Removed From Runtime Flow

- PMS origin, endpoint path, branch WINGS codes, page defaults, status groups, supported languages, room tower boundary, side panel path, and install/error messages now live in `src/config/*`.
- The manifest keeps `host_permissions` static because Chrome extension permissions must be declared in `manifest.json`.
- The manifest keeps `key` static because Chrome derives the unpacked extension ID from that public key.
- Message text is isolated as catalog product copy under `src/catalog/*` instead of being mixed with DOM/API logic.

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

`npm run build` compiles the TypeScript source into the runtime `dist` folder. Chrome should load `dist`, not the TypeScript source folder.
