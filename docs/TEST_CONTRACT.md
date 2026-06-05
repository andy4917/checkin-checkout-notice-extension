# Test Contract

이 프로젝트의 테스트는 점수나 파일 수를 늘리기 위한 장치가 아니라, Chrome 확장 제품 계약을 깨뜨렸을 때 바로 실패해야 하는 안전망입니다.

## 테스트로 증명할 것

- Svelte side panel entry가 실제 빌드에 포함되고 legacy DOM sidepanel 경로에 의존하지 않는다.
- manifest는 MV3, 고정 extension ID, `minimum_chrome_version = 120`, static host permission, module service worker, Svelte side panel entry를 유지해야 한다.
- 지점 선택은 명시적이어야 하며, 잘못된 저장 지점은 조용히 다른 지점으로 바뀌지 않는다.
- 지점 선택은 로고 trigger가 여는 명시적 sheet/popup이어야 하며, 과거의 다음 지점 순환 버튼이나 dropdown strip으로 되돌아가면 실패해야 한다.
- PMS 요청은 선택 지점의 WINGS 코드와 날짜 필터를 정확히 전송한다.
- PMS 목록 표면은 조회 중, 실패, 빈 결과, 실제 record 상태를 구분한다. 조회 중에는 `PMS 조회 중`을 표시하고, 실패 시 운영 메시지와 `PMS 연결 확인 필요` 상태를 표시해야 한다.
- PMS record UI는 실제 PMS 필드만 렌더한다. `N/A` 같은 컴포넌트-local fake value나 fallback label을 만들면 실패해야 한다.
- OTA 예약 입력은 실제 감지된 Naver/Station payload에서 WINGS 입력 필드만 만들고 저장/확정 동작을 만들지 않는다.
- WINGS 예약생성창 없음, OTA 지점 불일치, 저장소 손상, PMS 응답 오류는 짧은 운영 메시지로 실패한다.
- 템플릿 렌더링은 catalog metadata, branchScope, language body, required variable policy를 통과해야 한다.
- 고객 안내문/빠른 문의 답변의 아코디언 그룹은 사용자가 직접 접기 전까지 열린 상태를 유지하며, 하나만 열리는 제한을 두지 않는다.
- 복사 성공은 누른 버튼의 상태로만 보이고, 화면 이동 후에도 남는 전역 `복사되었습니다.` 배너를 만들지 않는다.
- 상단 공용 헤더는 오래된 활성 메뉴명, WINGS 배지, 업무 상태 suffix를 표시하지 않는다.
- 홈 상세 패널에서 지점 선택이 잠겨도 로고는 전역 disabled opacity를 상속해 회색으로 흐려지면 안 된다.
- 홈 상세 패널 전환은 shared `--sidepanel-motion-*` 토큰으로 forward slide를 사용하고, work/PMS surface는 `data-view-motion`에 맞는 direction animation을 사용해야 한다.
- 언어 선택바는 고객 안내문/빠른 문의 답변 템플릿 화면과 현재 work menu 게이트가 허용한 화면에만 나타난다.
- 홈 상세 패널이 숨겨져 있을 때 언어/복사/하위 메뉴 컨트롤은 탭 순서에서 빠져야 한다.
- 하단 navigation은 실제 Google Chrome 고DPI/확대 상태에서도 아이콘과 라벨이 모두 보여야 한다. MaterialIcon span과 label span을 같은 clipping 규칙으로 처리하면 실패해야 한다.
- work/settings/PMS header의 날짜는 실제 Chrome page edge에서 잘리면 실패해야 한다.
- 설정 import/export/reset은 storage schema와 template schema를 통과한 값만 저장한다.
- 설정 bottom action은 빈 placeholder 화면이 아니라 catalog-owned utility surface를 열고, 운영 경계 row와 기존 제품 표면으로 가는 편집 바로가기 row를 분리해 렌더한다.
- 세탁 기록은 extension storage의 실제 record 상태 변화로 검증한다.
- 화면에 별도 플로팅 런처를 추가하지 않는다. 설정과 업무 실행은 현재 홈/업무 내비게이션 계약 안에서만 노출한다.
- 구현 전 디자인 결정은 `docs/PRODUCT_DESIGN_CONTRACT.md`를 기준으로 하고,
  shell/home/footer 구조와 adaptive layout 변경 여부는
  `docs/UI_SURFACE_STABILITY_CONTRACT.md`를 기준으로 확인한다.
- PMS/OTA/WINGS/storage/clipboard backend 결정은
  `docs/BACKEND_CONTRACT_REVIEW.md`를 기준으로 리뷰한다.

## 테스트로 증명하지 않을 것

- 단순히 파일이나 배열 항목이 존재한다는 사실만 확인하는 테스트.
- 옛 런타임 계층을 유지하기 위한 호환성 테스트.
- UI에 없는 데모 데이터, 예시 고객, 임의 객실, 임의 예약 기록.
- 구현 세부 줄 수, 함수명, 스타일 클래스처럼 제품 계약과 직접 연결되지 않는 내용.
- 성공 경로만 있고 실패 경로가 없는 얕은 테스트.

## 현재 테스트 묶음

기존 `current-*` 테스트 파일은 폐기했다. 현재 테스트는 제품 계약과
owner/application/domain 동작만 보호한다.

- `product-surface-contract.test.ts`: `docs/product-surface-targets/*/contract.json`과 `target.svg`를 읽고 모든 surface target, catalog-backed route, smoke coverage를 검증한다.
- `repo-boundary.test.ts`: MV3 manifest, minimum Chrome runtime, Svelte side panel entry, App skeleton, legacy sidepanel 제거, placeholder attribute 금지, logo/motion/scroll CSS contract를 검증한다.
- `application-domain.test.ts`: PMS, OTA/WINGS, storage schema, template rendering, laundry, sales, airport van owner 함수의 성공/실패 contract를 검증한다.
- `integration-state.test.ts`: UI action이 controller/application/storage/backend boundary를 호출하고 visible state로 이어지는지 검증한다.
- `extension-smoke-contract.test.ts`: actual Chrome profile path 확인, runtime/console error 수집, placeholder/overflow/logo/motion/surface coverage가 smoke에 들어있는지 검증한다.

## Surface Target Contract

`docs/product-surface-targets/<surfaceId>/target.svg`와 `contract.json`이 UI
구축 전 확정되는 source visual contract다. ZIP reference screenshot과
ImageGen output은 방향 참고 입력일 뿐이며 repo에 복사하거나 최종
source authority로 주장하지 않는다. `contract.json`은 접근 경로,
expected visible text, prohibited text/placeholder, backend boundary,
required smoke coverage, visual requirements를 기계가 읽을 수 있게 보존해야
한다.

각 target contract에는 `firstScreenContract`가 있어야 한다. 이 필드는
visible rows, exact visible row count, before-scroll assertions, and
bottom-nav non-overlap rule을 구조화한다. 특히 홈 하위 메뉴
`고객 서비스 관리`, `업무 관리`, `템플릿 / 양식 편집`은 catalog row 전체가
한 화면에서 보이고 하단 navigation과 겹치면 실패해야 한다.

`sales-management`는 `카테고리` label만으로 covered 처리하지 않는다.
`소모품`, `수리`, `식음료`, `기타` category chips가 스크롤 전 화면에
모두 보여야 smoke/contract가 통과한다.
현재 backend 계약은 저장형 매지출 ledger가 아니라 template value plus
clipboard boundary다. 따라서 `Save Record`, recent expense rows, fake vendor or
amount records는 테스트/구현 통과 근거가 될 수 없다.

## Closeout Rule

Frontend or integration work is not closed by module-only tests. At minimum run:

```powershell
npm run typecheck
npm run build
npm test
```

When package state allows it, run `npm run verify`. A passing command is evidence only; the touched product path must still match the contract above.

`npm run verify` is a local verification bundle for this Chrome extension. It runs
typecheck, build, the current test bundle, side-panel scale inspection, and the
built-extension smoke check in one order:

```powershell
npm run verify
```

The product acceptance target is the user-controlled Google Chrome profile with
the unpacked `dist` extension loaded at fixed ID
`jeidoobjhbnnicfkcdfncheimgdnhmjk`. Direct evidence should use:

```text
chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html
```

The extension smoke target is a supplementary failure detector for the built
`dist` extension in an extension-capable Chromium runtime at
`chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html`. It loads
that URL through a CDP `page` target, so its bounded 400px layout check and
400x520 extension-page viewport probe are tab/page-target evidence only. They must never be
reported as actual user Chrome side-panel proof. It must
exercise the full home root menu state, branch popup, bottom menu enablement,
all five home submenu groups, the customer-guidance and quick-reply inline
template surfaces, service/work/template route groups, bottom-bar settings utility, template
editor routing, every owner work surface, all PMS bottom panels, and the PMS loading/resolved state. It must fail
on horizontal overflow, banned placeholder text, fake PMS fallback text, dimmed
locked shell logo, missing shared submenu transition, missing work-surface route
motion, wrong extension ID, missing extension worker, or runtime errors.
Visible `placeholder` attributes are product-surface residue. Smoke must collect
them globally from visible root/detail/work/PMS surfaces and fail even if the
placeholder is not inside the currently asserted work surface.

Smoke selectors must be scoped to the currently visible product surface:
visible root panel, visible detail panel, footer navigation, or the open branch
popup. A hidden duplicate text match is not a valid click target. The smoke
runner must launch with a wide tab viewport and still verify that the app
container stays bounded to the panel format as a supplementary layout guard.
That bounded-width result is not proof that Chrome opened the extension inside
the side-panel container. It must collect console errors,
CDP page errors, and in-page `error`/`unhandledrejection` events, and it must
classify render failures separately from click target failures.

`고객 서비스 관리` is not covered unless the visible viewport contains all three
service submenu routes: `세탁물 관리`, `매지출 관리`, and `공항밴 관리`. `매지출 관리`
is not covered unless the amount label/input, category label, and category
chips are visible before scrolling. PMS failure text is an observed failure
state only; it must not count as PMS record success. PMS backend-connected smoke
success requires network-observed PMS JSON `rows`; failure/empty DOM states are
allowed UI evidence but must keep the smoke non-passing as a release gate. When
the smoke reaches a real product assertion
failure, the temp run evidence JSON
`extension-smoke-result.json` must preserve the failed steps instead of
replacing them with an empty CDP failure record. By default this evidence belongs
outside the repository under a smoke run directory in the OS temp directory; an
explicit `EXTENSION_SMOKE_REPORT_DIR` override may choose another evidence path.
The CLI must print the actual JSON/PNG/HTML paths it wrote.

PMS target contracts must carry `pmsBackendEvidence.liveRowSuccess =
"unverified"` until real PMS `rows` render. A `backendFailure` or `empty` PMS
state is valid failure/empty-path evidence only; it is never evidence that the
PMS backend is connected.

Vite-rendered pages and isolated Chromium smoke are non-authoritative for
frontend closeout. They may help debug a bundle issue, but they do not replace
actual user Chrome extension proof.

If local branded Chrome rejects command-line unpacked extension loading, use the
configured smoke browser path or set `CHROME_EXTENSION_SMOKE_BROWSER` to a
Chrome for Testing/Chromium executable. Do not replace this with a localhost
render.
