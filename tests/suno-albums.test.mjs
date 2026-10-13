import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { observation } from '../src/observation.mjs';
import { catalog } from '../src/vault.mjs';
import { compose } from '../src/metabolizer.mjs';

const folder = new URL('../captures/suno/albums/', import.meta.url);
const importer = new URL('../scripts/ingest-suno-albums.mjs', import.meta.url).pathname;

test('Suno album capture is a complete, bounded source-labeled collection', async () => {
  const names = (await readdir(folder)).filter(name => name.endsWith('.observation.json')).sort();
  assert.equal(names.length, 6);
  const records = await Promise.all(names.map(async name => {
    const raw = JSON.parse(await readFile(new URL(name, folder), 'utf8'));
    return observation(raw);
  }));
  assert.equal(new Set(records.map(x => x.artifact.externalId)).size, 6);
  assert.equal(records.reduce((n, x) => n + x.facts.find(f => f.key === 'track_count').value, 0), 52);
  for (const item of records) {
    assert.equal(item.artifact.kind, 'album');
    assert.equal(item.capture.rights, 'links-only');
    assert.equal(item.capture.method, 'manual-transcription');
    assert.equal(item.capture.sourceUrl, item.artifact.title === 'Blue Night Morning' ? item.artifact.url : 'https://suno.com/@thestaticcollective');
    assert.match(item.artifact.url, /^https:\/\/suno\.com\/album\/[a-f0-9-]+$/);
    assert.ok(item.facts.every(f => f.basis === 'source-visible'));
    assert.equal(item.facts.some(f => /^(release_date|visibility|bpm)$/.test(f.key)), false);
  }
  const blue = records.find(x => x.artifact.title === 'Blue Night Morning');
  assert.ok(blue, 'new album observation is included');
  assert.equal(blue.facts.find(f => f.key === 'album_created_date').value, '2026-10-13');
  assert.equal(blue.facts.find(f => f.key === 'track_count').value, 9);
  const titles = ['Blue Night Morning Bloom', 'Home With You', 'Own Our Color',
    'Between the Pines', 'Dusty Underground Currents', 'Through the Wave',
    'Blooming Now', 'Sun Come Out', 'Toastbread Bed'];
  const durations = ['2:34','2:59','3:26','3:12','1:52','3:56','3:06','3:04','2:41'];
  for (let index = 1; index <= 9; index++) {
    const n = String(index).padStart(2, '0');
    assert.equal(blue.facts.find(f => f.key === `track_${n}_title`).value, titles[index-1]);
    assert.equal(blue.facts.find(f => f.key === `track_${n}_duration`).value, durations[index-1]);
  }
  const recipe = compose(records, { mode: 'narrative', seed: 325 });
  assert.equal(recipe.sources.length, 6);
  assert.equal(recipe.constraints.assetPolicy, 'references-only');
});

test('Suno album importer writes an idempotent local SIA vault', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sia-suno-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const run = () => JSON.parse(execFileSync(process.execPath, [importer, '--vault', dir], { encoding: 'utf8' }));
  assert.equal(run().imported, 6);
  assert.equal(run().imported, 6);
  const items = await catalog(dir);
  assert.equal(items.length, 6);
  assert.ok(items.every(x => x.artifact.kind === 'album'));
});
