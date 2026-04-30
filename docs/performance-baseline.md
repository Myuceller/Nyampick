# Performance Baseline

측정일: 2026-04-30 KST  
브랜치: `move-changes-20260429`  
목적: 성능, 안정성, 비용 개선 지표를 꾸준히 기록하고 변경 전후를 검증 가능하게 만든다.

관련 작업 흐름: [Codex Workflow](codex-workflow.md)

## 측정 원칙

- 개선 전/후를 같은 기기, 같은 네트워크, 같은 계정 상태에서 비교한다.
- Lighthouse는 모바일 기준을 우선 기록한다.
- API는 5회 이상 측정한 뒤 평균과 p95를 기록한다.
- 인증이 필요한 API는 실제 로그인 세션 또는 테스트 토큰으로 측정한다.
- `.env.local`, `.env.production`의 실제 키 값은 문서에 기록하지 않는다.

## 현재 빌드 기준

명령:

```bash
npm run build
```

결과:

| Route | Size | First Load JS |
| --- | ---: | ---: |
| `/` | 6.68 kB | 166 kB |
| `/auth` | 7.49 kB | 155 kB |
| `/children` | 5.95 kB | 166 kB |
| `/fridge` | 9.06 kB | 173 kB |
| `/fridge/edit` | 7.51 kB | 166 kB |
| `/landing` | 186 B | 101 kB |
| `/meal/edit` | 5.98 kB | 161 kB |
| `/meal/overview` | 4.37 kB | 159 kB |
| `/mypage` | 5.08 kB | 158 kB |
| `/recipe` | 11.6 kB | 175 kB |
| Shared by all | - | 87.4 kB |

우선 개선 후보:

| 우선순위 | 대상 | 현재값 | 목표 |
| ---: | --- | ---: | ---: |
| 1 | `/recipe` First Load JS | 175 kB | 140 kB 이하 |
| 2 | `/fridge` First Load JS | 173 kB | 140 kB 이하 |
| 3 | `/` First Load JS | 166 kB | 135 kB 이하 |
| 4 | Shared JS | 87.4 kB | 75 kB 이하 |

## Lighthouse Baseline

Lighthouse CLI는 dev dependency로 설치되어 있다. 측정 전 production 서버를 실행한다.

권장 측정 대상:

| Page | URL | Performance | Accessibility | Best Practices | SEO | PWA |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Landing | `/landing` | 97 | 96 | 100 | 100 | TBD |
| Home | `/` | TBD | TBD | TBD | TBD | TBD |
| Fridge | `/fridge` | TBD | TBD | TBD | TBD | TBD |
| Recipe | `/recipe` | TBD | TBD | TBD | TBD | TBD |

측정 명령 예시:

```bash
npm run build
npm start
npm run lighthouse:landing
npm run lighthouse:home
npm run lighthouse:fridge
npm run lighthouse:recipe
```

현재 측정된 Lighthouse 상세:

| Page | FCP | LCP | CLS | TBT | Speed Index | TTI | TTFB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/landing` | 0.8s | 2.6s | 0 | 0ms | 1.8s | 2.6s | 110ms |

수동 측정 시에는 Chrome DevTools Lighthouse 탭에서 다음 조건을 맞춘다.

| 항목 | 값 |
| --- | --- |
| Mode | Navigation |
| Device | Mobile 우선, Desktop 보조 |
| Categories | Performance, Accessibility, Best Practices, SEO, PWA |
| Environment | Production build |

## API 응답 시간 Baseline

인증이 필요한 API가 많으므로, 로그인 세션을 포함한 측정값을 별도로 기록해야 한다. 초기 baseline은 다음 endpoint를 우선 측정한다.

| Endpoint | Method | 인증 | 평균 | p95 | 목표 |
| --- | --- | --- | ---: | ---: | ---: |
| `/api/home/summary` | GET | 필요 | TBD | TBD | 500 ms 이하 |
| `/api/fridge/items` | GET | 필요 | TBD | TBD | 500 ms 이하 |
| `/api/meals` | GET | 필요 | TBD | TBD | 500 ms 이하 |
| `/api/recipes/saved` | GET | 필요 | TBD | TBD | 500 ms 이하 |
| `/api/recipes/recommendations` | GET | 필요 | TBD | TBD | 3,000 ms 이하 |
| `/api/fridge/receipt-scan` | POST | 필요 | TBD | TBD | 5,000 ms 이하 |

로컬 측정 예시:

```bash
npm run build
npm start
curl -w "status=%{http_code} time_total=%{time_total}s\n" -o /tmp/home-summary.json -s http://localhost:3000/api/home/summary
```

인증 API는 브라우저에서 로그인한 뒤 Network 탭의 요청 시간을 기록하거나, 테스트 세션 쿠키를 포함해서 `curl`로 측정한다.

반복 측정 템플릿:

```bash
for i in 1 2 3 4 5; do
  curl -w "%{time_total}\n" -o /tmp/api-result.json -s http://localhost:3000/api/fridge/items
done
```

## Web Vitals Baseline

| Page | LCP | CLS | INP | TTFB | 목표 |
| --- | ---: | ---: | ---: | ---: | --- |
| `/landing` | 2.6s | 0 | TBD | 110ms | LCP 2.5s 이하, CLS 0.1 이하, INP 200ms 이하 |
| `/` | TBD | TBD | TBD | TBD | LCP 2.5s 이하, CLS 0.1 이하, INP 200ms 이하 |
| `/fridge` | TBD | TBD | TBD | TBD | LCP 2.5s 이하, CLS 0.1 이하, INP 200ms 이하 |
| `/recipe` | TBD | TBD | TBD | TBD | LCP 2.5s 이하, CLS 0.1 이하, INP 200ms 이하 |

측정 방법:

- Lighthouse report의 LCP/CLS/TBT를 baseline으로 기록한다.
- 실제 배포 후에는 Vercel Speed Insights 또는 `web-vitals` 수집을 붙여 실제 사용자 기준으로 기록한다.

## AI 비용/지연 Baseline

| 기능 | 현재 모델 | 평균 latency | 평균 input tokens | 평균 output tokens | 실패율 | 목표 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 레시피 추천 | `OPENAI_MODEL` | TBD | TBD | TBD | TBD | latency 3s 이하, token 25% 절감 |
| 영수증 스캔 | `OPENAI_VISION_MODEL` | TBD | TBD | TBD | TBD | latency 5s 이하, 실패율 5% 이하 |

측정 방법:

- API route에서 요청 시작/종료 시간을 로그로 남긴다.
- OpenAI 응답의 usage 값을 구조화해서 기록한다.
- prompt/schema 변경 전후의 token 평균을 비교한다.

### AI 성능 평가 세트

AI 최적화는 단순히 빠르게 만드는 것이 아니라, 같은 입력에서 더 적은 비용으로 더 안정적인 결과를 내는지 측정한다.

레시피 추천 평가 입력:

| Case | 입력 재료 | 기대 결과 | 평가 포인트 |
| --- | --- | --- | --- |
| R1 | `["계란", "두부", "애호박"]` | 유아식으로 자연스러운 단백질/채소 조합 | JSON parse 성공, 재료 활용도, 조합 적절성 |
| R2 | `["바나나", "소고기", "양파"]` | 부자연스러운 조합 회피 | 충돌 조합 필터링, fallback 발생 여부 |
| R3 | `["쌀", "당근", "닭고기", "브로콜리"]` | 이유식/유아식 톤의 단계형 조리법 | 단계 완성도, title/subtitle 길이 준수 |
| R4 | `["우유", "치즈", "고구마"]` | 간식 또는 식사로 납득 가능한 추천 | 알레르기/유제품 표현 주의, 과도한 창작 방지 |
| R5 | `["새우", "달걀", "우유"]` | 알레르기 가능 재료를 무리하게 권장하지 않음 | 안전 문구 또는 보수적 추천 여부 |

영수증 OCR 평가 입력:

| Case | 입력 | 기대 결과 | 평가 포인트 |
| --- | --- | --- | --- |
| O1 | 선명한 마트 영수증 | 식재료명만 추출 | 가격/카드번호/매장명 제거 |
| O2 | 기울어진 영수증 | 핵심 품목 추출 | 인식 성공률, 중복 제거 |
| O3 | 품목명이 축약된 영수증 | 사용 가능한 식재료명으로 정규화 | `normalizeReceiptLines` 후 품질 |
| O4 | 식품 외 항목 포함 | 식품 외 항목 제외 | false positive 비율 |

### AI 정량 지표

| 지표 | 계산 방식 | 목표 |
| --- | --- | --- |
| Parse success rate | JSON parse 성공 수 / 전체 요청 수 | 95% 이상 |
| Valid recommendation rate | 유효 추천 개수 / 요청 limit 합계 | 90% 이상 |
| Fallback rate | fallback 호출 수 / 전체 요청 수 | 20% 이하 |
| Source validity rate | 접속 가능한 source URL 수 / source URL 포함 추천 수 | 90% 이상 |
| Ingredient utilization | 추천에 반영된 입력 재료 수 / 입력 재료 수 | 60% 이상 |
| Average latency | 총 요청 시간 평균 | 레시피 3s 이하, OCR 5s 이하 |
| p95 latency | 요청 시간 p95 | 레시피 5s 이하, OCR 8s 이하 |
| Average tokens | total tokens 평균 | 개선 전 대비 25% 절감 |
| Failure rate | 4xx/5xx 제외 AI 처리 실패 수 / 전체 요청 수 | 5% 이하 |

현재 코드 기준 측정 가능 여부:

| 기능 | latency | token usage | 품질 판정 | 비고 |
| --- | --- | --- | --- | --- |
| 레시피 추천 | 가능 | 가능 | 가능 | `/api/recipes/recommendations`가 `usage` 반환 |
| 영수증 OCR | 가능 | 추가 필요 | 가능 | `extractReceiptItemsWithOpenAI`가 현재 usage를 반환하지 않음 |

### AI 최적화 후보

| 후보 | 기대 지표 | 개선 요약 |
| --- | --- | --- |
| structured output/schema 강화 | Parse success rate, Failure rate | AI 응답 schema 검증으로 파싱 실패율 감소 |
| prompt 축약 및 중복 지시 제거 | Average tokens, latency | prompt 최적화로 평균 token 사용량 절감 |
| fallback 조건 계측 | Fallback rate, latency | fallback 호출률 추적 후 strict prompt 품질 개선 |
| OCR usage 반환 추가 | token usage, 비용 | vision OCR 비용 관측성 확보 |
| golden dataset 기반 회귀 테스트 | Valid recommendation rate | AI 추천 품질 회귀를 정량 평가 |
| 캐시 또는 동일 입력 dedupe | latency, 비용 | 반복 AI 요청 비용 절감 |

### AI 측정 로그 포맷

서버 로그 또는 별도 파일에 다음 형태로 기록한다. 실제 API 키나 사용자 개인정보는 기록하지 않는다.

```json
{
  "feature": "recipe_recommendation",
  "model": "OPENAI_MODEL",
  "caseId": "R1",
  "latencyMs": 2140,
  "inputTokens": 420,
  "outputTokens": 610,
  "totalTokens": 1030,
  "recommendationCount": 3,
  "parseSuccess": true,
  "fallbackUsed": false,
  "validRecommendationRate": 1,
  "createdAt": "2026-04-30T00:00:00.000Z"
}
```

### AI 평가 실행 절차

1. 평가 입력 5~10개를 고정한다.
2. 같은 모델과 같은 prompt로 각 case를 3회 이상 실행한다.
3. latency, token, parse 성공, 추천 개수, fallback 여부를 기록한다.
4. prompt/schema를 수정한다.
5. 같은 case를 다시 실행해 평균과 p95를 비교한다.

결과 기록 템플릿:

| 날짜 | 기능 | 변경 | 평균 latency | p95 latency | 평균 tokens | parse 성공률 | 실패율 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| TBD | 레시피 추천 | baseline | TBD | TBD | TBD | TBD | TBD |
| TBD | 레시피 추천 | prompt/schema 개선 | TBD | TBD | TBD | TBD | TBD |
| TBD | 영수증 OCR | baseline | TBD | TBD | TBD | TBD | TBD |

## 개선 로그

| 날짜 | 변경 | 지표 | Before | After | 비고 |
| --- | --- | --- | ---: | ---: | --- |
| 2026-04-30 | 냉장고 편집 UI 상태를 Zustand store로 분리 | 유지보수성 | - | - | 렌더 횟수는 React Profiler로 추가 측정 필요 |

## 개선 요약 후보

- Next.js App Router 기반 PWA에서 route별 bundle size, Lighthouse, API latency baseline을 수립하고 성능 개선 지표를 관리
- 냉장고/레시피 핵심 화면의 First Load JS를 측정하고 code splitting 및 client component 범위 축소로 초기 로딩 성능 개선
- Supabase 기반 API의 endpoint별 평균 latency/p95를 측정하고 중복 호출 제거 및 query 최적화로 응답 시간 개선
- OpenAI API 사용량과 latency를 추적해 prompt/schema 최적화로 token 비용과 실패율 개선
