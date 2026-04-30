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

function latestRowsByCase(entries) {
  const latest = new Map();
  for (const entry of entries) {
    const key = `${entry.feature ?? "unknown"}|${entry.caseId ?? "unknown"}`;
    latest.set(key, entry);
  }
  return [...latest.values()];
}

function trendPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function buildLineTrend(rows, options) {
  const nums = rows
    .map((row, index) => ({ row, index, value: options.value(row) }))
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));

  if (nums.length === 0) return "";

  const maxValue = Math.max(...nums.map((point) => point.value), options.maxHint ?? 0.01);
  const minValue = Math.min(...nums.map((point) => point.value), options.minHint ?? 0);
  const span = Math.max(0.01, maxValue - minValue);
  const pointGap = nums.length > 1 ? options.width / (nums.length - 1) : 0;
  const points = nums.map((point, index) => ({
    ...point,
    x: nums.length > 1 ? options.x + pointGap * index : options.x + options.width / 2,
    y: options.y + options.height - ((point.value - minValue) / span) * options.height,
  }));

  return `${points.length > 1 ? `<path d="${trendPath(points)}" fill="none" stroke="${options.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ""}
  ${points
    .map(
      (point, index) =>
        `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 5 : 4}" fill="${index === points.length - 1 ? "#202725" : options.color}" />`
    )
    .join("\n")}
  ${points
    .map((point, index) => {
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      return `<text x="${point.x.toFixed(1)}" y="${options.y + options.height + 22}" text-anchor="${anchor}" font-size="11" fill="#6f7875">${escapeXml(point.row.caseId ?? `#${point.index + 1}`)}</text>`;
    })
    .join("\n")}`;
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
  const latestEntries = latestRowsByCase(entries);
  const groups = groupByFeature(latestEntries);
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

function buildSvg(entries) {
  const width = 920;
  const height = entries.length > 0 ? 620 : 260;
  const chartX = 92;
  const chartWidth = 640;
  const chartHeight = 92;
  const latestEntries = latestRowsByCase(entries);
  const summary = summarize(latestEntries);

  const body =
    entries.length === 0
      ? `<text x="32" y="132" font-size="15" fill="#6f7875">No AI performance entries recorded yet.</text>
  <text x="32" y="158" font-size="13" fill="#6f7875">Add rows to docs/ai-performance-history.json and run npm run ai:report.</text>`
      : `<text x="32" y="112" font-size="15" font-weight="700" fill="#202725">Summary</text>
  <text x="32" y="136" font-size="12" fill="#6f7875">${latestEntries.length} latest cases · avg latency ${escapeXml(formatMs(summary.averageLatencyMs))} · p95 ${escapeXml(formatMs(summary.p95LatencyMs))} · avg tokens ${summary.averageTokens == null ? "TBD" : Math.round(summary.averageTokens)}</text>

  <text x="32" y="184" font-size="15" font-weight="700" fill="#202725">Latency Trend</text>
  <line x1="${chartX}" y1="284" x2="${chartX + chartWidth}" y2="284" stroke="#ecf0ee" />
  ${buildLineTrend(entries, {
    x: chartX,
    y: 194,
    width: chartWidth,
    height: chartHeight,
    color: "#57bf8e",
    value: (row) => row.latencyMs,
    minHint: 0,
  })}
  <text x="760" y="224" font-size="12" fill="#6f7875">lower is better</text>
  <text x="760" y="246" font-size="12" fill="#202725">slowest ${escapeXml(formatMs(Math.max(...entries.map((row) => row.latencyMs ?? 0))))}</text>

  <text x="32" y="354" font-size="15" font-weight="700" fill="#202725">Token Trend</text>
  <line x1="${chartX}" y1="454" x2="${chartX + chartWidth}" y2="454" stroke="#ecf0ee" />
  ${buildLineTrend(entries, {
    x: chartX,
    y: 364,
    width: chartWidth,
    height: chartHeight,
    color: "#75b7d9",
    value: (row) => row.totalTokens,
    minHint: 0,
  })}
  <text x="760" y="394" font-size="12" fill="#6f7875">lower is cheaper</text>
  <text x="760" y="416" font-size="12" fill="#202725">max ${Math.max(...entries.map((row) => row.totalTokens ?? 0))} tokens</text>

  <text x="32" y="522" font-size="15" font-weight="700" fill="#202725">Latest Runs</text>
  ${entries
    .slice(-5)
    .map((row, index) => {
      const x = 32 + index * 170;
      return `<text x="${x}" y="550" font-size="12" font-weight="700" fill="#202725">${escapeXml(row.caseId ?? `#${index + 1}`)}</text>
  <text x="${x}" y="572" font-size="12" fill="#6f7875">${escapeXml(formatMs(row.latencyMs))}</text>
  <text x="${x}" y="594" font-size="12" fill="#6f7875">${row.totalTokens ?? "TBD"} tokens</text>`;
    })
    .join("\n")}`;

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
