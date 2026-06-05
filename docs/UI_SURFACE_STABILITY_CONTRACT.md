# UI Surface Stability Contract

Status: active. Use this before changing layout, navigation, state, or visual
contracts.

This document protects stable product structure from accidental adaptive-layout
or test-driven rewrites. If a change touches many states, many menus, or shell
geometry, document the intended contract here or in the listed owner document
before changing the implementation.

## Protected Shell Structure

- `src/ui/App.svelte` remains a skeleton that creates the navigation controller
  and renders `SidePanelView`.
- `SidePanelView.svelte` orchestrates header, status, and `ScreenStage`. It must
  not own product menu rows or render the home footer shortcuts directly.
- `ScreenStage.svelte` routes between Home, PMS, and Work surfaces and passes
  catalog/controller state to the owning component.
- `HomeView.svelte` owns the home root menu, submenu drill-down, inline
  template copy rows, and footer-style work shortcuts.
- `ShellHeader.svelte` owns logo/date/branch trigger presentation. Header logo
  visibility must not be reduced by global disabled styles.
- Work leaf screens are rendered by their owning work component or a dedicated
  component called from `WorkSurface.svelte`; they do not belong in home
  submenu markup.

## Protected Visual Rhythm

- Home root rows keep the 48px row rhythm, 21px root title size, 16px root row
  gap, and 32px home panel inline padding unless a new approved reference
  contract replaces those values.
- Home submenu rows keep the 48px row rhythm and link-row shape. They are not
  cards.
- Home footer shortcuts remain part of the home surface and stay below the
  central drill-down viewport. They must not overlap visible submenu rows.
- Adaptive height rules may target a specific failing work surface, such as
  sales category chip visibility, but must not globally shrink protected home
  root/header/footer typography or spacing.
- The side panel remains bounded to the Chrome side-panel coordinate space. A
  wide tab page must not become the acceptance surface for layout.

## State And Contract Owner Documents

Use these docs for broad or state-heavy changes:

| Concern | Owner doc |
| --- | --- |
| Product surface count, menu paths, visual reference interpretation | `docs/PRODUCT_DESIGN_CONTRACT.md` |
| PMS/OTA/WINGS/storage/clipboard backend boundaries | `docs/BACKEND_CONTRACT_REVIEW.md` |
| Test and smoke acceptance behavior | `docs/TEST_CONTRACT.md` |
| Generated surface contracts and per-surface prohibited text/status rules | `docs/product-surface-targets/<surfaceId>/contract.json` |
| Actual verification status and unresolved evidence gaps | `docs/verification-report.md` |

## Change Gate

Before changing a protected structure:

1. Identify the user instruction or reference image that requires the change.
2. Update the owning doc when the change modifies structure, state, shape,
   status policy, or visual rhythm.
3. Keep tests as contract guards, not as a way to freeze a temporary bug.
4. Run the same failed proof after a fix when the failure is already known.
5. Do not claim completion until the actual user-controlled Chrome side panel
   is checked.

## Current Cleanup Rule

The active cleanup keeps the side-panel path/PMS failure guards and leaf
visibility fixes, but restores the protected HomeView footer ownership and home
root rhythm. Any further adaptive UI change must be scoped to the specific work
surface that needs it.
