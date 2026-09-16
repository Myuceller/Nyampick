---
name: nyampick-qa
description: QA Nyampick web, Expo mobile, authentication, API, and cross-platform changes. Use when asked to test, QA, regression-check, release-check, or prioritize defects; do not treat an implementation request alone as authorization for a broad audit.
---

# Nyampick QA

Produce reproducible evidence for the changed user journey and leave uncertain external behavior explicitly unverified.

## Load relevant project rules

- For mobile, authentication, shared contracts, or web discoverability, read `../nyampick-cross-platform-harness/SKILL.md` and its required architecture/delivery documents.
- For any Nyampick UI or screenshot review, use the `nyampick-design` skill.
- Read the active issue backlog under `docs/issues/` when the request refers to existing priorities.

## Safety and scope

- Preserve unrelated dirty-worktree changes. Inspect the scoped diff before deciding what belongs to the QA run.
- Never print `.env` contents, credentials, tokens, cookies, user records, or provider callback payloads. Check only variable names and presence when configuration matters.
- A QA-only request authorizes diagnosis and documentation, not production mutation or unrelated fixes. Implement fixes only when the user also asks to fix or build.
- Do not claim provider-console, physical-device, camera, share sheet, push, signing, or production behavior passed unless it was directly exercised in that environment.

## Test from risk outward

1. Define the exact journey and expected screen sequence, including loading, empty, failure, retry, cancellation, and authenticated states.
2. Inspect the implementation boundary and focused tests. Run the smallest relevant deterministic test first.
3. Run the applicable project gate:
   - Web logic: `npm run lint`, focused unit tests, then `npm run build` when routing or production output changed.
   - Mobile UI: `npm run mobile:typecheck`, `npm run mobile:harness`, then Expo export for every changed target platform.
   - Cross-platform/auth/SEO: `npm run platform:check` plus focused contract tests.
   - Release-wide request: `npm run release:check` and `npm run platform:check`.
4. Review native UI for safe areas, 44pt targets, keyboard/small-screen reachability, Korean line rhythm, accessibility labels, reduced motion, and actionable loading/error states.
5. Record device/provider/browser checks separately from automated checks.

## Severity

- **P0**: security or privacy exposure, data loss/cross-account access, release blocker, or core journey unusable with no workaround.
- **P1**: core behavior broken or misleading, auth/session inconsistency, severe accessibility failure, or common flow requiring a workaround.
- **P2**: edge-case recovery, performance, copy, layout, or polish issue that does not block the main journey.
- **P3**: optional improvement or low-impact consistency work.

Do not inflate severity based only on code smell. Tie every issue to an observable user or operational impact.

## Report contract

Lead with pass/fail and release risk. For each issue include priority, affected platform/journey, evidence, expected behavior, and the smallest safe next action. End with:

- commands that passed or failed;
- external checks not run;
- files changed by an authorized fix;
- backlog updates, if the request asked for them.

Passing typecheck or bundle generation proves compilation only; it does not replace interaction QA.
