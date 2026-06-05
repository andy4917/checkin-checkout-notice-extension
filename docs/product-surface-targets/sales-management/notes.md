# 매지출 관리

- surfaceId: `sales-management`
- menuPath: 홈 > 고객 서비스 관리 > 매지출 관리
- expected image: `docs/product-surface-targets/sales-management/expected.png` (repo-boundary expected image contract)
- status policy: Sales copy/storage feedback stays off shell status unless an OTA/WINGS dependency is involved.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: template value and clipboard boundary
- smoke access: 고객 서비스 관리 > 매지출 관리
