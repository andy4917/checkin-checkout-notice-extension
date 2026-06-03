# Test Contract

이 프로젝트의 테스트는 점수나 파일 수를 늘리기 위한 장치가 아니라, Chrome 확장 제품 계약을 깨뜨렸을 때 바로 실패해야 하는 안전망입니다.

## 테스트로 증명할 것

- Svelte side panel entry가 실제 빌드에 포함되고 legacy DOM sidepanel 경로에 의존하지 않는다.
- 지점 선택은 명시적이어야 하며, 잘못된 저장 지점은 조용히 다른 지점으로 바뀌지 않는다.
- 지점 선택은 로고 trigger가 여는 명시적 sheet/popup이어야 하며, 과거의 다음 지점 순환 버튼이나 dropdown strip으로 되돌아가면 실패해야 한다.
- PMS 요청은 선택 지점의 WINGS 코드와 날짜 필터를 정확히 전송한다.
- PMS 목록 표면은 조회 중, 실패, 빈 결과, 실제 record 상태를 구분한다. 조회 중에는 `PMS 조회 중`을 표시하고, 실패 시 운영 메시지와 `PMS 조회 실패`를 표시해야 한다.
- PMS record UI는 실제 PMS 필드만 렌더한다. `N/A` 같은 컴포넌트-local fake value나 fallback label을 만들면 실패해야 한다.
- OTA 예약 입력은 실제 감지된 Naver/Station payload에서 WINGS 입력 필드만 만들고 저장/확정 동작을 만들지 않는다.
- WINGS 예약생성창 없음, OTA 지점 불일치, 저장소 손상, PMS 응답 오류는 짧은 운영 메시지로 실패한다.
- 템플릿 렌더링은 catalog metadata, branchScope, language body, required variable policy를 통과해야 한다.
- 고객 안내문/빠른 문의 답변의 아코디언 그룹은 사용자가 직접 접기 전까지 열린 상태를 유지하며, 하나만 열리는 제한을 두지 않는다.
- 복사 성공은 누른 버튼의 상태로만 보이고, 화면 이동 후에도 남는 전역 `복사되었습니다.` 배너를 만들지 않는다.
- 상단 공용 헤더는 오래된 활성 메뉴명, WINGS 배지, 업무 상태 suffix를 표시하지 않는다.
- 언어 선택바는 고객 안내문/빠른 문의 답변 템플릿 화면과 현재 work menu 게이트가 허용한 화면에만 나타난다.
- 홈 상세 패널이 숨겨져 있을 때 언어/복사/하위 메뉴 컨트롤은 탭 순서에서 빠져야 한다.
- 설정 import/export/reset은 storage schema와 template schema를 통과한 값만 저장한다.
- 설정 bottom action은 빈 placeholder 화면이 아니라 catalog-owned settings hub를 열고, 그 hub에서 템플릿 편집과 양식 편집으로 라우팅한다.
- 세탁 기록은 extension storage의 실제 record 상태 변화로 검증한다.
- 화면에 별도 플로팅 런처를 추가하지 않는다. 설정과 업무 실행은 현재 홈/업무 내비게이션 계약 안에서만 노출한다.

## 테스트로 증명하지 않을 것

- 단순히 파일이나 배열 항목이 존재한다는 사실만 확인하는 테스트.
- 옛 런타임 계층을 유지하기 위한 호환성 테스트.
- UI에 없는 데모 데이터, 예시 고객, 임의 객실, 임의 예약 기록.
- 구현 세부 줄 수, 함수명, 스타일 클래스처럼 제품 계약과 직접 연결되지 않는 내용.
- 성공 경로만 있고 실패 경로가 없는 얕은 테스트.

## 현재 테스트 묶음

기존 테스트 파일은 폐기하고 현재 기준을 직접 보는 `current-*` 묶음으로 재작성한다.

- `current-repo-contract.test.ts`: repo-local `agents.md` casing, absent external workflow hardcoding 방지, `.agent-runs` 추적 방지, legacy sidepanel 문서/경로 제거, UI operation 값 소유권.
- `current-extension-boundary.test.ts`: MV3 manifest, Svelte side panel entry, `App.svelte` skeleton/orchestrator, side panel open policy, tab context.
- `current-catalog-routing.test.ts`: 홈/고객 안내문 routing, settings hub routing, catalog metadata filtering, branchScope attachment exclusion, renderer required-value/language failure, context guard.
- `current-data-flows.test.ts`: PMS request/date/branch body, PMS failure, OTA normalization, WINGS field map, branch mismatch, WINGS remark dependency and write behavior.
- `current-storage-settings.test.ts`: extension storage schema, recoverable corruption policy, template settings import/export/reset validation.

## Closeout Rule

Frontend or integration work is not closed by module-only tests. At minimum run:

```powershell
npm run typecheck
npm run build
npm test
```

When package state allows it, run `npm run verify`. A passing command is evidence only; the touched product path must still match the contract above.

`npm run verify` is the unified closeout gate for this Chrome extension. It runs
typecheck, build, the current test bundle, side-panel scale inspection, and the
built-extension smoke check in one order:

```powershell
npm run verify
```

The extension smoke target is the unpacked `dist` extension loaded in an
extension-capable Chromium runtime at
`chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html`. It must
exercise the full home root menu state, branch popup, bottom menu enablement,
all five home submenu groups, settings hub, template editor routing, one
service/work menu path, and the PMS loading/resolved backend state. It must fail
on horizontal overflow, banned placeholder text, fake PMS fallback text, wrong
extension ID, missing extension worker, or runtime errors.

Vite-rendered pages are non-authoritative for frontend closeout. They may help
debug a bundle issue, but they do not replace the actual Chrome extension proof.

If local branded Chrome rejects command-line unpacked extension loading, use the
configured smoke browser path or set `CHROME_EXTENSION_SMOKE_BROWSER` to a
Chrome for Testing/Chromium executable. Do not replace this with a localhost
render.
