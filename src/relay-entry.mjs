import {digest, record, boundedString, assertKeys} from './canonical.mjs';
export const RELAY_ENTRY_SCHEMA='sia/relay-entry/v0';
const names=['LOADOUT','GHoT','reLATTE','webZ','SIA'];
const statuses=['BOUND','EXECUTED','RECEIVED_HELD','OBSERVED','INDEXED'];
const hex=/^sha256:[0-9a-f]{64}$/;
export function relayEntry(input){
 record(input,'relay entry');assertKeys(input,['schema','missionId','sourceObservationId','sourceMediaSha256','step','organ','status','parents','evidence','verification','effect','permissions'],'relay entry');
 if(input.schema!==RELAY_ENTRY_SCHEMA)throw Error('Unsupported relay entry schema');
 const n=input.step;if(!Number.isInteger(n)||n<1||n>5||input.organ!==names[n-1]||input.status!==statuses[n-1])throw Error('Wrong relay organ or disposition');
 const missionId=boundedString(input.missionId,'missionId',1,160);
 if(!hex.test(input.sourceObservationId)||!hex.test(input.sourceMediaSha256))throw Error('Invalid source content address');
 if(!Array.isArray(input.parents)||input.parents.length!==(n===1?0:1)||input.parents.some(x=>!hex.test(x)))throw Error('Broken event parents');
 if(!Array.isArray(input.evidence)||input.evidence.length<1||input.evidence.length>12)throw Error('Evidence count invalid');
 const roles=new Set();
 const evidence=input.evidence.map(x=>{
  record(x,'evidence');assertKeys(x,['role','sha256','mediaType'],'evidence');
  const role=boundedString(x.role,'evidence role',1,90);
  if(!/^[a-z][a-z0-9-]*$/.test(role)||roles.has(role))throw Error('Unsafe/duplicate evidence role');
  roles.add(role);if(!hex.test(x.sha256)||x.mediaType!=='application/json')throw Error('Invalid evidence digest');
  return {role,sha256:x.sha256,mediaType:x.mediaType};
 }).sort((a,b)=>a.role<b.role?-1:a.role>b.role?1:0);
 record(input.verification,'verification');assertKeys(input.verification,['scope','mechanism','verified'],'verification');
 const verification={scope:boundedString(input.verification.scope,'scope',1,200),mechanism:boundedString(input.verification.mechanism,'mechanism',1,160),verified:input.verification.verified};
 if(typeof verification.verified!=='boolean')throw Error('Invalid verification flag');
 record(input.permissions,'permissions');assertKeys(input.permissions,['publication','admission','authorityTransferred'],'permissions');
 if(Object.values(input.permissions).some(x=>x!==false))throw Error('Relay index may not promote authority');
 if(!['none','local-read','local-index'].includes(input.effect))throw Error('Unrecognized effect');
 if(n===3&&input.effect!=='none')throw Error('HOLD must have no semantic effect');
 const body={schema:RELAY_ENTRY_SCHEMA,missionId,sourceObservationId:input.sourceObservationId,sourceMediaSha256:input.sourceMediaSha256,step:n,organ:input.organ,status:input.status,parents:[...input.parents],evidence,verification,effect:input.effect,permissions:{publication:false,admission:false,authorityTransferred:false}};
 return {id:digest(RELAY_ENTRY_SCHEMA,body),...body};
}
export function verifyRelayEntry(value){
 record(value,'stored relay entry');const {id,...body}=value;const normalized=relayEntry(body);
 if(id!==normalized.id)throw Error('Stored relay entry digest mismatch');
 return normalized;
}
export function relayTimeline(entries,sourceId){
 const ordered=entries.map(verifyRelayEntry).sort((a,b)=>a.step-b.step);
 if(ordered.length!==5)throw Error('Expected five relay steps');
 for(let i=0;i<5;i++){const e=ordered[i];if(e.step!==i+1||e.sourceObservationId!==sourceId||i>0&&e.parents[0]!==ordered[i-1].id)throw Error('Broken relay lineage');}
 return ordered;
}