# 홈

- surfaceId: `home`
- menuPath: 홈
- expected image: `docs/product-surface-targets/home/expected.png` (repo-boundary expected image contract)
- status policy: No general save/copy/laundry/template/airport-van/room-select status text.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: catalog navigation only
- smoke access: open side panel
