# Kakao Login QA Checklist

## 0) Test Metadata
- [ ] Test date:
- [ ] Tester:
- [ ] Environment: `local` / `preview` / `production`
- [ ] Base URL:
- [ ] Kakao 앱 자격 증명이 콘솔에서 확인됨 (값은 이 문서에 기록하지 않음)

## 1) Kakao Dev Console Configuration
- [ ] Platform > Web site domain includes exact service domain
- [ ] Redirect URI is the exact callback displayed in Supabase Auth > Providers > Kakao:
  - [ ] `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] `nyampick://auth/callback*` was **not** entered here; it belongs only in the Supabase Auth Redirect URL Allow List.
- [ ] Consent items:
  - [ ] `profile_nickname` enabled
  - [ ] `profile_image` enabled (optional)
  - [ ] `account_email` enabled (프로필 연락처가 필요할 때만; 같은 이메일을 기준으로 별도 OAuth 계정을 통합하지 않음)
- [ ] If `account_email` is required, app review/permission state confirmed

## 2) Supabase Provider Configuration
- [ ] Supabase Auth > Providers > Kakao is enabled
- [ ] Client ID / Client Secret match Kakao app
- [ ] Supabase Auth Redirect URL Allow List includes `nyampick://auth/callback*` for the native app
- [ ] Supabase Auth Redirect URL Allow List includes each approved web `/auth*` URL for browser login
- [ ] Production web origin follows the configured canonical host: currently `https://www.nyampick.kr` (`https://nyampick.kr` redirects here)
- [ ] The Kakao console Redirect URI matches the callback displayed in the Supabase provider settings
- [ ] Provider scope is aligned with Kakao consent setup
- [ ] `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_CANONICAL_URL` both point to the configured canonical production origin (not localhost)

## 3) Browser/Context Matrix
### Desktop
- [ ] Chrome latest: login success
- [ ] Safari latest: login success
- [ ] Edge latest: login success

### Mobile
- [ ] Android Chrome: login success
- [ ] iOS Safari: login success
- [ ] iOS Chrome: login success

### In-app Browser (Expected Risk)
- [ ] KakaoTalk in-app browser: behavior recorded
- [ ] Instagram in-app browser: behavior recorded
- [ ] Naver app in-app browser: behavior recorded
- [ ] If fail, message guides user to open external browser

## 4) Functional Scenarios
- [ ] First-time Kakao login creates/initializes profile correctly
- [ ] Returning Kakao login reuses same data scope
- [ ] Logout -> relogin returns same account data
- [ ] Kakao user with email provided: profile email stored/updated correctly
- [ ] Kakao user with no email consent: app handles null email safely
- [ ] `/api/profile` responds 200 after login
- [ ] No infinite redirect loop on `/auth`

## 5) Error Scenario Checklist
- [ ] `KOE205` reproduced and fixed path confirmed
- [ ] `disallowed_useragent` reproduced in restricted contexts and user guidance works
- [ ] `Unable to exchange external code` path handled with clear message
- [ ] Supabase `unauthorized` path handled and recoverable
- [ ] Network failure path shows retryable UI

## 6) Observability / Logging
- [ ] On success, server logs include user id + provider info (no sensitive token logs)
- [ ] On fail, logs include error code + route + timestamp
- [ ] Logs do not include access token / refresh token
- [ ] Can identify whether failure happened at:
  - [ ] Kakao authorize step
  - [ ] Supabase code exchange step
  - [ ] `/api/profile` seed step

## 7) Pass/Fail Criteria
### Pass
- [ ] Production domain login works on Android Chrome + iOS Safari
- [ ] No blocking auth loop / 500
- [ ] Existing user data remains consistent after relogin

### Conditional Pass (Known Limitation)
- [ ] In-app browser failure exists but user guidance to external browser is clear

### Fail
- [ ] Production browser login fails for normal browser contexts
- [ ] Same user creates fragmented data scope repeatedly
- [ ] Critical auth errors without recovery guidance

## 8) Known Break Conditions
- [ ] Kakao console uses a native deep link instead of the Supabase callback
- [ ] Native deep link callback pattern is missing from Supabase Auth Redirect URL Allow List
- [ ] `NEXT_PUBLIC_APP_URL` set to localhost in production
- [ ] Kakao consent scope requested but not enabled/reviewed
- [ ] Provider client secret mismatch
- [ ] In-app browser OAuth restriction

## 9) Quick Debug Commands / Checks
```bash
# Check required variable names exist locally without printing any values.
for required_name in NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  rg -q "^${required_name}=" .env.local .env.production 2>/dev/null || printf 'missing: %s\n' "$required_name"
done
```

```sql
-- Verify auth users provider distribution
select id, email, raw_app_meta_data->>'provider' as provider, created_at, last_sign_in_at
from auth.users
order by created_at desc;
```

```sql
-- Verify identities for kakao users
select user_id, provider, identity_data->>'email' as identity_email, created_at
from auth.identities
where provider = 'kakao'
order by created_at desc;
```
