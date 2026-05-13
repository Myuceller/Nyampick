import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'docs/lighthouse-performance-history.md');
const outputPath = path.join(root, 'docs/lighthouse-performance-trend.svg');

const routeOrder = ['/', '/fridge', '/recipe', '/mypage'];
const routeColors = {
  '/': '#2563eb',
  '/fridge': '#16a34a',
  '/recipe': '#dc2626',
  '/mypage': '#9333ea',
};

const metrics = [
  { key: 'performance', label: 'Performance score', unit: '', precision: 0 },
  { key: 'lcp', label: 'LCP seconds', unit: 's', precision: 2 },
  { key: 'speedIndex', label: 'Speed Index seconds', unit: 's', precision: 2 },
  { key: 'tbt', label: 'TBT milliseconds', unit: 'ms', precision: 0 },
];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseNumber(value) {
  const parsed = Number(String(value).replaceAll(',', '').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

function parseMarkdownTable(markdown) {
  const tableLines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  const headerLine = tableLines.find((line) => !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/.test(line));
  if (!headerLine) {
    throw new Error('Lighthouse history table header was not found.');
  }

  const headerIndex = tableLines.indexOf(headerLine);
  const headers = splitRow(headerLine);
  const rows = [];

  for (const line of tableLines.slice(headerIndex + 1)) {
    if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/.test(line)) continue;
    const cells = splitRow(line);
    if (cells.length !== headers.length) continue;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  }

  return rows;
}

function splitRow(line) {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function toRecord(row) {
  return {
    date: row.Date,
    env: row.Env,
    route: row.Route,
    performance: parseNumber(row.Performance),
    lcp: parseNumber(row['LCP s']),
    speedIndex: parseNumber(row['Speed Index s']),
    tbt: parseNumber(row['TBT ms']),
    notes: row.Notes,
  };
}

function formatValue(value, metric) {
  return `${value.toFixed(metric.precision)}${metric.unit}`;
}

function pointKey(row) {
  return `${row.date} ${row.env}`;
}

function xFor(index, total, left, width) {
  if (total === 1) return left + width / 2;
  return left + (width * index) / (total - 1);
}

function yFor(value, min, max, top, height) {
  if (max === min) return top + height / 2;
  return top + height - ((value - min) / (max - min)) * height;
}

function buildPanel({ metric, rows, measurementKeys, top, width }) {
  const left = 116;
  const chartWidth = width - left - 170;
  const chartHeight = 132;
  const values = rows.map((row) => row[metric.key]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = metric.key === 'performance' ? 2 : Math.max((rawMax - rawMin) * 0.12, rawMax * 0.04, 1);
  const min = metric.key === 'performance' ? Math.max(0, rawMin - padding) : Math.max(0, rawMin - padding);
  const max = metric.key === 'performance' ? Math.min(100, rawMax + padding) : rawMax + padding;

  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const y = top + chartHeight - ratio * chartHeight;
      const value = min + (max - min) * ratio;
      return `
        <line x1="${left}" y1="${y}" x2="${left + chartWidth}" y2="${y}" stroke="#e5e7eb" />
        <text x="${left - 12}" y="${y + 4}" text-anchor="end" class="axis">${escapeXml(formatValue(value, metric))}</text>`;
    })
    .join('');

  const series = routeOrder
    .map((route) => {
      const routeRows = rows
        .filter((row) => row.route === route)
        .sort((a, b) => measurementKeys.indexOf(pointKey(a)) - measurementKeys.indexOf(pointKey(b)));
      if (routeRows.length === 0) return '';

      const points = routeRows.map((row) => {
        const x = xFor(measurementKeys.indexOf(pointKey(row)), measurementKeys.length, left, chartWidth);
        const y = yFor(row[metric.key], min, max, top, chartHeight);
        return { x, y, row };
      });

      const pathData = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
      const color = routeColors[route];
      const line = points.length > 1 ? `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.4" />` : '';
      const dots = points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="#ffffff" stroke="${color}" stroke-width="2.4">
              <title>${escapeXml(`${route} ${point.row.date}: ${formatValue(point.row[metric.key], metric)}`)}</title>
            </circle>`,
        )
        .join('');
      const lastPoint = points.at(-1);
      const labelX = Math.min(lastPoint.x + 9, left + chartWidth + 8);
      return `${line}${dots}<text x="${labelX}" y="${lastPoint.y + 4}" class="series-label" fill="${color}">${escapeXml(route)}</text>`;
    })
    .join('');

  const labels = measurementKeys
    .map((key, index) => {
      const [date, ...envParts] = key.split(' ');
      const env = envParts.join(' ');
      const x = xFor(index, measurementKeys.length, left, chartWidth);
      return `
        <text x="${x}" y="${top + chartHeight + 24}" text-anchor="middle" class="axis">${escapeXml(date)}</text>
        <text x="${x}" y="${top + chartHeight + 39}" text-anchor="middle" class="axis sub">${escapeXml(env.replace('deployed-auth-', ''))}</text>`;
    })
    .join('');

  return `
    <g>
      <text x="${left}" y="${top - 18}" class="panel-title">${escapeXml(metric.label)}</text>
      <line x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}" stroke="#cbd5e1" />
      <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#cbd5e1" />
      ${grid}
      ${series}
      ${labels}
    </g>`;
}

async function main() {
  const markdown = await readFile(inputPath, 'utf8');
  const allRows = parseMarkdownTable(markdown).map(toRecord);
  const rows = allRows.filter((row) => row.env.startsWith('deployed-auth') && routeOrder.includes(row.route));
  if (rows.length === 0) {
    throw new Error('No deployed authenticated Lighthouse rows were found.');
  }

  const measurementKeys = [...new Set(rows.map(pointKey))].sort((a, b) => a.localeCompare(b));
  const width = 980;
  const panelGap = 204;
  const height = 128 + metrics.length * panelGap;
  const generatedAt = new Date().toISOString().slice(0, 10);
  const legend = routeOrder
    .map((route, index) => {
      const x = 540 + index * 96;
      return `<circle cx="${x}" cy="78" r="4" fill="${routeColors[route]}" /><text x="${x + 10}" y="82" class="legend">${escapeXml(route)}</text>`;
    })
    .join('');

  const panels = metrics
    .map((metric, index) =>
      buildPanel({
        metric,
        rows,
        measurementKeys,
        top: 126 + index * panelGap,
        width,
      }),
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Authenticated Lighthouse performance trend</title>
  <desc id="desc">Dot and line chart generated from docs/lighthouse-performance-history.md.</desc>
  <style>
    .title { font: 700 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #111827; }
    .subtitle { font: 400 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #64748b; }
    .panel-title { font: 700 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #1f2937; }
    .axis { font: 400 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #64748b; }
    .axis.sub { font-size: 10px; fill: #94a3b8; }
    .legend, .series-label { font: 600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  </style>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="48" y="50" class="title">Authenticated Lighthouse Performance Trend</text>
  <text x="48" y="76" class="subtitle">Source: docs/lighthouse-performance-history.md. Generated ${generatedAt}. Lower is better for LCP, Speed Index, and TBT.</text>
  ${legend}
  ${panels}
</svg>
`;

  await writeFile(outputPath, svg);
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
