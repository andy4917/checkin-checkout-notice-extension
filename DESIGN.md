# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-15
- Primary product surfaces: Chrome extension Svelte side panel home navigation, fixed shell header, fixed bottom work navigation, customer guidance/template list workflows.
- Evidence reviewed:
  - `PRODUCT.md`
  - `styles/sidepanel.css`
  - `src/catalog/menu-routing.ts`
  - `src/ui/components/HomeView.svelte`
  - `src/ui/components/ShellHeader.svelte`
  - `src/ui/components/SidePanelView.svelte`
  - `src/ui/components/CustomerGuidancePanel.svelte`
  - `src/ui/components/RoomsSettingsBar.svelte`
  - `src/ui/components/MaterialIcon.svelte`
  - `src/stories/HomeView.stories.ts`
  - `src/stories/ShellHeader.stories.ts`
  - `assets/fonts/NanumSquareNeo-Variable.woff2`
  - `assets/fonts/NotoSansKR-VariableFont_wght.ttf`
  - `assets/fonts/PlusJakartaSans-VariableFont_wght.ttf`
  - `src/assets/logo*.png`
  - `docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md`
  - `docs/TEST_CONTRACT.md`

## Brand
- Personality: quiet, operational, compact, Korean-first, precise staff-console feel.
- Trust signals: stable header/footer, catalog-owned menu labels, visible disabled states, no fake data, no hidden browser/storage fallbacks.
- Avoid: landing-page hero, onboarding copy, decorative imagery, gradients, neon, pure black, fake branch/room/guest/template values, legacy DOM side panel behavior.

## Product goals
- Goals:
  - Let UH Suite staff choose branch-scoped notices, quick replies, room/service work templates, and operational actions from a compact Chrome side panel.
  - Keep the first screen as the actual work menu.
  - Preserve fixed header and bottom work navigation while only the central navigation viewport slides.
  - Keep menu structure data-driven from catalog/schema modules.
- Non-goals:
  - Mobile-first redesign.
  - Marketing site, tutorial, or onboarding screen.
  - Adding unrequested inputs, filters, debug panels, or placeholder actions.
- Success signals:
  - Five root work groups are visible and scannable in the side-panel width.
  - Root group click performs nested drill-down, not accordion expansion.
  - Header logo, branch selector, date, and bottom navigation remain stable during drill-down.
  - Real failure paths remain observable through existing guard/test contracts.

## Personas and jobs
- Primary personas: UH Suite front-desk and operations staff using the extension alongside WINGS/PMS and OTA tabs.
- User jobs:
  - Find customer notices and quick replies quickly.
  - Navigate to service/work-management flows.
  - Open template/settings workflows without leaving the side panel.
  - Use branch/date context while choosing work actions.
- Key contexts of use: repetitive front-desk work on Chrome desktop, narrow side panel, frequent copy/send or PMS-assisted workflows.

## Information architecture
- Primary navigation:
  - Fixed shell header: company logo, branch selector, calendar/date.
  - Central nested drill-down navigation viewport.
  - Fixed bottom work navigation: `체크인 목록`, `체크아웃 목록`, `객실 선택`, `설정`.
- Core routes/screens:
  - Home navigation.
  - Customer guidance panel.
  - Template list workflows.
  - Laundry, OTA reservation input, settings, rooms/settings command sheet.
- Content hierarchy:
  - Root work groups first.
  - Drill-down submenu items second.
  - Bottom work shortcuts persistent but not part of the slide transition.

## Design principles
- Principle 1: Operational stability over decoration. Header/footer stay fixed; motion only clarifies navigation state.
- Principle 2: Catalog-owned UI labels. Components render schema; they do not own business labels, route IDs, PMS codes, endpoint paths, or fake data.
- Principle 3: White-family restraint. Use warm white surfaces, pale dividers, and neutral hover states instead of saturated decorative color.
- Tradeoffs:
  - Root menu items use bottom dividers only, so the UI reads as a clean work list rather than card-heavy marketing UI.
  - `--text-tracking-tight` stays `0` because current frontend rules prohibit negative letter spacing, even though tighter perceived text was requested.

## Visual language
- Color:
  - `--color-canvas: #FBFBFA`
  - `--color-surface: #FEFEFD`
  - `--color-surface-raised: #FEFEFD`
  - `--color-hover: #F5F5F3`
  - `--color-line: #E8E9E7`
  - `--color-home-divider: #ECECEA`
  - `--color-primary: #1F252B`
  - `--color-primary-soft: #3D444C`
  - `--color-text: #171B20`
  - `--color-muted: #767D84`
  - `--color-icon: #8E949A`
- Typography:
  - Card-title Korean: bundled local `NAVERNANUM` alias, then `NanumSquareNeo`.
  - Body Korean: bundled local `Noto Sans KR`, then installed `Malgun Gothic`.
  - Latin/English: bundled local `Plus Jakarta Sans`, then installed `Jakarta Sans` / `Segoe UI`.
  - No remote font imports.
  - Ordinary UI text is left-aligned and uses normal flow, not centered hero typography.
- Spacing/layout rhythm:
  - Side panel target width: 320px-400px.
  - Main horizontal padding: 16px with the existing right rail offset.
  - Root menu list uses stable grid rows and bottom dividers.
  - No horizontal scroll.
- Shape/radius/elevation:
  - Root menu groups are not full cards. They use only a thin bottom divider.
  - Cards elsewhere stay restrained, max 8px-12px radius depending on existing component pattern.
  - Avoid nested cards and heavy shadows.
- Motion:
  - Use `opacity` and `transform`.
  - Standard timing: 150ms-210ms with `cubic-bezier(0.2, 0, 0, 1)`.
  - Navigation viewport slides left/right; header/footer do not transition.
- Imagery/iconography:
  - Use shared `MaterialIcon.svelte`.
  - Home navigation icon backgrounds are transparent in default and hover states.
  - Company logos come from `src/assets/logo*.png` through the asset catalog.

## Components
- Existing components to reuse:
  - `HomeView.svelte`
  - `ShellHeader.svelte`
  - `SidePanelView.svelte`
  - `RoomsSettingsBar.svelte`
  - `MaterialIcon.svelte`
  - `LanguageSegmentedControl.svelte`
  - `CustomerGuidancePanel.svelte`
- New/changed components:
  - `HomeView.svelte` renders data-driven root groups, nested submenu panels, and fixed bottom navigation.
  - `ShellHeader.svelte` includes the calendar icon/date and enlarged home-mode logo/branch treatment.
  - `HomeView.stories.ts` documents and verifies the root and drill-down states in Storybook.
- Variants and states:
  - Root navigation: default, hover, active/pressed, focus-visible.
  - Drill-down detail: back button, submenu rows, selected route click.
  - Bottom navigation: enabled and real-disabled states only.
  - Header: home mode and work mode.
- Token/component ownership:
  - Shared visual tokens live in `styles/sidepanel.css`.
  - Menu schema and order live in `src/catalog/menu-routing.ts`.
  - Browser/global dependencies remain routed through `src/ui/side-panel-dependencies.ts`.

## Accessibility
- Target standard: practical keyboard and screen-reader support for Chrome extension side-panel workflows.
- Keyboard/focus behavior:
  - Interactive rows are real buttons.
  - Focus-visible states must remain visible.
  - Disabled bottom actions use actual disabled button state when no real route exists.
- Contrast/readability:
  - Text uses high-contrast neutral ink on white-family surfaces.
  - Disabled states remain visually distinct but not hidden.
- Screen-reader semantics:
  - Navigation regions have operational Korean labels.
  - Icon-only controls require `aria-label`.
  - Icons used only for decoration are `aria-hidden`.
- Reduced motion and sensory considerations:
  - Motion must be transform/opacity based and restrained.
  - No decorative animation loops, flashing, or bounce/elastic effects.

## Responsive behavior
- Supported breakpoints/devices: Chrome extension side panel desktop width. Mobile layout is not a target.
- Layout adaptations:
  - Main design assumes roughly 320px-400px side-panel width.
  - Fixed header/footer remain aligned to side-panel width.
  - Long Korean/English labels truncate or wrap without overlapping icons.
- Touch/hover differences:
  - Hover states may be subtle on pointer devices.
  - Click/press feedback uses light scale/compression only.

## Interaction states
- Loading:
  - Use existing loading image or exact-dimension skeletons.
  - Do not introduce circular spinner spectacle.
- Empty:
  - Do not fake business data. Empty states must reflect real absence.
- Error:
  - Errors state the next required operational condition, such as WINGS page or customer record requirements.
- Success:
  - Success indicators appear only after real successful actions, such as copy completion.
- Disabled:
  - Disabled actions must map to real route/context absence or guard conditions.
- Offline/slow network, if applicable:
  - No silent fallback. Surface existing guard or failure path instead of pretending success.

## Content voice
- Tone: concise, direct, operational Korean.
- Terminology:
  - Use the exact catalog labels for work groups and menu items.
  - Keep branch/date/menu labels short.
- Microcopy rules:
  - No visible tutorial or feature-explanation copy in the primary app surface.
  - No marketing words or invented productivity claims.
  - No fake names, rooms, branches, guest values, or demo summaries.

## Implementation constraints
- Framework/styling system:
  - Svelte side panel mounted from `src/ui/main.ts`.
  - `src/ui/App.svelte` remains an orchestrator.
  - Screen markup lives under `src/ui/components/*`.
  - Styling is centralized in `styles/sidepanel.css`.
- Design-token constraints:
  - Prefer existing CSS custom properties.
  - Do not scatter fonts, colors, route IDs, PMS values, or operation codes inside components.
  - Keep `--text-tracking-tight: 0`; negative letter spacing is not allowed by higher-level frontend rules.
- Performance constraints:
  - Keep motion to transform/opacity.
  - Avoid layout-shifting hover states.
  - Added font files are bundled assets; note that `NotoSansKR-VariableFont_wght.ttf` is large and should be reviewed if extension size becomes a concern.
- Compatibility constraints:
  - Chrome extension side-panel context.
  - No dependency on removed legacy `src/sidepanel/*` DOM code.
  - No hidden direct `fetch`, `chrome.storage`, `navigator.clipboard`, or `window` dependencies inside UI components.
- Test/screenshot expectations:
  - Run `npm run verify` for typecheck, extension build, and tests.
  - Use Storybook when available for component render checks.
  - Actual `chrome-extension://` visual automation may be blocked by browser policy; record that if it occurs.

## Open questions
- [ ] Confirm whether the large bundled `Noto Sans KR` variable font is acceptable for extension package size / owner: Product Owner / impact: bundle size and load cost.
