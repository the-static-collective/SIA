#!/usr/bin/env node
// Preview-only by default. Live registry mutation requires BOTH --reviewed --write.
// Does not publish, deploy, print, or verify recording rights on its own.
import {readFile,writeFile} from "node:fs/promises";
import {mergeMeshLinks} from "../src/mesh-bridge.mjs";
const args=process.argv.slice(2);
function flag(name){const i=args.indexOf(name);return i<0?null:args[i+1]}
const file=flag("--file"),since=flag("--since"),reason=flag("--reason");
const write=args.includes("--write"),reviewed=args.includes("--reviewed");
if(!file||!since||!reason){
 console.error("Usage: node scripts/import-humkin-mesh.mjs --file HUMKIN-export.json --since 2026-11-18T22:00:00.000Z --reason 'owner-reviewed published recordings' [--reviewed --write]");
 process.exitCode=2;
}else{
 try{
  const registryPath=new URL("../site/registry.json",import.meta.url);
  const prior=JSON.parse(await readFile(registryPath,"utf8"));
  const exported=JSON.parse(await readFile(file,"utf8"));
  const merged=mergeMeshLinks(prior,exported,since,reason);
  const changed=merged.assets.length-prior.assets.length;
  console.log(JSON.stringify({mode:write&&reviewed?"save":"preview",new_assets:changed,
    updated_or_reconfirmed:exported.links.length-changed,packet_count:merged.packets.length},null,2));
  if(write&&!reviewed)throw Error("Refusing write without --reviewed operator confirmation");
  if(write&&reviewed){
   await writeFile(registryPath,JSON.stringify(merged,null,2)+"\n");
   console.log("Saved owner-reviewed SIA registry locally; deployment remains separate.");
  }else console.error("PREVIEW ONLY. --reviewed --write is required to change the registry.");
 }catch(error){console.error("SIA MESH HOLD: "+error.message);process.exitCode=1}
}
