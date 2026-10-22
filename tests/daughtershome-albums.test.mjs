import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { observation } from '../src/observation.mjs';
import { ingest, catalog } from '../src/vault.mjs';

const root=new URL('../captures/suno/',import.meta.url);
async function json(relative){return JSON.parse(await readFile(new URL(relative,root),'utf8'));}
const titles=['TESTIMONY S00E07','TESTIMONY S00E06'];

test('owner-provided album pages preserve exact track ordering in schema-valid SIA observations',async()=>{
 for(const label of ['s00e07','s00e06']){
  const source=await json('daughtershome/testimony-'+label+'-public-snapshot.json');
  const observed=await json('albums/daughtershome-testimony-'+label+'.observation.json');
  const normalized=observation(observed);
  assert.match(normalized.id,/^sha256:[a-f0-9]{64}$/);
  assert.equal(source.album_title,observed.artifact.title);
  assert.equal(source.album_url,observed.artifact.url);
  assert.equal(source.track_count_displayed,source.tracks.length);
  assert.equal(observed.capture.rights,'links-only');
  assert.equal(observed.capture.method,'manual-transcription');
  assert.equal(source.shared_url,observed.capture.sourceUrl);
  for(const t of source.tracks){
   const prefix='track_'+String(t.position).padStart(2,'0')+'_';
   const value=key=>observed.facts.find(f=>f.key===prefix+key)?.value;
   assert.equal(value('title'),t.title);
   assert.equal(value('duration'),t.duration_displayed);
   assert.equal(value('model'),t.model_displayed);
   assert.equal(value('cover_badge'),t.cover_badge_displayed);
   assert.equal(value('url'),t.song_url);
   assert.equal(observed.relations[t.position-1].target,t.song_url);
  }
 }
});

test('six plus seven dated track positions, but owner chronology is separately attributed',async()=>{
 const inventory=await json('daughtershome/owner-album-inventory-2026-10-21.json');
 assert.deepEqual(inventory.verified_by_separately_supplied_album_links.map(x=>x.title),titles);
 assert.deepEqual(inventory.verified_by_separately_supplied_album_links.map(x=>x.songs),[7,6]);
 assert.ok(inventory.owner_assertions.some(x=>x.relation?.includes('S00E07 released before TESTIMONY S00E06')));
 assert.ok(inventory.owner_assertions.some(x=>x.kind==='creative-intent'));
 assert.equal(inventory.source.image_file_committed,false);
});

test('actual vault roundtrip is idempotent and yields two distinct album content addresses',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sia-daughtershome-'));
 try{
  const observations=await Promise.all(['s00e07','s00e06'].map(x=>json('albums/daughtershome-testimony-'+x+'.observation.json')));
  const first=await Promise.all(observations.map(x=>ingest(dir,x)));
  const second=await Promise.all(observations.map(x=>ingest(dir,x)));
  assert.notEqual(first[0].id,first[1].id);
  assert.deepEqual(first.map(x=>x.id),second.map(x=>x.id));
  const saved=await catalog(dir);
  assert.equal(saved.length,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
