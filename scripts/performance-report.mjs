import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const historyPath = path.join(root, "docs", "performance-history.json");
const reportPath = path.join(root, "docs", "performance-history-report.md");

function formatValue(value, unit) {
  if (typeof value !== "number") return "-";
  return `${Number(value.toFixed(2))} ${unit}`;
}

function formatDelta(before, after, unit) {
  if (typeof before !== "number" || typeof after !== "number") return "new";
  const delta = after - before;
  return `${delta >= 0 ? "+" : ""}${Number(delta.toFixed(2))} ${unit}`;
}

const parsed = JSON.parse(await readFile(historyPath, "utf8"));
const history = Array.isArray(parsed) ? parsed : [];
const generatedAt = new Date().toISOString();

const rows = history
  .map(
    (entry) =>
      `| ${entry.date ?? "-"} | ${entry.route ?? "-"} | ${entry.metric ?? "-"} | ${formatValue(entry.before, entry.unit)} | ${formatValue(entry.after, entry.unit)} | ${formatDelta(entry.before, entry.after, entry.unit)} | ${entry.change ?? "-"} |`,
  )
  .join("\n");

const report = `# Performance History Report

Generated at: ${generatedAt}

Source: \`docs/performance-history.json\`

| Date | Route | Metric | Before | After | Delta | Note |
| --- | --- | --- | ---: | ---: | ---: | --- |
${rows || "| - | - | - | - | - | - | - |"}
`;

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, report);
process.stdout.write(`Wrote ${path.relative(root, reportPath)}\n`);
