# Test Contract

이 프로젝트의 테스트는 점수나 파일 수를 늘리기 위한 장치가 아니라, Chrome 확장 제품 계약을 깨뜨렸을 때 바로 실패해야 하는 안전망입니다.

## 테스트로 증명할 것

- Svelte side panel entry가 실제 빌드에 포함되고 legacy DOM sidepanel 경로에 의존하지 않는다.
- 지점 선택은 명시적이어야 하며, 잘못된 저장 지점은 조용히 다른 지점으로 바뀌지 않는다.
- PMS 요청은 선택 지점의 WINGS 코드와 날짜 필터를 정확히 전송한다.
- OTA 예약 입력은 실제 감지된 Naver/Station payload에서 WINGS 입력 필드만 만들고 저장/확정 동작을 만들지 않는다.
- WINGS 예약생성창 없음, OTA 지점 불일치, 저장소 손상, PMS 응답 오류는 짧은 운영 메시지로 실패한다.
- 템플릿 렌더링은 catalog metadata, branchScope, language body, required variable policy를 통과해야 한다.
- 설정 import/export/reset은 storage schema와 template schema를 통과한 값만 저장한다.
- 세탁 기록은 extension storage의 실제 record 상태 변화로 검증한다.

## 테스트로 증명하지 않을 것

- 단순히 파일이나 배열 항목이 존재한다는 사실만 확인하는 테스트.
- 옛 런타임 계층을 유지하기 위한 호환성 테스트.
- UI에 없는 데모 데이터, 예시 고객, 임의 객실, 임의 예약 기록.
- 구현 세부 줄 수, 함수명, 스타일 클래스처럼 제품 계약과 직접 연결되지 않는 내용.
- 성공 경로만 있고 실패 경로가 없는 얕은 테스트.

## 현재 테스트 묶음

- `extension-boundary.test.ts`: manifest, side panel open policy, active tab context.
- `pms-api.test.ts`: PMS request body, branch code mapping, response validation, guest normalization.
- `ota-reservation-input.test.ts`: OTA source detection, payload normalization, WINGS field map, branch mismatch, missing WINGS window, request guard.
- `catalog-renderer.test.ts`: template rendering, language failure, required variables, context guard, remark formatting.
- `unified-template-catalog.test.ts`: menu metadata, duplicate source evidence, branch-scoped attachment filtering, stored catalog merge.
- `template-settings.test.ts`: settings import/export/reset and schema-validated saves.
- `storage-schema.test.ts`: extension state validation and recovery policy.
- `laundry-records.test.ts`: storage-backed laundry add/query/status update.
- `menu-routing.test.ts`: menu/tab selection from catalog metadata.
- `domain.test.ts`: pure date, room, guest sorting/filtering/status behavior.

## Closeout Rule

Frontend or integration work is not closed by module-only tests. At minimum run:

```powershell
npm run typecheck
npm run build
npm test
```

When package state allows it, run `npm run verify`. A passing command is evidence only; the touched product path must still match the contract above.
