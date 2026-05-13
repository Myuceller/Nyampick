# Performance Baseline

측정일: 2026-05-13 KST  
브랜치: `perf/performance-improvements`  
목적: 배포 전후 성능 변화를 같은 기준으로 남기고, 클릭 지연 개선 효과를 추적한다.

## 자료

| 항목 | 파일 |
| --- | --- |
| 번들 사이즈 이력 원본 | [Performance History](performance-history.json) |
| 번들 사이즈 그래프 | [Performance Chart](performance-chart.svg) |
| Lighthouse 이력 원본 | [Lighthouse Performance History](lighthouse-performance-history.md) |
| Lighthouse 점/선 그래프 | [Lighthouse Performance Trend](lighthouse-performance-trend.svg) |
| API 응답 시간 이력 원본 | [API Latency History](api-latency-history.md) |
| API 응답 시간 비교 그래프 | [API Latency Chart](api-latency-chart.svg) |
| 최신 배포 로그인 Lighthouse 막대그래프 | [Current Authenticated Lighthouse Chart](lighthouse-auth-current-chart.svg) |
| Auth 배포/로컬 비교 그래프 | [Auth Deployed vs Local Lighthouse Chart](lighthouse-auth-deployed-vs-local-chart.svg) |
| AI 성능 리포트 | [AI Performance Report](ai-performance-report.md) |
| AI 레시피 품질 리포트 | [AI Recipe Quality Report](ai-recipe-quality-report.md) |

## 업데이트 방법

Lighthouse 성능 변화를 추가할 때는 [lighthouse-performance-history.md](lighthouse-performance-history.md)에 행을 추가한 뒤 그래프를 재생성한다.

```bash
npm run perf:lighthouse
```

번들 사이즈 그래프는 기존처럼 [performance-history.json](performance-history.json)을 수정한 뒤 실행한다.

```bash
npm run perf:report
```

배포/로컬 API 응답 시간은 로그인 계정으로 측정한다. 계정 정보는 실행 중 입력하고 문서에 기록하지 않는다.

```bash
npm run perf:api
```

## 측정 원칙

- 개선 전/후를 같은 기기, 같은 네트워크, 같은 계정 상태에서 비교한다.
- 보호 라우트(`/`, `/fridge`, `/recipe`, `/mypage`)는 로그인 세션으로 측정한다.
- Lighthouse는 모바일 navigation 기준을 우선 기록한다.
- 실제 계정 비밀번호, 쿠키, 토큰은 문서와 저장소에 기록하지 않는다.

## 현재 빌드

명령:

```bash
npm run build
```

| Route | Size | First Load JS |
| --- | ---: | ---: |
| `/` | 7.64 kB | 167 kB |
| `/auth` | 8.46 kB | 156 kB |
| `/children` | 6.65 kB | 167 kB |
| `/family` | 5.87 kB | 154 kB |
| `/fridge` | 9.9 kB | 174 kB |
| `/fridge/edit` | 8.24 kB | 167 kB |
| `/landing` | 186 B | 101 kB |
| `/meal/edit` | 6.7 kB | 162 kB |
| `/meal/overview` | 5.12 kB | 160 kB |
| `/mypage` | 5.58 kB | 158 kB |
| `/mypage/profile` | 5.15 kB | 160 kB |
| `/recipe` | 12.3 kB | 176 kB |
| Shared by all | - | 87.4 kB |

클릭 지연 개선 후 번들 변화:

| Route | 이전 Size | 현재 Size | 변화 | 이전 First Load JS | 현재 First Load JS | 변화 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 7.16 kB | 7.64 kB | +0.48 kB | 167 kB | 167 kB | 0 kB |
| `/children` | 6.32 kB | 6.65 kB | +0.33 kB | 167 kB | 167 kB | 0 kB |
| `/family` | 5.53 kB | 5.87 kB | +0.34 kB | 153 kB | 154 kB | +1 kB |
| `/fridge` | 9.44 kB | 9.9 kB | +0.46 kB | 173 kB | 174 kB | +1 kB |
| `/fridge/edit` | 7.9 kB | 8.24 kB | +0.34 kB | 166 kB | 167 kB | +1 kB |
| `/meal/edit` | 6.35 kB | 6.7 kB | +0.35 kB | 161 kB | 162 kB | +1 kB |
| `/meal/overview` | 4.76 kB | 5.12 kB | +0.36 kB | 160 kB | 160 kB | 0 kB |
| `/mypage` | 5.3 kB | 5.58 kB | +0.28 kB | 158 kB | 158 kB | 0 kB |
| `/mypage/profile` | 4.82 kB | 5.15 kB | +0.33 kB | 160 kB | 160 kB | 0 kB |
| `/recipe` | 11.9 kB | 12.3 kB | +0.4 kB | 176 kB | 176 kB | 0 kB |

비고:

- `BottomNav` 라우트/API prefetch와 60초 인증 JSON 메모리 캐시를 추가했다.
- 공통 First Load JS는 유지됐고, 각 라우트 크기는 약 0.28-0.48 kB 증가했다.
- 기대 효과는 첫 로드 점수보다 보호 탭 재방문/탭 전환 시 API 대기 감소에 있다.

## 최신 배포 Lighthouse

측정일: 2026-05-13 KST  
대상: `https://www.nyampick.kr`  
환경: 배포 사이트, 로그인된 Chrome profile, Lighthouse CLI mobile.  
비고: Final URL이 보호 라우트에 그대로 유지되는 것을 확인했다.

| Page | Final URL | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index | TTI | TTFB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | `/` | 96 | 94 | 100 | 100 | 771ms | 2.12s | 0 | 9ms | 4.77s | 2.12s | 97ms |
| `/fridge` | `/fridge` | 97 | 96 | 100 | 66 | 773ms | 2.12s | 0 | 0ms | 4.25s | 2.12s | 10ms |
| `/recipe` | `/recipe` | 98 | 94 | 100 | 66 | 766ms | 2.11s | 0 | 2ms | 3.69s | 2.11s | 12ms |
| `/mypage` | `/mypage` | 95 | 96 | 100 | 69 | 773ms | 1.82s | 0 | 3ms | 5.75s | 1.82s | 10ms |

해석:

| 항목 | 판단 |
| --- | --- |
| 성능 점수 | 모든 보호 라우트가 95 이상이다. |
| LCP | 모든 보호 라우트가 2.12s 이하로 목표 2.5s 이내다. |
| `/recipe` 변화 | 이전 로그인 배포 측정 88점, Speed Index 35.9s에서 현재 98점, 3.69s로 개선됐다. |
| `/mypage` | LCP는 1.82s로 좋지만 Speed Index가 5.75s라 화면 완성 흐름은 추가 점검 대상이다. |
| 클릭 체감 | 이 표는 navigation 기준이다. 탭 클릭 후 반복 이동 체감은 user-flow 또는 DevTools Network timing으로 별도 측정한다. |

## Auth 배포/로컬 비교

측정일: 2026-05-13 KST

| 대상 | Final URL | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index | TTI | TTFB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 배포본 | `https://www.nyampick.kr/auth` | 100 | 95 | 100 | 66 | 805ms | 1.88s | 0 | 0ms | 805ms | 1.88s | 9ms |
| 현재 작업본 | `http://localhost:3000/auth` | 98 | 95 | 100 | 66 | 760ms | 2.41s | 0 | 0ms | 760ms | 2.41s | 71ms |

해석:

| 항목 | 판단 |
| --- | --- |
| 점수 | 배포본 100, 현재 작업본 98로 둘 다 양호하다. |
| LCP | 현재 작업본은 2.41s로 배포본보다 느리지만 목표 2.5s 이내다. |
| TBT | 둘 다 0ms로 blocking은 낮다. |
| 배포 전 판단 | `/auth`는 현재 작업본도 배포 가능한 성능 범위다. |

## API 배포/로컬 비교

측정일: 2026-05-13 KST  
조건: 같은 로그인 토큰, 각 endpoint 3회 호출, `cache: no-store`.

### 리전 수정 전

| Endpoint | 배포 Avg | 로컬 Avg | 배포/로컬 | 배포 P95 | 로컬 P95 | 판단 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/api/home/summary` | 2965ms | 580ms | 5.1x | 4905ms | 1404ms | 홈 진입/식단 탭 대기 주범 |
| `/api/fridge/items` | 1664ms | 109ms | 15.3x | 2930ms | 184ms | 냉장고 탭 대기 주범 |
| `/api/recipes/saved` | 794ms | 85ms | 9.3x | 858ms | 157ms | 레시피 탭 초기 데이터 지연 |
| `/api/profile` | 1126ms | 114ms | 9.9x | 1230ms | 195ms | 마이페이지 병렬 요청 중 하나 |
| `/api/children` | 1570ms | 157ms | 10.0x | 1577ms | 232ms | 마이페이지/가족 데이터 지연 |
| `/api/family` | 2296ms | 205ms | 11.2x | 2661ms | 272ms | 마이페이지 대기 주범 |

### 리전 수정 배포 후

배포 URL: `https://www.nyampick.kr`  
확인 헤더: `x-vercel-id: icn1::hnd1::...`

| Endpoint | 이전 배포 Avg | 현재 배포 Avg | 개선 | 현재 배포 P95 | 현재 로컬 Avg | 판단 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/api/home/summary` | 2965ms | 1025ms | -65% | 2360ms | 433ms | 여전히 가장 큰 잔여 병목 |
| `/api/fridge/items` | 1664ms | 187ms | -89% | 190ms | 118ms | 냉장고 탭 대기 크게 개선 |
| `/api/recipes/saved` | 794ms | 352ms | -56% | 465ms | 85ms | 개선됐지만 로컬보다 느림 |
| `/api/profile` | 1126ms | 349ms | -69% | 507ms | 155ms | 마이페이지 병렬 요청 개선 |
| `/api/children` | 1570ms | 412ms | -74% | 581ms | 202ms | 마이페이지 병렬 요청 개선 |
| `/api/family` | 2296ms | 561ms | -76% | 732ms | 257ms | 가족 데이터 대기 개선 |

해석:

| 항목 | 판단 |
| --- | --- |
| 사용자 체감 | 로컬이 빠르고 배포가 느리다는 체감이 맞다. Lighthouse navigation 점수보다 API 응답 시간이 문제다. |
| 가장 큰 병목 | `/api/home/summary`, `/api/fridge/items`, `/api/family`가 1.6-3.0초 평균으로 튄다. |
| 원인 후보 | 배포 serverless cold start, Supabase auth/user 조회, Supabase DB 쿼리 왕복, endpoint 내부 병렬화 부족. |
| 현재 개선 효과 | 클라이언트 prefetch/cache는 재방문 체감은 줄이지만, 첫 API 자체가 느린 문제는 서버/API 최적화가 필요하다. |

적용한 1차 수정:

| 수정 | 기대 효과 |
| --- | --- |
| `vercel.json`에서 Function region을 `hnd1`로 고정 | 기존 배포 함수가 `iad1`에서 실행되던 장거리 왕복을 줄인다. |
| Supabase admin client 싱글턴 재사용 | warm function에서 매 요청마다 client를 새로 구성하는 비용을 줄인다. |
| `listFridgeItemsFromDb`의 매 GET seed/profile 확인 제거 | `/api/fridge/items`의 불필요한 Supabase 조회 1회를 줄인다. |

## 다음 측정

| 우선순위 | 대상 | 이유 |
| ---: | --- | --- |
| 1 | `/api/home/summary` 내부 timing 로그 | 리전 수정 후에도 평균 1025ms, P95 2360ms로 가장 크게 남았다. |
| 2 | `/api/home/summary` 쿼리 수 축소 | meals/fridge/children/family count 조회를 더 적은 왕복으로 줄인다. |
| 3 | 보호 탭 전환 user-flow | API 개선 후 실제 클릭 대기 체감이 얼마나 줄었는지 측정한다. |
