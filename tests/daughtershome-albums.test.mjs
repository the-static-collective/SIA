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
const albumSlugs=['testimony-s00e07','testimony-s00e06','auto-s01e01'];

test('owner-provided album pages preserve exact track ordering in schema-valid SIA observations',async()=>{
 for(const label of albumSlugs){
  const source=await json('daughtershome/'+label+'-public-snapshot.json');
  const observed=await json('albums/daughtershome-'+label+'.observation.json');
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
  const observations=await Promise.all(albumSlugs.map(x=>json('albums/daughtershome-'+x+'.observation.json')));
  const first=await Promise.all(observations.map(x=>ingest(dir,x)));
  const second=await Promise.all(observations.map(x=>ingest(dir,x)));
  assert.equal(new Set(first.map(x=>x.id)).size,3);
  assert.deepEqual(first.map(x=>x.id),second.map(x=>x.id));
  const saved=await catalog(dir);
  assert.equal(saved.length,3);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('AUTO S01E01 preserves user-reported total separately from observed album count',async()=>{
 const source=await json('daughtershome/auto-s01e01-public-snapshot.json');
 const reported=await json('daughtershome/owner-album-count-2026-10-21.json');
 assert.equal(source.album_title,'AUTO S01E01');
 assert.equal(source.album_description,null);
 assert.equal(source.track_count_displayed,8);
 assert.equal(source.release_date_displayed,'2026-10-21');
 assert.equal(source.tracks.reduce((sum,t)=>{
  const [min,sec]=t.duration_displayed.split(':').map(Number);
  return sum+60*min+sec;
 },0),1729);
 assert.ok(source.tracks.every(x=>x.model_displayed==='V5.5'));
 assert.equal(reported.total_albums_owner_reported,21);
 assert.equal(reported.artist_handle,'daughtershome');
 assert.match(reported.evidence_basis,/creator/);
});
