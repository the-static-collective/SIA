import { observation, verifyObservation, compose } from './engine.ts';
import { structuralDraft, reviewDraft, acceptDraft } from './draft.ts';
import { exportBundle, readBundle } from './bundle.ts';
import { project, chronology, documentedEdges } from './model.ts';
import { layoutSky } from './layout.ts';
import { toneHz } from './tones.ts';
import { observedAlbums } from './sample.ts';

/**
 * Scripted, NON-MUTATING field proof. It operates exclusively on six previously
 * published SIA observation files bundled in the app, never on private vault data.
 * The selection step is a TEST SIMULATION, not a human action or canon admission.
 */
export function runObservedAlbumTrial() {
  const originals = observedAlbums.map((body) => observation(body));
  originals.forEach((item) => verifyObservation(item));
  if (originals.length !== 6 || new Set(originals.map((x) => x.artifact.url)).size !== 6) {
    throw new Error('SIA observed-album fixture must contain six distinct album locators');
  }
  const positions = originals.reduce((n, item) => {
    const fact = item.facts.find((f: { key: string }) => f.key === 'track_count');
    if (!fact || !Number.isSafeInteger(fact.value) || fact.value < 0) throw new Error('Missing album track count');
    return n + fact.value;
  }, 0);
  if (positions !== 52) throw new Error('SIA observed collection changed; review before claiming a 52-position witness');
  const items = originals.map((x) => project(x));
  const sky = layoutSky(items, documentedEdges(items, []), 390, 720, null);
  const skyIds = new Set(sky.nodes.flatMap((node) => node.memberIds));
  if (skyIds.size !== 6 || originals.some((x) => !skyIds.has(x.id))) {
    throw new Error('One or more observed albums cannot be reached in the Orrery');
  }
  const frequencies = originals.map((item) => toneHz(item.id));
  if (frequencies.some((hz) => !Number.isFinite(hz) || hz <= 0)) throw new Error('Bone Flute tone failure');

  const bloom = originals.find((x) => x.artifact.title === 'Bloom');
  const week = originals.find((x) => x.artifact.title === 'a week together');
  if (!bloom || !week) throw new Error('Required observed pair not found');
  const recipe = compose([bloom, week], { mode: 'visual', seed: 325 });
  const draft = structuralDraft(recipe);
  const held = reviewDraft(recipe, draft);
  if (held.receipt.disposition !== 'HOLD') throw new Error('A draft must remain HOLD');
  let refused = false;
  try {
    acceptDraft(recipe, draft, false);
  } catch {
    refused = true;
  }
  if (!refused) throw new Error('Unauthorized creative selection was not refused');

  // Test-only simulation of an explicit local choice. No vault or server writes.
  const simulated = acceptDraft(recipe, draft, true);
  const objects = Object.fromEntries([...originals, simulated].map((item) => [item.id, item]));
  const bundle = exportBundle({
    objects, raw: {}, hypotheses: [], annotations: [], threads: [], candidates: [],
    reviews: [{ schema: 'fossil-orrery/test-choice/v0', disposition: 'SIMULATED_LOCAL_SELECTION_NOT_HUMAN', derivedId: simulated.id }],
  });
  const restored = readBundle(JSON.parse(JSON.stringify(bundle)));
  if (restored.rejected.length || restored.objects.length !== 7) throw new Error('Bundle round-trip failed');
  if (new Set(restored.objects.map((x) => x.id)).size !== 7) throw new Error('Identity mismatch on re-import');
  if (!restored.objects.some((x) => x.id === simulated.id)) throw new Error('Derived specimen lost in round trip');
  if (restored.objects.some((x) => x.artifact?.creator === 'Fossil Orrery fixture (synthetic)')) {
    throw new Error('A synthetic record was introduced into the observed-only proof');
  }

  return {
    schema: 'fossil-orrery/field-trial/v1',
    status: 'SCRIPTED_SIMULATION_NOT_FIELD_OBSERVATION',
    source: 'SIA six public Suno album observations recorded 2026-10-13; not a Suno owner export',
    observedAlbumCount: originals.length,
    albumTrackPositions: positions,
    uniqueSongCount: null,
    earliestSourceClaim: items.filter((x) => chronology(x.raw).kind === 'source-claimed').length,
    undatedSourceClaims: items.filter((x) => chronology(x.raw).kind === 'unresolved').length,
    orreryReachable: skyIds.size,
    boneFluteTonesComputed: frequencies.length,
    recipeId: recipe.id,
    receiptDisposition: held.receipt.disposition,
    unchosenSelectionRefused: refused,
    simulatedDerivedId: simulated.id,
    roundTripRecordCount: restored.objects.length,
    contentIdsPreserved: true,
    archiveMutation: 'NONE',
    authority: 'NONE — scripted test, not human selection or publishing',
    nextGate: 'Use a private owner-supplied export in a local browser; inspect storage/persistence and perform human selection manually.',
  };
}
