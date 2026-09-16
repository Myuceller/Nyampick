# AI delivery harness

This is the working contract for AI-assisted Nyampick implementation. It makes feature
work repeatable without treating the current web UI as a code template for native.

## Before writing a feature

1. Identify the feature boundary: web, mobile, server/API, shared contract, or public
   discovery content.
2. Read `skills/nyampick-cross-platform-harness/SKILL.md`. For Nyampick UI, load the
   Nyampick design skill as well.
3. State the source of truth for user-visible data and the required behavior for loading,
   empty, failure, and retry states.
4. Check whether a DTO or rule already exists under `src/lib/dto` or should become a
   platform-neutral contract. Never copy server code into the client.

## Implementation rules

- Build the same user capability, not the same markup. Web and native get their own
  presentation components.
- Keep network calls behind a feature-level client boundary. Error messages must tell the
  parent what happened and what action can recover.
- Use real data after an API integration exists. Demo data is allowed only in an explicitly
  labeled app-shell stage and must be removed from the production path before release.
- Do not add a dependency simply to mirror the web stack. Add it only when it has a clear
  native responsibility and a supported Expo version.
- Never expose secret environment variables, bypass server authorization, or infer OAuth
  provider-console success from local source code.

## Definition of done

Every completed feature records:

- affected platforms and files;
- data/auth contract or why it remains local-only;
- validation run and its result;
- deliberately unverified external checks, such as real-provider login or physical-device
  behavior.

Run `npm run platform:check` for cross-platform or SEO-impacting work. Add a focused test
when behavior can regress without a device. Use Expo bundling as a compilation gate, not
as a replacement for iOS/Android device QA.

## Required review questions

- Can this user data appear in a sitemap, metadata, cache, log, or public URL? If yes, it
  is a privacy bug until explicitly justified.
- Is the code importing a platform-specific UI or storage implementation across a boundary?
  If yes, split it at the contract layer.
- Does the native screen meet safe-area, touch-target, Korean typography, and state rules?
- Does the public web change preserve crawlability and one canonical URL?
