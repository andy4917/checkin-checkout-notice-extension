# Current Program Structure

This document records the current product structure. It is not a migration plan
and must not revive removed DOM side-panel code, sample dashboards, or stale
reference UI concepts.

## Current Goal

- keep the employee workflow fast in the Chrome side panel
- persist the last valid branch because each workstation usually serves one branch
- keep templates, menu routing, branch scope, and settings catalog/schema-owned
- keep PMS/WINGS/OTA request logic, message generation, Chrome storage, and UI rendering in separate owners
- keep unsupported language, missing branch, missing template, PMS failure, WINGS context failure, and storage corruption as explicit errors
- avoid global success banners for copy operations; copied state belongs on the button/action that was used

## Primary User Flow

1. Staff opens the Chrome extension side panel.
2. Chrome loads the built `dist` package and the Svelte side panel entry.
3. The app loads the last valid branch from `chrome.storage.local`.
4. If no saved branch exists, branch-required workflows fail visibly and do not query PMS.
5. Staff selects `coex`, `gangnam`, or `seolleung`; the selection is saved as `lastBranchId`.
6. Staff opens a catalog-owned home group.
7. Customer 안내문 and 빠른 문의 답변 groups open inline accordion template lists; service/work/template management groups open menu screens.
8. PMS guest records are fetched only through explicit bottom PMS list actions or workflows that require selected-room context.
9. Staff copies a template, updates a local workflow state, or performs a guarded active-tab action.
10. The app validates branch, language, template, variables, context, command availability, and asset scope before the action.

## Current Folder Shape

```text
src/
  application/
    airport-van-form.ts
    context-guard.ts
    laundry-records.ts
    operator-error-messages.ts
    ota-reservation-input.ts
    sync-guests.ts
    template-settings.ts
    wings-remark.ts
  assets/
    asset-catalog.ts
    logo*.png
  background/
    index.ts
    side-panel-policy.ts
  catalog/
    menu-routing.ts
    template-catalog.ts
    template-groups.ts
    template-renderer.ts
    template-schema.ts
    template-types.ts
    template-variable-mapping.ts
    workflow-catalog.ts
  config/
    app-config.ts
    branches.ts
    ota-wings-contract.ts
    pms-filter-schema.ts
  domain/
    dates.ts
    guests.ts
    language.ts
    remarks.ts
    room-context.ts
    rooms.ts
  laundry/
    storage.ts
    types.ts
  ota/
    normalizer.ts
    request-guard.ts
    source-detection.ts
    types.ts
  platform/
    active-tab-automation.ts
    chrome-storage.ts
    storage-schema.ts
    tab-context.ts
  pms/
    client.ts
    filter-builder.ts
    normalizer.ts
  ui/
    App.svelte
    main.ts
    side-panel-navigation-controller.svelte.ts
    side-panel-navigation-dependencies.ts
    template-list-state.ts
    components/
      HomeView.svelte
      MaterialIcon.svelte
      PmsGuestPanel.svelte
      ScreenStage.svelte
      ShellHeader.svelte
      SidePanelView.svelte
      WorkSurface.svelte
  wings/
    reservation-draft.ts
```

Removed `src/sidepanel/*` DOM code is not a compatibility target. Current UI work
stays under `src/ui/*`, with `App.svelte` as the skeleton entry,
`SidePanelView.svelte` as composition, `ScreenStage.svelte` as screen switch,
and `side-panel-navigation-controller.svelte.ts` as the state/use-case boundary.

## Storage Contract

Use one versioned object in `chrome.storage.local`:

```ts
type StoredExtensionState = {
  schemaVersion: 1;
  lastBranchId?: BranchId;
  templateOverrides: Record<string, TemplateOverride>;
  customTemplates: CustomTemplate[];
  ui: {
    lastTab?: TabMode;
    compactMode?: boolean;
    templateVariableValues?: Record<string, string>;
    airportVanFormValues?: AirportVanFormValues;
  };
};
```

Rules:

- invalid `lastBranchId` is rejected and surfaced; it must not silently fall back to another branch
- branch selection writes only after `BranchId` validation
- template overrides never mutate the built-in catalog directly
- reset removes only override keys, not built-in catalog entries
- import/export must validate schema before applying
- UI form values stored in `ui` are workflow inputs, not fake PMS/customer data

## UI State Contract

- Home root rows and submenu rows are link-like rows, not card grids.
- The footer/bottom bar uses fixed icon+label actions and must not resize around text animations.
- Hover underline belongs to the visible row label text, not the full grid cell.
- Customer 안내문 and 빠른 문의 답변 use inline accordion lists; multiple sections may stay open until closed by the user.
- Language selectors appear only where a multilingual template workflow is active:
  - home accordion template groups
  - work surfaces allowed by `usesWorkLanguageSelector(menu.id)`
- Copy actions show success through the copied button state only. They do not set persistent shell success messages.
- Blocking errors remain visible through the status surface; stale success/status text must be cleared on navigation boundaries.
- Work headers use branch logo/date/back controls and must not show stale menu titles.

## Template Contract

Runtime menu/source metadata is layered through
`UnifiedTemplateDefinition` in `src/catalog/template-catalog.ts`, not duplicated
in Svelte components. Template rendering and requirement checks stay in
catalog/UI helper modules:

- `src/catalog/template-renderer.ts`
- `src/catalog/template-catalog.ts`
- `src/ui/template-list-state.ts`

Template packs may only be imported as real catalog entries with source evidence.
No UI component may introduce business placeholder copy, fake guest values,
fake branch data, or fallback success text.

## Current Verification Authority

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run verify`

Frontend closeout requires the Svelte entry to build/load and at least one real
failure path to remain observable. Passing tests are evidence, not permission to
leave stale UI or documentation residue.

## Next Safe Work Slices

1. Import additional real template-pack slices through `workflow-catalog.ts` and `template-catalog.ts`.
2. Add or adjust focused contract tests under the product contract suite:
   `product-surface-contract`, `repo-boundary`, `application-domain`,
   `integration-state`, or `extension-smoke-contract`.
3. Normalize repeated row/list/form controls only inside `src/ui/components/*`.
4. Keep PMS, OTA, WINGS, storage, laundry, and catalog behavior in their owner modules.
5. Run `npm run verify` and inspect the touched side-panel path.
