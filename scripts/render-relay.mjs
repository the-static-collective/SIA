#!/usr/bin/env node
import {renderRelayFile} from '../src/relay-view.mjs';
if(process.argv.length!==4){console.error('Usage: node scripts/render-relay.mjs INDEX.json OUTPUT.html');process.exit(2)}
await renderRelayFile(process.argv[2],process.argv[3]);console.log('WROTE '+process.argv[3]);