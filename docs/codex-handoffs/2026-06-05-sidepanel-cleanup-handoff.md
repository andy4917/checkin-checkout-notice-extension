# 2026-06-05 Sidepanel Cleanup Handoff

Reactivation prompt:

```text
We are continuing from docs/codex-handoffs/2026-06-05-sidepanel-cleanup-handoff.md.
Read this handoff first, inspect the current repo state, and continue from the
listed next steps without assuming old chat context is available.
Do not claim completion unless actual user-controlled Chrome side panel evidence
and backend evidence match the documented contracts.
```

## Repo And Branch

- Repo: `C:\Users\anise\code\Dev-Product\입실퇴실 안내문 생성기`
- Branch: `codex/home-submenu-icons-overflow`
- Upstream status before cleanup commit: `origin/codex/home-submenu-icons-overflow`,
  ahead `0`, behind `0`

## Current Goal

Clean up the accumulated worktree, split the work into reviewable stages, keep
structure/shape/state/design contracts in docs, and commit/push the current
validated state without turning missing Chrome/PMS evidence into a false
completion claim.

## Completed In This Cleanup Slice

- Added `docs/UI_SURFACE_STABILITY_CONTRACT.md` to protect shell ownership,
  home footer ownership, visual rhythm, adaptive-layout scope, and change gates.
- Linked the stability contract from product design, test, and frontend
  directive docs.
- Restored home footer ownership to `HomeView.svelte` and removed direct footer
  rendering from `SidePanelView.svelte`.
- Scoped adaptive height compression to specific work surfaces instead of
  globally shrinking protected home typography and spacing.
- Classified 16 `docs/product-surface-targets/*/expected.png` files as product
  image contracts, not disposable screenshots. They must be tracked for
  `product-surface-contract.test.ts` to pass.
- Ran `keep-codex-fast` in report-only mode. It created a backup at
  `C:\Users\anise\Documents\Codex\codex-backups\keep-codex-fast-20260605-151423`.

## Files And Areas Touched

- Product contracts and docs:
  - `docs/PRODUCT_DESIGN_CONTRACT.md`
  - `docs/BACKEND_CONTRACT_REVIEW.md`
  - `docs/UI_SURFACE_STABILITY_CONTRACT.md`
  - `docs/TEST_CONTRACT.md`
  - `docs/FRONTEND_CONNECTION_DESIGN_DIRECTIVE.md`
  - `docs/product-surface-inventory.md`
  - `docs/product-surface-targets/*`
- Frontend and catalog:
  - `src/catalog/menu-routing.ts`
  - `src/ui/components/HomeView.svelte`
  - `src/ui/components/ScreenStage.svelte`
  - `src/ui/components/SidePanelView.svelte`
  - `src/ui/components/WorkSurface.svelte`
  - `src/ui/components/RoomRemarkSurface.svelte`
  - `styles/sidepanel.css`
- Backend and integration boundaries:
  - `src/pms/client.ts`
  - `src/pms/filter-builder.ts`
  - `src/config/pms-filter-schema.ts`
  - `src/background/index.ts`
  - `src/background/side-panel-policy.ts`
  - `src/ui/side-panel-navigation-dependencies.ts`
  - `scripts/diagnose-pms-backend.ts`
- Tests and smoke scripts:
  - `tests/product-surface-contract.test.ts`
  - `tests/repo-boundary.test.ts`
  - `tests/extension-smoke-contract.test.ts`
  - `tests/application-domain.test.ts`
  - `tests/integration-state.test.ts`
  - `scripts/check-extension-sidepanel-smoke.ts`
  - `scripts/extension-smoke-release-gate.ts`

## Validation Already Run

- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run check:sidepanel-scale`: PASS
- `npx tsx --test tests/repo-boundary.test.ts`: PASS
- `npx tsx --test tests/product-surface-contract.test.ts tests/repo-boundary.test.ts`:
  PASS after staging/tracking the 16 `expected.png` image contracts.
- `npm test`: PASS, 46/46.
- `npm run check:extension-smoke`: FAIL after the short viewport guard was
  corrected to respect `HomeView` footer ownership. Current smoke failure is no
  longer the stale `screenStageRect.bottom <= footerRect.top` assertion. It now
  reports missing owner evidence for several leaf surfaces, PMS SAML HTML
  instead of JSON rows, and missing actual user Chrome side-panel proof.
  Evidence path:
  `C:\Users\anise\AppData\Local\Temp\checkin-checkout-extension-smoke-2026-06-05T06-22-34-666Z-11540\extension-smoke-result.json`.
- `keep-codex-fast` report-only:
  - active sessions: `1.616GB`
  - archived sessions: `0.130GB`
  - logs: `754MB`
  - stale worktree candidates: `0`
  - config prune candidates: `0`
  - extended path refs: `179`

## Known Failures And Gaps

- Actual user-controlled Chrome side panel proof is still missing. Chrome
  control failed with `Transport closed`.
- PMS/backend live row success remains unverified. Do not treat a WINGS SSO,
  SAML, HTML, empty, or failure response as backend success.
- `npm run check:extension-smoke` is intentionally still red because the actual
  Chrome side panel, several leaf owner-evidence paths, and PMS success path are
  still unresolved.
- Codex local-state cleanup was report-only. Mutating cleanup should wait until
  Codex is closed or be run with `--wait-for-codex-exit` after this handoff is
  committed.

## Commit Split Used For This Cleanup

1. Product contract/docs and tracked image contracts.
2. Frontend/backend/test implementation changes.
3. Handoff and verification-state documentation.

## Do Not Touch Without New Evidence

- Do not restore legacy `src/sidepanel/*` as a product surface.
- Do not make PMS appear successful with fake rows, fixture rows, HTML/SAML
  responses, or hidden fallback.
- Do not globally shrink home root/header/footer typography or spacing to solve
  one work-surface height problem.
- Do not move home footer ownership back into `SidePanelView.svelte`.
- Do not claim actual Chrome completion from a tab viewport or isolated
  Chromium smoke run.

## Next Steps

1. Track the 16 `expected.png` files and rerun product-surface contract tests.
2. Run `npm test`, `npm run typecheck`, `npm run build`, and
   `npm run check:sidepanel-scale` after staging the final file set.
3. Reattempt actual user Chrome side panel capture after Chrome control
   connectivity is available.
4. Run PMS diagnostic with real host-permission fetch and keep the result as
   failure evidence unless JSON `rows` are observed.
5. If Codex performance cleanup is still needed, close Codex or run the
   keep-codex-fast script with `--wait-for-codex-exit`; do not mutate live
   session DBs while Codex is active.
