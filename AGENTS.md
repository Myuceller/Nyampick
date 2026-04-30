# Codex Project Memory

This file is the project-level memory for Codex. Keep it short, operational, and updated when the project workflow changes.

## Project

Nyampick is a mobile-first Next.js 14 App Router PWA for child meal records, fridge inventory, receipt scanning, and AI recipe recommendations.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript strict mode
- Tailwind CSS
- Supabase Auth/Database
- OpenAI API
- Zustand for complex client draft/UI state

## Working Rules

- Prefer small, measurable improvements over broad rewrites.
- Keep server data fetching/API contracts separate from client draft UI state.
- Put feature-scoped client state in `src/features/{feature}/stores`.
- Put truly shared app state in `src/lib/stores`.
- Keep API request/response shapes aligned with `src/lib/dto` and `docs/api-spec.md`.
- Do not commit secrets or real environment values.
- Record performance, API latency, and AI optimization results in `docs/performance-baseline.md`.

## Verification

Run the narrowest checks that match the change:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For Lighthouse:

```bash
npm run build
npm start
npm run lighthouse:landing
npm run lighthouse:home
npm run lighthouse:fridge
npm run lighthouse:recipe
```

## High-Value Work

Prioritize work that can be quantified and verified:

- Reduce route First Load JS and shared bundle size.
- Improve Lighthouse Performance, LCP, CLS, and TBT.
- Measure and reduce API average latency and p95.
- Track OpenAI latency, token usage, parse success rate, fallback rate, and failure rate.
- Add tests around mappers, normalization, store actions, and server business logic.

## Codex Workflow

Use `docs/codex-workflow.md` as the local equivalent of a Claude Code HOWTO:

- Project memory: this `AGENTS.md`
- Slash command equivalents: reusable request templates in `docs/codex-workflow.md`
- Skills/workflows: focused recipes for performance, AI optimization, code review, and refactoring
- Subagent equivalents: use only when explicitly requested by the user
- Hooks/checkpoints equivalents: manual verification checklists and measurable baseline updates
