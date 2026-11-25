#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composeRelationship, navigationProjection, panelLoomDraft } from './relationship-passenger.mjs';

const args = process.argv.slice(2);
const mode = args[0] || 'echo';
const seed = args[1] ? Number(args[1]) : 325;
const output = args[2] ? resolve(args[2]) : null;
if(!['echo','fork','encounter'].includes(mode)){
  process.stderr.write('Usage: node cli.mjs [echo|fork|encounter] [numeric-seed] [output-json-path]\n');
  process.exit(2);
}
const fixture = JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url),'utf8'));
const [a,b] = fixture.threads;
try{
  const candidate=composeRelationship(a,b,{mode,seed});
  const result={
    schema:'story-dna/specimen-packet/v0',
    candidate,
    navigation:navigationProjection(candidate),
    manga:panelLoomDraft(candidate),
  };
  const body=JSON.stringify(result,null,2)+'\n';
  if(output){ writeFileSync(output,body,{flag:'wx'}); process.stdout.write(output+'\n'); }
  else process.stdout.write(body);
}catch(err){process.stderr.write(err.message+'\n');process.exit(1);}
