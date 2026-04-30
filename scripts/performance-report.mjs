import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const historyPath = path.join(root, "docs", "performance-history.json");
const chartPath = path.join(root, "docs", "performance-chart.svg");

const history = JSON.parse(await readFile(historyPath, "utf8"));
const rows = history.filter(
  (entry) =>
    typeof entry.after === "number" &&
    entry.unit === "kB" &&
    (entry.metric === "route_size" || entry.metric === "first_load_js")
);

const width = 920;
const rowHeight = 88;
const top = 96;
const left = 270;
const chartWidth = 410;
const chartHeight = 42;
const valueLeft = left + chartWidth + 32;

const groups = [];
const groupMap = new Map();

for (const entry of rows) {
  const key = `${entry.route}|${entry.metric}|${entry.unit}`;
  let group = groupMap.get(key);
  if (!group) {
    group = {
      key,
      route: entry.route,
      metric: entry.metric,
      unit: entry.unit,
      entries: [],
      values: [],
    };
    groupMap.set(key, group);
    groups.push(group);
  }

  group.entries.push(entry);
  if (group.values.length === 0 && typeof entry.before === "number") {
    group.values.push({
      date: entry.date,
      label: "before",
      value: entry.before,
      change: entry.change,
    });
  }
  group.values.push({
    date: entry.date,
    label: "after",
    value: entry.after,
    change: entry.change,
  });
}

const height = top + groups.length * rowHeight + 82;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatValue(value, unit) {
  return `${Number(value.toFixed(2))} ${unit}`;
}

function truncateText(value, maxLength = 34) {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function trendPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function buildTrend(group, y) {
  const values = group.values;
  const minValue = Math.min(...values.map((point) => point.value));
  const maxValue = Math.max(...values.map((point) => point.value));
  const span = Math.max(0.01, maxValue - minValue);
  const paddedMin = minValue - span * 0.15;
  const paddedMax = maxValue + span * 0.15;
  const paddedSpan = paddedMax - paddedMin;
  const pointGap = values.length > 1 ? chartWidth / (values.length - 1) : 0;
  const points = values.map((point, index) => ({
    ...point,
    x: values.length > 1 ? left + pointGap * index : left + chartWidth / 2,
    y: y + 10 + chartHeight - ((point.value - paddedMin) / paddedSpan) * chartHeight,
  }));
  const path = points.length > 1 ? trendPath(points) : "";
  const valueLabels = points
    .map((point, index) => {
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      const dx = index === 0 ? -2 : index === points.length - 1 ? 2 : 0;
      return `<text x="${(point.x + dx).toFixed(1)}" y="${y + 72}" text-anchor="${anchor}" font-size="11" fill="#6f7875">${escapeXml(formatValue(point.value, group.unit))}</text>`;
    })
    .join("\n");

  return `
    <line x1="${left}" y1="${y + 52}" x2="${left + chartWidth}" y2="${y + 52}" stroke="#ecf0ee" stroke-width="1" />
    ${path ? `<path d="${path}" fill="none" stroke="#57bf8e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ""}
    ${points
      .map(
        (point, index) =>
          `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 5 : 4}" fill="${index === points.length - 1 ? "#202725" : "#57bf8e"}" />`
      )
      .join("\n")}
    ${valueLabels}
  `;
}

const rowSvg = groups
  .map((group, index) => {
    const y = top + index * rowHeight;
    const label = `${group.route} ${group.metric.replaceAll("_", " ")}`;
    const first = group.values[0];
    const latest = group.values.at(-1);
    const totalDelta = latest.value - first.value;
    const totalDeltaText =
      group.values.length > 1
        ? `${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(2)} ${group.unit}`
        : "new";
    const pointLabel = group.values.length === 1 ? "point" : "points";
    const recent = group.entries.at(-1);
    const recentDelta =
      typeof recent.before === "number"
        ? `${recent.after - recent.before >= 0 ? "+" : ""}${(recent.after - recent.before).toFixed(2)} ${group.unit}`
        : "new";

    return [
      `<text x="24" y="${y + 18}" font-size="15" font-weight="700" fill="#202725">${escapeXml(label)}</text>`,
      `<text x="24" y="${y + 39}" font-size="12" fill="#6f7875">${escapeXml(group.values.length)} ${pointLabel} · total ${escapeXml(totalDeltaText)}</text>`,
      `<text x="24" y="${y + 58}" font-size="12" fill="#6f7875">latest ${escapeXml(recent.date)} · ${escapeXml(recentDelta)}</text>`,
      buildTrend(group, y),
      `<text x="${valueLeft}" y="${y + 22}" font-size="12" fill="#6f7875">first ${escapeXml(formatValue(first.value, group.unit))}</text>`,
      `<text x="${valueLeft}" y="${y + 44}" font-size="12" font-weight="700" fill="#202725">latest ${escapeXml(formatValue(latest.value, group.unit))}</text>`,
      `<text x="${valueLeft}" y="${y + 66}" font-size="12" fill="#6f7875">${escapeXml(truncateText(recent.change))}</text>`,
    ].join("\n");
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Performance Trend History</title>
  <desc id="desc">Route size and first load JavaScript trends grouped by route and metric from docs/performance-history.json.</desc>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="24" y="34" font-size="24" font-weight="800" fill="#202725">Performance Trend History</text>
  <text x="24" y="58" font-size="13" fill="#6f7875">Grouped by route and metric from docs/performance-history.json</text>
  <g>
    <circle cx="${left}" cy="72" r="4" fill="#57bf8e" />
    <text x="${left + 12}" y="76" font-size="12" fill="#6f7875">Historical point</text>
    <circle cx="${left + 142}" cy="72" r="5" fill="#202725" />
    <text x="${left + 154}" y="76" font-size="12" fill="#6f7875">Latest point</text>
  </g>
  ${rowSvg}
</svg>
`;

await mkdir(path.dirname(chartPath), { recursive: true });
await writeFile(chartPath, svg);
console.log(`Wrote ${path.relative(root, chartPath)}`);
