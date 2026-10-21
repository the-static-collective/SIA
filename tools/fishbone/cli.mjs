#!/usr/bin/env node
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { permitUrl, robotsPermit, makeWitness, verifyWitness, toSiaObservation } from './core.mjs';
import { ingest } from '../../src/vault.mjs';
import { compareWitnesses, loadHistory, makeTimeline, readWitnessFile } from './temporal.mjs';

const HELP = `FISHBONE-002 — bounded browser witness + temporal change tracking for SIA

  node tools/fishbone/cli.mjs capture https://example.org/ --allow-domain example.org [--out DIR]
  node tools/fishbone/cli.mjs preview FILE
  node tools/fishbone/cli.mjs compare OLDER.json NEWER.json
  node tools/fishbone/cli.mjs history https://example.org/ --allow-domain example.org [--from DIR]
  node tools/fishbone/cli.mjs admit FILE --reviewed [--vault .sia]

Install browser runtime first: npm install --no-save playwright && npx playwright install chromium
One URL per invocation; explicit allow-domain and robots compliance; no scheduled or recursive crawling.
Changes are LOCAL HOLD reports, never automatic admission or publication.`;
const args = process.argv.slice(2), command = args.shift();
function opt(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Missing value for ${name}`);
  return args[i + 1];
}
const positionals = args.filter((x,i) => !x.startsWith('--') &&
  !(i && args[i-1].startsWith('--') && args[i-1] !== '--reviewed'));

async function robotsFor(url) {
  const robotsUrl = new URL('/robots.txt', url);
  const response = await fetch(robotsUrl, { redirect: 'manual', signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Fishbone/001 (+local archival research)' } });
  if (response.status === 404 || response.status === 410) return true;
  if (response.status !== 200) throw Error(`Robots retrieval returned ${response.status}; HOLD`);
  if (Number(response.headers.get('content-length') || 0) > 65536) throw Error('robots.txt too large; HOLD');
  const content = await response.text();
  if (content.length > 65536) throw Error('robots.txt exceeded safety bound; HOLD');
  return robotsPermit(content, url.pathname + url.search);
}

async function capture(raw, allowedDomain, outDir) {
  const target = permitUrl(raw, allowedDomain);
  if (!await robotsFor(target)) throw Error('robots.txt disallows this URL; HOLD');
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch {
    throw Error('Playwright not installed. Run npm install --no-save playwright && npx playwright install chromium');
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: false, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      try { permitUrl(route.request().url(), allowedDomain); return route.continue(); }
      catch { return route.abort(); }
    });
    const page = await context.newPage();
    const response = await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const final = permitUrl(page.url(), allowedDomain);
    if (!await robotsFor(final)) throw Error('Final URL disallowed by robots.txt; HOLD');
    const result = await page.evaluate(() => ({
      title: document.title || document.querySelector('h1')?.innerText || location.hostname,
      text: (document.body?.innerText || '').slice(0, 12000),
      links: Array.from(document.querySelectorAll('a[href]'), a => a.href).slice(0, 100)
    }));
    // Cross-origin links are not followed or recorded as same-origin relations.
    const safeLinks = result.links.filter(link => { try { permitUrl(link, allowedDomain); return true; } catch { return false; } });
    const witness = makeWitness({ requestedUrl: target.href, finalUrl: final.href, allowedDomain,
      capturedAt: new Date().toISOString(), title: result.title, text: result.text,
      links: safeLinks, status: response?.status() ?? 0 });
    const directory = resolve(outDir);
    await mkdir(directory, { recursive: true });
    const file = join(directory, witness.witnessSha256 + '.json');
    await writeFile(file, JSON.stringify(witness, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    // Every visit is a new immutable snapshot. Detect temporal changes without admitting any observation.
    let comparisonStatus = 'HOLD_HISTORY_UNAVAILABLE', change = null, historyError = null;
    try {
      const timeline = makeTimeline(await loadHistory(directory, witness.finalUrl, allowedDomain), witness.finalUrl);
      const current = timeline.entries.find(x => x.witnessSha256 === witness.witnessSha256);
      if (!current) throw Error('New witness missing from local timeline');
      comparisonStatus = current.comparisonStatus;
      change = current.change;
    } catch (error) {
      historyError = String(error.message);
    }
    process.stdout.write(JSON.stringify({ status: 'CAPTURED_NOT_ADMITTED', file, title: witness.title,
      witnessSha256: witness.witnessSha256, linkCount: witness.links.length,
      comparisonStatus, change, historyError }, null, 2) + '\n');
  } finally { await browser.close(); }
}

async function main() {
  if (command === 'capture') {
    if (positionals.length !== 1) throw Error('capture requires exactly one URL');
    return capture(positionals[0], opt('--allow-domain', ''), opt('--out', '.fishbone/captures'));
  }
  if (command === 'compare') {
    if (positionals.length !== 2) throw Error('compare requires OLDER.json NEWER.json');
    const earlier = await readWitnessFile(positionals[0]);
    const later = await readWitnessFile(positionals[1]);
    process.stdout.write(JSON.stringify(compareWitnesses(earlier, later), null, 2) + '\n');
    return;
  }
  if (command === 'history') {
    if (positionals.length !== 1) throw Error('history requires exactly one page URL');
    const allowed = opt('--allow-domain', '');
    const requested = permitUrl(positionals[0], allowed).href;
    const records = await loadHistory(opt('--from', '.fishbone/captures'), requested, allowed);
    process.stdout.write(JSON.stringify(makeTimeline(records, requested), null, 2) + '\n');
    return;
  }
  if (command === 'preview' || command === 'admit') {
    if (positionals.length !== 1) throw Error(`${command} requires one witness file`);
    const file = resolve(positionals[0]);
    if ((await stat(file)).size > 65536) throw Error('Witness exceeds 64KiB');
    const witness = verifyWitness(JSON.parse(await readFile(file, 'utf8')));
    const proposal = toSiaObservation(witness);
    if (command === 'preview') {
      process.stdout.write(JSON.stringify({ status: 'HOLD', witnessFile: file, source: witness.finalUrl,
        observedAt: witness.capturedAt, title: witness.title, snippet: witness.visibleText.slice(0, 300),
        proposedObservation: proposal }, null, 2) + '\n');
      return;
    }
    if (!args.includes('--reviewed')) throw Error('Human review required: run preview, then admit with --reviewed');
    const stored = await ingest(opt('--vault', '.sia'), proposal);
    process.stdout.write(JSON.stringify({ status: 'LOCAL_ADMISSION', id: stored.id, title: stored.artifact.title,
      witnessSha256: witness.witnessSha256 }, null, 2) + '\n');
    return;
  }
  console.log(HELP);
  if (command && command !== '--help' && command !== 'help') process.exitCode = 1;
}
main().catch(e => { console.error('FISHBONE HOLD: ' + e.message); process.exitCode = 1; });
