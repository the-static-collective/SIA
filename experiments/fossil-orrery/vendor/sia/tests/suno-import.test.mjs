// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, stat, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseExport,parseCsv,planSunoImport,importSunoFile,sourceTime} from '../src/importers/suno.mjs';
import {load,catalog} from '../src/vault.mjs';
import {compose} from '../src/metabolizer.mjs';
const base=resolve(import.meta.dirname,'../examples');
const jsonFile=join(base,'suno-owner-export.sample.json');
const csvFile=join(base,'suno-owner-export.sample.csv');
const fixed='2026-10-13T13:00:00.000Z';
const make=async t=>{const d=await mkdtemp(join(tmpdir(),'sia-suno-'));t.after(()=>rm(d,{recursive:true,force:true}));return d;};
const getFact=(obj,key)=>obj.facts.find(x=>x.key===key)?.value;

test('oldest known source creation first, undated last, with provenance for every row',async()=>{
 const bytes=await readFile(jsonFile);
 const plan=planSunoImport(bytes,{observedAt:fixed});
 assert.deepEqual(plan.selected.map(s=>s.object.artifact.title),['Fixture Sweater','Fixture Door','Fixture Bloom','Fixture Night']);
 assert.deepEqual(plan.selected.map(s=>s.sourcePosition),[3,2,1,4]);
 assert.equal(plan.undated,1);
 assert.deepEqual(plan.rejected,[{sourcePosition:5,reason:'No supported Suno recording URL or recoverable UUID'}]);
 const first=plan.selected[0].object;
 assert.equal(first.capture.method,'owner-export');
 assert.equal(first.capture.rights,'links-only');
 assert.equal(getFact(first,'source_created_at'),'2026-10-07');
 assert.equal(getFact(first,'source_created_precision'),'day');
 assert.equal(getFact(first,'locator_constructed'),undefined);
 const derived=plan.selected[1].object;
 assert.equal(getFact(derived,'locator_constructed'),true);
 assert.equal(getFact(derived,'source_position'),2);
 assert.equal(getFact(plan.selected[3].object,'source_created_at'),undefined);
 assert.equal(getFact(plan.selected[3].object,'source_published_at'),'2026-10-06T12:00:00.000Z');
 assert.equal(getFact(plan.selected[2].object,'prompt_excerpt'),undefined);
 assert.equal(plan.batchId,planSunoImport(bytes,{observedAt:fixed}).batchId);
 assert.equal(plan.selected[0].object.id,planSunoImport(bytes,{observedAt:fixed}).selected[0].object.id);
});

test('local content-addressed raw snapshots, repeat import, and real metabolizer composition',async t=>{
 const dir=await make(t);
 const bytes=await readFile(jsonFile);
 const preview=await importSunoFile(jsonFile,{vault:dir,observedAt:fixed,dryRun:true});
 assert.equal(preview.committed,false);
 await assert.rejects(stat(join(dir,'raw')),/ENOENT/);
 const imported=await importSunoFile(jsonFile,{vault:dir,observedAt:fixed});
 assert.equal(imported.committed,true);
 assert.equal(imported.tracks.length,4);
 assert.deepEqual(await readFile(join(dir,imported.rawPath)),bytes);
 const objects=await catalog(dir);
 assert.equal(objects.length,4);
 const first=await load(dir,imported.observationIds[0]);
 assert.equal(first.artifact.title,'Fixture Sweater');
 assert.equal(first.capture.observedAt,fixed);
 assert.equal(first.capture.notes.includes(imported.rawHash),true);
 assert.equal(getFact(first,'snapshot_sha256'),imported.rawHash);
 const second=await load(dir,imported.observationIds[1]);
 const recipe=compose([first,second],{mode:'narrative',seed:325});
 assert.equal(recipe.sources.length,2);
 assert.ok(recipe.atoms.length>1);
 assert.equal(recipe.constraints.assetPolicy,'references-only');
 const replay=await importSunoFile(jsonFile,{vault:dir,observedAt:'2026-11-01T00:00:00Z'});
 assert.equal(replay.reused,true);
 assert.deepEqual(replay.observationIds,imported.observationIds);
 assert.equal((await catalog(dir)).length,4);
 const entries=await readdir(join(dir,'imports'));
 assert.equal(entries.length,1);
});

test('CSV parser honors quoted commas, embedded newlines, and exact raw snapshot preservation',async t=>{
 const dir=await make(t);
 const raw=await readFile(csvFile);
 const parsed=parseExport(raw);
 assert.equal(parsed.format,'csv');
 assert.equal(parsed.rows.length,2);
 assert.match(parsed.rows[0].lyrics,/multi-line\nprivate/);
 const imported=await importSunoFile(csvFile,{vault:dir,observedAt:fixed});
 assert.deepEqual(imported.tracks.map(t=>t.title),['Fixture Door','Fixture Bloom']);
 assert.equal(imported.tracks[0].sourcePosition,2);
 const one=await load(dir,imported.observationIds[0]);
 assert.equal(getFact(one,'prompt_excerpt'),undefined);
 assert.deepEqual(await readFile(join(dir,imported.rawPath)),raw);
 assert.throws(()=>parseCsv('id,title\n"oops,title'),/unterminated/);
 assert.throws(()=>parseCsv('id,title\na,b,c'),/expected 2/);
});

test('limit and prompt opt-in alter batch identity and require explicit human action',async t=>{
 const raw=await readFile(jsonFile),dir=await make(t);
 const limited=planSunoImport(raw,{observedAt:fixed,limit:2});
 assert.equal(limited.selected.length,2);
 const opted=planSunoImport(raw,{observedAt:fixed,limit:2,includePrompts:true});
 assert.notEqual(limited.batchId,opted.batchId);
 const full=await importSunoFile(jsonFile,{vault:dir,limit:2,includePrompts:true,observedAt:fixed});
 assert.equal(full.observationIds.length,2);
 const later=await importSunoFile(jsonFile,{vault:dir,observedAt:fixed});
 assert.equal(later.observationIds.length,4);
 assert.equal((await readdir(join(dir,'raw'))).length,1);
 const created=planSunoImport(raw,{observedAt:fixed,includePrompts:true});
 assert.match(getFact(created.selected[2].object,'prompt_excerpt'),/PRIVATE OWNER EXPORT/);
});

test('source timestamps are only ranked at the precision actually reported',()=>{
 assert.equal(sourceTime('2026-02-28').precision,'day');
 assert.equal(sourceTime('2026-02-30'),null);
 assert.equal(sourceTime('2026-10-13T13:00:00'),null);
 assert.equal(sourceTime('not available'),null);
 assert.equal(sourceTime('2026-10-13T08:00:00-05:00').text,'2026-10-13T13:00:00.000Z');
 assert.equal(sourceTime(1791896400).precision,'instant');
});

test('malformed data and untrusted domains refuse; export format cannot be guessed silently',()=>{
 const b=x=>Buffer.from(JSON.stringify(x));
 assert.throws(()=>parseExport(b({songs:[],clips:[]})),/exactly one/);
 assert.throws(()=>parseExport(b({other:[{id:'x'}]})),/exactly one/);
 assert.throws(()=>planSunoImport(b([{id:'11111111-1111-4111-8111-111111111111',title:'spoofed',url:'https://evil.example/s/11111111-1111-4111-8111-111111111111'}]),{observedAt:fixed}),/no usable/);
 assert.throws(()=>planSunoImport(b([{id:'11111111-1111-4111-8111-111111111111',title:'spoofed',url:'https://user:pass@suno.com/song/11111111-1111-4111-8111-111111111111'}]),{observedAt:fixed}),/no usable/);
 assert.throws(()=>planSunoImport(b([{id:'11111111-1111-4111-8111-111111111111',title:'A'}]),{observedAt:fixed,limit:0}),/limit/);
 assert.throws(()=>planSunoImport(b([{id:'11111111-1111-4111-8111-111111111111',title:'A'}]),{observedAt:'yesterday'}),/observedAt/);
});

test('CLI: dry-run writes nothing, imported IDs compose with the established pipeline',async t=>{
 const vault=await make(t),cli=resolve(import.meta.dirname,'../src/cli.mjs');
 const dry=JSON.parse(execFileSync(process.execPath,[cli,'suno-import',jsonFile,'--vault',vault,'--limit','2','--dry-run','--observed-at',fixed],{encoding:'utf8'}));
 assert.equal(dry.selected,2);
 assert.equal(dry.committed,false);
 assert.equal((await readdir(vault)).length,0);
 const result=JSON.parse(execFileSync(process.execPath,[cli,'suno-import',jsonFile,'--vault',vault,'--limit','2','--observed-at',fixed],{encoding:'utf8'}));
 const recipe=JSON.parse(execFileSync(process.execPath,[cli,'compose',result.observationIds.join(','),'--vault',vault,'--mode','visual','--seed','325'],{encoding:'utf8'}));
 assert.equal(recipe.sources.length,2);
 assert.equal(recipe.mode,'visual');
});
