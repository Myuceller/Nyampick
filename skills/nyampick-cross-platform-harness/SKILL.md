---
name: nyampick-cross-platform-harness
description: Build or review Nyampick features that span the Next.js web app and Expo mobile app, including native UI parity, shared contracts, mobile performance, and public-web SEO boundaries.
---

# Nyampick cross-platform harness

Use this skill before adding or reviewing Nyampick mobile screens, extracting shared
logic, changing authentication/API boundaries, or modifying web pages that affect
search visibility. It does not apply to isolated copy edits or a web-only component
with no mobile, API, performance, or SEO consequence.

## Read first

- Read [cross-platform architecture](../../docs/cross-platform-architecture.md).
- Read [AI delivery harness](../../docs/ai-delivery-harness.md) for the task's required
  evidence and quality gates.
- For Nyampick UI, use the `nyampick-design` skill. Treat existing web screens and
  screenshots as product references, not portable implementation code.

## Non-negotiable boundaries

- The root Next.js app remains the web app. Native code lives in `apps/mobile`.
- Rebuild UI with React Native primitives; never import DOM components, `next/*`,
  browser-only Supabase clients, or `src/lib/server/*` into native code.
- Extract only stable, platform-neutral contracts, validation, and deterministic domain
  helpers. A shared package must not depend on React, Next.js, Expo, browser storage,
  or server credentials.
- All client data access goes through versioned API contracts and bearer-token auth.
  Do not expose the Supabase service-role key or call server-only storage from mobile.
- Native deep links use `nyampick://`; authenticate through the configured callback
  route, then persist sessions in device-secure storage.

## Credentials and environment values

- Never expose an actual API key, token, password, cookie, connection string, or
  other secret in user-facing prose, commentary, source patches, commit messages,
  documentation, test reports, or command output. Refer only to variable names and
  redact any incidental value.
- Do not use commands that print `.env` files or environment dumps. Inspect key
  presence or configuration shape without reading the values.
- A mobile bundle may contain only intentionally public `EXPO_PUBLIC_*` values;
  never place service-role, OpenAI, email-provider, or other server secrets in it.
- Expo public values used in native JavaScript must use static dot notation such as
  `process.env.EXPO_PUBLIC_API_URL`; bracket access and destructuring are not inlined.

## Design and performance gates

- Match product intent and information hierarchy, not web pixel layout. Preserve
  accessible labels, 44pt touch targets, safe areas, Korean line rhythm, and all
  loading/empty/error states.
- Prefer `FlatList`/`SectionList` for unbounded records, image sizing/caching for media,
  and screen-local state. Do not introduce a global state library before a cross-screen
  synchronization need is demonstrated.
- Keep initial screens independent of server credentials so the app can boot to an
  actionable auth/error state. Do not silently show fake production data after auth is
  wired.

## SEO and web discoverability

- Native app screens do not receive web SEO. Put indexable acquisition content in the
  Next.js public pages and guide routes.
- Keep account, meal, fridge, recipe, API, and auth routes out of the sitemap and
  blocked from crawling. Do not add user data to page metadata or structured data.
- When public content changes, preserve canonical URLs, Korean metadata, Open Graph
  image coverage, JSON-LD validity, `robots.ts`, and `sitemap.ts` together.
- Use deep links as product navigation only; do not create duplicate indexable web URLs
  for the same private native state.

## Completion evidence

Run `npm run platform:check` for changes in this scope. For a native feature, also
bundle at least the platform being changed with Expo. For public-web SEO changes,
inspect the generated metadata/sitemap/robots output or run the relevant SEO check.
Record any skipped device, provider-console, or production checks rather than claiming
they passed.
