# Chrome Extension Principles

This file turns the Chrome extension sample review into local product rules.
It is a contract for this repo, not a copy target from the sample repository.

## Reference Inputs

- GoogleChrome chrome-extensions-samples, `main` at `c4393862e164d74d1b6112ced19f2a2bbe26506c`.
- Chrome MV3 side panel, service worker, scripting, and permission documentation.
- This product's repo-local contract in `agents.md`.

## Runtime Boundary

- The product is a Chrome MV3 extension with a Svelte side panel.
- The supported runtime floor is `minimum_chrome_version = 120`, matching the Vite `chrome120` build target.
- Chrome loads the built `dist` folder. The source-root manifest is a development contract and `scripts/write-extension-manifest.ts` writes the runtime manifest paths.
- `manifest.json` keeps the fixed unpacked extension `key`; changing it changes the extension ID.
- `side_panel.default_path` and `background.service_worker` remain manifest-owned entry points.

## Permissions

- Use static `host_permissions` only for product-owned PMS/OTA hosts that are required by current workflows.
- Permission changes must be source-backed and must update the manifest boundary test before release.
- Do not add broad host permissions, `activeTab`, content scripts, offscreen documents, or context menus as convenience shortcuts.
- Keep `tabs` and `scripting` tied to active-tab OTA/WINGS field workflows, not PMS list fetches or generic browser inspection.

## Source Ownership

- Screen markup stays in `src/ui/components/*`.
- `src/ui/App.svelte` stays an orchestrator and must not own screen markup or direct Chrome/browser dependencies.
- Chrome API access enters the side panel through `src/ui/side-panel-navigation-dependencies.ts` or a named platform owner module.
- PMS, OTA, WINGS, catalog, storage, and domain operation values stay in their owner modules.
- Sample repo hardcoding is not product authority. It may show an API shape, but not business data, fallback values, UI copy, or component ownership.

## Verification

- `npm run verify` is the normal closeout gate when package state allows it.
- The final frontend proof is the user-controlled Google Chrome sidePanel container for the unpacked
  extension, not a Vite, localhost, or extension-URL page-target render.
- `chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html` page-target checks are
  supplementary failure detectors only; they do not prove the real Chrome sidePanel frame.
- The smoke check must fail on wrong extension ID, missing worker, runtime errors, fake fallback data, hidden placeholders, horizontal overflow, and broken route motion.
- Missing evidence is a blocker; do not replace an unavailable extension smoke with a weaker success claim.
