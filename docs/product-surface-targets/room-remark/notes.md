# 객실 정보 리마크

- surfaceId: `room-remark`
- menuPath: 홈 > 업무 관리 > 객실 정보 리마크
- expected image: `docs/product-surface-targets/room-remark/expected.png` (repo-boundary expected image contract)
- status policy: Only WINGS dependency notices are allowed for this surface.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: active WINGS remark read/upsert/write
- smoke access: 업무 관리 > 객실 정보 리마크
