// @ts-nocheck
import { boundedString, digest, record, uniqueSorted } from './canonical.mjs';
import { verifyObservation, OBSERVATION_SCHEMA } from './observation.mjs';
import { verifyDerived, DERIVED_SCHEMA } from './derived.mjs';

export const RECIPE_SCHEMA='sia/recipe/v0';
const MODES={
  visual:{form:'visual',movementNames:['arrival','encounter','transformation','opening'],unit:'image scene'},
  music:{form:'music',movementNames:['invocation','answer','mutation','return'],unit:'musical movement'},
  narrative:{form:'narrative',movementNames:['threshold','particular','discovery','invitation'],unit:'story movement'}
};
const stopwords=new Set(['the','a','an','and','or','to','for','of','by','in','on','at','it','my','your','with','from','this','that','where','we','our','is','be','me','you','i','there','let']);
function tokenize(str) {
  return (str.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[])
    .filter(x=>!stopwords.has(x)).slice(0,40);
}
function choice(options,seed,domain) {
  const hash=digest('sia/selector/v0',{seed,domain});
  const n=BigInt('0x'+hash.slice(7,23));
  return options[Number(n%BigInt(options.length))];
}
function factsFrom(src) {
  if(src.schema===DERIVED_SCHEMA) return [
    {value:src.title,kind:'creative-title',sourceId:src.id,basis:'locally-selected-proposal'},
    ...src.inventedMotifs.map(value=>({value,kind:'invented-motif',sourceId:src.id,basis:'locally-selected-proposal'}))
  ];
  const result=[{value:src.artifact.title,kind:'title',sourceId:src.id,basis:'source-claimed'}];
  for(const f of src.facts){
    if(f.key==='style_tags' || f.key==='motif' || f.key==='subject' || f.key==='prompt_excerpt') {
      if(typeof f.value==='string') result.push({value:f.value,kind:f.key,sourceId:src.id,basis:f.basis});
    }
  }
  return result;
}

export function compose(records,{mode='visual',seed=0}={}) {
  if(!MODES[mode])throw Error('Unknown composition mode');
  if(!Number.isSafeInteger(seed) || seed<0 || seed>2147483647)throw Error('Seed must be an integer from 0 to 2147483647');
  if(!Array.isArray(records) || records.length<1 || records.length>12) throw Error('Recipe needs 1–12 observations');
  const sources=records.map(x=> x.schema===DERIVED_SCHEMA ? verifyDerived(x) : verifyObservation(x)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(new Set(sources.map(x=>x.id)).size!==sources.length)throw Error('Duplicate observations in recipe');
  const inputs=sources.map(s=>s.schema===DERIVED_SCHEMA ? {
    id:s.id,title:s.title,url:null,kind:'creative-text',captureMethod:'local-selection',captureUrl:null,
    rights:'undetermined',evidenceClass:'creative-proposal'
  } : {id:s.id,title:s.artifact.title,url:s.artifact.url,kind:s.artifact.kind,
    captureMethod:s.capture.method,captureUrl:s.capture.sourceUrl,rights:s.capture.rights,evidenceClass:'source-claimed'});
  const phrases=factsFromSources(sources);
  // Tokens are explicitly derived title/style tokens, not claims about actual lyrics or audio features.
  const motifs=uniqueSorted(phrases.flatMap(p=>tokenize(p.value))).slice(0,32);
  if(!motifs.length) throw Error('No usable motifs in observation titles/facts');
  const originMotifs=motifs.map(token=>({token,derivedFrom:phrases.filter(x=>tokenize(x.value).includes(token)).map(x=>({sourceId:x.sourceId,path:x.kind,basis:x.basis}))}));
  const relationships=sources.flatMap(src=>src.schema===DERIVED_SCHEMA ? [
    {from:src.id,type:'locally-composed-from',target:src.parents.recipeId,evidenceUrl:null,basis:'unsigned-local-selection'}
  ] : src.relations.map(r=>({from:src.id,type:r.type,target:r.target,evidenceUrl:r.evidenceUrl,basis:r.basis})))
    .sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0);
  const slots=MODES[mode].movementNames.map((name,i)=>({
    index:i+1,name,focus:choice(motifs,seed,`${mode}:movement:${i}:focus`),
    supportingSourceId:choice(inputs,seed,`${mode}:movement:${i}:source`).id
  }));
  const constraints={
    exactSectionCount:slots.length, maxSectionTitleChars:100,
    maxSectionTextChars:750, maxNovelMotifs:12,
    unit:MODES[mode].unit,
    treatment:'source claims are not verified truths; creative additions must remain marked as proposal',
    assetPolicy:inputs.every(x=>x.rights==='links-only')?'references-only':'check-rights-per-source'
  };
  const brief=[
    `Compose ${slots.length} ${MODES[mode].unit}s for a ${mode} artifact.`,
    `Deterministic structure: ${slots.map(s=>`${s.index}. ${s.name} [${s.focus}]`).join('; ')}.`,
    `Source motifs (derived text tokens, not confirmed content): ${motifs.join(', ')}.`,
    'Be inventive; do not claim to have heard, seen, downloaded or verified source material.',
    'Treat source-linked labels as claims observed at the named source, not as attested truth.',
    'Treat previously generated creative material as proposals, not source evidence.',
    'Distinguish newly invented motifs from source-derived motifs. Do not copy external media.',
    'Return a JSON AI proposal referencing this recipe; every proposed section must follow the assigned slot.'
  ].join('\n');
  const body={schema:RECIPE_SCHEMA,engine:'sia/metabolizer-001',seed,mode,sources:inputs,atoms:originMotifs,
    relations:relationships,slots,constraints,brief};
  return {id:digest(RECIPE_SCHEMA,body),...body};
}
function factsFromSources(sources){return sources.flatMap(factsFrom);}
export function verifyRecipe(recipe) {
  record(recipe,'recipe');
  const {id,...body}=recipe;
  if(recipe.schema!==RECIPE_SCHEMA || typeof id!=='string'||digest(RECIPE_SCHEMA,body)!==id)throw Error('Recipe digest mismatch');
  if(!Array.isArray(recipe.slots)||recipe.slots.length!==4||!Array.isArray(recipe.sources)||!Array.isArray(recipe.atoms))throw Error('Malformed recipe');
  if(!MODES[recipe.mode])throw Error('Unsupported recipe mode');
  return recipe;
}
export function promptPackage(recipe) {
  verifyRecipe(recipe);
  return {
    recipeId:recipe.id,
    role:'creative proposal only; no canonical source edits or remote write',
    instructions:recipe.brief,
    requiredJsonShape:{
      schema:'sia/proposal/v0',recipeId:recipe.id,
      author:{kind:'ai',name:'YOUR_MODEL_NAME'},
      title:'NEW CREATIVE TITLE',
      sections:recipe.slots.map(s=>({index:s.index,slot:s.name,title:`Creative title for ${s.name}`,text:`Write a ${recipe.constraints.unit} about ${s.focus}`})),
      motifsUsed:[recipe.slots[0].focus],newMotifs:[],
      sourceAssertion:'no new source facts asserted'
    }
  };
}
