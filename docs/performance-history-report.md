# Performance History Report

Generated at: 2026-05-28T08:28:39.115Z

Source: `docs/performance-history.json`

| Date | Route | Metric | Before | After | Delta | Note |
| --- | --- | --- | ---: | ---: | ---: | --- |
| 2026-04-30 | /children | route_size | 5.75 kB | 5.21 kB | -0.54 kB | Move family linking to /family and remove child-level invite UI from /children |
| 2026-04-30 | /mypage | route_size | 5.14 kB | 4.56 kB | -0.58 kB | Remove unused My Page card components |
| 2026-04-30 | /family | first_load_js | - | 153 kB | new | Add family linking page |
| 2026-04-30 | /auth | route_size | 7.49 kB | 8.16 kB | +0.67 kB | Harden OAuth callback, profile seed retry, and auth form validation |
| 2026-04-30 | /auth | route_size | 8.16 kB | 8.27 kB | +0.11 kB | Share auth session cache between AuthGate and logout flows |
| 2026-04-30 | /mypage | route_size | 4.56 kB | 4.65 kB | +0.09 kB | Share auth session cache between AuthGate and logout flows |
| 2026-04-30 | / | route_size | 6.68 kB | 6.91 kB | +0.23 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /children | route_size | 5.21 kB | 5.45 kB | +0.24 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /family | route_size | 4.83 kB | 5.05 kB | +0.22 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /fridge | route_size | 9.06 kB | 9.28 kB | +0.22 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /fridge/edit | route_size | 7.51 kB | 7.74 kB | +0.23 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /meal/edit | route_size | 5.98 kB | 6.21 kB | +0.23 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /meal/overview | route_size | 4.37 kB | 4.6 kB | +0.23 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /mypage | route_size | 4.65 kB | 4.8 kB | +0.15 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | /recipe | route_size | 11.6 kB | 11.8 kB | +0.2 kB | Retry authenticated fetch once after 401 token refresh |
| 2026-04-30 | / | route_size | 6.91 kB | 7.07 kB | +0.16 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /children | route_size | 5.45 kB | 5.62 kB | +0.17 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /family | route_size | 5.05 kB | 5.22 kB | +0.17 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /fridge | route_size | 9.28 kB | 9.44 kB | +0.16 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /fridge/edit | route_size | 7.74 kB | 7.9 kB | +0.16 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /meal/edit | route_size | 6.21 kB | 6.35 kB | +0.14 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /meal/overview | route_size | 4.6 kB | 4.76 kB | +0.16 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /mypage | route_size | 4.8 kB | 4.97 kB | +0.17 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /recipe | route_size | 11.8 kB | 11.9 kB | +0.1 kB | Redirect protected routes after final authenticated fetch 401 |
| 2026-04-30 | /auth | route_size | 8.27 kB | 8.41 kB | +0.14 kB | Return users to the original protected route after login |
| 2026-04-30 | /auth | route_size | 8.41 kB | 8.46 kB | +0.05 kB | Show a return-to-previous-screen notice on auth redirect |
| 2026-04-30 | /mypage | route_size | 4.97 kB | 4.99 kB | +0.02 kB | Show toast feedback for logout and expired sessions |
| 2026-05-28 | /auth | route_size | 8.46 kB | 8.47 kB | +0.01 kB | Split AI recipe modules and harden auth/fridge/recipe save flows |
| 2026-05-28 | /fridge | route_size | 9.9 kB | 10.4 kB | +0.5 kB | Split AI recipe modules and harden auth/fridge/recipe save flows |
| 2026-05-28 | /recipe | route_size | 12.3 kB | 12.4 kB | +0.1 kB | Split AI recipe modules and harden auth/fridge/recipe save flows |
| 2026-05-28 | /mypage | route_size | 5.58 kB | 5.62 kB | +0.04 kB | Split AI recipe modules and harden auth/fridge/recipe save flows |
| 2026-05-28 | /fridge | route_size | 10.4 kB | 10.4 kB | +0 kB | Split fridge page into focused UI components |
