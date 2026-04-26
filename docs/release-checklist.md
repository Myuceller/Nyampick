# Nyampick Release Checklist

## 0) Release Info
- [ ] Release date/time:
- [ ] Release owner:
- [ ] Target environment: `Production`
- [ ] Vercel deployment URL:
- [ ] Rollback deployment URL:

## 1) Auth & Account
- [ ] Email login works
- [ ] Google login works
- [ ] Kakao login works
- [ ] Same-email multi-provider login uses same app data scope
- [ ] No infinite loading / redirect loop on `/auth`
- [ ] Unauthorized handling (`401`) shows recoverable UI

## 2) Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` set correctly for production domain
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `OPENAI_API_KEY` set
- [ ] `OPENAI_MODEL` set (or default confirmed)
- [ ] `OPENAI_VISION_MODEL` set (or default confirmed)
- [ ] Values verified in Vercel `Production` (not only Preview/Development)
- [ ] Redeploy completed after env updates

## 3) Database Integrity (Supabase)
- [ ] Foreign keys exist for user-linked tables
- [ ] `ON DELETE CASCADE` confirmed on user-linked tables
- [ ] No orphan rows in `user_profile`
- [ ] RLS enabled as intended
- [ ] Service-role-only server access path confirmed
- [ ] Required indexes present

## 4) Core Flows (Smoke Test)
- [ ] Sign in -> land on home without error
- [ ] Home meal list loads
- [ ] Meal edit save persists after refresh
- [ ] Fridge list loads
- [ ] Fridge add (manual) works
- [ ] Fridge edit quantity/delete works
- [ ] Fridge bulk delete works
- [ ] Receipt scan -> candidate select -> add works
- [ ] Recipe save/edit/delete/favorite works
- [ ] Family invite code create/join/unlink works

## 5) AI Recommendation Stability
- [ ] `/api/recipes/recommendations` returns `200` for valid request
- [ ] Failure path returns user-friendly message
- [ ] Token usage logging visible in server logs
- [ ] Prompt output quality sanity check done (3+ samples)
- [ ] Fallback logic checked (strict -> fallback)

## 6) Cost & Abuse Guard
- [ ] Daily token limit policy decided
- [ ] Per-user request rate limit policy decided
- [ ] Alerting threshold defined (monthly budget / usage spike)
- [ ] Emergency kill switch plan documented

## 7) UX & Error Handling
- [ ] No blocking `alert(...)` remains (toast only)
- [ ] Critical error messages are actionable
- [ ] Empty states are understandable
- [ ] Retry path exists for network failures

## 8) PWA & Mobile
- [ ] `manifest.webmanifest` returns `200`
- [ ] App icons (`192`, `512`) accessible
- [ ] Android Chrome install works (`앱 설치` / `홈 화면에 추가`)
- [ ] iOS Safari add-to-home instructions visible in app/help
- [ ] In-app browser OAuth warning documented (Google disallowed user-agent)

## 9) Security
- [ ] No secret keys in client bundle
- [ ] No secrets committed in git
- [ ] API logs do not leak PII/tokens
- [ ] OAuth redirect URLs/allowed origins are exact

## 10) Build & Deployment
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Production deployment health check done
- [ ] Post-release smoke test done on actual domain
- [ ] Rollback plan tested (or command prepared)

## 11) Post-Release (D+1)
- [ ] Auth error rate reviewed
- [ ] API 5xx rate reviewed
- [ ] AI usage/cost reviewed
- [ ] Top user-reported issues triaged

## Recommended Quick SQL Checks
```sql
-- orphan profiles
select p.id, p.email
from public.user_profile p
left join auth.users u on u.id = p.id
where u.id is null;
```

```sql
-- FK check for user_profile
select
  con.conname as constraint_name,
  con.confdeltype as delete_rule
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where con.contype = 'f'
  and nsp.nspname = 'public'
  and rel.relname = 'user_profile';
```
