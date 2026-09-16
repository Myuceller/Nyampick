import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoots = [join(root, "src"), join(root, "apps", "mobile", "src")];
const sourceFiles = [...sourceRoots.flatMap(walk), join(root, "apps", "mobile", "App.tsx")];
const errors = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  if (/(?:from\s+|import\()\s*["']\.\.\//.test(source)) {
    errors.push(`${relative(root, file)} uses a parent-relative import; use an app alias instead.`);
  }
  if (/packages\/contracts\/src/.test(source)) {
    errors.push(`${relative(root, file)} reaches into the contracts source; use @nyampick/contracts/* instead.`);
  }
}

const rootTsconfig = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"));
const mobileTsconfig = JSON.parse(readFileSync(join(root, "apps", "mobile", "tsconfig.json"), "utf8"));
const contractsPackage = JSON.parse(readFileSync(join(root, "packages", "contracts", "package.json"), "utf8"));

if (rootTsconfig.compilerOptions?.paths?.["@/*"]?.[0] !== "./src/*") {
  errors.push("tsconfig.json must map @/* to ./src/*.");
}
if (mobileTsconfig.compilerOptions?.paths?.["@mobile/*"]?.[0] !== "./src/*") {
  errors.push("apps/mobile/tsconfig.json must map @mobile/* to ./src/*.");
}
if (contractsPackage.name !== "@nyampick/contracts" || !contractsPackage.exports?.["./legal"] || !contractsPackage.exports?.["./recipe"]) {
  errors.push("packages/contracts must expose the legal and recipe public entry points.");
}

if (errors.length) {
  console.error("Import boundary check failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Import boundary check passed.");
