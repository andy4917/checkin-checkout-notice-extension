# Extension Structure Mapping

## Source To Skeleton

| Previous file | New owner | Responsibility |
| --- | --- | --- |
| `manifest.json` | `manifest.json` | MV3 extension declaration, fixed unpacked extension ID key, side panel path, host permission, module service worker |
| `background.js` | `src/background/index.ts` | side panel behavior and PMS-origin tab enablement |
| `sidepanel.html` inline CSS | `styles/sidepanel.css` | side panel presentation |
| `sidepanel.js` global state | `src/sidepanel/index.ts` | DOM lifecycle, tab switching, search rendering, copy dispatch |
| `sidepanel.js` templates | `src/messages/templates.ts` | localized guest notice bodies copied from the existing extension |
| `sidepanel.js` template dispatch | `src/messages/message-service.ts` | message selection and language validation |
| `sidepanel.js` PMS URL/filter literals | `src/config/app-config.ts`, `src/config/branches.ts`, `src/config/pms-filter-schema.ts`, `src/pms/filter-builder.ts`, `src/pms/client.ts` | PMS endpoint, branch WINGS codes, request defaults, query construction, fetch client |
| `sidepanel.js` room/date helpers | `src/domain/dates.ts`, `src/domain/rooms.ts`, `src/domain/guests.ts` | pure formatting, filtering, sorting, and status mapping |

## Hardcoding Removed From Runtime Flow

- PMS origin, endpoint path, branch WINGS codes, page defaults, status groups, supported languages, room tower boundary, side panel path, and install/error messages now live in `src/config/*`.
- The manifest keeps `host_permissions` static because Chrome extension permissions must be declared in `manifest.json`.
- The manifest keeps `key` static because Chrome derives the unpacked extension ID from that public key.
- Message text remains static content, but is isolated as product copy in `src/messages/templates.ts` instead of being mixed with DOM/API logic.

## Branch Scope

| Branch | BSNS_CODE | PROPERTY_NO | PP_BSNS_CODE | Door password guide |
| --- | --- | --- | --- | --- |
| `coex` | `13` | `13` | `13` | enabled |
| `gangnam` | `91` | `91` | `91` | disabled |
| `seolleung` | `14` | `14` | `14` | disabled |

Door password guide assets are scoped to `coex` only. Gangnam and Seolleung must not show the door password guide template or include the door password guide sentence in check-in messages.

## Verification Authority

- `package.json` now owns local scripts:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
  - `npm run verify`

`npm run build` compiles the TypeScript source into the runtime `dist` folder. Chrome should load `dist`, not the TypeScript source folder.
