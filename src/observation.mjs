import { assertKeys, boundedString, digest, httpsUrl, record } from './canonical.mjs';

export const OBSERVATION_SCHEMA='sia/observation/v0';
const kinds=['song','album','image','video','page','code','text','other'];
const methods=['manual-transcription','owner-export','api-response'];
const rights=['links-only','owned-media','licensed-media'];
const factKinds=['source-visible','owner-export','owner-note'];
const relations=['published-pair','part-of','links-to','version-of','sibling-of'];

export function observation(input) {
  record(input,'observation');
  assertKeys(input,['schema','artifact','capture','facts','relations','interpretations'],'observation');
  if(input.schema!==OBSERVATION_SCHEMA) throw Error('Unsupported observation schema');
  const a=record(input.artifact,'artifact');
  assertKeys(a,['externalId','kind','title','url','creator'],'artifact');
  if(!kinds.includes(a.kind)) throw Error('Unsupported artifact kind');
  const artifact={
    externalId:boundedString(a.externalId,'externalId',1,200),
    kind:a.kind,
    title:boundedString(a.title,'title',1,240),
    url:httpsUrl(a.url,'artifact URL'),
    creator:boundedString(a.creator??'','creator',0,160)
  };
  const c=record(input.capture,'capture');
  assertKeys(c,['sourceUrl','observedAt','method','rights','evidenceUrl','notes'],'capture');
  if(!methods.includes(c.method)) throw Error('Unknown capture method');
  if(!rights.includes(c.rights)) throw Error('Unknown media rights declaration');
  if(typeof c.observedAt!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(c.observedAt) || !Number.isFinite(Date.parse(c.observedAt)))
    throw Error('observedAt requires valid UTC ISO date-time');
  const capture={
    sourceUrl:httpsUrl(c.sourceUrl,'capture source URL'), observedAt:c.observedAt,
    method:c.method, rights:c.rights,
    evidenceUrl:httpsUrl(c.evidenceUrl??c.sourceUrl,'evidence URL'),
    notes:boundedString(c.notes??'','capture notes',0,600)
  };
  if(!Array.isArray(input.facts) || input.facts.length>64) throw Error('facts must be a list of at most 64');
  const facts=input.facts.map((f,i)=>{
    record(f,`fact[${i}]`);assertKeys(f,['key','value','basis'],'fact');
    const key=boundedString(f.key,'fact key',1,64);
    if(!/^[a-z][a-z0-9_]*$/.test(key)) throw Error('fact key must be snake_case');
    if(!factKinds.includes(f.basis)) throw Error('Unknown fact basis');
    if(!(['string','boolean','number'].includes(typeof f.value)) || (typeof f.value==='string' && f.value.length>600) || (typeof f.value==='number' && !Number.isSafeInteger(f.value))) throw Error('Fact value must be short JSON scalar');
    return {key,value:f.value,basis:f.basis};
  });
  const keys=facts.map(f=>f.key);
  if(new Set(keys).size!==keys.length) throw Error('Duplicate fact key in observation');
  const rr=input.relations??[];
  if(!Array.isArray(rr) || rr.length>32) throw Error('relations must be a list of at most 32');
  const connections=rr.map((r,i)=>{
    record(r,`relation[${i}]`);assertKeys(r,['type','target','basis','evidenceUrl'],'relation');
    if(!relations.includes(r.type)) throw Error('Unknown relation type');
    if(!factKinds.includes(r.basis)) throw Error('Unknown relation basis');
    return {type:r.type,target:httpsUrl(r.target,'relation target'),basis:r.basis,evidenceUrl:httpsUrl(r.evidenceUrl,'relation evidence')};
  });
  const ii=input.interpretations??[];
  if(!Array.isArray(ii) || ii.length>24) throw Error('interpretations must be a list of at most 24');
  const interpretations=ii.map((x,i)=>{
    record(x,`interpretation[${i}]`);assertKeys(x,['text','by'],'interpretation');
    if(!['human','ai'].includes(x.by)) throw Error('Interpretation must declare human or ai author');
    return {text:boundedString(x.text,'interpretation',1,400),by:x.by};
  });
  const body={schema:OBSERVATION_SCHEMA,artifact,capture,facts:facts.sort((x,y)=>x.key<y.key?-1:x.key>y.key?1:0),
    relations:connections.sort((x,y)=>JSON.stringify(x)<JSON.stringify(y)?-1:JSON.stringify(x)>JSON.stringify(y)?1:0),
    interpretations:interpretations.sort((x,y)=>x.text<y.text?-1:x.text>y.text?1:0)};
  return {id:digest(OBSERVATION_SCHEMA,body),...body};
}

export function verifyObservation(saved) {
  record(saved,'stored observation');
  const {id,...body}=saved;
  const recalculated=observation(body);
  if(id!==recalculated.id) throw Error('Stored observation digest mismatch');
  // Canonical normalized representation is also checked: no unrecognized fields.
  return recalculated;
}
