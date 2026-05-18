# API Latency History

배포/로컬 API 응답 시간의 원본 데이터다. 새 측정값은 표에 행으로 추가한다.

| Date | Scenario | Origin | Endpoint | Avg ms | P95 ms | Notes |
| --- | --- | --- | --- | ---: | ---: | --- |
| 2026-05-13 | before-region-fix | deployed | /api/home/summary | 2965 | 4905 | function ran in iad1 |
| 2026-05-13 | before-region-fix | deployed | /api/fridge/items | 1664 | 2930 | function ran in iad1 |
| 2026-05-13 | before-region-fix | deployed | /api/recipes/saved | 794 | 858 | function ran in iad1 |
| 2026-05-13 | before-region-fix | deployed | /api/profile | 1126 | 1230 | function ran in iad1 |
| 2026-05-13 | before-region-fix | deployed | /api/children | 1570 | 1577 | function ran in iad1 |
| 2026-05-13 | before-region-fix | deployed | /api/family | 2296 | 2661 | function ran in iad1 |
| 2026-05-13 | after-region-fix | deployed | /api/home/summary | 1025 | 2360 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | deployed | /api/fridge/items | 187 | 190 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | deployed | /api/recipes/saved | 352 | 465 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | deployed | /api/profile | 349 | 507 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | deployed | /api/children | 412 | 581 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | deployed | /api/family | 561 | 732 | function ran in hnd1 |
| 2026-05-13 | after-region-fix | local | /api/home/summary | 433 | 904 | localhost comparison |
| 2026-05-13 | after-region-fix | local | /api/fridge/items | 118 | 160 | localhost comparison |
| 2026-05-13 | after-region-fix | local | /api/recipes/saved | 85 | 152 | localhost comparison |
| 2026-05-13 | after-region-fix | local | /api/profile | 155 | 307 | localhost comparison |
| 2026-05-13 | after-region-fix | local | /api/children | 202 | 350 | localhost comparison |
| 2026-05-13 | after-region-fix | local | /api/family | 257 | 359 | localhost comparison |
