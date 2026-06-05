# 객실 방문 예정

- surfaceId: `quick-room-visit-reply`
- menuPath: 홈 > 빠른 문의 답변 > 객실 방문 예정
- expected image: `docs/product-surface-targets/quick-room-visit-reply/expected.png` (repo-boundary expected image contract)
- status policy: Quick reply copy feedback stays on the button state only.
- hidden surface policy: Quick reply leaves are 16-surface product surfaces. Missing templates must produce an owner-defined empty state and must not remove the catalog row in HomeView.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: template render and clipboard boundary
- smoke access: 빠른 문의 답변 > 객실 방문 예정
