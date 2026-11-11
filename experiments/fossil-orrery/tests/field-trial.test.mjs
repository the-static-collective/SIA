import test from 'node:test';
import assert from 'node:assert/strict';
import { runObservedAlbumTrial } from '../src/lib/orrery/field-trial.ts';
import { storageHealth } from '../src/lib/orrery/storage-health.ts';
import { planSunoImport } from '../vendor/sia/src/importers/suno.mjs';
import { exportBundle, readBundle } from '../src/lib/orrery/bundle.ts';
import { observation as observe } from '../vendor/sia/src/observation.mjs';
import { observedAlbums } from '../src/lib/orrery/sample.ts';
import { hashText } from '../src/lib/orrery/intake.ts';

test('003: six actual SIA album observation claims traverse -> HOLD -> scripted local choice -> round-trip without mutation', () => {
  const result = runObservedAlbumTrial();
  assert.equal(result.observedAlbumCount, 6);
  assert.equal(result.albumTrackPositions, 52);
  assert.equal(result.uniqueSongCount, null);
  assert.equal(result.earliestSourceClaim, 1);
  assert.equal(result.undatedSourceClaims, 5);
  assert.equal(result.orreryReachable, 6);
  assert.equal(result.boneFluteTonesComputed, 6);
  assert.equal(result.receiptDisposition, 'HOLD');
  assert.equal(result.unchosenSelectionRefused, true);
  assert.equal(result.roundTripRecordCount, 7);
  assert.equal(result.archiveMutation, 'NONE');
  assert.match(result.status, /SIMULATION/);
});

test('003: album fixture never asserts 52 unique songs or a fabricated source recording', () => {
  const albums = observedAlbums.map((a) => observe(a));
  assert.equal(new Set(albums.map((a) => a.artifact.url)).size, 6);
  assert.equal(albums.every((a) => a.artifact.kind === 'album'), true);
  assert.equal(albums.every((a) => a.capture.method === 'manual-transcription'), true);
  assert.equal(albums.every((a) => a.capture.rights === 'links-only'), true);
  assert.equal(albums.every((a) => a.facts.some((fact) => fact.key === 'source_created_at') || !a.facts.some((fact) => fact.key === 'source_created_at')), true);
});

test('003: storage guidance identifies unknown quota, high usage and large archive', () => {
  assert.match(storageHealth(undefined, undefined, 2).warning, /unknown/);
  assert.match(storageHealth(90, 100, 2).warning, /80%/);
  assert.match(storageHealth(4, 100, 15000).warning, /Large collection/);
});

test('003: scripted 15,000-song synthetic owner export ingests, preserves raw hashes, reimports identities', { timeout: 40000 }, () => {
  // THESE ARE ARTIFICIAL TEST RECORDS, NOT REAL SUNO RECORDINGS.
  const songs = Array.from({ length: 15000 }, (_, i) => {
    const id = i.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000';
    return { id, title: `SYNTHETIC TEST Song ${i}`, created_at: i % 4 ? '2024-01-01T00:00:00Z' : undefined,
      url: `https://suno.com/song/${id}` };
  });
  const raw = JSON.stringify({ songs });
  const plan = planSunoImport(raw, { observedAt: '2026-10-21T18:00:00Z' });
  assert.equal(plan.sourceRows, 15000);
  assert.equal(plan.eligible, 15000);
  assert.equal(plan.selected.length, 15000);
  assert.equal(plan.undated, 3750);
  assert.equal(plan.rejected.length, 0);
  const objects = Object.fromEntries(plan.selected.map((row) => [row.object.id, row.object]));
  assert.equal(Object.keys(objects).length, 15000);
  const bundle = exportBundle({ objects, raw: { [hashText(raw)]: { sha256: hashText(raw), filename: 'SYNTHETIC-TEST.json', text: raw } },
    hypotheses: [], annotations: [], threads: [], candidates: [], reviews: [] });
  const restored = readBundle(JSON.parse(JSON.stringify(bundle)));
  assert.equal(restored.objects.length, 15000);
  assert.equal(restored.raw.length, 1);
  assert.deepEqual(restored.rejected, []);
  assert.deepEqual(new Set(restored.objects.map((x) => x.id)), new Set(Object.keys(objects)));
});
