# Nyampick workspace

Before changing a screen, native integration, shared contract, or web discoverability,
read [the cross-platform harness](skills/nyampick-cross-platform-harness/SKILL.md).

- Keep the existing Next.js web app at the repository root while native work lives in
  `apps/mobile`; do not move the web app as an incidental refactor.
- Native UI is a React Native implementation, not a port of DOM/Tailwind components.
  Apply the `nyampick-design` skill for Nyampick UI work.
- Share only platform-neutral contracts and domain logic. Never import Next.js pages,
  browser clients, or server-only modules into the mobile app.
- Treat the web's public guides, metadata, sitemap, and robots rules as SEO surfaces.
  Authenticated product routes and native screens are not SEO targets.
- Run `npm run platform:check` after cross-platform or SEO-harness changes.
