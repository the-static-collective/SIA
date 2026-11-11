import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,cp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {relayEntry,verifyRelayEntry,relayTimeline} from '../src/relay-entry.mjs';
import {ingestRelay} from '../src/relay-import.mjs';
import {relayHtml} from '../src/relay-view.mjs';
import {catalog} from '../src/vault.mjs';
const sha=c=>'sha256:'+c.repeat(64);
function event(n,previous=null){return {schema:'sia/relay-entry/v0',missionId:'relay-001-blue-night-morning-bloom',sourceObservationId:sha('a'),sourceMediaSha256:sha('b'),step:n,
 organ:['LOADOUT','GHoT','reLATTE','webZ','SIA'][n-1],status:['BOUND','EXECUTED','RECEIVED_HELD','OBSERVED','INDEXED'][n-1],
 parents:previous?[previous]:[],evidence:[{role:'local-evidence',sha256:sha('1'),mediaType:'application/json'}],
 verification:{scope:'verified in test',mechanism:'local-replay',verified:true},effect:'none',
 permissions:{publication:false,admission:false,authorityTransferred:false}}}
test('five append-only event identities preserve chronology',()=>{
 const records=[];for(let n=1;n<=5;n++)records.push(relayEntry(event(n,records.at(-1)?.id)));
 assert.deepEqual(relayTimeline(records,records[0].sourceObservationId),records);
 assert.equal(verifyRelayEntry(records[0]).id,records[0].id);
 const forged=structuredClone(records[1]);forged.status='ADMIT';assert.throws(()=>verifyRelayEntry(forged));
});
test('no forged admission, unsafe reference or missing ancestor can become a relay event',()=>{
 for(const change of [v=>v.permissions.publication=true,v=>v.permissions.admission=true,v=>v.effect='local-index',v=>v.evidence[0].sha256='fake',
 v=>v.evidence[0].role='../danger',v=>v.parents=[],v=>v.verification.verified='yes']){
  const x=event(3,sha('f'));change(x);assert.throws(()=>relayEntry(x));
 }
});
test('archive viewer escapes embedded hostile text',()=>{
 const html=relayHtml({schema:'sia/relay-index/v0',title:'<script>alert(1)</script>',executedOrgans:5,entries:[1,2,3,4,5].map(()=>({organ:'SIA'})),proposedRemaining:[]});
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);assert.match(html,/SIA/);
});
const packet=process.env.RELAY_PACKET,verifier=process.env.RELAY_WEBZ_MODULE;
test('native import is idempotent and preserves five organs and original source',{skip:!packet||!verifier},async t=>{
 const vault=await mkdtemp(join(tmpdir(),'sia-relay-'));t.after(()=>rm(vault,{recursive:true,force:true}));
 const options={observedAt:'2026-10-13T15:40:00Z'};
 const a=await ingestRelay(packet,vault,verifier,options);
 const b=await ingestRelay(packet,vault,verifier,options);
 assert.deepEqual(a,b);assert.equal(a.entries.length,5);assert.equal(a.proposedRemaining.length,34);
 assert.equal(a.boundary.signedReceiverDisposition,'HOLD');assert.equal(a.boundary.publication,false);
 assert.equal((await catalog(vault)).length,6);
 assert.equal((await readdir(join(vault,'objects'))).length,6);
 const target=join(vault,'objects',a.entries[0].id.slice(7)+'.json');
 const wrong=JSON.parse(await readFile(target,'utf8'));wrong.status='INDEXED';await writeFile(target,JSON.stringify(wrong));
 await assert.rejects(()=>ingestRelay(packet,vault,verifier,options),/digest mismatch|disposition/);
});
test('tampered signed crossing refused before SIA writes',{skip:!packet||!verifier},async t=>{
 const root=await mkdtemp(join(tmpdir(),'sia-reject-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const copy=join(root,'packet'),vault=join(root,'vault');await cp(packet,copy,{recursive:true});
 const file=join(copy,'third-organ/public/roundtrip-result.json'),o=JSON.parse(await readFile(file,'utf8'));
 o.disposition_receipt.note='falsely admitted';await writeFile(file,JSON.stringify(o));
 await assert.rejects(()=>ingestRelay(copy,vault,verifier,{observedAt:'2026-10-13T15:40:00Z'}));
 await assert.rejects(()=>readdir(join(vault,'objects')));
});
test('tampered original audio refused before SIA writes',{skip:!packet||!verifier},async t=>{
 const root=await mkdtemp(join(tmpdir(),'sia-reject-mp3-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const copy=join(root,'packet'),vault=join(root,'vault');await cp(packet,copy,{recursive:true});
 await writeFile(join(copy,'source/song.mp3'),'fake source');
 await assert.rejects(()=>ingestRelay(copy,vault,verifier,{observedAt:'2026-10-13T15:40:00Z'}),/AUDIO_BYTES_MISMATCH/);
 await assert.rejects(()=>readdir(join(vault,'objects')));
});