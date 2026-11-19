import test from "node:test";
import assert from "node:assert/strict";
import {mergeMeshLinks} from "../src/mesh-bridge.mjs";
import {LINKBANK_SCHEMA,resolvePacket} from "../src/linkbank.mjs";
const prior=()=>({schema:LINKBANK_SCHEMA,assets:[
 {id:"humkin-surprise",type:"music",title:"Surprise",status:"active",
  locations:[{url:"https://humkin.abundent.org/surprise.html",since:"2026-11-18T00:00:00.000Z",reason:"previous"}]}],
 packets:[{id:"radio-surprise-001",title:"First Packet",items:[{asset_id:"humkin-surprise"}]}]});
const exportFile=(state="active")=>({schema:"humkin.mesh/sia-export/v1",links:[{
 id:"winter-music-001",title:"A winter recording",status:state,
 url:"https://humkin.abundent.org/m/?id=winter-music-001"}]});
const since="2026-11-19T00:00:00.000Z";
test("merges new MESH doorway while keeping original SIA packet unchanged",()=>{
 const result=mergeMeshLinks(prior(),exportFile(),since,"reviewed release");
 assert.equal(result.assets.length,2);
 assert.deepEqual(resolvePacket(result,"radio-surprise-001").items[0].url,
  "https://humkin.abundent.org/surprise.html");
 assert.equal(result.assets.at(-1).locations[0].url,exportFile().links[0].url);
});
test("idempotent reimport and held links preserve reference identity",()=>{
 const first=mergeMeshLinks(prior(),exportFile(),since,"reviewed release");
 const again=mergeMeshLinks(first,exportFile("held"),"2026-11-20T00:00:00.000Z","held");
 assert.equal(again.assets.length,2);
 assert.equal(again.assets.at(-1).locations.length,1);
 assert.equal(again.assets.at(-1).status,"held");
 assert.equal(again.packets[0].id,"radio-surprise-001");
});
test("rejects arbitrary URLs, duplicate IDs and private paths",()=>{
 const cases=[
  {...exportFile(),links:[{...exportFile().links[0],url:"https://private.example/audio.mp3"}]},
  {...exportFile(),links:[exportFile().links[0],exportFile().links[0]]},
  {...exportFile(),links:[{...exportFile().links[0],url:"file:///C:/secret.wav"}]}
 ];
 for(const input of cases)assert.throws(()=>mergeMeshLinks(prior(),input,since,"reviewed"));
});
test("does not silently retype pre-existing SIA assets",()=>{
 const registry=prior();registry.assets[0].type="witness";
 const next={schema:"humkin.mesh/sia-export/v1",links:[{
  id:"humkin-surprise",title:"Pretend",status:"active",
  url:"https://humkin.abundent.org/m/?id=humkin-surprise"}]};
 assert.throws(()=>mergeMeshLinks(registry,next,since,"reviewed"),/non-music/);
});
