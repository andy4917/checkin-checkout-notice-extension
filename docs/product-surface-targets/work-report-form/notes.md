# 업무보고 양식

- surfaceId: `work-report-form`
- menuPath: 홈 > 업무 관리 > 업무보고 양식
- expected image: `docs/product-surface-targets/work-report-form/expected.png` (repo-boundary expected image contract)
- status policy: Work-report clipboard feedback stays on control state only.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: template render and clipboard boundary
- smoke access: 업무 관리 > 업무보고 양식
