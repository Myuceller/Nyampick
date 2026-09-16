# Nyampick cross-platform architecture

## Decision

Nyampick is one repository with two product clients:

```text
Nyampick/
├── src/                     # Current Next.js web app and server routes
├── apps/mobile/             # Expo / React Native iOS + Android app
├── packages/                # Add only stable platform-neutral code
├── docs/
└── skills/
```

The web app stays at the root until a dedicated workspace migration is needed. Moving it
to `apps/web` is not part of native feature work. This prevents a second high-risk change
while the mobile client is being established.

## Ownership and dependency direction

| Area | Owner | May depend on | Must not depend on |
| --- | --- | --- | --- |
| Web UI and SEO | `src/app`, `src/components`, web features | Web client libraries, shared contracts | Expo or React Native UI |
| Native UI | `apps/mobile` | Expo, React Native, shared contracts | `next/*`, DOM UI, `src/lib/server/*` |
| Server/API | Next route handlers and `src/lib/server` | Supabase service role, server secrets | Native UI or browser storage |
| Shared packages | `packages/*` when introduced | TypeScript, validation utilities | React, Next.js, Expo, credentials |

Create `packages/contracts` first when the same request/response DTO is used by both
clients. It owns exported types, input/output validation, and transport-independent error
codes. Do not share web components or hooks. Extract a `packages/domain` helper only when
business behavior is deterministic and tested on both sides.

Import paths express those boundaries directly:

- Mobile code imports its own modules through `@mobile/*`.
- Web code imports its own modules through `@/*`.
- Both clients import shared contracts through `@nyampick/contracts/*`.
- Product source must not use parent-relative imports (`../`). Same-directory `./` imports remain allowed.
- Neither app may reach into `packages/contracts/src`; only the package's public exports are supported.

The mobile TypeScript and Metro configurations must resolve the same aliases. Metro watches
the repository root so shared runtime helpers—not only erased TypeScript types—bundle on
iOS and Android.

## API and authentication contract

The Next.js API remains the application backend during the first native release. Mobile
calls its public HTTPS API with the Supabase access token in `Authorization: Bearer …`.

Native authentication requirements before a real provider release:

1. Configure the Expo scheme `nyampick://` and callback `nyampick://auth/callback`.
2. Add `nyampick://auth/callback*` to the Supabase Auth redirect allow-list. The suffix is limited to the callback query that binds a first-signup consent to one OAuth attempt. In Google/Kakao provider
   consoles, register the Supabase callback shown in the provider settings
   (`https://<project-ref>.supabase.co/auth/v1/callback`), not the native deep link.
3. Use PKCE and device-secure session storage; never use browser localStorage.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. The mobile bundle may contain only
   public project URL and anon key.
5. Verify Google, Kakao, email reset, session refresh, logout, and expired-token recovery
   on a real iOS device and Android device.

## Native implementation approach

- Implement each screen in React Native. Reuse product language, DTOs, and interaction
  intent from web, not DOM/Tailwind source.
- Start with one feature vertical: auth → home → meal → fridge → recipe → profile.
- Give each screen loading, empty, permission, offline/error, and retry states before
  calling it complete.
- Use `FlatList` or `SectionList` for user-sized lists. Avoid nested scrolling lists and
  shipping large images without a fixed display size.
- Keep view state local. Introduce a query cache when real API data creates repeated
  fetching, mutation invalidation, or cross-tab consistency needs.
- Target JavaScript startup work before cosmetic polish: defer nonessential analytics,
  avoid eager tabs, and profile any screen with noticeably delayed interaction.

## First-entry experience

Web and native intentionally use different unauthenticated entry surfaces:

- The public web root `/` is the indexable product landing page. It explains the value
  before asking for an account and sends its CTAs to `/auth`.
- The native app is an account-first product: after session restoration, a signed-out
  user opens the login/signup screen rather than a duplicate marketing landing page.
- A newly authenticated user whose `onboarding_completed` metadata is not `true` sees
  the three-step native product onboarding. Completing or skipping it persists the same
  completion flag. Returning authenticated users enter the product directly.
- Password recovery always takes precedence over product onboarding.

Keep this decision in a pure entry-state resolver so loading, auth, onboarding, and app
transitions can be regression-tested without a device.

## SEO and acquisition boundary

Native screens are app surfaces, not crawlable pages. The Next.js web app owns discovery.

- Index only public acquisition and guide content: landing, about, guides, privacy, and
  terms.
- Keep `/auth`, user data pages, and `/api` non-indexable and out of the sitemap.
- Public page changes must preserve canonical metadata, Korean title/description, Open
  Graph preview, and relevant JSON-LD. Do not include child, profile, meal, or fridge data
  in structured data.
- A mobile deep link may open an in-app destination, but it must not replace or duplicate
  the canonical public guide URL.

The baseline guards are `npm run seo:harness`, `src/app/layout.tsx`, `src/app/robots.ts`,
and `src/app/sitemap.ts`.

## Acceptance gates

| Change | Required evidence |
| --- | --- |
| Native UI-only | Type check, mobile harness, Expo bundle for a target platform |
| Native API/auth | Above plus provider callback and real-device login smoke test |
| Shared contract | Contract test or both-client type check, API compatibility review |
| Public web/SEO | SEO harness and metadata/sitemap/robots inspection |
| Cross-platform feature | `npm run platform:check` plus relevant device and browser smoke tests |
