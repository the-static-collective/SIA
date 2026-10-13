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
  assert.equal(names.length, 5);
  const records = await Promise.all(names.map(async name => {
    const raw = JSON.parse(await readFile(new URL(name, folder), 'utf8'));
    return observation(raw);
  }));
  assert.equal(new Set(records.map(x => x.artifact.externalId)).size, 5);
  assert.equal(records.reduce((n, x) => n + x.facts.find(f => f.key === 'track_count').value, 0), 43);
  for (const item of records) {
    assert.equal(item.artifact.kind, 'album');
    assert.equal(item.capture.rights, 'links-only');
    assert.equal(item.capture.method, 'manual-transcription');
    assert.equal(item.capture.sourceUrl, 'https://suno.com/@thestaticcollective');
    assert.match(item.artifact.url, /^https:\/\/suno\.com\/album\/[a-f0-9-]+$/);
    assert.ok(item.facts.every(f => f.basis === 'source-visible'));
    assert.equal(item.facts.some(f => /^(release_date|visibility|bpm)$/.test(f.key)), false);
  }
  const recipe = compose(records, { mode: 'narrative', seed: 325 });
  assert.equal(recipe.sources.length, 5);
  assert.equal(recipe.constraints.assetPolicy, 'references-only');
});

test('Suno album importer writes an idempotent local SIA vault', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sia-suno-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const run = () => JSON.parse(execFileSync(process.execPath, [importer, '--vault', dir], { encoding: 'utf8' }));
  assert.equal(run().imported, 5);
  assert.equal(run().imported, 5);
  const items = await catalog(dir);
  assert.equal(items.length, 5);
  assert.ok(items.every(x => x.artifact.kind === 'album'));
});
