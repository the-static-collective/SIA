import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeWitness } from '../tools/fishbone/core.mjs';
import { compareWitnesses, loadHistory, makeTimeline, readWitnessFile } from '../tools/fishbone/temporal.mjs';

const root = 'https://example.org/garden';
const at = (time, overrides = {}) => makeWitness({
  requestedUrl: root, finalUrl: root, allowedDomain: 'example.org',
  capturedAt: time, title: 'The Garden',
  text: 'One apple.\nTwo roses.',
  links: ['https://example.org/door-a'],
  ...overrides
});
const day1 = '2026-10-20T10:00:00.000Z';
const day2 = '2026-10-21T10:00:00.000Z';
const day3 = '2026-10-22T10:00:00.000Z';

test('new timestamp with identical observed content is unchanged; reports are deterministic', () => {
  const a = at(day1), b = at(day2);
  const change = compareWitnesses(a, b);
  assert.equal(change.verdict, 'UNCHANGED');
  assert.equal(change.changes.visibleText, null);
  assert.equal(change.changes.title, null);
  assert.deepEqual(change.changes.links.added, []);
  assert.equal(change.changeSha256, compareWitnesses(a, b).changeSha256);
  assert.equal(change.status, 'HOLD');
  assert.notEqual(a.witnessSha256, b.witnessSha256);
  assert.equal(a.contentSha256, b.contentSha256);
});

test('title, visible text and links produce inspectable, bounded change details', () => {
  const a = at(day1);
  const b = at(day2, {
    title: 'The New Garden',
    text: 'One apple.\nThree roses.',
    links: ['https://example.org/door-b']
  });
  const change = compareWitnesses(a, b);
  assert.equal(change.verdict, 'CHANGED');
  assert.deepEqual(change.changes.title, { before: 'The Garden', after: 'The New Garden' });
  assert.equal(change.changes.visibleText.beforeLength, a.visibleText.length);
  assert.match(change.changes.visibleText.afterExcerpt, /Three roses/);
  assert.deepEqual(change.changes.links.added, ['https://example.org/door-b']);
  assert.deepEqual(change.changes.links.removed, ['https://example.org/door-a']);
});

test('status-only change is recorded even without content change', () => {
  const a = at(day1);
  const b = at(day2, { status: 201 });
  assert.equal(a.contentSha256, b.contentSha256);
  const report = compareWitnesses(a, b);
  assert.equal(report.verdict, 'CHANGED');
  assert.deepEqual(report.changes.httpStatus, { before: 200, after: 201 });
});

test('refuse mismatched page identities, reversed timestamps and modified evidence', () => {
  const a = at(day1), b = at(day2);
  assert.throws(() => compareWitnesses(b, a), /timestamps/);
  assert.throws(() => compareWitnesses(a, at(day1)), /timestamps/);
  assert.throws(() => compareWitnesses(a, at(day2, {
    requestedUrl: 'https://example.org/other', finalUrl: 'https://example.org/other'
  })), /different final URLs/);
  assert.throws(() => compareWitnesses(a, { ...b, title: 'Falsified' }), /integrity/);
});

test('chronology is retained, adjacent deltas computed, and timestamp ties explicitly ambiguous', () => {
  const a = at(day1), b = at(day2), c = at(day3, { text: 'Rosemary bloomed.' });
  const entries = [a,b,c].map(w => ({ file: w.witnessSha256 + '.json', witness: w }));
  const timeline = makeTimeline(entries, root);
  assert.equal(timeline.observations, 3);
  assert.deepEqual(timeline.entries.map(x => x.comparisonStatus),
    ['FIRST_OBSERVATION', 'UNCHANGED', 'CHANGED']);
  assert.equal(timeline.entries[2].change.earlierWitnessSha256, b.witnessSha256);
  assert.equal(timeline.status, 'LOCAL_HOLD');
  const sameTime = makeTimeline([entries[0], { file: 'copy', witness: at(day1, { text: 'Other.' }) }], root);
  assert.equal(sameTime.entries[1].comparisonStatus, 'AMBIGUOUS_SAME_TIMESTAMP');
  assert.equal(sameTime.entries[1].change, null);
  assert.throws(() => makeTimeline([...entries].reverse(), root), /chronologically ordered/);
});

test('directory history verifies content-addressed filenames and exact final URL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fishbone-temporal-'));
  try {
    const other = at(day2, { requestedUrl: 'https://example.org/else',
      finalUrl: 'https://example.org/else' });
    const ordered = [at(day3, {text:'Changed.'}), at(day1), at(day2), other];
    for (const w of ordered)
      await writeFile(join(dir, w.witnessSha256 + '.json'), JSON.stringify(w));
    const found = await loadHistory(dir, root, 'example.org');
    assert.deepEqual(found.map(x => x.witness.capturedAt), [day1, day2, day3]);
    const timeline = makeTimeline(found, root);
    assert.equal(timeline.entries[2].comparisonStatus, 'CHANGED');
    assert.equal((await readWitnessFile(found[0].file)).witnessSha256, found[0].witness.witnessSha256);
    await writeFile(join(dir, '0'.repeat(64) + '.json'), JSON.stringify(at(day1)));
    await assert.rejects(() => loadHistory(dir, root, 'example.org'), /filename does not match/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
