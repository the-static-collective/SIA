import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { observation, verifyObservation, OBSERVATION_SCHEMA } from './observation.mjs';
import { verifyDerived,DERIVED_SCHEMA } from './derived.mjs';
import { verifyRelayEntry, RELAY_ENTRY_SCHEMA } from './relay-entry.mjs';

const MAX_FILE=1024*1024;
export const verifyObject=value=>value?.schema===OBSERVATION_SCHEMA?verifyObservation(value):value?.schema===DERIVED_SCHEMA?verifyDerived(value):value?.schema===RELAY_ENTRY_SCHEMA?verifyRelayEntry(value):(()=>{throw Error('Unknown vault object schema')})();
export async function readJson(path) {
  const {stat}=await import('node:fs/promises');
  if((await stat(path)).size>MAX_FILE) throw Error('Input exceeds 1 MiB');
  return JSON.parse(await readFile(path,'utf8'));
}
export async function ingest(vault,input) {
  const normalized=observation(input);
  return store(vault,normalized);
}
export async function store(vault,material) {
  const normalized=verifyObject(material);
  const dir=join(resolve(vault),'objects');
  await mkdir(dir,{recursive:true});
  const file=join(dir,normalized.id.split(':')[1]+'.json');
  const bytes=JSON.stringify(normalized,null,2)+'\n';
  try {await writeFile(file,bytes,{flag:'wx',mode:0o600});}
  catch(e) {
    if(e.code!=='EEXIST') throw e;
    const previous=JSON.parse(await readFile(file,'utf8'));
    verifyObject(previous);
    if(previous.id!==normalized.id)throw Error('Existing object ID collision');
  }
  return normalized;
}
export async function load(vault,id) {
  if(typeof id!=='string' || !/^sha256:[a-f0-9]{64}$/.test(id)) throw Error('Invalid content address');
  const file=join(resolve(vault),'objects',id.slice(7)+'.json');
  const value=await readJson(file);
  const normalized=verifyObject(value);
  if(normalized.id!==id) throw Error('Object path/content mismatch');
  return normalized;
}
export async function catalog(vault) {
  let files=[];
  try{files=await readdir(join(resolve(vault),'objects'));}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const ids=files.filter(x=>/^[a-f0-9]{64}\.json$/.test(x)).sort();
  const items=[];
  for(const file of ids)items.push(await load(vault,'sha256:'+file.slice(0,-5)));
  return items;
}
