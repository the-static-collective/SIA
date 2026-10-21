#!/usr/bin/env node
/**
 * End-to-end browser smoke test.
 * Two explicitly permitted visits to one public documentation URL, then
 * offline comparison, timeline reconstruction, review, and local admission.
 *
 * Requires separately installed playwright + browser runtime.
 * This program is opt-in; it does not schedule or discover URLs.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = 'https://example.org/';
const domain = 'example.org';
const root = await mkdtemp(join(tmpdir(), 'fishbone-live-'));
const captureDir = join(root, 'captures');
const vaultDir = join(root, 'vault');
const script = 'tools/fishbone/cli.mjs';
const run = (...args) => {
  const output = execFileSync(process.execPath, [script, ...args], {
    encoding: 'utf8', cwd: process.cwd(),
    timeout: 90_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, CI: 'true' }
  });
  return JSON.parse(output);
};

try {
  console.log('FISHBONE live browser smoke: validating robots and capturing one explicit public URL.');
  const first = run('capture', url, '--allow-domain', domain, '--out', captureDir);
  assert.equal(first.status, 'CAPTURED_NOT_ADMITTED');
  await new Promise(resolve => setTimeout(resolve, 1250));
  const second = run('capture', url, '--allow-domain', domain, '--out', captureDir);
  assert.equal(second.status, 'CAPTURED_NOT_ADMITTED');
  assert.notEqual(first.witnessSha256, second.witnessSha256, 'Distinct capture events must have distinct hashes');
  const older = JSON.parse(await readFile(first.file, 'utf8'));
  const newer = JSON.parse(await readFile(second.file, 'utf8'));
  assert.equal(older.finalUrl, url);
  assert.equal(newer.finalUrl, url);
  assert.equal(older.method, 'playwright-browser-observation');
  assert.equal(newer.method, 'playwright-browser-observation');
  assert.ok(older.title.length > 0, 'Rendered page has a title');
  assert.ok(older.visibleText.length > 0, 'Rendered page has visible text');
  const pair = run('compare', first.file, second.file);
  assert.equal(pair.status, 'HOLD');
  assert.equal(pair.sourceUrl, url);
  assert.equal(pair.verdict, 'UNCHANGED',
    'The static example.org page should preserve its visible content between visits');
  const history = run('history', url, '--allow-domain', domain, '--from', captureDir);
  assert.equal(history.status, 'LOCAL_HOLD');
  assert.equal(history.observations, 2);
  assert.deepEqual(history.entries.map(x => x.comparisonStatus),
    ['FIRST_OBSERVATION', 'UNCHANGED']);
  const preview = run('preview', second.file);
  assert.equal(preview.status, 'HOLD');
  assert.equal(preview.proposedObservation.capture.method, 'browser-observation');
  assert.equal(preview.proposedObservation.capture.rights, 'links-only');
  const admitted = run('admit', second.file, '--reviewed', '--vault', vaultDir);
  assert.equal(admitted.status, 'LOCAL_ADMISSION');
  assert.match(admitted.id, /^sha256:[0-9a-f]{64}$/);
  const recorded = JSON.parse(await readFile(join(vaultDir, 'objects', admitted.id.slice(7) + '.json'), 'utf8'));
  assert.equal(recorded.capture.rights, 'links-only');
  assert.equal(recorded.artifact.url, url);
  console.log(JSON.stringify({
    outcome: 'PASS', browser: 'Playwright Chromium (real browser visit)',
    source: url, robots: 'checked by FISHBONE before navigation',
    captures: 2, comparison: pair.verdict,
    history: history.entries.map(e => e.comparisonStatus),
    admission: admitted.status, admittedId: admitted.id,
    note: 'Local example.org smoke only; no Suno automated visit and no external publication.'
  }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
