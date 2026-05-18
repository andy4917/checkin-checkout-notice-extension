# Panel Motion And Responsive Contract

## Status

- Status: Active common UI contract
- Last refreshed: 2026-05-15
- Source basis: user-provided `UI_MOTION_META_DESIGN_PLAN_v2.md`, `DESIGN.md`, `PRODUCT.md`, `styles/sidepanel.css`, `src/ui/components/HomeView.svelte`
- Reference boundary: Framer Sidebar Navigation is used for motion and responsive interaction quality only, not for product content, mobile navigation, full-screen drawer behavior, backdrop treatment, or typography scale.

## Purpose

This document defines the reusable motion, responsive, and interaction rules for compact Chrome extension panel UI. It is a common implementation contract, not product content, menu inventory, or business workflow authority.

## Ownership

- Product content and menu structure: `src/catalog/*`
- Screen markup: `src/ui/components/*`
- Shared visual and motion tokens: `styles/sidepanel.css`
- Browser, storage, clipboard, tab, and fetch dependencies: `src/ui/side-panel-dependencies.ts`
- Product design contract: `DESIGN.md`

## Stable Shell Rule

The shell stays stable. Only the central motion viewport changes during nested navigation.

Stable regions include:

- top header and branch/date context
- bottom work navigation
- persistent room/settings launcher
- status surfaces outside the changing viewport

The motion viewport must clip panel transitions and must not move header or footer controls.

## Direction Contract

Panel navigation uses explicit intent:

- `forward`: child or deeper view enters from the right
- `backward`: previous view returns from the left
- `replace`: same-level change crossfades without implying hierarchy

Do not infer direction from labels, visual order, or catalog text.

## CSS Token Contract

Shared panel motion tokens live in `styles/sidepanel.css`:

- `--motion-panel-duration`
- `--motion-panel-duration-compact`
- `--motion-fade-duration`
- `--motion-hover-duration`
- `--motion-reveal-duration`
- `--motion-press-duration`
- `--motion-standard`
- `--motion-layer-current`
- `--motion-layer-entering`
- `--motion-layer-overlay`

Ordinary UI components should reuse these tokens instead of embedding new duration or easing values.

## Motion Rules

- Use `transform` and `opacity` for primary transitions.
- Keep panel transitions below 300ms.
- Keep hover and press feedback local to the row, button, icon, or chevron.
- Hover may use a 1px accent-line reveal and a 1px transform shift when it improves perceived responsiveness without changing layout.
- Nested view entry may use a short content reveal after the panel movement starts, capped by the shared reveal token.
- Do not animate width, height, top, left, margins, or padding for primary navigation.
- Do not add idle animation, bounce-heavy spring, glow, flashing, or decorative movement.
- Hidden or offscreen panels must not receive pointer or keyboard interaction.

## Responsive Rules

Responsiveness is panel/container based, not only viewport based.

Density changes may adjust:

- spacing
- row height
- icon column width
- label truncation
- secondary metadata visibility
- compact transition duration

Density changes must not change:

- navigation state model
- forward/backward direction semantics
- shell stability
- required actions
- accessibility labels

Mobile navigation is not a target for this product surface. The side panel must not switch to a hamburger menu, mobile drawer, full-screen overlay, or bottom-sheet navigation solely because width is narrow.

## Height And Scroll Rules

- Header and footer remain fixed or persistent.
- The central panel region owns its own scroll when content is long.
- Scrollbars must not create horizontal layout shift.
- Long content must not push the bottom action area off screen.
- Primary navigation must not animate scroll height.

## Input And Interaction Rules

Every shared interactive row or compact action must define:

- default
- hover
- focus-visible
- pressed
- selected or current, when applicable
- disabled
- loading or pending, when applicable
- error or failed, when applicable
- success or completed, when applicable

Coarse pointer surfaces keep at least 44px practical hit targets and must not require hover to reveal essential behavior.

## Keyboard And Focus Rules

- Enter and Space activate focused button controls through native button behavior.
- Escape returns one nested level when a nested panel is active.
- Forward navigation moves focus to the child view's meaningful starting control.
- Back navigation restores focus to the trigger that opened the child view.
- Focus-visible styling must remain static and visible. Motion cannot be the only focus indicator.
- Offscreen panels must be removed from the tab path.

## Reduced Motion Rules

When `prefers-reduced-motion: reduce` is active:

- remove slide choreography and staggered movement
- keep state changes immediate or nearly immediate
- preserve the selected view and focus behavior
- keep hover, focus, selected, disabled, and error states visible

Reduced motion reduces movement only. It must not reduce clarity.

## Overlay Rules

Anchored overlays, popovers, and sheets are separate from panel navigation.

- Define the anchor and close behavior.
- Allow overlays to sit above the motion viewport when needed.
- Do not let overlays move with unrelated panel transitions.
- Return focus to the trigger when the overlay closes.
- Keep overlay motion shorter than panel navigation.

## Validation Checklist

- Forward navigation enters from the right.
- Backward navigation returns from the left.
- Replace changes do not imply hierarchy.
- Header and footer remain stable.
- The motion viewport clips overflow.
- Hidden panels cannot receive focus.
- Escape returns one nested level.
- Focus returns to the opening row after back navigation.
- Narrow widths preserve the same navigation model.
- Labels truncate without horizontal scroll.
- Coarse pointer hit targets remain usable.
- Reduced motion removes slide choreography without breaking state.
- Primary transition uses transform and opacity, not layout properties.
- Motion values come from shared tokens.
