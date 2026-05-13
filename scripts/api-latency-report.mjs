import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'docs/api-latency-history.md');
const outputPath = path.join(root, 'docs/api-latency-chart.svg');

const endpoints = [
  '/api/home/summary',
  '/api/fridge/items',
  '/api/recipes/saved',
  '/api/profile',
  '/api/children',
  '/api/family',
];

const series = [
  { key: 'before-region-fix:deployed', label: 'Before deploy', color: '#ef4444' },
  { key: 'after-region-fix:deployed', label: 'After deploy', color: '#2563eb' },
  { key: 'after-region-fix:local', label: 'Local', color: '#16a34a' },
];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function splitRow(line) {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseRows(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));
  const header = splitRow(lines[0]);
  return lines
    .slice(2)
    .map(splitRow)
    .filter((cells) => cells.length === header.length)
    .map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index]])));
}

function yFor(value, max, top, height) {
  return top + height - (value / max) * height;
}

function formatEndpoint(endpoint) {
  return endpoint.replace('/api/', '');
}

async function main() {
  const markdown = await readFile(inputPath, 'utf8');
  const rows = parseRows(markdown).map((row) => ({
    scenario: row.Scenario,
    origin: row.Origin,
    endpoint: row.Endpoint,
    avg: Number(row['Avg ms']),
    p95: Number(row['P95 ms']),
  }));

  const values = rows.map((row) => row.avg);
  const max = Math.ceil(Math.max(...values) / 500) * 500;
  const width = 1120;
  const height = 680;
  const left = 110;
  const top = 120;
  const chartWidth = 900;
  const chartHeight = 420;
  const groupWidth = chartWidth / endpoints.length;
  const barWidth = 20;

  const rowMap = new Map(rows.map((row) => [`${row.scenario}:${row.origin}:${row.endpoint}`, row]));

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = top + chartHeight - chartHeight * ratio;
      const value = Math.round(max * ratio);
      return `
        <line x1="${left}" y1="${y}" x2="${left + chartWidth}" y2="${y}" stroke="#e5e7eb" />
        <text x="${left - 14}" y="${y + 4}" text-anchor="end" class="axis">${value}ms</text>`;
    })
    .join('');

  const bars = endpoints
    .map((endpoint, endpointIndex) => {
      const baseX = left + endpointIndex * groupWidth + groupWidth / 2 - (series.length * barWidth + 12) / 2;
      const labelX = left + endpointIndex * groupWidth + groupWidth / 2;
      const rects = series
        .map((item, seriesIndex) => {
          const row = rowMap.get(`${item.key}:${endpoint}`);
          if (!row) return '';
          const x = baseX + seriesIndex * (barWidth + 6);
          const y = yFor(row.avg, max, top, chartHeight);
          const h = top + chartHeight - y;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3" fill="${item.color}">
              <title>${escapeXml(`${item.label} ${endpoint}: avg ${row.avg}ms, p95 ${row.p95}ms`)}</title>
            </rect>
            <text x="${x + barWidth / 2}" y="${y - 7}" text-anchor="middle" class="value">${row.avg}</text>`;
        })
        .join('');
      return `
        ${rects}
        <text x="${labelX}" y="${top + chartHeight + 28}" text-anchor="middle" class="endpoint">${escapeXml(formatEndpoint(endpoint))}</text>`;
    })
    .join('');

  const legend = series
    .map((item, index) => {
      const x = 700 + index * 130;
      return `<rect x="${x}" y="70" width="12" height="12" rx="2" fill="${item.color}" /><text x="${x + 18}" y="81" class="legend">${escapeXml(item.label)}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">API latency before and after deployment fix</title>
  <desc id="desc">Average API response time comparison generated from docs/api-latency-history.md.</desc>
  <style>
    .title { font: 700 25px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #111827; }
    .subtitle { font: 400 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #64748b; }
    .axis { font: 400 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #64748b; }
    .endpoint { font: 600 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334155; }
    .value { font: 700 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334155; }
    .legend { font: 600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334155; }
  </style>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="54" y="56" class="title">API Latency: Before vs After Region Fix</text>
  <text x="54" y="82" class="subtitle">Average response time in milliseconds. Lower is better. After deploy uses hnd1 instead of iad1.</text>
  ${legend}
  <line x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}" stroke="#cbd5e1" />
  <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#cbd5e1" />
  ${grid}
  ${bars}
</svg>
`;

  await writeFile(outputPath, svg);
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
