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
| `src/catalog/*` or current `src/messages/*` + `src/assets/*` | template and asset definitions, validators | DOM events, PMS fetch |
| `src/application/*` | use cases that join storage, PMS, catalog, and domain | HTML string rendering |
| `src/ui/*` | Svelte components and local interaction | branch code authority, PMS filters |
| `scripts/*` | build/package helpers | runtime business behavior |

## Target Folder Shape

```text
src/
  application/
    generate-message.ts
    load-work-context.ts
    select-branch.ts
    sync-guests.ts
    save-template-override.ts
  catalog/
    asset-catalog.ts
    template-catalog.ts
    template-renderer.ts
    template-validation.ts
  domain/
    dates.ts
    guests.ts
    rooms.ts
  errors/
    app-errors.ts
  platform/
    chrome-storage.ts
    chrome-runtime.ts
    storage-schema.ts
  pms/
    client.ts
    filter-builder.ts
  ui/
    App.svelte
    components/
      AppHeader.svelte
      BranchSelector.svelte
      GuestCard.svelte
      GuestList.svelte
      MessageActionGrid.svelte
      AssetReminderList.svelte
      SettingsPanel.svelte
      TemplateEditor.svelte
      ErrorBanner.svelte
    state/
      sidepanel-state.svelte.ts
```

The current `src/sidepanel/*` can remain during migration, but new UI work should move toward `src/ui/*` and use DOM APIs/Svelte bindings instead of HTML string rendering for user-editable content.

## Storage Contract

Use one versioned object in `chrome.storage.local`:

```ts
type StoredExtensionState = {
  schemaVersion: 1;
  lastBranchId?: BranchId;
  templateOverrides: Record<string, TemplateOverride>;
  ui: {
    lastTab?: TabMode;
    compactMode?: boolean;
  };
};
```

Rules:

- invalid `lastBranchId` is ignored and reported as a recoverable settings error
- branch selection writes only after `BranchId` validation
- template overrides never mutate the built-in catalog directly
- reset removes only override keys, not built-in catalog entries
- import/export must validate schema before applying

## Template Contract

Move toward a single editable template shape:

```ts
type TemplateDefinition = {
  id: string;
  title: string;
  category: TemplateCategory;
  branchScope: BranchId[];
  languages: Partial<Record<Language, TemplateBody>>;
  variables: TemplateVariable[];
  attachments: string[];
  editable: boolean;
  sourcePath: string;
  duplicateGroupId: string | null;
};
```

`TemplateBody` should support conditional segments instead of removing password text after rendering:

```ts
type TemplateSegment =
  | { kind: "text"; value: string }
  | { kind: "variable"; name: TemplateVariable }
  | { kind: "conditional"; policy: "coexDoorPasswordGuide"; segments: TemplateSegment[] };
```

This makes the COEX-only password sentence a catalog policy decision, not a string replace.

## Error Classes

Add explicit errors before settings work:

- `BranchRequiredError`
- `InvalidBranchError`
- `UnsupportedLanguageError`
- `TemplateNotFoundError`
- `TemplateLanguageMissingError`
- `PmsRequestError`
- `StorageSchemaError`

The side panel should display these as user-actionable states instead of generic `Error: ...`.

## Implementation Order

1. Storage adapter and last branch persistence
   - add `src/platform/chrome-storage.ts`
   - add `src/platform/storage-schema.ts`
   - load saved branch on startup
   - save selected branch after validation
   - tests: valid saved branch, missing branch, invalid saved branch, storage failure

2. Application use cases
   - move branch selection, PMS sync, list filtering, and message generation out of `src/sidepanel/index.ts`
   - keep existing DOM UI working during this step
   - tests: `selectBranch`, `syncGuests`, `generateMessage`

3. Svelte shell migration
   - change `sidepanel.html` to mount `src/ui/App.svelte`
   - replace `renderGuestList` HTML strings with components
   - use Svelte state for branch, tab, guests, loading, and error state
   - keep PMS and message logic in application/domain modules

4. Catalog-driven message generation
   - make `template-catalog.ts` the runtime entry point
   - support `templateId + lang + branchId + variables`
   - replace password text removal with conditional segments
   - tests: COEX includes password segment, Gangnam/Seolleung omit it, unsupported language fails

5. Settings panel
   - list templates by category and branch scope
   - edit language body and attachments
   - preview with sample guest variables
   - validate before save
   - reset one template or all overrides

6. Packaging
   - add zip packaging script only after `dist` is stable
   - preserve fixed extension ID
   - Chrome should load `dist`

## Next Concrete Batch

The next coding batch should be:

1. `src/platform/chrome-storage.ts`
2. `src/platform/storage-schema.ts`
3. `src/application/select-branch.ts`
4. update `src/sidepanel/index.ts` to load/save `lastBranchId`
5. add focused tests for branch persistence and invalid storage data

Done when:

- a valid saved branch auto-selects and queries PMS
- no saved branch keeps the existing branch-required state
- invalid saved branch does not fall back to COEX silently
- branch changes persist to `chrome.storage.local`
- `npm run verify` passes
