# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-25
- Primary product surfaces: Chrome extension Svelte side panel home navigation, fixed shell header, footer-style work shortcuts, nested submenu navigation, inline customer/quick-reply template accordions, PMS guest selection panel, template work surface, OTA reservation input surface, laundry workflow surface, airport van form surface, and template/settings surface.
- Evidence reviewed:
  - `PRODUCT.md`
  - `styles/sidepanel.css`
  - `src/catalog/menu-routing.ts`
  - `src/ui/components/HomeView.svelte`
  - `src/ui/components/ShellHeader.svelte`
  - `src/ui/components/SidePanelView.svelte`
  - `src/ui/components/PmsGuestPanel.svelte`
  - `src/ui/components/WorkSurface.svelte`
  - `src/ui/components/MaterialIcon.svelte`
  - `src/ui/side-panel-navigation-controller.svelte.ts`
  - `src/ui/side-panel-navigation-dependencies.ts`
  - `src/application/airport-van-form.ts`
  - `src/application/laundry-records.ts`
  - `src/application/ota-reservation-input.ts`
  - `src/application/operator-error-messages.ts`
  - `assets/fonts/NanumSquareNeo-Variable.woff2`
  - `assets/fonts/NotoSansKR-VariableFont_wght.ttf`
  - `assets/fonts/PlusJakartaSans-VariableFont_wght.ttf`
  - `src/assets/logo*.png`
  - `docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md`
  - `docs/PANEL_MOTION_RESPONSIVE_CONTRACT.md`
  - `docs/FRAMER_SIDEBAR_INTERACTION_GRAMMAR.md`
  - `docs/TEST_CONTRACT.md`

## Brand
- Personality: quiet, operational, compact, Korean-first, precise staff-console feel.
- Trust signals: stable header/footer, catalog-owned menu labels, visible disabled states, no fake data, no hidden browser/storage fallbacks.
- Avoid: landing-page hero, onboarding copy, decorative imagery, gradients, neon, pure black, fake branch/room/guest/template values, legacy DOM side panel behavior.

## Product goals
- Goals:
  - Let UH Suite staff navigate branch-scoped notice, quick-reply, room/service, work-management, and template/editing menu groups from a compact Chrome side panel.
  - Keep the first screen as the actual work menu.
  - Preserve fixed header and footer-style work shortcuts while only the central navigation viewport slides.
  - Keep menu structure data-driven from catalog/schema modules.
  - Make operational choices visible on screen, so staff recognize the current workflow state instead of remembering hidden route or backend details.
- Non-goals:
  - Mobile-first redesign.
  - Marketing site, tutorial, or onboarding screen.
  - Adding unrequested inputs, filters, debug panels, or placeholder actions.
- Success signals:
  - Five root work groups are visible and scannable in the side-panel width.
  - Root group click performs nested drill-down. The first two groups expand catalog templates as submenu accordions; the remaining groups continue to work/menu screens.
  - Header logo, branch selector, date, and footer shortcuts remain stable during drill-down.
  - Real failure paths remain observable through existing guard/test contracts.

## Personas and jobs
- Primary personas: UH Suite front-desk and operations staff using the extension alongside WINGS/PMS and OTA tabs.
- User jobs:
  - Find customer notices and quick replies quickly.
  - Navigate to service/work-management flows.
  - Reach the intended menu group and submenu, then complete supported work screens with visible branch, customer, laundry, OTA, or airport-van context.
  - Use branch/date context while choosing work actions.
- Key contexts of use: repetitive front-desk work on Chrome desktop, narrow side panel, frequent copy/send or PMS-assisted workflows.

## Information architecture
- Primary navigation:
  - Fixed shell header: company logo, branch selector, calendar/date.
  - Central nested drill-down navigation viewport.
  - Footer-style work shortcuts: `체크인 목록`, `체크아웃 목록`, `객실 선택`, `설정`.
- Core routes/screens:
  - Home navigation.
  - Nested submenu navigation.
  - PMS guest panels for check-in, check-out, and room selection.
  - Work surfaces for supported templates, OTA reservation input, laundry management, airport van management, and settings/template editing.
- Content hierarchy:
  - Root work groups first.
  - Drill-down submenu items second.
  - Work-surface primary action and required context third.
  - Bottom work shortcuts persistent but not part of the slide transition.

## Design principles
- Principle 1: Operational stability over decoration. Header/footer stay fixed; motion only clarifies navigation state.
- Principle 2: Catalog-owned UI labels. Components render schema; they do not own business labels, route IDs, PMS codes, endpoint paths, or fake data.
- Principle 3: White-family restraint. Use warm white surfaces, pale dividers, and neutral hover states instead of saturated decorative color.
- Principle 4: Common motion grammar. Nested panel navigation uses the shared direction, focus, reduced-motion, and responsive rules in `docs/PANEL_MOTION_RESPONSIVE_CONTRACT.md`.
- Principle 5: Recognition over recall. Staff should see selected source, selected customer, required inputs, copy target, and failure state directly in the surface.
- Principle 6: Aesthetic/minimalist operation. Remove decorative or secondary text when it competes with the current task, but keep guardrails and failure states visible.
- Tradeoffs:
  - Root menu items use Framer-like link rows and underline hover instead of cards or heavy dividers.
  - `--text-tracking-tight` stays `0` because current frontend rules prohibit negative letter spacing, even though tighter perceived text was requested.

## Visual language
- Color:
  - `--color-canvas: #FDFDFC`
  - `--color-surface: #FDFDFC`
  - `--color-surface-raised: #FDFDFC`
  - `--color-hover: #F5F5F3`
  - `--color-line: #EEEEEC`
  - `--color-home-divider: #EEEEEC`
  - `--color-primary: #1F252B`
  - `--color-primary-soft: #3D444C`
  - `--color-text: #171B20`
  - `--color-muted: #767D84`
  - `--color-icon: #8E949A`
- Typography:
  - Home navigation Korean: bundled local `Noto Sans KR`, then installed `Malgun Gothic`, with restrained weight so the list reads like a precise work menu instead of poster display type.
  - Bundled `NAVERNANUM` / `NanumSquareNeo` remains available for surfaces that need a heavier brand-style Korean title, but it is not the home navigation default.
  - Body Korean: bundled local `Noto Sans KR`, then installed `Malgun Gothic`.
  - Latin/English: bundled local `Plus Jakarta Sans`, then installed `Jakarta Sans` / `Segoe UI`.
  - No remote font imports.
  - Ordinary UI text is left-aligned and uses normal flow, not centered hero typography.
- Spacing/layout rhythm:
  - Side panel target width: 320px-400px.
  - Main horizontal padding is 12px-14px with no artificial right rail offset.
  - Root menu list uses stable 48px link rows, 32px sidebar padding, compact catalog icons, and no heavy dividers.
  - No horizontal scroll.
- Shape/radius/elevation:
  - Root menu groups are not full cards. They read as sidebar links with underline hover.
  - Cards elsewhere stay restrained, max 8px-12px radius depending on existing component pattern.
  - Avoid nested cards and heavy shadows.
- Motion:
  - Use transform-first motion for navigation and keep opacity effects away from the home drill-down route.
  - Standard timing uses shared tokens in `styles/sidepanel.css`: `--motion-standard`, `--motion-reveal-duration`, `--motion-hover-duration`, `--sidepanel-motion-duration`, `--sidepanel-motion-ease`, `--micro-motion-duration`, `--home-content-motion-duration`, and `--home-content-motion-delay`.
  - Shared hover affordance uses `--home-hover-label-shift`, `--home-hover-chevron-shift`, `--home-hover-underline-height`, and `--home-hover-underline-opacity` so text, underline, and chevron emphasis stay consistent across root and submenu rows.
  - Home drill-down rows do not use stagger variables. The reference motion is carried by the clipped transform slide, retained outgoing detail content on backward navigation, short content enter/exit motion, and visible text underline hover; row labels and chevrons move forward subtly on hover.
  - Navigation viewport slides left/right; header/footer do not transition.
  - `forward`, `backward`, and `replace` are explicit navigation intents, not inferred from menu labels.
  - Framer sidebar is the target for felt sidebar quality: 400px reference scale, 64px top rhythm, 48px rows, 600ms submenu slide, icon+label footer treatment, clipped scroll mask, and underline hover. Do not copy remote Framer runtime, fake social/legal links, heavy backdrop, or mobile menu model.
- Common UI/motion consistency:
  - Header and footer shortcuts are persistent shell surfaces. They do not participate in central route slide motion.
  - Central navigation changes through a clipped two-panel transform track; content may enter/exit with short transform/opacity support, but route state must not animate layout properties.
  - Forward, backward, hover, focus-visible, active, disabled, and reduced-motion behavior must be implemented from shared tokens instead of one-off CSS values.
  - Hover feedback must be visible on pointer devices but nonessential on touch/coarse pointers.
  - Any future menu-like row should reuse the same underline, subtle forward nudge, chevron emphasis, focus ring, and reduced-motion conventions unless a documented exception is added.
- Imagery/iconography:
  - Use shared `MaterialIcon.svelte`.
  - Home navigation icon backgrounds are transparent in default and hover states.
  - Company logos come from `src/assets/logo*.png` through the asset catalog.

## Components
- Existing components to reuse:
  - `HomeView.svelte`
  - `ShellHeader.svelte`
  - `SidePanelView.svelte`
  - `PmsGuestPanel.svelte`
  - `WorkSurface.svelte`
  - `MaterialIcon.svelte`
- New/changed components:
  - `HomeView.svelte` renders data-driven root groups, nested submenu panels, inline template accordions for catalog-marked groups, and footer-style work shortcuts.
  - `ShellHeader.svelte` includes the calendar icon/date and enlarged home-mode logo/branch treatment.
  - `PmsGuestPanel.svelte` renders branch/date-scoped PMS lists and selected room context without inventing records.
  - `WorkSurface.svelte` renders supported work screens from catalog/application-owned contracts, not route ID literals.
- Variants and states:
  - Root navigation: default, hover with unclipped text underline expansion, subtle label nudge, and chevron emphasis, active/pressed, focus-visible.
  - Drill-down detail: explicit forward/backward direction, retained outgoing detail panel during back motion, back button, submenu rows, accordion expansion for customer/quick-reply template lists, selected route click for work/menu groups, Escape-to-back, and focus restoration.
  - Footer shortcuts: enabled and real-disabled states only.
  - Header: home navigation mode.
  - PMS panel: loading, empty, selectable row, selected row, and visible fetch failure.
  - Work surface: branch-required, loading, success, error, selected source, selected copy target, required manual value, and reset-confirmation states.
- Token/component ownership:
  - Shared visual tokens live in `styles/sidepanel.css`.
  - Shared panel motion and responsive interaction contract lives in `docs/PANEL_MOTION_RESPONSIVE_CONTRACT.md`.
  - Menu schema and order live in `src/catalog/menu-routing.ts`.
  - Current navigation storage dependencies remain routed through `src/ui/side-panel-navigation-dependencies.ts`.
  - Operation choices, source labels, workflow columns, and error copy live in application/catalog/platform owner modules before reaching UI components.

## Accessibility
- Target standard: practical keyboard and screen-reader support for Chrome extension side-panel workflows.
- Keyboard/focus behavior:
  - Interactive rows are real buttons.
  - Focus-visible states must remain visible.
  - Disabled footer actions use actual disabled button state when no real route exists.
  - Nested home navigation moves focus into the child panel and restores focus to the opening row after returning.
  - Escape returns one nested level when a child panel is active.
- Contrast/readability:
  - Text uses high-contrast neutral ink on white-family surfaces.
  - Disabled states remain visually distinct but not hidden.
- Screen-reader semantics:
  - Navigation regions have operational Korean labels.
  - Icon-only controls require `aria-label`.
  - Icons used only for decoration are `aria-hidden`.
- Reduced motion and sensory considerations:
  - Navigation motion must be transform-first and restrained; opacity effects must not drive the home drill-down.
  - No decorative animation loops, flashing, or bounce/elastic effects.
  - Reduced motion removes slide choreography while preserving the selected panel and focus behavior.

## Responsive behavior
- Supported breakpoints/devices: Chrome extension side panel desktop width. Mobile layout is not a target.
- Layout adaptations:
  - Main design assumes roughly 320px-400px side-panel width.
  - Home navigation uses container-aware density rules for compressed widths instead of switching to a mobile drawer.
  - Fixed header/footer remain aligned to side-panel width; the central stage is the only vertical scroll owner for work screens, while home navigation panels own their own vertical wheel scroll.
  - Long Korean/English labels truncate or wrap without overlapping icons.
  - Home drill-down content does not stagger rows; narrow side-panel heights must stay usable without waiting on list choreography.
- Touch/hover differences:
  - Hover states may be subtle on pointer devices.
  - Click/press feedback uses light scale/compression only.
  - Coarse pointer surfaces keep practical 44px hit targets and cannot depend on hover-only disclosure.

## Interaction states
- Loading:
  - Keep loading state scoped to the active control or workflow surface.
  - Do not introduce global loading banners, decorative loading images, or circular spinner spectacle.
- Empty:
  - Do not fake business data. Empty states must reflect real absence.
  - PMS, laundry, OTA, and template surfaces use concise absence labels tied to the real missing context.
- Error:
  - Errors state the next required operational condition, such as WINGS page or customer record requirements.
  - Storage recovery, repeated setup failures, branch mismatch, missing WINGS page, and invalid workflow steps remain operator-visible.
- Success:
  - Success indicators appear only after real successful actions.
  - Copy completion is shown on the button/action that was used; it must not become a persistent shell banner.
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
  - The shared top header does not render active menu titles or stale workflow badges.

## Implementation constraints
- Framework/styling system:
  - Svelte side panel mounted from `src/ui/main.ts`.
  - `src/ui/App.svelte` remains an orchestrator.
  - Screen markup lives under `src/ui/components/*`.
  - Styling is centralized in `styles/sidepanel.css`.
- Design-token constraints:
  - Prefer existing CSS custom properties.
  - New panel motion durations, layer values, and responsive motion adjustments must reuse the shared CSS tokens and common contract.
  - Do not scatter fonts, colors, route IDs, PMS values, or operation codes inside components.
  - Route IDs, operation choices, source labels, customer numbers, endpoints, storage recovery copy, and workflow statuses must enter UI through catalog/application/config/platform owner modules.
  - Keep `--text-tracking-tight: 0`; negative letter spacing is not allowed by higher-level frontend rules.
- Performance constraints:
  - Keep navigation motion to transform so route changes do not animate layout or create horizontal page scroll.
  - Avoid layout-shifting hover states.
  - Added font files are bundled assets; note that `NotoSansKR-VariableFont_wght.ttf` is large and should be reviewed if extension size becomes a concern.
- Compatibility constraints:
  - Chrome extension side-panel context.
  - No dependency on removed legacy `src/sidepanel/*` DOM code.
  - No hidden direct `fetch`, `chrome.storage`, `navigator.clipboard`, or `window` dependencies inside UI components.
- Test/screenshot expectations:
  - Run `npm run verify` for typecheck, extension build, and tests.
  - Actual `chrome-extension://` visual automation may be blocked by browser policy; record that if it occurs.

## Open questions
- [ ] Confirm whether the large bundled `Noto Sans KR` variable font is acceptable for extension package size / owner: Product Owner / impact: bundle size and load cost.
