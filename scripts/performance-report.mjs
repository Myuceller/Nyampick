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
const rowHeight = 54;
const top = 80;
const left = 220;
const barWidth = 560;
const height = top + rows.length * rowHeight + 72;
const maxValue = Math.max(...rows.flatMap((entry) => [entry.before ?? 0, entry.after]));

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bar(value, y, color) {
  if (typeof value !== "number") return "";
  const w = Math.max(2, (value / maxValue) * barWidth);
  return `<rect x="${left}" y="${y}" width="${w.toFixed(1)}" height="14" rx="4" fill="${color}" />`;
}

const rowSvg = rows
  .map((entry, index) => {
    const y = top + index * rowHeight;
    const label = `${entry.route} ${entry.metric.replaceAll("_", " ")}`;
    const beforeText = typeof entry.before === "number" ? `${entry.before} ${entry.unit}` : "-";
    const afterText = `${entry.after} ${entry.unit}`;
    const delta =
      typeof entry.before === "number"
        ? `${(entry.after - entry.before).toFixed(2)} ${entry.unit}`
        : "new";

    return [
      `<text x="24" y="${y + 18}" font-size="15" font-weight="700" fill="#202725">${escapeXml(label)}</text>`,
      `<text x="24" y="${y + 38}" font-size="12" fill="#6f7875">${escapeXml(entry.date)} · ${escapeXml(delta)}</text>`,
      bar(entry.before, y + 4, "#d6ddd9"),
      bar(entry.after, y + 24, "#57bf8e"),
      `<text x="${left + barWidth + 16}" y="${y + 16}" font-size="12" fill="#6f7875">before ${escapeXml(beforeText)}</text>`,
      `<text x="${left + barWidth + 16}" y="${y + 36}" font-size="12" font-weight="700" fill="#202725">after ${escapeXml(afterText)}</text>`,
    ].join("\n");
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Performance Change History</title>
  <desc id="desc">Route size and first load JavaScript changes generated from docs/performance-history.json.</desc>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="24" y="34" font-size="24" font-weight="800" fill="#202725">Performance Change History</text>
  <text x="24" y="58" font-size="13" fill="#6f7875">Generated from docs/performance-history.json</text>
  <g>
    <rect x="${left}" y="48" width="14" height="14" rx="4" fill="#d6ddd9" />
    <text x="${left + 22}" y="60" font-size="12" fill="#6f7875">Before</text>
    <rect x="${left + 88}" y="48" width="14" height="14" rx="4" fill="#57bf8e" />
    <text x="${left + 110}" y="60" font-size="12" fill="#6f7875">After</text>
  </g>
  ${rowSvg}
</svg>
`;

await mkdir(path.dirname(chartPath), { recursive: true });
await writeFile(chartPath, svg);
console.log(`Wrote ${path.relative(root, chartPath)}`);
