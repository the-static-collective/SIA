#!/usr/bin/env node
// Local owner-reviewed edits only. No hosting, GitHub actions, or external calls.
import { readFile, writeFile } from 'node:fs/promises';
import { validateRegistry, resolvePacket, repointAsset, addPacket } from '../src/linkbank.mjs';
const usage = () => {
 console.error('Usage: node scripts/linkbank.mjs validate|resolve <id>|repoint <asset-id> <https-url> <ISO-date> <reason>|add <packet-id> <title> <asset-id,...> [--write]');
 console.error('Set LINKBANK_REGISTRY to override site/registry.json. Mutations preview JSON until --write.');
 process.exitCode=2;
};
const [command,...args] = process.argv.slice(2);
const file=process.env.LINKBANK_REGISTRY||new URL('../site/registry.json',import.meta.url);
try {
 if (!command) { usage(); }
 else {
  const data=JSON.parse(await readFile(file,'utf8'));
  validateRegistry(data);
  let result;
  if(command==='validate') result={valid:true,assets:data.assets.length,packets:data.packets.length};
  else if(command==='resolve' && args.length===1) result=resolvePacket(data,args[0]);
  else if(command==='repoint' && args.length>=4) result=repointAsset(data,args[0],args[1],args[2],args[3]);
  else if(command==='add' && args.length>=3) result=addPacket(data,{id:args[0],title:args[1],items:args[2].split(',').map(asset_id=>({asset_id}))});
  else {usage();}
  if(result!==undefined) {
   const isMutation=['repoint','add'].includes(command);
   if (isMutation && args.includes('--write')) {
     await writeFile(file,JSON.stringify(result,null,2)+'\n',{encoding:'utf8'});
     console.log(JSON.stringify({saved:true,file:String(file),packetCount:result.packets.length}));
   } else {
     console.log(JSON.stringify(result,null,2));
     if(isMutation) console.error('PREVIEW ONLY — pass --write to change the local registry; publish requires separate review.');
   }
  }
 }
} catch(error) { console.error('LINKBANK HOLD: '+error.message);process.exitCode=1; }
