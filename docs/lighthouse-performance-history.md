# Lighthouse Performance History

이 파일은 Lighthouse 성능 변화의 원본 데이터다. 새 측정값은 표에 행으로 추가한다.

숫자는 Lighthouse JSON에서 가져온 원값을 사람이 읽기 쉬운 단위로 기록한다.

| Date | Env | Route | Performance | LCP s | Speed Index s | TBT ms | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 2026-04-30 | deployed-auth-vercel | / | 96 | 2.10 | 4.40 | 11 | authenticated deployed baseline |
| 2026-04-30 | deployed-auth-vercel | /fridge | 97 | 1.90 | 4.10 | 20 | authenticated deployed baseline |
| 2026-04-30 | deployed-auth-vercel | /recipe | 88 | 2.20 | 35.90 | 111 | authenticated deployed baseline |
| 2026-05-13 | deployed-auth-www | / | 96 | 2.12 | 4.77 | 9 | current authenticated production |
| 2026-05-13 | deployed-auth-www | /fridge | 97 | 2.12 | 4.25 | 0 | current authenticated production |
| 2026-05-13 | deployed-auth-www | /recipe | 98 | 2.11 | 3.69 | 2 | current authenticated production |
| 2026-05-13 | deployed-auth-www | /mypage | 95 | 1.82 | 5.75 | 3 | current authenticated production |
| 2026-05-13 | deployed-auth-www | /auth | 100 | 1.88 | 0.805 | 0 | current production auth page |
| 2026-05-13 | local-current | /auth | 98 | 2.41 | 0.760 | 0 | current local production build |
