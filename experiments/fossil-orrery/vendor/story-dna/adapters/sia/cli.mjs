#!/usr/bin/env node
// @ts-nocheck
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bankExport } from './album-title-bridge.mjs';

const args = process.argv.slice(2);
const includeTracks = !args.includes('--album-only');
const paths = args.filter(x => x !== '--album-only');
if (!paths.length) {
  process.stderr.write('Usage: node adapters/sia/cli.mjs [--album-only] observation.json [...observation.json] > story-bank-import.json\n');
  process.exit(2);
}
try {
  const observations = paths.map(p => JSON.parse(readFileSync(resolve(p), 'utf8')));
  process.stdout.write(JSON.stringify(bankExport(observations, {includeTracks}), null, 2) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exit(1);
}
