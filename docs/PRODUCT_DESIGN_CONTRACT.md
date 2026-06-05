# Product Design Contract

Status: current build reference. Use this before changing UI surfaces.

This document consolidates the Product Design brief for the UH Suite Chrome side
panel. It is grounded in:

- `C:\Users\anise\Downloads\구조.md`
- `C:\Users\anise\Downloads\sidepanel_submenu_uiux_reference.md`
- `C:\Users\anise\Desktop\UI Reference\*.png`
- `docs/product-surface-inventory.md`
- `docs/UI_SURFACE_STABILITY_CONTRACT.md`
- `src/catalog/menu-routing.ts`

## Product Design Brief

Build a compact, fully interactive Chrome MV3 Svelte side panel for UH Suite
staff. The product has 16 product surfaces: one home surface plus the 15 leaf
surfaces listed in `구조.md`. The bottom PMS panels and bottom-bar settings
utility are verification/operation surfaces, but they are not extra product
image targets.

The visual language is minimal operational UI: warm white surfaces, charcoal
text, quiet grey dividers, 8px-or-less framed cards only for actual work
panels, catalog-owned link rows for navigation, stable logo/date header, fixed
footer, and screen transitions using only transform and opacity.

## Reference Interpretation

The UI Reference images provide visual grammar, not permission to add fake
business data. Extract these reusable points:

| Reference | Apply | Reject |
| --- | --- | --- |
| `세탁물 관리 screen.png` | in-progress columns, add row, scheduled list, completed disclosure | sample rooms as product data |
| `매지출관리 screen.png` | amount hierarchy, category chips, detail field, strong action placement | `Save Record`, recent expense ledger, fake expense rows |
| `공항밴 관리 screen.png` | pickup/sending segment, route card, date/time/flight/payment fields, bottom copy action | browser automation or fake booking data |
| `객실 리마크 관리 screen.png` | room-centered composition, inventory controls, additional remarks area, black WINGS action | fake `Room 402`, `Towels`, `Water`, `Bedding` business model |
| `OTA 예약관리 screen.png` | source segment, extraction card, preview card, WINGS action dock | sample reservation rows as product success |
| `업무보고 설정 screen.png` | accordion template-editing density, smart variable chips, editable layout area | generic mock template content as authority |
| `탬플릿 설정 세팅 screen.png` | template selection, language/scope controls, title/body editing, active template list | unrelated marketing text or unsourced languages |

## Surface Contracts

Shell ownership, protected home rhythm, and adaptive-layout change gates are
defined in `docs/UI_SURFACE_STABILITY_CONTRACT.md`. Do not change protected
header/footer/home structure from a local CSS or test patch alone.

### Home And Submenus

- Home shows exactly five root rows: `고객 안내문`, `빠른 문의 답변`, `고객 서비스 관리`, `업무 관리`, `템플릿 / 양식 편집`.
- `고객 안내문` has four leaf rows.
- `빠른 문의 답변` has three leaf rows.
- `고객 서비스 관리` has exactly `세탁물 관리`, `매지출 관리`, `공항밴 관리`, all visible before scroll.
- `업무 관리` has exactly `객실 정보 리마크`, `NAVER / STATION 예약입력`, `업무보고 양식`, all visible before scroll.
- `템플릿 / 양식 편집` has exactly `안내문 편집 / 빠른답변 편집`, `업무 양식 편집`, both visible before scroll.
- Submenus are link rows, not cards. The footer must not overlap them in normal,
  fullscreen, or tab-switch/reopen Chrome side-panel states.

### Customer Guidance And Quick Replies

- These are copy workflows, not editor views.
- Rows come from the catalog and renderer.
- Copy feedback stays on the clicked button only.
- No body preview or explanation card is required unless a real workflow owner
  provides it.

### Laundry Management

- Uses storage-backed laundry records only.
- Empty states use `없음`.
- User action evidence must include create, move, or remove through
  `src/application/laundry-records.ts` and `src/laundry/*`.
- Do not render sample rooms or placeholder task cards.

### Sales Management

- Current backend boundary is template value plus clipboard output, not a
  storage-backed expense ledger.
- The UI may use the reference's amount/category/detail visual hierarchy, but
  the action is `매지출 보고 복사`.
- Category chips must be visible before the footer: `소모품`, `수리`, `식음료`,
  `기타`.
- Do not add `Save Record`, recent expense rows, edit/delete ledger actions, or
  fake vendor/amount data unless a new expense storage owner contract is added.

### Airport Van Management

- Form values persist through extension state.
- The only final actions are `업무 기록 복사` and `고객 전달 복사`.
- No browser automation, WINGS save, or fake booking records.

### Room Remark

- The surface is WINGS remark upsert, not OTA reservation fill.
- The business model is card keys, rentals, medical bloom, and stone house,
  backed by `src/domain/remarks.ts` and `src/application/wings-remark.ts`.
- A selected PMS room may be shown only inside this workflow context.
- Missing WINGS room information window remains a WINGS dependency failure. Do
  not convert it to success.

### OTA Reservation Input

- Uses active Naver/Station tab extraction and WINGS field fill only.
- The user reviews and saves in WINGS.
- Preview rows must come from actual extracted payload fields.

### Work Report Form

- Uses template owner render plus clipboard boundary.
- Nonempty clipboard text alone is not proof; copied text must include the
  selected template owner title or rendered body signature.

### Template And Form Editors

- `안내문 편집 / 빠른답변 편집` edits template overrides through schema-mediated
  storage.
- `업무 양식 편집` edits manual variable values through the storage owner.
- Bottom-bar `설정` remains a utility surface with links to these editor product
  surfaces; it must not duplicate or replace them.

## Feedback Policy

- Non-OTA/WINGS success and generic storage feedback must not appear as shell
  status text.
- Copy feedback is local to the action button.
- WINGS, OTA, and PMS dependency failures may use concise operator text.
- Hidden structured failure evidence may exist for tests and diagnostics, but it
  must not become normal UI copy.

## Verification Implications

- A surface is not covered by label presence alone.
- Owner interaction evidence is required for leaf surfaces.
- `expected.png` files are reference contracts only after they are intentional
  tracked artifacts; untracked images are not completion evidence.
- Actual closeout requires the user-controlled actual Chrome side-panel surface,
  not an extension URL tab alone.
