# 지점 선택 / 헤더 잠금

## Reference Files

- no direct positive reference file; use repo contract and user negative screenshots.

## Intent

로고와 날짜가 유지되고 popup에는 실제 branch option만 보인다.

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

chrome.storage.local setLastBranchId 호출과 실패 상태를 검증한다.
