# Product Context: UH Suite Notice Side Panel

## Register

product

## Users

UH Suite front-desk and operations staff use this Chrome extension side panel while working beside WINGS/PMS and OTA browser tabs.

## Product Purpose

The product helps staff choose branch-scoped customer notices, quick replies, room/service work templates, and operational actions from a compact side panel without leaving their active browser workflow.

## Operating Principles

- The first screen is the actual work menu, not a landing page.
- Staff should see the branch, date, task groups, and fixed bottom work shortcuts immediately.
- Menu structure is catalog-owned and data-driven; Svelte components render the schema but do not own business labels, route IDs, PMS codes, endpoint paths, or fake data.
- Navigation from the home screen uses nested drill-down panels, not accordions.
- Header and footer controls remain stable while only the central navigation viewport transitions.
- Customer-facing template and copy workflows must fail visibly when required data or browser context is missing.

## Tone

Quiet, operational, compact, and Korean-first. The interface should feel like a precise staff console rather than marketing software.

## Anti-References

- No landing-page hero, onboarding copy, tutorial text, decorative imagery, gradients, neon effects, or placeholder business data.
- No fake success state, fake branch, fake room, fake guest, or demo template.
- No legacy DOM side panel behavior under `src/sidepanel`.
