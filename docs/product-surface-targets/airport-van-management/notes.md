# 공항밴 관리

## Reference Files

- 새 폴더/공항밴 관리 screen.png

## Intent

route, 탑승/항공편/수하물/결제 control과 copy action이 보인다.

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

form state 저장, renderAirportVanCopy, clipboard.writeText를 검증한다.
