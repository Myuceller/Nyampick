import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const historyPath = path.join(root, "docs", "ai-performance-history.json");
const reportPath = path.join(root, "docs", "ai-performance-report.md");
const chartPath = path.join(root, "docs", "ai-performance-chart.svg");

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function summarize(rows) {
  const total = rows.length;
  const successRows = rows.filter((row) => row.ok !== false);
  const parseRows = rows.filter((row) => row.parseSuccess === true);
  const fallbackRows = rows.filter((row) => row.fallbackUsed === true);
  const latencyValues = rows.map((row) => row.latencyMs);
  const tokenValues = rows.map((row) => row.totalTokens);
  const validRates = rows.map((row) => row.validRecommendationRate);

  return {
    total,
    averageLatencyMs: average(latencyValues),
    p95LatencyMs: percentile(latencyValues, 95),
    averageTokens: average(tokenValues),
    parseSuccessRate: total > 0 ? parseRows.length / total : null,
    fallbackRate: total > 0 ? fallbackRows.length / total : null,
    failureRate: total > 0 ? (total - successRows.length) / total : null,
    validRecommendationRate: average(validRates),
  };
}

async function readHistory() {
  try {
    const text = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildMarkdown(entries) {
  const groups = groupByFeature(entries);
  const generatedAt = new Date().toISOString();

  if (groups.length === 0) {
    return `# AI Performance Report

Generated at: ${generatedAt}

No AI performance entries recorded yet.

Add rows to \`docs/ai-performance-history.json\` using the format documented in \`docs/performance-baseline.md\`, then run:

\`\`\`bash
npm run ai:report
\`\`\`
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
        `| ${entry.createdAt ?? entry.date ?? "TBD"} | ${entry.feature ?? "unknown"} | ${entry.caseId ?? "-"} | ${formatMs(entry.latencyMs)} | ${entry.totalTokens ?? "TBD"} | ${entry.fallbackUsed ? "yes" : "no"} | ${entry.ok === false ? "fail" : "ok"} |`
    )
    .join("\n");

  return `# AI Performance Report

Generated at: ${generatedAt}

Source: \`docs/ai-performance-history.json\`

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

function buildSvg(entries) {
  const groups = groupByFeature(entries);
  const width = 920;
  const height = groups.length > 0 ? 160 + groups.length * 96 : 260;
  const left = 240;
  const barWidth = 420;

  const body =
    groups.length === 0
      ? `<text x="32" y="132" font-size="15" fill="#6f7875">No AI performance entries recorded yet.</text>
  <text x="32" y="158" font-size="13" fill="#6f7875">Add rows to docs/ai-performance-history.json and run npm run ai:report.</text>`
      : groups
          .map(({ feature, rows }, index) => {
            const y = 116 + index * 96;
            const summary = summarize(rows);
            const latencySeconds = (summary.averageLatencyMs ?? 0) / 1000;
            const latencyRatio = Math.min(1, latencySeconds / 5);
            const tokenRatio = Math.min(1, (summary.averageTokens ?? 0) / 3000);
            const fallbackRatio = summary.fallbackRate ?? 0;
            return `<text x="32" y="${y}" font-size="15" font-weight="700" fill="#202725">${escapeXml(feature)}</text>
  <text x="32" y="${y + 22}" font-size="12" fill="#6f7875">${rows.length} runs · avg ${escapeXml(formatMs(summary.averageLatencyMs))} · p95 ${escapeXml(formatMs(summary.p95LatencyMs))}</text>
  <rect x="${left}" y="${y - 12}" width="${barWidth}" height="12" rx="3" fill="#ecf0ee" />
  <rect x="${left}" y="${y - 12}" width="${(barWidth * latencyRatio).toFixed(1)}" height="12" rx="3" fill="#57bf8e" />
  <text x="${left + barWidth + 18}" y="${y - 2}" font-size="12" fill="#202725">latency ${escapeXml(formatMs(summary.averageLatencyMs))}</text>
  <rect x="${left}" y="${y + 14}" width="${barWidth}" height="12" rx="3" fill="#ecf0ee" />
  <rect x="${left}" y="${y + 14}" width="${(barWidth * tokenRatio).toFixed(1)}" height="12" rx="3" fill="#8ccfb0" />
  <text x="${left + barWidth + 18}" y="${y + 24}" font-size="12" fill="#202725">tokens ${summary.averageTokens == null ? "TBD" : Math.round(summary.averageTokens)}</text>
  <rect x="${left}" y="${y + 40}" width="${barWidth}" height="12" rx="3" fill="#ecf0ee" />
  <rect x="${left}" y="${y + 40}" width="${(barWidth * fallbackRatio).toFixed(1)}" height="12" rx="3" fill="#f2b84b" />
  <text x="${left + barWidth + 18}" y="${y + 50}" font-size="12" fill="#202725">fallback ${escapeXml(formatRate(summary.fallbackRate))}</text>`;
          })
          .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">AI Performance Report</title>
  <desc id="desc">Aggregated AI latency, token usage, fallback rate, and failure rate from docs/ai-performance-history.json.</desc>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="32" y="42" font-size="24" font-weight="800" fill="#202725">AI Performance Report</text>
  <text x="32" y="68" font-size="13" fill="#6f7875">Latency, tokens, fallback rate, and failure rate from docs/ai-performance-history.json</text>
  ${body}
</svg>
`;
}

const entries = await readHistory();
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, buildMarkdown(entries));
await writeFile(chartPath, buildSvg(entries));

console.log(`Wrote ${path.relative(root, reportPath)}`);
console.log(`Wrote ${path.relative(root, chartPath)}`);
