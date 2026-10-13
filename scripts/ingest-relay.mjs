#!/usr/bin/env node
import {ingestRelay} from '../src/relay-import.mjs';
const argv=process.argv.slice(2),arg=name=>{const i=argv.indexOf(name);return i<0?null:argv[i+1]};
const packet=arg('--packet'),vault=arg('--vault'),verifier=arg('--webz-verifier'),observedAt=arg('--observed-at'),out=arg('--out');
if(!packet||!vault||!verifier||!observedAt||!out){console.error('Usage: node scripts/ingest-relay.mjs --packet DIR --vault DIR --webz-verifier FILE --observed-at UTC --out DIR');process.exit(2)}
try{const r=await ingestRelay(packet,vault,verifier,{observedAt,outputDir:out});console.log(JSON.stringify({sourceObservationId:r.sourceObservationId,entries:r.entries.map(x=>({organ:x.organ,id:x.id})),executedOrgans:r.executedOrgans,proposedRemaining:r.proposedRemaining.length,output:out},null,2))}catch(e){console.error('SIA HOLD: '+e.message);process.exitCode=1}