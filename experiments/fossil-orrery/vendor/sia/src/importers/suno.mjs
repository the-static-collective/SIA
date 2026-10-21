// @ts-nocheck
// Explicit owner-supplied Suno metadata importer. No fetching, API calls or media copying.
// The raw source file, including unrecognized fields, is kept separately in a private local vault.
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {digest} from '../canonical.mjs';
import {observation} from '../observation.mjs';
import {store,load} from '../vault.mjs';

export const SUNO_BATCH_SCHEMA='sia/suno-batch/v0';
export const ADAPTER='sia/suno-importer-001';
const MAX_BYTES=24*1024*1024;
const MAX_ROWS=20000;
const sha=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const scalar=x=>(typeof x==='string' || typeof x==='number' || typeof x==='boolean')?x:null;
const nonempty=x=>typeof x==='string' && x.trim() ? x.trim() : null;
const pick=(row,keys)=>{for(const key of keys){const v=row[key];if(v!==null && v!==undefined && v!=='')return v;}return null;};
const safeObject=x=>x!==null && typeof x==='object' && !Array.isArray(x);

export function parseCsv(input){
  const rows=[];let cell='',row=[],quoted=false,endQuote=false;
  const text=input.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"' && text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;endQuote=true;}else cell+=c;continue;}
    if(endQuote && c!=='\r' && c!=='\n' && c!==',')throw Error('Invalid CSV: characters after closing quote');
    if(c==='"'){if(cell!=='')throw Error('Invalid CSV: quote inside unquoted value');quoted=true;endQuote=false;continue;}
    if(c===','){row.push(cell);cell='';endQuote=false;continue;}
    if(c==='\n' || c==='\r'){
      if(c==='\r' && text[i+1]==='\n')i++;
      row.push(cell);if(row.some(v=>v!==''))rows.push(row);
      row=[];cell='';endQuote=false;continue;
    }
    if(endQuote)throw Error('Invalid CSV: text after closing quote');
    cell+=c;
  }
  if(quoted)throw Error('Invalid CSV: unterminated quoted field');
  if(cell!=='' || row.length){row.push(cell);if(row.some(v=>v!==''))rows.push(row);}
  if(rows.length<2)throw Error('CSV requires a header and at least one data row');
  const headers=rows.shift().map(h=>h.trim().replace(/^\uFEFF/,''));
  if(headers.some(h=>!h) || new Set(headers).size!==headers.length)throw Error('CSV headers must be nonempty and unique');
  return rows.map((cells,i)=>{
    if(cells.length!==headers.length)throw Error(`CSV row ${i+2}: expected ${headers.length} fields, found ${cells.length}`);
    return Object.fromEntries(headers.map((h,j)=>[h,cells[j]]));
  });
}

function rowsFromJson(raw){
  const root=Array.isArray(raw)?raw:null;
  if(root)return root;
  if(!safeObject(raw))throw Error('Suno JSON export must contain an array of tracks');
  // Reject ambiguous envelopes instead of silently assuming which collection is correct.
  const parents=[raw,raw.data,raw.export].filter(safeObject);
  const found=[];
  for(const parent of parents)for(const key of ['songs','clips','tracks','items']){
    if(Array.isArray(parent[key])) found.push({key,value:parent[key]});
  }
  if(found.length!==1)throw Error(`Expected exactly one supported tracks array (songs, clips, tracks, items); found ${found.length}`);
  return found[0].value;
}

export function parseExport(bytes,format='auto'){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
  if(bytes.length>MAX_BYTES)throw Error('Suno export exceeds 24 MiB; split it locally');
  const text=bytes.toString('utf8').replace(/^\uFEFF/,'');
  const detected=format==='auto'? (text.trimStart().startsWith('{') || text.trimStart().startsWith('[') ? 'json':'csv') :format;
  if(!['json','csv'].includes(detected))throw Error('Unsupported format');
  const rows=detected==='json'?rowsFromJson(JSON.parse(text)):parseCsv(text);
  if(!rows.length || rows.length>MAX_ROWS)throw Error('Suno export must contain 1–20,000 rows');
  return {rows,format:detected,rawHash:sha(bytes)};
}

export function sourceTime(value){
  if(value===null || value===undefined || value==='')return null;
  let iso=null, precision=null, sort=null;
  if(typeof value==='number' || (typeof value==='string' && /^\d{10}(?:\d{3})?$/.test(value))){
    const n=Number(value);
    if(!Number.isSafeInteger(n))return null;
    const ms=n>=1000000000000?n:n*1000;
    const dt=new Date(ms);
    if(!Number.isFinite(dt.getTime()) || dt.getUTCFullYear()<1990 || dt.getUTCFullYear()>2100)return null;
    iso=dt.toISOString();precision='instant';sort=ms;
  }else if(typeof value==='string'){
    const raw=value.trim();
    if(/^\d{4}-\d\d-\d\d$/.test(raw)){
      const d=new Date(raw+'T00:00:00Z');
      if(!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==raw)return null;
      iso=raw;precision='day';sort=d.getTime();
    }else if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/i.test(raw)){
      const d=new Date(raw);
      if(!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==raw.slice(0,10) && /Z$/i.test(raw))return null;
      iso=d.toISOString();precision='instant';sort=d.getTime();
    }
  }
  return iso===null?null:{text:iso,precision,sort};
}

function songUrl(value,id){
  const raw=nonempty(value);
  if(!raw){
    // This is a constructed locator, never asserted as an observed source URL.
    if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return {url:`https://suno.com/song/${id}`,derived:true};
    return null;
  }
  let u;
  try{u=new URL(raw);}catch{return null;}
  if(u.protocol!=='https:' || u.username || u.password || !['suno.com','www.suno.com'].includes(u.hostname))return null;
  const m=/^\/(song|s)\/([A-Za-z0-9_-]{8,80})\/?$/.exec(u.pathname);
  if(!m)return null;
  if(m[1]==='song' && id && m[2].toLowerCase()!==String(id).toLowerCase())return null;
  return {url:`https://suno.com/${m[1]}/${m[2]}`,derived:false,extractedId:m[2]};
}

function put(facts,key,value,max=600){
  if(value===null || value===undefined || value==='')return;
  if(typeof value==='number' && !Number.isSafeInteger(value))return;
  if(typeof value!=='string' && typeof value!=='number' && typeof value!=='boolean')return;
  if(typeof value==='string' && value.length>max){
    facts.push({key,value:value.slice(0,max),basis:'owner-export'});
    facts.push({key:key+'_truncated',value:true,basis:'owner-export'});
  }else facts.push({key,value,basis:'owner-export'});
}
function projection(row,position,rawHash,{observedAt,includePrompts=false}={}){
  if(!safeObject(row))throw Error('Not a track object');
  const t=safeObject(row.clip)?row.clip:safeObject(row.song)?row.song:row;
  const id=pick(t,['id','song_id','clip_id','songId','clipId','uuid']);
  const candidate=pick(t,['url','song_url','songUrl','share_url','shareUrl','link']);
  const locator=songUrl(candidate,id);
  if(!locator)throw Error('No supported Suno recording URL or recoverable UUID');
  const externalId=nonempty(String(id??locator.extractedId??''));
  if(!externalId || externalId.length>150 || !/^[A-Za-z0-9_-]+$/.test(externalId))throw Error('Invalid Suno recording identifier');
  const title=nonempty(pick(t,['title','name','song_title','songTitle']));
  if(!title || title.length>240)throw Error('Missing or oversized song title');
  const createdRaw=pick(t,['created_at','createdAt','creation_time','created','created_date']);
  const created=sourceTime(createdRaw);
  const published=sourceTime(pick(t,['published_at','publishedAt','release_date','released_at']));
  const creator=nonempty(pick(t,['display_name','artist_name','artist','creator','username']))||'';
  if(creator.length>160)throw Error('Oversized creator');
  const facts=[];
  put(facts,'snapshot_sha256',rawHash);
  put(facts,'source_position',position);
  if(created){put(facts,'source_created_at',created.text);put(facts,'source_created_precision',created.precision);}
  if(published)put(facts,'source_published_at',published.text);
  if(locator.derived)put(facts,'locator_constructed',true);
  const tags=pick(t,['tags','style_tags','style','styles','genre']);
  const tagString=Array.isArray(tags)?tags.filter(x=>typeof x==='string').join(', '):tags;
  if(typeof tagString==='string')put(facts,'style_tags',tagString);
  put(facts,'model_name',scalar(pick(t,['model_name','modelName','model','version'])));
  for(const [key,keys] of Object.entries({is_public:['is_public','isPublic'],is_instrumental:['is_instrumental','isInstrumental']})){
    const v=pick(t,keys);
    if(typeof v==='boolean')put(facts,key,v);
  }
  const duration=pick(t,['duration','duration_seconds','durationSeconds']);
  if(typeof duration==='number' && Number.isFinite(duration) && duration>=0 && duration<=86400){
    put(facts,'reported_duration_ms',Math.round(duration*1000));
  }else if(typeof duration==='string' && /^\d+(?:\.\d{1,3})?$/.test(duration)){
    const n=Number(duration);if(n<=86400)put(facts,'reported_duration_ms',Math.round(n*1000));
  }
  if(includePrompts){
    const prompt=pick(t,['prompt','gpt_description_prompt','description_prompt','lyrics']);
    if(typeof prompt==='string')put(facts,'prompt_excerpt',prompt);
  }
  // Every original field and its actual type remains in the byte-for-byte raw snapshot.
  return {created,sourcePosition:position,sourceTimeKnown:Boolean(created),object:observation({
    schema:'sia/observation/v0',artifact:{externalId:`suno:${externalId}`,kind:'song',title,url:locator.url,creator},
    capture:{sourceUrl:locator.url,evidenceUrl:locator.url,observedAt,method:'owner-export',rights:'links-only',
      notes:`Operator-supplied Suno export, not API-authenticated. Raw snapshot ${rawHash}; original entry ${position}. URL ${locator.derived?'constructed from supplied UUID':'supplied in export'}.`},
    facts,relations:[],interpretations:[]
  })};
}

export function planSunoImport(bytes,{format='auto',observedAt='2026-01-01T00:00:00Z',limit=20000,includePrompts=false}={}){
  if(!sourceTime(observedAt) || !observedAt.endsWith('Z') || !observedAt.includes('T'))throw Error('observedAt must be a timezone-explicit UTC instant');
  if(!Number.isSafeInteger(limit)||limit<1||limit>20000)throw Error('limit must be 1–20,000');
  const parsed=parseExport(bytes,format);
  const accepted=[],rejected=[];
  parsed.rows.forEach((row,i)=>{
    try{accepted.push(projection(row,i+1,parsed.rawHash,{observedAt,includePrompts}));}
    catch(e){rejected.push({sourcePosition:i+1,reason:String(e.message).slice(0,180)});}
  });
  if(!accepted.length)throw Error('SIA HOLD: no usable Suno recordings; inspect the reported export shape and URLs');
  accepted.sort((a,b)=>(a.sourceTimeKnown===b.sourceTimeKnown ? (a.sourceTimeKnown?a.created.sort-b.created.sort:0):a.sourceTimeKnown?-1:1)||a.sourcePosition-b.sourcePosition);
  const selected=accepted.slice(0,limit);
  const batchId=digest(SUNO_BATCH_SCHEMA,{rawHash:parsed.rawHash,format:parsed.format,limit,includePrompts,adapter:ADAPTER});
  const ids=new Set(),duplicates=[];
  for(const item of accepted){const id=item.object.artifact.externalId;if(ids.has(id))duplicates.push(id);else ids.add(id);}
  return {schema:SUNO_BATCH_SCHEMA,batchId,adapter:ADAPTER,rawHash:parsed.rawHash,format:parsed.format,
    sourceRows:parsed.rows.length,eligible:accepted.length,undated:accepted.filter(x=>!x.created).length,
    rejected,duplicates:[...new Set(duplicates)],selected,
    chronology:'Only explicit source created timestamps; undated rows retain input order after dated rows. Published date is never treated as creation date.',
    privacy:'Entire original export is stored locally, may contain sensitive data, and must not be committed to git.'};
}

async function writeImmutable(path,bytes){
  try{await writeFile(path,bytes,{flag:'wx',mode:0o600});}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    const old=await readFile(path);
    if(!old.equals(bytes))throw Error('Immutable archive content mismatch: '+path);
  }
}
function summarize(plan,committed=false){
  return {schema:plan.schema,batchId:plan.batchId,adapter:ADAPTER,committed,rawHash:plan.rawHash,
    sourceRows:plan.sourceRows,eligible:plan.eligible,selected:plan.selected.length,
    undated:plan.undated,rejected:plan.rejected,duplicates:plan.duplicates,
    chronology:plan.chronology,privacy:plan.privacy,
    tracks:plan.selected.map((s,rank)=>({rank:rank+1,sourcePosition:s.sourcePosition,
      sourceCreatedAt:s.created?.text??null,sourceCreatedPrecision:s.created?.precision??null,
      title:s.object.artifact.title,url:s.object.artifact.url,observationId:s.object.id}))};
}
export async function importSunoFile(file,{vault='.sia',format='auto',observedAt=new Date().toISOString(),limit=20000,includePrompts=false,dryRun=false}={}){
  const bytes=await readFile(file);if(bytes.length>MAX_BYTES)throw Error('Suno export exceeds 24 MiB');
  const plan=planSunoImport(bytes,{format,observedAt,limit,includePrompts});
  if(dryRun)return summarize(plan,false);
  const archive=resolve(vault),manifestFile=join(archive,'imports',plan.batchId.slice(7)+'.json');
  await mkdir(join(archive,'raw'),{recursive:true});await mkdir(join(archive,'imports'),{recursive:true});
  const snapshotFile=join(archive,'raw',plan.rawHash.slice(7)+'.bin');
  await writeImmutable(snapshotFile,bytes);
  let previous=null;
  try{previous=JSON.parse(await readFile(manifestFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous){
    if(previous.batchId!==plan.batchId || previous.rawHash!==plan.rawHash)throw Error('Stored Suno manifest inconsistent with source snapshot');
    for(const id of previous.observationIds)await load(archive,id);
    return {...previous,committed:true,reused:true};
  }
  for(const item of plan.selected)await store(archive,item.object);
  const report={...summarize(plan,true),observedAt,observationIds:plan.selected.map(x=>x.object.id),
    rawPath:`raw/${plan.rawHash.slice(7)}.bin`,reused:false};
  await writeImmutable(manifestFile,Buffer.from(JSON.stringify(report,null,2)+'\n'));
  return report;
}
