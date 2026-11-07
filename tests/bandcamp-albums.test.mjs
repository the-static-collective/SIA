import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { observation } from '../src/observation.mjs';
import { catalog } from '../src/vault.mjs';

const folder = new URL('../captures/bandcamp/albums/', import.meta.url);
const importer = new URL('../scripts/ingest-bandcamp-albums.mjs', import.meta.url).pathname;

test('33 owner-supplied Bandcamp listings have source-bound album observations', async () => {
  const names = (await readdir(folder)).filter(name => name.endsWith('.observation.json')).sort();
  assert.equal(names.length, 33);
  const records = await Promise.all(names.map(async name => observation(JSON.parse(await readFile(new URL(name, folder), 'utf8')))));
  assert.equal(new Set(records.map(x => x.artifact.externalId)).size, 33);
  assert.deepEqual(records.map(r => r.facts.find(f => f.key === 'album_list_position').value).sort((a,b)=>a-b), Array.from({length:33},(_,i)=>i+1));
  for (const record of records) {
    assert.equal(record.artifact.kind, 'album');
    assert.match(record.artifact.externalId, /^bandcamp:album:\d+$/);
    assert.match(record.artifact.url, /^https:\/\/thestaticcollective\.bandcamp\.com\/album\//);
    assert.equal(record.capture.sourceUrl, 'https://thestaticcollective.bandcamp.com/');
    assert.equal(record.capture.rights, 'links-only');
    assert.equal(record.capture.method, 'manual-transcription');
    assert.equal(record.facts.some(f => f.key === 'release_date'), false);
  }
});

test('Bandcamp metadata-only importer is repeatable and idempotent', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sia-bandcamp-'));
  t.after(() => rm(dir, {recursive:true, force:true}));
  const run = () => JSON.parse(execFileSync(process.execPath, [importer, '--vault', dir], {encoding:'utf8'}));
  assert.equal(run().imported, 33);
  assert.equal(run().imported, 33);
  const items = await catalog(dir);
  assert.equal(items.length, 33);
});
