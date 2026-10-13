#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, ingest } from '../src/vault.mjs';

// Committed, source-labeled metadata only. No network access or media downloads.
const args = process.argv.slice(2);
if (args.length > 0 && (args.length !== 2 || args[0] !== '--vault' || !args[1])) {
  throw Error('Usage: npm run ingest:suno -- [--vault DIR]');
}
const vault = args[1] ?? '.sia';
const folder = fileURLToPath(new URL('../captures/suno/albums/', import.meta.url));
const names = (await readdir(folder)).filter(name => name.endsWith('.observation.json')).sort();
if (names.length === 0) throw Error('No Suno album observations found');
const items = [];
for (const name of names) {
  const observation = await ingest(vault, await readJson(join(folder, name)));
  if (observation.artifact.kind !== 'album') throw Error('Unexpected non-album capture');
  items.push({ id: observation.id, title: observation.artifact.title, url: observation.artifact.url });
}
process.stdout.write(JSON.stringify({ imported: items.length, vault, observations: items }, null, 2) + '\n');
