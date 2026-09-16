import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const checks = [
  ["src/app/layout.tsx", ["metadataBase", "openGraph", "alternates:", "application/ld+json"]],
  ["src/app/sitemap.ts", ["/guide/", 'path: "/privacy"', 'path: "/terms"']],
  ["src/app/robots.ts", ["/api/", "/auth", "/fridge", "/meal", "/recipe"]],
];
const errors = [];

for (const [file, tokens] of checks) {
  const path = join(root, file);
  if (!existsSync(path)) {
    errors.push(`${file} is missing.`);
    continue;
  }
  const source = readFileSync(path, "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${file} is missing SEO baseline: ${token}`);
  }
}

if (errors.length) {
  console.error("Web SEO harness check failed:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("Web SEO harness check passed.");
