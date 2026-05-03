# Next Step Program Structure

## Goal

Prepare the extension for the next implementation stage after TypeScript compilation:

- keep the employee workflow fast in the Chrome side panel
- persist the last selected branch because each workstation usually serves one branch
- make templates, assets, branch scope, and settings editable through one catalog shape
- keep PMS/WINGS request logic, message generation, Chrome storage, and UI rendering in separate owners
- keep unsupported language, missing branch, missing template, PMS failure, and storage corruption as explicit errors

## Primary User Flow

1. Staff opens a PMS page and clicks the extension.
2. Chrome opens `sidepanel.html` from the built `dist` folder.
3. The app loads the last valid branch from `chrome.storage.local`.
4. If no saved branch exists, the side panel stays in a branch-required state and does not query PMS.
5. Staff selects `coex`, `gangnam`, or `seolleung`.
6. The selected branch is saved as `lastBranchId`.
7. The app fetches PMS guests for the selected branch, current business date, and active tab.
8. Staff searches by guest name or room.
9. Staff clicks a language/template action.
10. The app validates branch, language, template, variables, and asset scope.
11. The app copies the generated message and shows any branch-scoped attachment reminder.
12. Staff can open settings to edit template copy, branch scope, language variants, and attachments.

## Runtime Surfaces

| Surface | Role | Must not own |
| --- | --- | --- |
| `src/background/index.ts` | Enable side panel on allowed PMS origins | message generation, catalog rules |
| `src/platform/*` | Chrome APIs, storage, runtime adapters | PMS filter details, UI state |
| `src/pms/*` | PMS endpoint and request body construction | selected branch persistence, UI rendering |
| `src/domain/*` | pure date, room, guest behavior | Chrome APIs, DOM, Svelte state |
| `src/catalog/*` + `src/assets/*` | template and asset definitions, validators | DOM events, PMS fetch |
| `src/application/*` | use cases that join storage, PMS, catalog, and domain | HTML string rendering |
| `src/ui/*` | Svelte components and local interaction | branch code authority, PMS filters |
| `scripts/*` | build/package helpers | runtime business behavior |

## Current Folder Shape

```text
src/
  application/
    context-guard.ts
    laundry-records.ts
    ota-reservation-input.ts
    sync-guests.ts
    template-settings.ts
  catalog/
    menu-routing.ts
    template-catalog.ts
    template-renderer.ts
    template-schema.ts
    template-types.ts
    template-variable-mapping.ts
    workflow-catalog.ts
  assets/
    asset-catalog.ts
  domain/
    dates.ts
    guests.ts
    language.ts
    remarks.ts
    rooms.ts
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
    side-panel-controller.svelte.ts
    app-state-helpers.ts
    app-view-model.ts
    display-helpers.ts
    pms-workflow.ts
    laundry-workflow.ts
    ota-workflow.ts
    template-runtime-values.ts
    template-settings-workflow.ts
    components/
      SidePanelView.svelte
      ShellHeader.svelte
      HomeView.svelte
      WorkHeader.svelte
      TemplateList.svelte
      SettingsPanel.svelte
      RoomBottomBar.svelte
      LaundryPanel.svelte
      OtaReservationPanel.svelte
```

The old `src/sidepanel/*` DOM renderer has been removed. New UI work must stay under `src/ui/*`. `App.svelte` stays an entry skeleton; side-panel composition belongs in `components/SidePanelView.svelte`, state orchestration belongs in `side-panel-controller.svelte.ts`, and feature calculations belong in the workflow/helper modules.

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
  };
};
```

Rules:

- invalid `lastBranchId` is rejected and surfaced; it must not silently fall back to another branch
- branch selection writes only after `BranchId` validation
- template overrides never mutate the built-in catalog directly
- reset removes only override keys, not built-in catalog entries
- import/export must validate schema before applying

## Template Contract

The current editable template shape is:

```ts
type TemplateDefinition = {
  id: string;
  title: string;
  category: TemplateCategory;
  branchScope: BranchId[];
  languages: Partial<Record<Language, string>>;
  variables: TemplateVariable[];
  attachments: string[];
  requiresContext: TemplateContextRequirement;
  editable: boolean;
  defaultValue: string;
};
```

Runtime menu/source metadata is layered through `UnifiedTemplateDefinition` in `src/catalog/template-catalog.ts`, not duplicated in Svelte components.

Future catalog work may add structured `TemplateBody` conditional segments:

```ts
type TemplateSegment =
  | { kind: "text"; value: string }
  | { kind: "variable"; name: TemplateVariable }
  | { kind: "conditional"; policy: "coexDoorPasswordGuide"; segments: TemplateSegment[] };
```

That would make COEX-only password text a catalog policy decision. Until then, no UI component may reimplement password-text branching; rendering and attachment filtering must stay in catalog/asset owners.

## Error Surfaces

Current explicit failure surfaces include:

- `UnsupportedLanguageError`
- `TemplateLanguageUnavailableError`
- `PmsRequiredValueMissingError`
- `ManualRequiredValueMissingError`
- `PmsRequestError`
- `StorageSchemaError`
- `OtaReservationDependencyError`

The side panel should display these as user-actionable states instead of generic `Error: ...`.

## Completed Structure Work

- `src/sidepanel/*` DOM renderer has been removed.
- `src/messages/*` legacy message layer has been removed.
- `src/ui/App.svelte` is a skeleton entry.
- Browser globals are injected through `src/ui/side-panel-dependencies.ts`.
- PMS, OTA, storage, catalog rendering, laundry records, and template settings have owner modules.
- Tests are organized by product contract in `docs/TEST_CONTRACT.md`.

## Remaining Implementation Order

1. Catalog-driven message expansion
   - make `template-catalog.ts` the runtime entry point
   - support `templateId + lang + branchId + variables`
   - import only real template-pack content with source evidence
   - keep unsupported language, missing PMS value, and missing manual required value observable

2. Settings panel
   - list templates by category and branch scope
   - edit language body and attachments
   - preview with operator-provided guest variables
   - validate before save
   - reset one template or all overrides

3. Frontend reference normalization
   - keep `App.svelte` as skeleton
   - normalize repeated row/list/form controls under `src/ui/components/*`
   - exercise the built Svelte entry and at least one real failure path

4. Packaging
   - add zip packaging script only after `dist` is stable
   - preserve fixed extension ID
   - Chrome should load `dist`

## Next Concrete Batch

The next coding batch should be:

1. import the next real template-pack slice into `src/catalog/workflow-catalog.ts`
2. update `src/catalog/template-catalog.ts` metadata and duplicate evidence
3. normalize the affected `src/ui/components/*` rows without adding new workflow sections
4. add or adjust contract tests under the relevant test file from `docs/TEST_CONTRACT.md`
5. run `npm run verify` plus an app-path check for the touched side-panel workflow

Done when:

- new template copy renders through `renderTemplate()`
- branch scope and language availability are enforced
- no fake customer, room, reservation, machine, or source data is introduced
- the Svelte entry still builds
- a real failure path remains observable
