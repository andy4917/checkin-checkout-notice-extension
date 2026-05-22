# Framer Sidebar Interaction Grammar

## Status

- Status: Active reference mapping
- Last refreshed: 2026-05-17
- Source: user-provided Framer sidebar reference application plan
- Boundary: This document preserves state, motion, hover, responsive, and emphasis grammar only. It is not permission to clone the Framer visual style, import Framer runtime code, or add marketing sidebar content.

## What To Carry Forward

- Named navigation intent: use `forward`, `backward`, and `replace` states instead of inferring direction from labels or DOM order.
- Stable shell: header, status, and bottom controls stay outside the central route slide area.
- Route transition: central content moves with clipped transform motion and never creates horizontal page scroll.
- Navigation hierarchy: primary home items and submenu rows remain stable during route motion; no per-item stagger is used in the home drill-down.
- Hover grammar: main navigation uses text underline expansion only. It does not use background fill, scale, color flash, or chevron movement.
- Emphasis grammar: selected state remains calmer than hover, and action emphasis must not depend on fake product data.
- Responsive grammar: compact widths reduce spacing, icon columns, row height, and transition duration without changing the navigation model.
- Reduced motion: slide and stagger choreography collapse to near-instant state changes while focus, selected, disabled, and error states remain visible.

## What Not To Carry Forward

- No Framer, React, Framer Motion, or remote `framerusercontent.com` dependency.
- No dark translucent marketing drawer as the main panel canvas.
- No social, legal, copyright, or fixed five-link navigation clone.
- No component-owned business labels, route IDs, branch IDs, PMS/OTA codes, fake data, or success placeholders.
- No layout animation of width, height, margins, or padding for route changes.

## Current Implementation Mapping

| Reference grammar | Local owner | Rule |
| --- | --- | --- |
| Navigation entry state | `src/ui/side-panel-navigation-controller.svelte.ts` | Keep the active frontend limited to branch context and home drill-down state. |
| Home drill-down rows | `src/ui/components/HomeView.svelte`, `styles/sidepanel.css` | Keep rows stable, evenly spaced, and unstaggered while the panel slides. |
| Hover and emphasis | `HomeView.svelte`, `styles/sidepanel.css` | Labels use underline expansion; chevrons and icons stay optically stable. |

## Verification Expectations

- Run `npm run verify` after implementation changes.
- Confirm typecheck/build/test pass from the Svelte side-panel entrypoint.
- Manually inspect forward/back route direction, hover/focus affordance, sheet z-index, reduced motion behavior, and absence of horizontal scroll when practical.
- If Chrome extension visual automation is blocked, report the exact blocker and use build/typecheck plus code-level evidence as the closest direct check.
