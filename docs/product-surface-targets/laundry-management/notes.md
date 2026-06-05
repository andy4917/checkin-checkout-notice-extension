# 세탁물 관리

- surfaceId: `laundry-management`
- menuPath: 홈 > 고객 서비스 관리 > 세탁물 관리
- expected image: `docs/product-surface-targets/laundry-management/expected.png` (repo-boundary expected image contract)
- status policy: Laundry owner state changes are visible in board state only; no general status text.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: chrome.storage laundry state
- smoke access: 고객 서비스 관리 > 세탁물 관리
