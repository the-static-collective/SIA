import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { canonical } from '../../src/canonical.mjs';

export const WITNESS_SCHEMA = 'fishbone/witness/v1';
const BLOCKED = ['suno.com']; // Suno currently disallows automated extraction.
const sha = value => createHash('sha256').update(value).digest('hex');

export function permitUrl(value, allowedDomain) {
  if (typeof allowedDomain !== 'string' || !/^[a-z0-9.-]+$/.test(allowedDomain))
    throw Error('Supply --allow-domain as one exact public DNS hostname');
  let url;
  try { url = new URL(value); } catch { throw Error('Invalid target URL'); }
  const host = url.hostname.toLowerCase();
  const allowed = allowedDomain.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw Error('FISHBONE only permits credential-free HTTPS URLs on standard port 443');
  if (host !== allowed) throw Error('Host outside the explicit --allow-domain boundary');
  if (!host.includes('.') || isIP(host) || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) ||
      host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') ||
      BLOCKED.some(x => host === x || host.endsWith('.' + x)))
    throw Error('This host is not eligible for automated FISHBONE capture');
  url.hash = '';
  return url;
}

// Bounded robots.txt matcher: the most specific matching user-agent group wins;
// within it, the longest matching path wins, and Allow wins ties.
export function robotsPermit(source, path, agent = 'Fishbone') {
  const groups = [];
  let agents = [], rules = [], hasRules = false;
  const flush = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = []; rules = []; hasRules = false;
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === 'user-agent') {
      if (hasRules) flush();
      agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && agents.length) {
      hasRules = true;
      if (value) rules.push({ type: key, pattern: value });
    }
  }
  flush();
  const a = agent.toLowerCase();
  const scored = groups.map(group => ({ group,
    score: Math.max(-1, ...group.agents.map(x => x === '*' ? 0 : (a.includes(x) ? x.length : -1))) }));
  const best = Math.max(-1, ...scored.map(x => x.score));
  if (best < 0) return true;
  const matching = scored.filter(x => x.score === best).flatMap(x => x.group.rules);
  const matches = matching.map(rule => {
    const anchored = rule.pattern.endsWith('$');
    const literal = anchored ? rule.pattern.slice(0, -1) : rule.pattern;
    const escaped = literal.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    let match;
    try { match = new RegExp('^' + escaped + (anchored ? '$' : '')).exec(path); }
    catch { return null; }
    return match ? { length: literal.replace(/\*/g, '').length, allow: rule.type === 'allow' } : null;
  }).filter(Boolean).sort((x,y) => y.length-x.length || Number(y.allow)-Number(x.allow));
  return matches[0]?.allow ?? true;
}

export function makeWitness({ requestedUrl, finalUrl, allowedDomain, capturedAt, title, text, links = [], status = 200, robots = 'allowed' }) {
  const start = permitUrl(requestedUrl, allowedDomain);
  const end = permitUrl(finalUrl, allowedDomain);
  if (!Number.isInteger(status) || status < 200 || status > 299) throw Error('Page did not return HTTP 2xx');
  if (robots !== 'allowed') throw Error('Capture requires recorded robots permission');
  if (!Number.isFinite(Date.parse(capturedAt)) || new Date(capturedAt).toISOString() !== capturedAt)
    throw Error('Invalid UTC capture time');
  if (typeof title !== 'string' || !title.trim()) throw Error('Page title is required');
  if (typeof text !== 'string') throw Error('Visible text must be a string');
  const safeTitle = title.trim().slice(0, 240);
  const safeText = text.trim().slice(0, 12000);
  const safeLinks = [...new Set(links.map(x => permitUrl(x, allowedDomain).href))]
    .filter(x => x !== end.href).sort().slice(0, 24);
  const contentSha256 = sha(canonical({ title: safeTitle, text: safeText, links: safeLinks }));
  const body = { schema: WITNESS_SCHEMA, requestedUrl: start.href, finalUrl: end.href, allowedDomain: end.hostname,
    capturedAt, status, robots, title: safeTitle, visibleText: safeText,
    links: safeLinks, contentSha256, method: 'playwright-browser-observation' };
  return { ...body, witnessSha256: sha(canonical(body)) };
}

export function verifyWitness(value) {
  if (!value || value.schema !== WITNESS_SCHEMA || value.method !== 'playwright-browser-observation')
    throw Error('Unsupported witness format');
  const { witnessSha256, ...body } = value;
  if (typeof witnessSha256 !== 'string' || sha(canonical(body)) !== witnessSha256)
    throw Error('Witness integrity check failed');
  const normalized = makeWitness({ requestedUrl: value.requestedUrl, finalUrl: value.finalUrl,
    allowedDomain: value.allowedDomain, capturedAt: value.capturedAt, title: value.title,
    text: value.visibleText, links: value.links, status: value.status, robots: value.robots });
  if (canonical(normalized) !== canonical(value)) throw Error('Witness contents are not normalized');
  return normalized;
}

export function toSiaObservation(witness) {
  const w = verifyWitness(witness);
  return {
    schema: 'sia/observation/v0',
    artifact: { externalId: 'web:' + sha(w.finalUrl), kind: 'page', title: w.title, url: w.finalUrl, creator: '' },
    capture: { sourceUrl: w.finalUrl, observedAt: w.capturedAt, method: 'browser-observation', rights: 'links-only',
      evidenceUrl: w.finalUrl,
      notes: `FISHBONE local browser witness sha256:${w.witnessSha256}; evidence kept outside SIA vault. Source claim, not authentication.` },
    facts: [
      { key: 'visible_content_sha256', value: w.contentSha256, basis: 'source-visible' },
      { key: 'visible_text_excerpt', value: w.visibleText.slice(0, 600), basis: 'source-visible' },
      { key: 'outgoing_link_count', value: w.links.length, basis: 'source-visible' }
    ],
    relations: w.links.map(target => ({ type: 'links-to', target, basis: 'source-visible', evidenceUrl: w.finalUrl })),
    interpretations: []
  };
}
