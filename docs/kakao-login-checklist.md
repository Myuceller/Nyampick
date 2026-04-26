# Kakao Login QA Checklist

## 0) Test Metadata
- [ ] Test date:
- [ ] Tester:
- [ ] Environment: `local` / `preview` / `production`
- [ ] Base URL:
- [ ] Kakao app key used:

## 1) Kakao Dev Console Configuration
- [ ] Platform > Web site domain includes exact service domain
- [ ] Redirect URI includes:
  - [ ] `http://localhost:3000/auth` (local)
  - [ ] `https://<preview-domain>/auth` (preview if needed)
  - [ ] `https://nyampick.vercel.app/auth` (production)
- [ ] Consent items:
  - [ ] `profile_nickname` enabled
  - [ ] `profile_image` enabled (optional)
  - [ ] `account_email` enabled (if email-based account unification is required)
- [ ] If `account_email` is required, app review/permission state confirmed

## 2) Supabase Provider Configuration
- [ ] Supabase Auth > Providers > Kakao is enabled
- [ ] Client ID / Client Secret match Kakao app
- [ ] Redirect URL in Supabase/Kakao side is consistent
- [ ] Provider scope is aligned with Kakao consent setup
- [ ] `NEXT_PUBLIC_APP_URL` points to real production origin (not localhost)

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
- [ ] Redirect URI mismatch between Kakao and Supabase
- [ ] `NEXT_PUBLIC_APP_URL` set to localhost in production
- [ ] Kakao consent scope requested but not enabled/reviewed
- [ ] Provider client secret mismatch
- [ ] In-app browser OAuth restriction

## 9) Quick Debug Commands / Checks
```bash
# Check env keys exist (local)
rg -n "NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY" .env.local .env.production
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
