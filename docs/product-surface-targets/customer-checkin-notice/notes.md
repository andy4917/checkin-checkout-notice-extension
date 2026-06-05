# 체크인 안내문

- surfaceId: `customer-checkin-notice`
- menuPath: 홈 > 고객 안내문 > 체크인 안내문
- expected image: `docs/product-surface-targets/customer-checkin-notice/expected.png` (repo-boundary expected image contract)
- status policy: Customer guidance copy feedback stays on the button state only.
- hidden surface policy: Customer guidance leaves are 16-surface product surfaces. Missing templates must produce an owner-defined empty state and must not remove the catalog row in HomeView.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: template render and clipboard boundary
- smoke access: 고객 안내문 > 체크인 안내문
