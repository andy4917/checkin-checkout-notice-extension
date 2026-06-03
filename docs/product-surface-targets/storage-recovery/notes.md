# 저장소 복구 / migration

## Reference Files

- no direct positive reference file; use repo contract and user negative screenshots.

## Intent

복구 가능한 mismatch는 조용히 기본 state로 저장되고 붉은 복구 배너를 보이지 않는다.

## Failure Signals

- N/A
- YYYY.MM.DD
- HH:MM
- The Gangnan
- 복사되었습니다
- 저장된 데이터 손상이 발견되었습니다
- placeholder attribute
- fake business data

## Verification

readExtensionStateWithRecovery recovered=true와 write failure를 검증한다.
