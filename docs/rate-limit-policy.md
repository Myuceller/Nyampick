# Rate Limit Policy

## 목적
AI API 남용과 비용 폭주를 막고, 정상 사용자 경험을 보호한다.

## 적용 대상
- `POST /api/recipes/recommendations`
- `POST /api/fridge/receipt-scan`

## 사용자 기준 제한 (로그인 유저)
### 1) AI 레시피 추천
- 분당 제한: `5 req / user`
- 일일 제한: `100 req / user`

### 2) 영수증 OCR 스캔
- 분당 제한: `3 req / user`
- 일일 제한: `30 req / user`

## 비로그인/IP 보호
- 분당 제한: `20 req / IP` (AI 엔드포인트 합산)

## 실패/남용 방어
- 연속 실패 `5회` 발생 시 `10분 쿨다운`
- 쿨다운 중 요청은 `429 Too Many Requests`
- `Retry-After` 헤더를 함께 반환

## 토큰 예산 정책
- 유저별 일일 토큰 예산: `50,000 tokens / day`
- 예산 초과 시 당일 AI 요청 차단
- 다음날 자동 해제

## 입력 검증 정책
- 이미지/텍스트 payload 상한을 초과하면 AI 호출 전 `400` 반환
- 잘못된 입력(필수값 누락, 형식 오류)은 제한 카운트 대상에서 제외

## 운영 정책
- 관리자 예외 계정은 최소 수(1개)만 허용
- 제한 응답 문구 통일:
  - `요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.`

## 구현 메모
- 키 설계 예시:
  - `rl:user:{userId}:recipes:minute:{YYYYMMDDHHmm}`
  - `rl:user:{userId}:recipes:day:{YYYYMMDD}`
  - `rl:user:{userId}:ocr:minute:{YYYYMMDDHHmm}`
  - `rl:user:{userId}:ocr:day:{YYYYMMDD}`
  - `rl:ip:{ip}:ai:minute:{YYYYMMDDHHmm}`
- 저장소는 Redis/Upstash 권장 (서버리스 환경에서 인메모리 카운터 비권장)
