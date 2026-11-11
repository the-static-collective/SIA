// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { observedAlbumToCards, bankExport } from '../adapters/sia/album-title-bridge.mjs';

const read = name => JSON.parse(readFileSync(new URL('../fixtures/sia/' + name + '.observation.json', import.meta.url),'utf8'));
const blue=read('blue-night-morning'), week=read('a-week-together');

test('album-title bridge emits 11 uniquely sourced motif cards, no fictional assertions', () => {
  const result=bankExport([blue,week]);
  assert.equal(result.schema,'static-story-dna-bank/v1');
  assert.equal(result.custom.length,11);
  assert.equal(new Set(result.custom.map(c=>c.id)).size,11);
  for(const c of result.custom){
    assert.equal(c.kind,'motif');
    assert.equal(c.custom,true);
    assert.match(c.detail,/Title words only/);
    assert.match(c.status,/SOURCE-CLAIMED TITLE/);
    assert.match(c.source,/^https:\/\/suno.com\//);
  }
});

test('SIA motif identity is independent of input order and stable across calls', () => {
  const r1=bankExport([blue,week]),r2=bankExport([week,blue]),r3=bankExport([blue,week]);
  assert.deepEqual(r1,r3);
  assert.deepEqual(new Set(r1.custom.map(x=>x.id)),new Set(r2.custom.map(x=>x.id)));
});

test('album-only keeps exactly one seed per album', () => {
  const result=bankExport([blue,week],{includeTracks:false});
  assert.equal(result.custom.length,2);
  assert.deepEqual(observedAlbumToCards(week),observedAlbumToCards(week));
});

test('SIA bridge rejects unsupported, unattributed and unauthenticated-looking inputs', () => {
  assert.throws(()=>bankExport([]),/1–100/);
  assert.throws(()=>bankExport([{schema:'nope'}]),/Requires an SIA observation/);
  const broken=JSON.parse(JSON.stringify(blue));broken.capture.method='hidden-scrape';
  assert.throws(()=>bankExport([broken]),/capture method invalid/);
  const bad=JSON.parse(JSON.stringify(blue));bad.artifact.url='http://example.com';
  assert.throws(()=>bankExport([bad]),/source URL/);
});
