import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { canonical } from '../../src/canonical.mjs';
import { permitUrl, verifyWitness } from './core.mjs';

export const CHANGE_SCHEMA = 'fishbone/change/v1';
const MAX_FILES = 256;
const MAX_FILE_BYTES = 65536;
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');

// A small excerpt near the first changed code unit, not a claim of semantic diff.
function firstDifference(before, after) {
  const limit = Math.min(before.length, after.length);
  let offset = 0;
  while (offset < limit && before[offset] === after[offset]) offset += 1;
  return offset;
}
function excerpt(text, at) {
  const start = Math.max(0, at - 64);
  const end = Math.min(text.length, at + 144);
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export function compareWitnesses(earlier, later) {
  const a = verifyWitness(earlier);
  const b = verifyWitness(later);
  if (a.finalUrl !== b.finalUrl)
    throw Error('HOLD: different final URLs; cannot assume these are the same page');
  if (Date.parse(a.capturedAt) >= Date.parse(b.capturedAt))
    throw Error('HOLD: timestamps are tied or out of order; preserve both witnesses without temporal claims');

  const contentChanged = a.contentSha256 !== b.contentSha256;
  const titleChanged = a.title !== b.title;
  const textChanged = a.visibleText !== b.visibleText;
  const statusChanged = a.status !== b.status;
  const addedLinks = b.links.filter(x => !a.links.includes(x));
  const removedLinks = a.links.filter(x => !b.links.includes(x));
  const offset = textChanged ? firstDifference(a.visibleText, b.visibleText) : null;
  const changes = {
    title: titleChanged ? { before: a.title, after: b.title } : null,
    httpStatus: statusChanged ? { before: a.status, after: b.status } : null,
    visibleText: textChanged ? {
      firstDifferentOffset: offset,
      beforeLength: a.visibleText.length,
      afterLength: b.visibleText.length,
      beforeExcerpt: excerpt(a.visibleText, offset),
      afterExcerpt: excerpt(b.visibleText, offset)
    } : null,
    links: { added: addedLinks, removed: removedLinks,
      beforeCount: a.links.length, afterCount: b.links.length }
  };
  const body = {
    schema: CHANGE_SCHEMA,
    status: 'HOLD',
    sourceUrl: a.finalUrl,
    earlierAt: a.capturedAt,
    laterAt: b.capturedAt,
    earlierWitnessSha256: a.witnessSha256,
    laterWitnessSha256: b.witnessSha256,
    earlierContentSha256: a.contentSha256,
    laterContentSha256: b.contentSha256,
    verdict: contentChanged || statusChanged ? 'CHANGED' : 'UNCHANGED',
    changes,
    scope: 'Bounded browser-visible title, first 12000 characters of visible text, first 24 sorted same-host links and HTTP status; absence or identity outside this window is unknown.'
  };
  return { ...body, changeSha256: hash(body) };
}

export async function readWitnessFile(filename) {
  const file = resolve(filename);
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_FILE_BYTES)
    throw Error('HOLD: witness file is not a regular file <= 64KiB');
  return verifyWitness(JSON.parse(await readFile(file, 'utf8')));
}

// Only content-hash-named JSON records in a dedicated local capture directory.
// Corrupt evidence fails the operation rather than being silently discarded.
export async function loadHistory(directory, sourceUrl, allowedDomain) {
  const target = permitUrl(sourceUrl, allowedDomain).href;
  const root = resolve(directory);
  const candidates = (await readdir(root, { withFileTypes: true }))
    .filter(item => /^[a-f0-9]{64}\.json$/.test(item.name));
  if (candidates.length > MAX_FILES)
    throw Error('HOLD: too many local snapshots; archive or select a smaller directory (max 256)');
  const matches = [];
  for (const item of candidates) {
    if (!item.isFile()) throw Error('HOLD: evidence path is not a regular file: ' + item.name);
    const file = join(root, item.name);
    const witness = await readWitnessFile(file);
    if (item.name !== witness.witnessSha256 + '.json')
      throw Error('HOLD: filename does not match witness hash: ' + item.name);
    if (witness.finalUrl === target) matches.push({ file, witness });
  }
  matches.sort((a,b) => a.witness.capturedAt.localeCompare(b.witness.capturedAt) ||
    a.witness.witnessSha256.localeCompare(b.witness.witnessSha256));
  return matches;
}

export function makeTimeline(records, sourceUrl) {
  if (!Array.isArray(records)) throw Error('History must be an array');
  const entries = [];
  for (const record of records) {
    const w = verifyWitness(record.witness);
    if (w.finalUrl !== sourceUrl)
      throw Error('HOLD: a history witness does not belong to the requested final URL');
    const prev = entries.at(-1);
    if (prev && w.capturedAt < prev.capturedAt)
      throw Error('HOLD: history input is not chronologically ordered');
    let change = null;
    let comparisonStatus = 'FIRST_OBSERVATION';
    if (prev) {
      if (w.capturedAt === prev.capturedAt) comparisonStatus = 'AMBIGUOUS_SAME_TIMESTAMP';
      else {
        change = compareWitnesses(prev.witness, w);
        comparisonStatus = change.verdict;
      }
    }
    entries.push({ file: record.file, witness: w, capturedAt: w.capturedAt,
      witnessSha256: w.witnessSha256, contentSha256: w.contentSha256,
      comparisonStatus, change });
  }
  return { schema: 'fishbone/timeline/v1', status: 'LOCAL_HOLD',
    sourceUrl, observations: entries.length,
    entries: entries.map(({ witness, ...entry }) => entry) };
}
