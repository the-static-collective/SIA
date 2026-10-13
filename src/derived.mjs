import { digest, record, assertKeys } from './canonical.mjs';
import { evaluate, selectLocally } from './proposal.mjs';
export const DERIVED_SCHEMA='sia/derived/v0';
export function harvest(recipe,proposal,{explicitChoice=false}={}) {
  const selected=selectLocally(recipe,proposal,{explicitChoice});
  const valid=evaluate(recipe,proposal);
  const body={
    schema:DERIVED_SCHEMA,
    kind:'creative-text',
    title:valid.title,
    sourceClass:'locally-selected-creative-proposal',
    parents:{recipeId:recipe.id,proposalId:valid.id,selectionId:selected.id,sourceObservationIds:recipe.sources.map(x=>x.id)},
    sections:valid.sections,
    inheritedMotifs:valid.motifsUsed,
    inventedMotifs:valid.newMotifs,
    rights:'undetermined; do not assume downstream publication permission',
    status:'locally-created-not-published'
  };
  return {id:digest(DERIVED_SCHEMA,body),...body};
}
export function verifyDerived(input) {
  record(input,'derived material');
  assertKeys(input,['id','schema','kind','title','sourceClass','parents','sections','inheritedMotifs','inventedMotifs','rights','status'],'derived');
  const {id,...body}=input;
  if(input.schema!==DERIVED_SCHEMA || input.kind!=='creative-text' || input.sourceClass!=='locally-selected-creative-proposal' ||
    input.status!=='locally-created-not-published' || !Array.isArray(input.sections) || input.sections.length>12 ||
    !Array.isArray(input.inventedMotifs) || !Array.isArray(input.inheritedMotifs) || !input.parents?.recipeId ||
    typeof input.title!=='string' || input.title.length>120) throw Error('Malformed derived particular');
  if(id!==digest(DERIVED_SCHEMA,body))throw Error('Derived particular digest mismatch');
  return input;
}
