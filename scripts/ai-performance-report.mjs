import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const historyPath = path.join(root, "docs", "ai-performance-history.json");
const reportPath = path.join(root, "docs", "ai-performance-report.md");

function formatMs(value) {
  if (typeof value !== "number") return "TBD";
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
}

function formatRate(value) {
  if (typeof value !== "number") return "TBD";
  return `${Math.round(value * 100)}%`;
}

function average(values) {
  const nums = values.filter((value) => typeof value === "number");
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function percentile(values, percentileValue) {
  const nums = values
    .filter((value) => typeof value === "number")
    .sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const index = Math.ceil((percentileValue / 100) * nums.length) - 1;
  return nums[Math.max(0, Math.min(nums.length - 1, index))];
}

function groupByFeature(entries) {
  const map = new Map();
  for (const entry of entries) {
    const feature = entry.feature ?? "unknown";
    if (!map.has(feature)) map.set(feature, []);
    map.get(feature).push(entry);
  }
  return [...map.entries()].map(([feature, rows]) => ({ feature, rows }));
}

function latestRowsByCase(entries) {
  const latest = new Map();
  for (const entry of entries) {
    const key = `${entry.feature ?? "unknown"}|${entry.caseId ?? "unknown"}`;
    latest.set(key, entry);
  }
  return [...latest.values()];
}

function summarize(rows) {
  const total = rows.length;
  const successRows = rows.filter((row) => row.ok !== false);
  const parseRows = rows.filter((row) => row.parseSuccess === true);
  const fallbackRows = rows.filter((row) => row.fallbackUsed === true);

  return {
    total,
    averageLatencyMs: average(rows.map((row) => row.latencyMs)),
    p95LatencyMs: percentile(rows.map((row) => row.latencyMs), 95),
    averageTokens: average(rows.map((row) => row.totalTokens)),
    parseSuccessRate: total > 0 ? parseRows.length / total : null,
    fallbackRate: total > 0 ? fallbackRows.length / total : null,
    failureRate: total > 0 ? (total - successRows.length) / total : null,
    validRecommendationRate: average(rows.map((row) => row.validRecommendationRate)),
  };
}

async function readHistory() {
  try {
    const parsed = JSON.parse(await readFile(historyPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildMarkdown(entries) {
  const latestEntries = latestRowsByCase(entries);
  const groups = groupByFeature(latestEntries);
  const generatedAt = new Date().toISOString();

  if (groups.length === 0) {
    return `# AI Performance Report

Generated at: ${generatedAt}

No AI performance entries recorded yet.
`;
  }

  const rows = groups
    .map(({ feature, rows: featureRows }) => {
      const summary = summarize(featureRows);
      return `| ${feature} | ${summary.total} | ${formatMs(summary.averageLatencyMs)} | ${formatMs(summary.p95LatencyMs)} | ${summary.averageTokens == null ? "TBD" : Math.round(summary.averageTokens)} | ${formatRate(summary.parseSuccessRate)} | ${formatRate(summary.fallbackRate)} | ${formatRate(summary.failureRate)} | ${formatRate(summary.validRecommendationRate)} |`;
    })
    .join("\n");

  const latestRows = entries
    .slice(-10)
    .reverse()
    .map(
      (entry) =>
        `| ${entry.createdAt ?? entry.date ?? "TBD"} | ${entry.feature ?? "unknown"} | ${entry.caseId ?? "-"} | ${formatMs(entry.latencyMs)} | ${entry.totalTokens ?? "TBD"} | ${entry.fallbackUsed ? "yes" : "no"} | ${entry.ok === false ? "fail" : "ok"} |`,
    )
    .join("\n");

  return `# AI Performance Report

Generated at: ${generatedAt}

Source: \`docs/ai-performance-history.json\`

Summary is calculated from the latest run for each feature/case pair.

## Summary

| Feature | Runs | Avg latency | p95 latency | Avg tokens | Parse success | Fallback rate | Failure rate | Valid recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

## Latest Runs

| Created at | Feature | Case | Latency | Tokens | Fallback | Result |
| --- | --- | --- | ---: | ---: | --- | --- |
${latestRows}
`;
}

const entries = await readHistory();
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, buildMarkdown(entries));
process.stdout.write(`Wrote ${path.relative(root, reportPath)}\n`);
