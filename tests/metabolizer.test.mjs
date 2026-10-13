import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {canonical,digest} from '../src/canonical.mjs';
import {observation,verifyObservation} from '../src/observation.mjs';
import {ingest,load,catalog,store} from '../src/vault.mjs';
import {compose,verifyRecipe,promptPackage} from '../src/metabolizer.mjs';
import {evaluate,holdReceipt,selectLocally} from '../src/proposal.mjs';
import {harvest,verifyDerived} from '../src/derived.mjs';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
async function fixtures(){return Promise.all(['../examples/rosemary.observation.json','../examples/porch.observation.json'].map(read));}
async function setup(t){const dir=await mkdtemp(join(tmpdir(),'sia-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('canonical object key order is stable and unsafe numeric values refused',()=>{
 assert.equal(canonical({z:3,a:{y:2,x:[true,'hi']}}),canonical({a:{x:[true,'hi'],y:2},z:3}));
 assert.equal(digest('sia/selector/v0',{x:1,y:2}),digest('sia/selector/v0',{y:2,x:1}));
 assert.throws(()=>canonical({x:1.2}),/safe integer/);
});

test('source snapshots preserve provenance, media rights, and immutable addresses',async t=>{
 const dir=await setup(t);const [one]=await fixtures();
 const first=await ingest(dir,one);
 const reordered=structuredClone(one);reordered.facts.reverse();
 const repeated=await ingest(dir,reordered);
 assert.equal(first.id,repeated.id);
 assert.equal((await catalog(dir)).length,1);
 const stored=await load(dir,first.id);
 assert.equal(stored.capture.rights,'links-only');
 assert.equal(stored.relations[0].basis,'source-visible');
 assert.equal(stored.interpretations[0].by,'human');
 const tampered=structuredClone(stored);tampered.artifact.title='Not the title';
 assert.throws(()=>verifyObservation(tampered),/digest mismatch/);
 const location=join(dir,'objects',first.id.slice(7)+'.json');
 await writeFile(location,JSON.stringify(tampered));
 await assert.rejects(load(dir,first.id),/digest mismatch/);
});

test('unsupported source claims, fake URLs, bad rights and duplicate facts refused',async()=>{
 const [one]=await fixtures();
 for(const edit of [
   o=>o.capture.rights='all-rights-granted',
   o=>o.artifact.url='file:///etc/passwd',
   o=>o.capture.method='automatically-authenticated',
   o=>o.facts.push(o.facts[0]),
   o=>o.artifact.creator={object:'not a creator'}
 ]){const tampered=structuredClone(one);edit(tampered);assert.throws(()=>observation(tampered));}
});

test('recipes are identical independent of input order and do not claim source audio properties',async()=>{
 const [a,b]=(await fixtures()).map(observation);
 const left=compose([a,b],{mode:'visual',seed:325});
 const right=compose([b,a],{mode:'visual',seed:325});
 const golden=await read('../examples/golden.visual.recipe.json');
 assert.deepEqual(left,golden);
 assert.deepEqual(left,right);
 assert.equal(verifyRecipe(left).id,left.id);
 assert.equal(left.slots.length,4);
 assert.equal(left.constraints.assetPolicy,'references-only');
 assert.ok(left.atoms.some(x=>x.token==='rosemary'));
 assert.ok(left.atoms.every(x=>x.derivedFrom.every(y=>y.basis==='source-claimed')));
 assert.match(left.brief,/not confirmed content/);
 assert.ok(left.relations.every(r=>r.basis==='source-visible'));
 assert.notEqual(compose([a,b],{mode:'visual',seed:326}).id,left.id);
 assert.notEqual(compose([a,b],{mode:'narrative',seed:325}).id,left.id);
 assert.equal(promptPackage(left).requiredJsonShape.recipeId,left.id);
 assert.throws(()=>compose([a,a],{}),/Duplicate/);
 assert.throws(()=>compose([a],{seed:-1}),/Seed/);
});

test('AI proposal remains HOLD; human choice is explicit; locally selected output becomes next food',async t=>{
 const dir=await setup(t);
 const [a,b]=await fixtures();const captured=[await ingest(dir,a),await ingest(dir,b)];
 const recipe=compose(captured,{mode:'visual',seed:325});
 const example=await read('../examples/ai-proposal.visual.json');
 assert.equal(example.recipeId,recipe.id,'the example AI output must remain anchored to actual recipe');
 const proposal=evaluate(recipe,example);
 assert.equal(proposal.sections.length,4);
 const held=holdReceipt(recipe,example);
 assert.equal(held.disposition,'HOLD');
 assert.throws(()=>selectLocally(recipe,example),/explicit/);
 assert.throws(()=>harvest(recipe,example),/explicit/);
 const selection=selectLocally(recipe,example,{explicitChoice:true});
 assert.equal(selection.disposition,'LOCAL_SELECTION');
 const material=harvest(recipe,example,{explicitChoice:true});
 assert.equal(material.parents.selectionId,selection.id);
 assert.equal(verifyDerived(material).id,material.id);
 assert.equal(material.sourceClass,'locally-selected-creative-proposal');
 await store(dir,material);
 const reread=await load(dir,material.id);
 const second=compose([reread],{mode:'narrative',seed:325});
 assert.equal(second.sources[0].evidenceClass,'creative-proposal');
 assert.equal(second.atoms.find(x=>x.token==='chair').derivedFrom[0].basis,'locally-selected-proposal');
 assert.equal(second.constraints.assetPolicy,'check-rights-per-source');
 assert.ok(second.relations.some(x=>x.type==='locally-composed-from'));
 assert.equal((await catalog(dir)).length,3);
});

test('a suggested fiction may not be relabeled as a discovered fact or falsify recipe',async()=>{
 const [a,b]=(await fixtures()).map(observation),recipe=compose([a,b],{mode:'visual',seed:325});
 const original=await read('../examples/ai-proposal.visual.json');
 for(const edit of [
   o=>o.recipeId='sha256:'+'0'.repeat(64),
   o=>o.sections[1].slot='invented-slot',
   o=>o.sections.pop(),
   o=>o.motifsUsed.push('chair'),
   o=>o.sourceAssertion='AI independently authenticated the Suno audio',
   o=>o.newMotifs.push('rosemary')
 ]){
   const forged=structuredClone(original);edit(forged);
   assert.throws(()=>evaluate(recipe,forged));
 }
});

test('CLI demo -> source vault -> proposal review -> selected harvest -> second-generation recipe',async t=>{
 const dir=await setup(t);const cli=new URL('../src/cli.mjs',import.meta.url).pathname;
 const out=execFileSync(process.execPath,[cli,'demo','--vault',dir],{encoding:'utf8'});
 const demo=JSON.parse(out);
 assert.equal(demo.networkCalls,0);assert.equal(demo.aiCalls,0);
 const raw=JSON.parse(await readFile(demo.recipeFile,'utf8'));
 const proposal=new URL('../examples/ai-proposal.visual.json',import.meta.url).pathname;
 const report=JSON.parse(execFileSync(process.execPath,[cli,'review',demo.recipeFile,proposal],{encoding:'utf8'}));
 assert.equal(report.receipt.disposition,'HOLD');
 assert.throws(()=>execFileSync(process.execPath,[cli,'harvest',demo.recipeFile,proposal,'--vault',dir],{encoding:'utf8',stdio:'pipe'}));
 const selected=JSON.parse(execFileSync(process.execPath,[cli,'harvest',demo.recipeFile,proposal,'--vault',dir,'--accept'],{encoding:'utf8'}));
 const second=JSON.parse(execFileSync(process.execPath,[cli,'compose',selected.id,'--vault',dir,'--mode','music','--seed','1'],{encoding:'utf8'}));
 assert.equal(second.sources[0].id,selected.id);
 assert.equal(second.mode,'music');
});
