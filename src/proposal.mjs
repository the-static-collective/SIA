import { boundedString, digest, record, uniqueSorted, assertKeys } from './canonical.mjs';
import {verifyRecipe} from './metabolizer.mjs';
export const PROPOSAL_SCHEMA='sia/proposal/v0';
const listOf=(items,name,max,size)=>{
  if(!Array.isArray(items)||items.length>max)throw Error(`${name} must be a list of at most ${max}`);
  const values=items.map(x=>boundedString(x,name+' item',1,size));
  if(new Set(values).size!==values.length)throw Error(`${name} items must be unique`);
  return values;
};
export function evaluate(recipe, candidate) {
  verifyRecipe(recipe);
  record(candidate,'proposal');
  assertKeys(candidate,['schema','recipeId','author','title','sections','motifsUsed','newMotifs','sourceAssertion'],'proposal');
  if(candidate.schema!==PROPOSAL_SCHEMA||candidate.recipeId!==recipe.id) throw Error('Proposal references wrong recipe');
  const author=record(candidate.author,'proposal author');
  assertKeys(author,['kind','name'],'proposal author');
  if(!['ai','human'].includes(author.kind))throw Error('Proposal author.kind must be ai or human');
  boundedString(author.name,'proposal author.name',1,120);
  boundedString(candidate.title,'proposal title',1,120);
  if(candidate.sourceAssertion!=='no new source facts asserted')throw Error('Proposal may not introduce source authority claims');
  if(!Array.isArray(candidate.sections)||candidate.sections.length!==recipe.slots.length)throw Error('Proposal requires exactly the planned sections');
  for(let i=0;i<recipe.slots.length;i++){
    const p=record(candidate.sections[i],`section ${i+1}`),slot=recipe.slots[i];
    assertKeys(p,['index','slot','title','text'],'section');
    if(p.index!==slot.index || p.slot!==slot.name)throw Error('Section does not match deterministic slot');
    boundedString(p.title,'section title',1,recipe.constraints.maxSectionTitleChars);
    boundedString(p.text,'section text',1,recipe.constraints.maxSectionTextChars);
  }
  const motifsUsed=listOf(candidate.motifsUsed,'motifsUsed',32,80);
  if(!motifsUsed.every(x=>recipe.atoms.some(atom=>atom.token===x)))throw Error('Motif incorrectly presented as source-derived');
  const newMotifs=listOf(candidate.newMotifs,'newMotifs',recipe.constraints.maxNovelMotifs,80);
  if(newMotifs.some(x=>motifsUsed.includes(x)))throw Error('Motif cannot simultaneously be new and source-derived');
  const body={schema:PROPOSAL_SCHEMA,recipeId:recipe.id,author:{kind:author.kind,name:author.name},
    title:candidate.title,sections:candidate.sections.map(x=>({...x})),
    motifsUsed:uniqueSorted(motifsUsed),newMotifs:uniqueSorted(newMotifs),
    sourceAssertion:candidate.sourceAssertion};
  return {id:digest(PROPOSAL_SCHEMA,body),...body};
}
export function holdReceipt(recipe, proposal) {
  const parsed=evaluate(recipe,proposal);
  const body={schema:'sia/review/v0',recipeId:recipe.id,proposalId:parsed.id,
    disposition:'HOLD',reason:'Valid proposal structure; no human adoption',
    evidenceLevel:'source-claimed metadata + deterministic recipe + unsigned proposal'};
  return {id:digest('sia/review/v0',body),...body};
}
export function selectLocally(recipe,proposal,{explicitChoice=false}={}){
  if(explicitChoice!==true)throw Error('LOCAL_SELECTION requires explicit human --accept');
  const parsed=evaluate(recipe,proposal);
  const body={schema:'sia/selection/v0',recipeId:recipe.id,proposalId:parsed.id,
    disposition:'LOCAL_SELECTION',meaning:'A local human-selected creative candidate; not published, signed, verified, or globally canonical'};
  return {id:digest('sia/selection/v0',body),...body};
}
