import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ingest,store,load} from './vault.mjs';
import {relayEntry,relayTimeline} from './relay-entry.mjs';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const must=(v,code)=>{if(!v)throw Error(code)};
const address=/^sha256:[a-f0-9]{64}$/;
const evidencePaths={
 LOADOUT:[['loadout-binding','crossing/native-song-evidence/loadout-binding.json'],['loadout-parameters','crossing/native-song-evidence/loadout-parameters.json']],
 GHoT:[['ghot-task','crossing/native-song-evidence/ghot-task.json'],['ghot-receipt','crossing/native-song-evidence/ghot-receipt.json'],['ghot-execution','crossing/native-song-evidence/relay-crossing.json']],
 reLATTE:[['signed-roundtrip','third-organ/public/roundtrip-result.json'],['signed-transport','third-organ/public/transport-bundle.json'],['hold-verification','third-organ/public/verification.json']],
 webZ:[['observer-report','fourth-organ/observation.json'],['observer-mission','fourth-organ/mission-fourth.json']],
 SIA:[['source-seed','seed.json'],['mission-plan','mission.json']]
};
async function bounded(root,relative,max=1024*1024){
 const file=resolve(root,relative);must(file.startsWith(resolve(root)+'/'),'UNSAFE_PATH');
 const s=await stat(file);must(s.isFile()&&s.size<=max,'INVALID_FILE_SIZE');return readFile(file);
}
async function json(root,path){return JSON.parse((await bounded(root,path)).toString('utf8'))}
export async function ingestRelay(packetDir,vaultDir,webzModule,{observedAt,outputDir=null}={}){
 const root=resolve(packetDir),vault=resolve(vaultDir);
 must(typeof observedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(observedAt)&&Number.isFinite(Date.parse(observedAt)),'OBSERVATION_TIME_REQUIRED');
 const seed=await json(root,'seed.json'),mission=await json(root,'mission.json'),
   fourth=await json(root,'fourth-organ/mission-fourth.json'),
   native=await json(root,'crossing/native-song-evidence/relay-crossing.json'),
   webz=await json(root,'fourth-organ/observation.json'),
   held=await json(root,'third-organ/public/roundtrip-result.json'),
   bind=await json(root,'crossing/native-song-evidence/loadout-binding.json'),
   task=await json(root,'crossing/native-song-evidence/ghot-task.json'),
   receipt=await json(root,'crossing/native-song-evidence/ghot-receipt.json');
 must(seed.schema==='static-relay/seed-v0'&&mission.schema==='static-relay/mission-v0'&&mission.mission_id==='relay-001-blue-night-morning-bloom','UNKNOWN_RELAY_PACKET');
 const source='sha256:'+seed.audio_file.sha256;
 must(address.test(source)&&source==='sha256:'+native.source_sha256,'SOURCE_HASH_MISMATCH');
 must(hash(await bounded(root,'source/song.mp3',30*1024*1024))===source,'AUDIO_BYTES_MISMATCH');
 for(const k of ['embedded_artwork','embedded_lyrics']){
  const d=seed[k];must(typeof d.path==='string'&&address.test('sha256:'+d.sha256),'INVALID_MEDIA_DERIVATIVE');
  must(hash(await bounded(root,d.path,15*1024*1024))==='sha256:'+d.sha256,'DERIVATIVE_HASH_MISMATCH');
 }
 must(bind.capability==='media.probe'&&bind.disposition==='BIND'&&bind.authority_delta==='none','LOADOUT_NOT_BOUND');
 must(task.kind==='ghot.task'&&task.task_id===receipt.task_id&&task.capability==='media.probe'&&
 receipt.kind==='ghot.receipt'&&receipt.status==='ok'&&receipt.error===null&&
 native.ghot_receipt_id===receipt.receipt_id&&native.source_unchanged===true&&
 task.constraints?.source_sha256===seed.audio_file.sha256&&
 task.constraints?.loadout_parameter_digest===bind.parameter_digest,'NATIVE_EXECUTION_INCONSISTENT');
 must(held.crossing.source_history_head===source&&held.crossing.crossing_id===webz.crossing_id&&fourth.source_sha256===source,'SIGNED_CROSSING_SOURCE_DRIFT');
 must(webz.schema==='webz/relay-observation/v0'&&webz.result==='SIGNED_HOLD_OBSERVED'&&webz.disposition==='HOLD'&&!webz.admitted&&!webz.published,'INVALID_WEBZ_OBSERVATION');
 must(typeof webzModule==='string','WEBZ_NATIVE_VERIFIER_REQUIRED');
 const proof=await import(pathToFileURL(resolve(webzModule)).href);
 must(typeof proof.inspectRelay==='function','INVALID_WEBZ_MODULE');
 const inspected=await proof.inspectRelay(held);
 must(inspected.result==='SIGNED_HOLD_OBSERVED'&&inspected.crossing_id===webz.crossing_id&&
 inspected.source_media_sha256===source&&inspected.disposition==='HOLD'&&
 !inspected.admitted&&!inspected.published,'WEBZ_SIGNATURE_VERIFICATION_FAILED');
 must(Array.isArray(mission.candidate_organs)&&mission.candidate_organs.length===39&&
 new Set(mission.candidate_organs.map(x=>x.project)).size===39&&
 mission.candidate_organs.some(x=>x.project==='SIA'&&x.status==='PROPOSED_NOT_INVOKED'),'CANDIDATE_INVENTORY_INVALID');
 // All upstream checks finish before creating anything in SIA.
 const sourceObservation=await ingest(vault,{
  schema:'sia/observation/v0',
  artifact:{externalId:'suno:share:isV6mAiuOJSv8r38',kind:'song',title:seed.title,url:seed.link_supplied_by_user,creator:seed.artist},
  capture:{sourceUrl:seed.link_supplied_by_user,evidenceUrl:seed.link_supplied_by_user,
   observedAt,method:'manual-transcription',rights:'links-only',
   notes:'User-provided MP3 and embedded metadata; source-page authentication and media publication rights not inferred.'},
  facts:[{key:'audio_sha256',value:source,basis:'owner-note'},
    {key:'embedded_suno_id',value:seed.suno_id_embedded,basis:'owner-note'},
    {key:'duration_ms',value:Math.round(seed.audio_file.duration_seconds_ffprobe*1000),basis:'owner-note'},
    {key:'observed_relay',value:mission.mission_id,basis:'owner-note'}],
  relations:[],interpretations:[]
 });
 const names=['LOADOUT','GHoT','reLATTE','webZ','SIA'],
  statuses=['BOUND','EXECUTED','RECEIVED_HELD','OBSERVED','INDEXED'],
  scopes=['Native LOADOUT binding and GHoT parameter lineage',
   'Native GHoT task and successful media probe',
   'Native reLATTE signed crossing RECEIVE HOLD',
   'webZ independent observer of reLATTE signatures',
   'SIA local immutable index of the prior chain'],
  mechanisms=['record-and-source-consistency','record-and-source-consistency',
   'webz-independent-signature-replay','webz-independent-signature-replay',
   'sia-immutable-local-record'];
 const chain=[];
 for(let i=0;i<5;i++){
  const name=names[i],evidence=[];
  for(const [role,path] of evidencePaths[name])evidence.push({role,sha256:hash(await bounded(root,path)),mediaType:'application/json'});
  const entry=relayEntry({schema:'sia/relay-entry/v0',missionId:mission.mission_id,
   sourceObservationId:sourceObservation.id,sourceMediaSha256:source,step:i+1,
   organ:name,status:statuses[i],parents:i?[chain[i-1].id]:[],evidence,
   verification:{scope:scopes[i],mechanism:mechanisms[i],verified:true},
   effect:i===1?'local-read':i===4?'local-index':'none',
   permissions:{publication:false,admission:false,authorityTransferred:false}});
  chain.push(await store(vault,entry));
 }
 relayTimeline(chain,sourceObservation.id);
 for(const event of chain)await load(vault,event.id);
 const report={schema:'sia/relay-index/v0',missionId:mission.mission_id,title:seed.title,
  sourceObservationId:sourceObservation.id,sourceMediaSha256:source,
  entries:chain.map(x=>({step:x.step,organ:x.organ,status:x.status,id:x.id,parents:x.parents,evidence:x.evidence,verification:x.verification})),
  projectCount:39,executedOrgans:5,
  proposedRemaining:mission.candidate_organs.filter(x=>!names.includes(x.project)).map(x=>({project:x.project,lane:x.lane,status:'PROPOSED_NOT_EXECUTED'})),
  boundary:{sourcePageAuthenticated:false,originalMediaReissued:false,ghotSigned:false,
    signedReceiverDisposition:'HOLD',receiverAdmission:false,publication:false,
    humanIdentityAuthenticated:false,verifier:'webZ inspectRelay (project-owned checked code)'},
  networkRequests:0,mediaCopiedIntoVault:false};
 must(report.proposedRemaining.length===34,'EXPECTED_34_UNEXECUTED');
 if(outputDir){await mkdir(resolve(outputDir),{recursive:true});await writeFile(join(resolve(outputDir),'relay-index.json'),JSON.stringify(report,null,2)+'\n');}
 return report;
}