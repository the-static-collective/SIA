#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, ingest, store, catalog, load } from './vault.mjs';
import {harvest} from './derived.mjs';
import { compose, promptPackage } from './metabolizer.mjs';
import { evaluate,holdReceipt,selectLocally } from './proposal.mjs';
import {importSunoFile} from './importers/suno.mjs';
const HELP=`SIA 001 — Static Internet Archive / Metadata Metabolizer

  node src/cli.mjs ingest FILE [--vault DIR]
  node src/cli.mjs catalog [--vault DIR]
  node src/cli.mjs suno-import FILE [--vault DIR] [--limit N] [--dry-run] [--include-prompts] [--observed-at UTC]
  node src/cli.mjs compose ID[,ID...] [--vault DIR] [--mode visual|music|narrative] [--seed INTEGER] [--out FILE]
  node src/cli.mjs prompt RECIPE.json [--out FILE]
  node src/cli.mjs review RECIPE.json PROPOSAL.json [--out FILE]
  node src/cli.mjs choose RECIPE.json PROPOSAL.json --accept [--out FILE]
  node src/cli.mjs harvest RECIPE.json PROPOSAL.json --accept [--vault DIR]
  node src/cli.mjs demo [--vault DIR]

No network or AI calls. Suno imports retain the entire raw file privately and by default
project only source-reported metadata, not prompt/lyrics contents.
All AI writing is optional, externally supplied, and reviewed locally.`;
const argv=process.argv.slice(2);const cmd=argv.shift();
function option(flag,fallback) {const i=argv.indexOf(flag);if(i<0)return fallback; if(i===argv.length-1 || argv[i+1].startsWith('--'))throw Error('Missing value for '+flag);return argv[i+1];}
function positional(){const arr=[];for(let i=0;i<argv.length;i++){if(['--accept','--dry-run','--include-prompts'].includes(argv[i]))continue;if(argv[i].startsWith('--')){i++;continue;}arr.push(argv[i]);}return arr;}
async function emit(value,filename=null){const data=JSON.stringify(value,null,2)+'\n';if(filename){await mkdir(dirname(resolve(filename)),{recursive:true});await writeFile(filename,data,{flag:'wx'});process.stdout.write('WROTE '+resolve(filename)+'\n');}else process.stdout.write(data);}
async function main(){
 const vault=option('--vault','.sia');const args=positional();const out=option('--out',null);
 if(cmd==='suno-import'){
   if(args.length!==1)throw Error('suno-import needs exactly one owner-supplied JSON or CSV file');
   const n=Number(option('--limit','20000'));
   const result=await importSunoFile(args[0],{vault,limit:n,
     observedAt:option('--observed-at',new Date().toISOString()),
     dryRun:argv.includes('--dry-run'),includePrompts:argv.includes('--include-prompts')});
   await emit(result,out);return;
 }
 if(cmd==='ingest') {if(args.length!==1)throw Error('ingest needs one JSON file');const r=await ingest(vault,await readJson(args[0]));await emit({id:r.id,title:r.artifact.title,source:r.capture.sourceUrl,mediaRights:r.capture.rights});return;}
 if(cmd==='catalog') {const items=await catalog(vault);await emit(items.map(x=>x.schema==='sia/derived/v0'?{id:x.id,title:x.title,kind:'creative-text',status:x.status,parentRecipeId:x.parents.recipeId}:{id:x.id,title:x.artifact.title,kind:x.artifact.kind,url:x.artifact.url,observedAt:x.capture.observedAt,rights:x.capture.rights}));return;}
 if(cmd==='compose') {if(args.length!==1)throw Error('compose needs comma-separated content IDs');const ids=args[0].split(',');if(!ids.length)throw Error('No observation IDs');const inputs=[];for(const id of ids)inputs.push(await load(vault,id));const seed=Number(option('--seed','0'));const recipe=compose(inputs,{mode:option('--mode','visual'),seed});await emit(recipe,out);return;}
 if(cmd==='prompt'){if(args.length!==1)throw Error('prompt needs one recipe');await emit(promptPackage(await readJson(args[0])),out);return;}
 if(cmd==='review'||cmd==='choose'||cmd==='harvest'){if(args.length!==2)throw Error(cmd+' needs recipe and proposal files');const [recipe,raw]=await Promise.all(args.map(readJson));if(cmd==='harvest'){const object=harvest(recipe,raw,{explicitChoice:argv.includes('--accept')});await store(vault,object);await emit({id:object.id,title:object.title,parentRecipeId:recipe.id,status:object.status});return;}
 const result=cmd==='review'?{proposal:evaluate(recipe,raw),receipt:holdReceipt(recipe,raw)}:{proposal:evaluate(recipe,raw),receipt:selectLocally(recipe,raw,{explicitChoice:argv.includes('--accept')})};await emit(result,out);return;}
 if(cmd==='demo'){
   const basedir=resolve(import.meta.dirname,'../examples');const captured=[];
   for(const name of ['rosemary.observation.json','porch.observation.json']) captured.push(await ingest(vault,await readJson(resolve(basedir,name))));
   const recipe=compose(captured,{mode:'visual',seed:325});
   const pkg=promptPackage(recipe);const dir=resolve(vault,'demo');await mkdir(dir,{recursive:true});
   await writeFile(resolve(dir,'recipe.json'),JSON.stringify(recipe,null,2)+'\n');
   await writeFile(resolve(dir,'ai-prompt.json'),JSON.stringify(pkg,null,2)+'\n');
   await emit({sources:captured.map(x=>x.id),recipeId:recipe.id,recipeFile:resolve(dir,'recipe.json'),promptFile:resolve(dir,'ai-prompt.json'),networkCalls:0,aiCalls:0});return;
 }
 process.stdout.write(HELP+'\n');if(cmd&&cmd!=='help'&&cmd!=='--help')process.exitCode=1;
}
main().catch(e=>{console.error('SIA HOLD: '+e.message);process.exitCode=1;});
