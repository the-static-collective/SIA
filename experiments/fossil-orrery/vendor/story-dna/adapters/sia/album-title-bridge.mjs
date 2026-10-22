// @ts-nocheck
import { createHash } from 'node:crypto';

const fail = message => { throw new TypeError(message); };
const nonempty = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) fail(label + ' must be nonempty');
  return value.trim();
};

/**
 * Map SIA *observed title claims* into Story DNA Bank motif cards.
 * This does NOT infer song semantics, character identities or media rights.
 */
export function observedAlbumToCards(observation, { includeTracks = true } = {}) {
  if (observation?.schema !== 'sia/observation/v0') fail('Requires an SIA observation');
  const artifact = observation.artifact ?? {};
  const capture = observation.capture ?? {};
  if (artifact.kind !== 'album' || !/^https:\/\//.test(artifact.url ?? '')) fail('Album must have a source URL');
  const title = nonempty(artifact.title, 'title');
  const externalId = nonempty(artifact.externalId, 'externalId');
  const observedAt = nonempty(capture.observedAt, 'capture.observedAt');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(observedAt) || Number.isNaN(Date.parse(observedAt))) fail('capture date invalid');
  if (!['manual-transcription', 'owner-export', 'api-response'].includes(capture.method)) fail('capture method invalid');
  const rights = nonempty(capture.rights, 'rights');
  const facts = Array.isArray(observation.facts) ? observation.facts : [];
  const card = (name, marker, basis, role) => ({
    id: 'sia-echo-' + createHash('sha256').update(JSON.stringify([externalId, observedAt, marker, name])).digest('hex').slice(0, 20),
    kind: 'motif', name: ('Title echo: ' + name).slice(0, 120),
    world: ('SIA / ' + title).slice(0, 100),
    detail: `${role} title observed by ${capture.method} on ${observedAt}. Basis: ${basis}. Title words only, not a claim about lyrics, audio, characters or fictional canon. Recorded rights: ${rights}.`.slice(0, 600),
    drive: 'An independently imagined fictional possibility may be inspired by title words. New meanings are proposals, not inherited source claims.',
    source: artifact.url, status: 'SOURCE-CLAIMED TITLE / CREATIVE USE REQUIRES REVIEW', custom: true,
  });
  const out = [card(title, 'album-title', 'attributed album title', 'Album')];
  if (includeTracks) {
    for (const fact of facts) {
      if (!/^track_\d{2}_title$/.test(fact?.key) || typeof fact.value !== 'string' || !fact.value.trim()) continue;
      if (!['source-visible', 'owner-export', 'owner-note'].includes(fact.basis)) continue;
      out.push(card(fact.value.trim(), fact.key, fact.basis, 'Track ' + fact.key.slice(6, 8)));
    }
  }
  return out;
}

export function bankExport(observations, options = {}) {
  if (!Array.isArray(observations) || !observations.length || observations.length > 100) fail('Requires 1–100 observations');
  const out = observations.flatMap(observation => observedAlbumToCards(observation, options));
  const distinct = new Map(out.map(card => [card.id, card]));
  return {
    schema: 'static-story-dna-bank/v1',
    custom: [...distinct.values()],
    exportedAt: 'SOURCE_DERIVED_NO_EXPORT_CLOCK',
    note: 'Attributed metadata-derived motif proposals only. Source visibility, ownership, rights, meaning and canon require separate review.',
  };
}
