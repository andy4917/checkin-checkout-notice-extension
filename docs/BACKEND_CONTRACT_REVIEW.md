# Backend Contract Review

Status: current review baseline before product implementation.

This review uses the `code-review-and-quality` axes: correctness, architecture,
security, and verification strength. It is not a success claim.

## PMS Contract

Expected behavior:

- PMS lookup is a direct host-permission POST from the extension side panel.
- It does not require a WINGS login workflow.
- It uses selected branch and date filters through PMS owner modules.
- Backend-connected success requires network-observed JSON `rows` correlated to
  the PMS surface that requested them.

Current owner path:

- `src/pms/client.ts`
- `src/pms/filter-builder.ts`
- `src/application/sync-guests.ts`
- `src/ui/side-panel-navigation-dependencies.ts`
- `src/background/side-panel-policy.ts`
- `scripts/diagnose-pms-backend.ts`
- `scripts/extension-smoke-release-gate.ts`

Current evidence:

- `src/pms/client.ts` builds a POST to
  `https://pms.sanhait.com/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do`
  through `buildPmsSearchParams()`.
- It uses `credentials: "include"` through the injected fetch dependency.
- It rejects non-JSON content type and requires `rows` to be an array.
- `src/ui/side-panel-navigation-dependencies.ts` injects global fetch as
  `fetchPmsWithHostPermissions`; it does not fetch through WINGS.
- `src/background/side-panel-policy.ts` enables the side panel for PMS-origin
  tabs, matching the original boundary that made the side panel available from
  PMS without adding a WINGS-login step.

Current failure evidence:

- Recent diagnostic evidence in `docs/verification-report.md` records PMS
  responses as SAML HTML with `jsonRowsObserved=false`.
- SAML HTML, empty DOM rows, PMS failure copy, or a WINGS SSO message are not
  PMS backend success.
- A fake record or DOM row without correlated JSON `rows` is a false pass.

Review findings:

- Correctness: direct POST boundary is aligned with the original premise, but
  live JSON `rows` are not yet proven.
- Architecture: request construction remains in PMS modules; UI must not own
  endpoint paths, field names, branch PMS codes, or SSO assumptions.
- Security: do not log cookies, tokens, SAML payloads, or full response bodies.
  Diagnostic reports may record status, content type, row counts, and body
  classification only.
- Verification: release success must require all required PMS surfaces to have
  correlated JSON row evidence. Failure/empty states are useful evidence but not
  success.

Implementation rule:

Do not add a WINGS-login prerequisite, fake PMS rows, synthetic records, retry
loops, or a success fallback. If PMS returns SAML HTML, leave it as a PMS
backend failure and report the exact evidence.

## OTA And WINGS Contract

- OTA extraction uses active authenticated Naver/Station tabs.
- WINGS reservation input fills available fields only; the user saves manually.
- WINGS remark upsert is separate from reservation input fill.
- Room remark uses `src/application/wings-remark.ts` and
  `src/domain/remarks.ts`, not OTA reservation fill logic.

## Storage And Clipboard Contract

- Laundry records are stored through the laundry owner modules.
- Airport van and sales form values use extension state through the controller
  and storage schema.
- Template/editor changes go through template/storage schema validation.
- Clipboard success is local action evidence; it is not a shell-level success
  message.
- Storage write failures must be structured evidence. Non-OTA/WINGS shell
  success/error text is prohibited unless the contract explicitly allows it.

## Review Gate For Future Backend Changes

Before claiming backend work is ready, provide:

1. The changed owner modules.
2. The request/response contract being asserted.
3. A failing-path proof that does not become success.
4. A connected-success proof when success is claimed.
5. Evidence that UI components did not receive backend constants or fake data.
