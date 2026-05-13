import { performance } from 'node:perf_hooks';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_ENDPOINTS = [
  '/api/home/summary',
  '/api/fridge/items',
  '/api/recipes/saved',
  '/api/profile',
  '/api/children',
  '/api/family',
];

const DEFAULT_ORIGINS = [
  'https://www.nyampick.kr',
  'http://localhost:3000',
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function parseList(value, fallback) {
  return (value ?? fallback.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readCredential(name, prompt) {
  if (process.env[name]) return process.env[name];
  if (name.toLowerCase().includes('password') && input.isTTY) {
    return await readHidden(prompt);
  }
  const rl = createInterface({ input, output });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function readHidden(prompt) {
  return new Promise((resolve) => {
    output.write(prompt);
    const chunks = [];

    const onData = (chunk) => {
      const value = chunk.toString('utf8');
      if (value === '\u0003') {
        output.write('\n');
        process.exit(130);
      }
      if (value.includes('\n') || value.includes('\r')) {
        chunks.push(value.replace(/[\r\n]/g, ''));
        input.off('data', onData);
        input.setRawMode(false);
        input.pause();
        output.write('\n');
        resolve(chunks.join(''));
        return;
      }
      if (value === '\u007f') {
        chunks.pop();
        return;
      }
      chunks.push(value);
    };

    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function signIn() {
  const supabase = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const email = await readCredential('NYAMPICK_TEST_EMAIL', 'Email: ');
  const password = await readCredential('NYAMPICK_TEST_PASSWORD', 'Password: ');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Supabase sign-in did not return an access token.');
  return data.session.access_token;
}

async function measure(url, token) {
  const startedAt = performance.now();
  let status = 0;
  let bytes = 0;
  let ok = false;
  let error = '';

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    status = response.status;
    const text = await response.text();
    bytes = Buffer.byteLength(text);
    ok = response.ok;
    if (!response.ok) error = text.slice(0, 120).replace(/\s+/g, ' ');
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return {
    ms: Math.round(performance.now() - startedAt),
    status,
    bytes,
    ok,
    error,
  };
}

function average(values) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function printTable(rows) {
  const headers = ['Origin', 'Endpoint', 'Runs', 'Avg', 'P95', 'Min', 'Max', 'Status'];
  const widths = headers.map((header) => header.length);
  const cells = rows.map((row) => [
    row.origin,
    row.endpoint,
    String(row.runs),
    `${row.avg}ms`,
    `${row.p95}ms`,
    `${row.min}ms`,
    `${row.max}ms`,
    row.status,
  ]);

  for (const row of cells) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], cell.length);
    });
  }

  const formatRow = (row) =>
    `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`;

  console.log(formatRow(headers));
  console.log(`| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`);
  for (const row of cells) console.log(formatRow(row));
}

async function main() {
  const origins = parseList(process.env.NYAMPICK_BENCH_ORIGINS, DEFAULT_ORIGINS);
  const endpoints = parseList(process.env.NYAMPICK_BENCH_ENDPOINTS, DEFAULT_ENDPOINTS);
  const runs = Number(process.env.NYAMPICK_BENCH_RUNS ?? 3);
  if (!Number.isInteger(runs) || runs < 1) throw new Error('NYAMPICK_BENCH_RUNS must be a positive integer.');

  const token = await signIn();
  const rows = [];

  for (const origin of origins) {
    for (const endpoint of endpoints) {
      const results = [];
      for (let index = 0; index < runs; index += 1) {
        results.push(await measure(new URL(endpoint, origin).toString(), token));
      }
      const times = results.map((result) => result.ms);
      const failed = results.find((result) => !result.ok);
      rows.push({
        origin,
        endpoint,
        runs,
        avg: average(times),
        p95: percentile(times, 95),
        min: Math.min(...times),
        max: Math.max(...times),
        status: failed ? `${failed.status || 'ERR'} ${failed.error}`.trim() : 'ok',
      });
    }
  }

  printTable(rows);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
