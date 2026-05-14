# Design System: UH Suite Side Panel Home & Customer Guidance

## 1. Visual Theme & Atmosphere

This design system is scoped only to the current program's home screen and the `고객 안내문` menu. It describes a compact Chrome extension side panel for UH Suite staff who repeatedly copy branch-scoped customer notices while working beside WINGS/PMS tabs.

The atmosphere is quiet, operational, and precise: a narrow staff console with warm monochrome surfaces, calm hierarchy, and no marketing theater. The home screen is the actual menu surface, not a landing page. The customer guidance screen is a fast copy workflow, not a document reader or template editor.

- **Density:** 7 / 10, Daily App Balanced leaning compact. Rows must be scannable without feeling crowded.
- **Variance:** 4 / 10, predictable with small offset rhythm. Asymmetry may come from priority cards and grouped lists, not decorative layout tricks.
- **Motion:** 4 / 10, restrained fluid CSS. Movement confirms state change and touch feedback only.

## 2. Color Palette & Roles

Use one warm neutral palette across both screens. Avoid cool-blue dashboard drift except for the single selected/focus accent.

- **Warm Canvas** (`#FBFBFA`) — Primary side panel background.
- **Paper Surface** (`#FFFFFF`) — Menu cards, guidance cards, sheets, and controls.
- **Soft Wash** (`#F4F5F4`) — Icon wells, hover surfaces, and quiet grouped background hints.
- **Pressed Wash** (`#ECEFED`) — Hover/pressed card state where a row needs stronger affordance.
- **Charcoal Ink** (`#15191D`) — Primary labels, active menu title, and high-emphasis copy.
- **Slate Text** (`#333D4B`) — Secondary strong text, branch controls, icons in active contexts.
- **Muted Stone** (`#747B84`) — Summaries, section labels, metadata, disabled-adjacent text.
- **Hairline Border** (`#E5E8EB`) — 1px structural dividers and neutral card borders.
- **Selected Blue** (`#4F7DD6`) — The only accent. Use only for focus rings, selected left inset, selected border, and active affordance.
- **Selected Blue Wash** (`#EEF4FF`) — Selected card fill only.

Rules:

- Never use pure black (`#000000`).
- No gradients, neon glows, decorative blobs, or saturated purple/blue atmospherics.
- Selected state receives the only color emphasis; default and hover states remain neutral.
- Error or blocked states may use restrained warm warning tones only when a real workflow guard is active.

## 3. Typography Rules

The interface is Korean-first and work-focused. Hierarchy comes from weight, spacing, and contrast, not oversized type.

- **Display / Section Labels:** `NanumSquareNeo`, `Segoe UI`, `Malgun Gothic`, sans-serif. Use 14px-17px, weight 700-900, line-height 1.15-1.25.
- **Body / Summaries:** `NanumSquareNeo`, `Segoe UI`, `Malgun Gothic`, sans-serif. Use 12px-14px, weight 500-700, line-height 1.3-1.45.
- **Numbers / Dates / Counts:** `JetBrains Mono`, `Consolas`, monospace only when the row becomes data-dense or when tabular alignment matters.
- **Maximum Copy Width:** Side-panel rows are width-constrained by the panel; summaries should ellipsize or wrap to at most two compact lines depending on the component.

Banned typography patterns:

- No large landing-page headlines.
- No generic serif fonts.
- No negative letter spacing.
- No visible feature explanations, tutorial paragraphs, or product marketing copy.
- No AI-style words such as "Elevate", "Seamless", "Unleash", or "Next-Gen".

## 4. Home Screen Components

The home screen is the first work surface. It renders catalog-owned menu groups and actions only.

### Shell Header

- Sticky top header with UH Suite logo, branch trigger, and date/context area.
- Height: 56px-60px.
- Background: `Paper Surface`; bottom border: `Hairline Border`.
- The branch trigger is text-first and compact, with a chevron icon from the shared local SVG component.
- No extra app slogan, hero headline, onboarding copy, or illustrated banner.

### Priority Menu Cards

- Use for primary customer communication actions such as `고객 안내문` and `빠른 답변`.
- Layout: icon well, text stack, chevron.
- Minimum height: 88px-96px.
- Radius: 8px-12px maximum.
- Border: `1px solid rgba(51,61,75,0.10)`.
- Background: `Paper Surface`.
- Shadow: functional and light, never floating-heavy.
- Hover: background changes to `Pressed Wash`, icon scales subtly, chevron translates 2px.
- Active: subtle scale feedback around `0.96`.

### Secondary Home Rows

- Use for `고객 서비스 관리`, `업무 관리`, and `설정` groups.
- Layout: 32px icon column, one-line label, chevron.
- Minimum height: 56px-58px.
- Gap between rows: 4px-8px.
- Section headings are quiet uppercase or compact Korean labels at 12px-15px.
- Do not merge multiple actions into a single parent card.

## 5. Customer Guidance Menu Components

The customer guidance menu is a copy workflow for actual catalog templates. It must not become a generic template editor, preview reader, or tutorial surface.

### Work Header

- The menu screen uses the shared compact topbar and work navigation row.
- Back action appears once in the lower navigation row and returns directly to home.
- Active menu title appears once with the catalog icon.
- Show language segmented control only when templates exist for the active menu.
- PMS/WINGS status appears only if the active template context requires it.

### Language Segmented Control

- Fully rounded pill container.
- Four compact options: `KR`, `EN`, `JP`, `CH`.
- Active segment uses `Paper Surface`, subtle border, and light shadow.
- Minimum tap target: 24px visual height inside a 40px surrounding control zone when possible.
- No dropdown for language in this menu.

### Template Group Sections

- Groups come from catalog-owned template family logic, not title heuristics.
- Each group starts with a compact section title and a light top divider after the first group.
- Group gap: 12px-14px.
- Do not add filter tabs such as `전체`, `안내문`, or `WINGS`.

### Customer Guidance Cards

- Cards are action rows.
- Layout: circular icon well, title/summary stack, copy icon button.
- Minimum height: 64px.
- Radius: 10px-12px.
- Padding: 10px-12px.
- Default background: `Paper Surface`.
- Default border: `Hairline Border`.
- Hover: `Pressed Wash`, slight `translateY(-1px)`, light shadow.
- Selected: `Selected Blue Wash`, selected border, and a 3px left inset in `Selected Blue`.
- Blocked: opacity reduction is allowed, but the copy button must remain clearly disabled.
- Copy action icon changes to check only after a real successful copy state.

Text rules:

- Title: 14px, weight 800-900, line-height 1.25.
- Summary: 12px, weight 500-600, muted color, line-height 1.3.
- No body preview inside this list.
- No placeholder guest names, fake rooms, fake branches, or demo summaries.

## 6. Layout Principles

- Design for a side panel width of roughly 320px-400px.
- Use CSS Grid for rows and stable columns.
- Main padding: 16px left, 16px right, with the existing right rail offset preserved.
- Vertical rhythm: 8px for tight row stacks, 12px-16px for screen sections, 36px-40px between major home groups.
- Cards and controls must keep stable dimensions on hover.
- No nested cards.
- No horizontal scroll at any width.
- Below 390px, multi-column controls collapse to one column.
- Long Korean or English text must truncate or wrap cleanly without overlapping icons or buttons.
- The persistent Rooms & Settings trigger remains outside this scope except where it affects bottom padding.

## 7. Motion & Interaction

Motion should feel responsive, not theatrical.

- Use only `opacity` and `transform` for animation.
- Standard timing: 150ms-180ms with `cubic-bezier(0.2, 0, 0, 1)`.
- Screen transition: fade in with 6px vertical lift.
- Sheet transition: translate from bottom with opacity.
- Button press: `scale(0.96)` or a 1px tactile compression.
- Hover: surface shade, icon color shift, subtle icon scale, or small chevron movement.
- Loading uses the shared loading image component or exact-dimension skeletons. No circular spinner spectacle.
- Respect reduced-motion preferences.

## 8. Accessibility & Operational Copy

- All icon-only buttons need `aria-label`.
- Status updates use the existing polite live region.
- Disabled actions must correspond to a real guard condition.
- Labels must be operational Korean, short, and direct.
- Error text must state the next required operational condition, not a long explanation.
- Text selection is disabled by default except template/content input areas and copy-relevant text surfaces.

## 9. Anti-Patterns (Banned)

- No landing page, hero section, onboarding screen, or marketing headline.
- No centered hero layout.
- No decorative background image, gradient, orb, blob, bokeh, or neon glow.
- No emojis.
- No pure black.
- No oversized rounded-full cards or pill containers except true segmented controls and small icon buttons.
- No 3-column equal feature-card layouts.
- No generic placeholder names such as "John Doe", "Acme", or fake guest/room data.
- No fake success, fake copy state, fake template, fake branch, or fallback business data.
- No body-preview-driven routing or title-text heuristics.
- No direct Chrome, clipboard, storage, fetch, or window dependencies hidden inside Svelte components.
- No duplicate legacy sidepanel behavior.
- No explanatory tutorial copy inside the app surface.
- No log panels, debug streams, or trace details in normal UI.

## 10. Stitch Generation Notes

When generating or revising only the home screen and `고객 안내문` menu:

- Treat `src/catalog/menu-routing.ts` as the source of menu names, groups, icons, and order.
- Treat `src/catalog/template-groups.ts` and the active catalog templates as the source of customer guidance grouping.
- Keep `src/ui/App.svelte` as an orchestrator only.
- Put screen markup in `src/ui/components/HomeView.svelte` and `src/ui/components/CustomerGuidancePanel.svelte`.
- Keep shared Chrome, clipboard, storage, fetch, and window dependencies flowing through `src/ui/side-panel-dependencies.ts`.
- Preserve the shared local SVG icon component rather than creating per-screen custom icons.
- Build the actual operational screen first; do not generate a concept page.
