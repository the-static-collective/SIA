import { createHash } from 'node:crypto';

const THREAD = 'story-dna/relationship-thread/v0';
const CANDIDATE = 'story-dna/candidate/v0';
const assert = (condition, message) => { if (!condition) throw new TypeError(message); };
const text = (v, label) => { assert(typeof v === 'string' && v.trim().length > 0 && v.length <= 2000, `${label} must be a nonempty bounded string`); return v.trim(); };
const canonical = value => JSON.stringify(value, (key, val) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.keys(val).sort().map(k => [k, val[k]])) : val);
const digest = (domain, value) => 'sha256:' + createHash('sha256').update(domain + '\0' + canonical(value)).digest('hex');

export function validateThread(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'thread must be object');
  assert(input.schema === THREAD, 'thread schema mismatch');
  text(input.key, 'key'); text(input.title, 'title'); text(input.world, 'world');
  const src = input.source;
  assert(src && typeof src === 'object', 'source required');
  ['locator', 'revision', 'basis'].forEach(k => text(src[k], 'source.' + k));
  assert(['proposal','observed','derived'].includes(src.classification), 'source classification invalid');
  assert(['public','private','restricted'].includes(src.visibility), 'source visibility invalid');
  assert(['unverified','owner-declared','licensed'].includes(src.rights), 'source rights invalid');
  assert(Array.isArray(input.participants) && input.participants.length >= 1 && input.participants.length <= 12, 'participants invalid');
  input.participants.forEach((p, i) => text(p, 'participants[' + i + ']'));
  assert(new Set(input.participants).size === input.participants.length, 'duplicate participants');
  assert(input.arc && typeof input.arc === 'object', 'arc required');
  for (const part of ['desire', 'relationship', 'conflict', 'choice', 'consequence', 'remainder']) text(input.arc[part], 'arc.' + part);
  assert(Array.isArray(input.constraints) && input.constraints.length <= 16, 'constraints invalid');
  input.constraints.forEach((c, i) => text(c, 'constraints[' + i + ']'));
  assert(input.controls && typeof input.controls === 'object', 'controls required');
  for (const k of ['fictional', 'analogyAllowed', 'characterCrossingAllowed']) assert(typeof input.controls[k] === 'boolean', 'controls.' + k + ' required');
  const { id: providedId, ...body } = input;
  const id = digest(THREAD, body);
  if (providedId !== undefined) assert(providedId === id, 'thread content ID mismatch');
  return Object.freeze({ ...body, id });
}

function eligibleForAnalogy(t) {
  return t.controls.analogyAllowed && t.source.visibility === 'public';
}
function eligibleForEncounter(t) {
  return t.controls.fictional && t.controls.characterCrossingAllowed &&
    t.source.visibility === 'public' && t.source.rights !== 'unverified';
}

export function composeRelationship(aRaw, bRaw, { mode = 'echo', seed = 325 } = {}) {
  const a = validateThread(aRaw), b = validateThread(bRaw);
  assert(['echo', 'fork', 'encounter'].includes(mode), 'invalid mode');
  assert(Number.isSafeInteger(seed) && seed >= 0, 'invalid seed');
  assert(a.id !== b.id, 'requires two distinct thread particulars');
  assert(eligibleForAnalogy(a) && eligibleForAnalogy(b), 'source is not cleared for analogy');
  if (mode === 'encounter') assert(eligibleForEncounter(a) && eligibleForEncounter(b), 'encounter requires fictional sources, public scope, owner-declared/verified rights and explicit character crossing controls');
  const relation = {
    inheritedQuestion: a.arc.remainder,
    answeringPressure: b.arc.remainder,
    invariantA: a.arc.relationship,
    invariantB: b.arc.relationship,
    changedConstraint: `The pressure of "${a.arc.conflict}" meets "${b.arc.conflict}".`,
  };
  const names = mode === 'encounter' ? {
    actorA: a.participants.join(' / '), actorB: b.participants.join(' / '),
  } : null;
  const steps = [
    `THRESHOLD — A new occurrence inherits two unresolved pressures, without overwriting either originating story.`,
    `DESIRE — One perspective seeks "${a.arc.desire}"; the other seeks "${b.arc.desire}".`,
    `CONFLICT — A quick resolution would violate the relationship boundary: "${a.constraints[0] || a.arc.relationship}".`,
    `CHOICE — Rework the incompatible choices "${a.arc.choice}" and "${b.arc.choice}" into a new voluntary decision.`,
    `RESIDUE — Leave "${a.arc.remainder}" and "${b.arc.remainder}" inspectable as distinct unanswered questions.`,
  ];
  const proposal = {
    schema: CANDIDATE, posture: 'HOLD', admission: 'NONE', publication: 'NONE',
    mode, seed, parentThreads: [a.id, b.id], sourceCuts: [a.source, b.source],
    sourceWorlds: [a.world, b.world], characterTransfer: names,
    relation, title: `${a.title} × ${b.title}`,
    logline: mode === 'encounter'
      ? `Proposed noncanonical meeting: ${names.actorA} and ${names.actorB} encounter a dilemma neither source story resolves for them.`
      : mode === 'fork'
        ? 'A new independent story inherits two relationship pressures, but no original characters or events.'
        : 'An analogy joins two unresolved relationship patterns without merging their universes.',
    beats: steps,
    editorialRightsNote: 'A recorded rights declaration is not an authenticated license. No model proposal admits, releases, or publishes source content.',
    destinationAuthority: 'NONE',
  };
  return Object.freeze({ ...proposal, id: digest(CANDIDATE, proposal) });
}

export function navigationProjection(candidate) {
  assert(candidate?.schema === CANDIDATE && candidate?.id, 'valid candidate required');
  const {id, ...body} = candidate;
  assert(digest(CANDIDATE, body) === id, 'candidate modified');
  return {
    schema: 'story-dna/navigation-projection/v0', candidateId: id,
    storyshipRuntimeEvent: false, storyshipTransferPacket: false,
    sourceThreads: candidate.parentThreads, availableHelmChoices: ['HOLD', 'REVISE', 'DECLINE', 'PROPOSE_FOR_REVIEW'],
    interpretations: [
      {kind: 'analogy', text: 'The two relationships disclose a common narrative question; their worlds remain independent.', basis: candidate.parentThreads},
      {kind: 'counter-reading', text: 'The apparent similarity may conceal incompatible motives; keep the distinction visible.', basis: candidate.parentThreads},
    ],
    historicalEventsAdded: 0, originalWorldsChanged: false, destinationDecision: 'NOT_REQUESTED',
    note: 'Read-only STORYSHIP-inspired navigator view. No native voyage event, signed crossing, selection, or customs admission.',
  };
}

export function panelLoomDraft(candidate) {
  navigationProjection(candidate); // verifies the content ID before presenting a derivative
  return {
    schema: 'panel-loom/v1', workId: candidate.id,
    title: candidate.title, page: '01',
    source: `Story DNA 002: ${candidate.parentThreads.join(' ; ')}`,
    status: 'CANDIDATE', reading: 'rtl',
    panels: candidate.beats.map((staging, i) => ({
      id: `P${String(i+1).padStart(2,'0')}`,
      shape: i === 0 ? 'wide' : i === 4 ? 'splash' : 'split',
      staging, caption: '', speech: '', sfx: '',
      notes: 'Unadmitted story development. Story identities and actual source characters remain controlled by source owners.',
    })),
  };
}
