import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateThread, composeRelationship, navigationProjection, panelLoomDraft } from './relationship-passenger.mjs';
const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
const [a,b] = fixture.threads;
const copy = x => JSON.parse(JSON.stringify(x));

test('source-rooted thread IDs replay and detect tampering', () => {
  const bound = validateThread(a);
  assert.match(bound.id, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(bound,validateThread(bound));
  const altered = copy(bound); altered.arc.remainder = 'erased';
  assert.throws(() => validateThread(altered), /content ID mismatch/);
});

test('same exact inputs and seed yield identical candidate', () => {
  const x=composeRelationship(a,b,{seed:325,mode:'echo'});
  const y=composeRelationship(a,b,{seed:325,mode:'echo'});
  assert.deepEqual(x,y);
  assert.equal(x.posture,'HOLD');
  assert.equal(x.publication,'NONE');
  assert.equal(x.admission,'NONE');
  assert.equal(x.characterTransfer,null);
  assert.equal(x.parentThreads.length,2);
  assert.notEqual(x.parentThreads[0],x.parentThreads[1]);
});

test('echo and fork neither transport nor impersonate source characters', () => {
  for(const mode of ['echo','fork']){
    const x=composeRelationship(a,b,{mode,seed:4});
    assert.equal(x.characterTransfer,null);
    assert.equal(x.destinationAuthority,'NONE');
    assert.equal(x.sourceWorlds[0],a.world);
    assert.equal(x.sourceWorlds[1],b.world);
  }
});

test('encounter refuses undeclared character and rights grants', () => {
  assert.throws(()=>composeRelationship(a,b,{mode:'encounter'}),/encounter requires/);
  const aa=copy(a), bb=copy(b);
  aa.controls.characterCrossingAllowed=true; bb.controls.characterCrossingAllowed=true;
  assert.throws(()=>composeRelationship(aa,bb,{mode:'encounter'}),/encounter requires/);
  aa.source.rights='owner-declared'; bb.source.rights='owner-declared';
  const candidate=composeRelationship(aa,bb,{mode:'encounter'});
  assert.match(candidate.logline,/Proposed noncanonical/);
  assert.equal(candidate.admission,'NONE');
  assert.deepEqual(candidate.characterTransfer.actorA,a.participants.join(' / '));
});

test('privacy and protected analogy are not bypassed', () => {
  let aa=copy(a);
  aa.source.visibility='private';
  assert.throws(()=>composeRelationship(aa,b),/not cleared for analogy/);
  aa=copy(a); aa.controls.analogyAllowed=false;
  assert.throws(()=>composeRelationship(aa,b),/not cleared for analogy/);
});

test('navigation is a read-only view, never a Storyship event', () => {
  const c=composeRelationship(a,b);
  const navigation=navigationProjection(c);
  assert.equal(navigation.historicalEventsAdded,0);
  assert.equal(navigation.storyshipRuntimeEvent,false);
  assert.equal(navigation.storyshipTransferPacket,false);
  assert.equal(navigation.destinationDecision,'NOT_REQUESTED');
  assert.equal(navigation.interpretations.length,2);
  assert.notEqual(navigation.interpretations[0].text,navigation.interpretations[1].text);
  const tampered=copy(c); tampered.beats[0]='fiction treated as fact';
  assert.throws(()=>navigationProjection(tampered),/modified/);
});

test('Panel Loom is explicitly candidate-only and keeps source ancestry', () => {
  const c=composeRelationship(a,b);
  const p=panelLoomDraft(c);
  assert.equal(p.schema,'panel-loom/v1');
  assert.equal(p.panels.length,5);
  assert.equal(p.status,'CANDIDATE');
  assert.equal(p.workId,c.id);
  assert.match(p.source,/Story DNA 002/);
});

test('thread constraints cannot be omitted', () => {
  const bad=copy(a); delete bad.arc.remainder;
  assert.throws(()=>validateThread(bad),/arc.remainder/);
});
