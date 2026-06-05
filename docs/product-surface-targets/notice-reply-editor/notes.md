# 안내문 편집 / 빠른답변 편집

- surfaceId: `notice-reply-editor`
- menuPath: 홈 > 템플릿 / 양식 편집 > 안내문 편집 / 빠른답변 편집
- expected image: `docs/product-surface-targets/notice-reply-editor/expected.png` (repo-boundary expected image contract)
- status policy: Template save/reset feedback must not use shell status text.
- hidden surface policy: Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.
- vertical anchoring: Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.; tolerance 2px.
- backend boundary: template override storage
- smoke access: 템플릿 / 양식 편집 > 안내문 편집 / 빠른답변 편집
