# 공항밴 관리

- surfaceId: `airport-van-management`
- menuPath: 홈 > 고객 서비스 관리 > 공항밴 관리
- expected image: `docs/product-surface-targets/airport-van-management/expected.png` (repo-boundary expected image contract)
- status policy: Airport-van form feedback is local control state only; no general shell status text.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: stored form and clipboard boundary
- smoke access: 고객 서비스 관리 > 공항밴 관리
