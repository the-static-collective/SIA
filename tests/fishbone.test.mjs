import test from 'node:test';
import assert from 'node:assert/strict';
import { permitUrl, robotsPermit, makeWitness, verifyWitness, toSiaObservation } from '../tools/fishbone/core.mjs';
import { observation } from '../src/observation.mjs';

const url = 'https://example.org/library';
const record = () => makeWitness({ requestedUrl: url, finalUrl: url, allowedDomain: 'example.org',
  capturedAt: '2026-10-21T16:00:00.000Z', title: 'Public Library', text: 'A bounded observation.',
  links: ['https://example.org/another'] });

test('exact-domain HTTPS only and restricted platforms refused', () => {
  assert.equal(permitUrl(url, 'example.org').href, url);
  for (const target of ['http://example.org', 'https://evil.org/', 'https://example.org:8443/',
    'https://user:pass@example.org/', 'file:///etc/passwd'])
    assert.throws(() => permitUrl(target, 'example.org'));
  assert.throws(() => permitUrl('https://suno.com/@daughtershome', 'suno.com'));
  assert.throws(() => permitUrl('https://127.0.0.1/', '127.0.0.1'));
});

test('robots groups, longest path, end-anchor, and default allowance', () => {
  const rules = `User-agent: *\nDisallow: /private\nAllow: /private/public\nUser-agent: Fishbone\nDisallow: /secret\nAllow: /secret/notice`;
  assert.equal(robotsPermit(rules, '/secret'), false);
  assert.equal(robotsPermit(rules, '/secret/notice'), true);
  assert.equal(robotsPermit(rules, '/private'), true);
  assert.equal(robotsPermit('User-agent: *\nDisallow: /private\nAllow: /private/public', '/private'), false);
  assert.equal(robotsPermit('User-agent: *\nDisallow: /log$', '/log'), false);
  assert.equal(robotsPermit('User-agent: *\nDisallow: /log$', '/logging'), true);
  assert.equal(robotsPermit('', '/anything'), true);
});

test('witness is content-addressed and cannot be silently altered', () => {
  const w = record();
  assert.equal(verifyWitness(w).witnessSha256, w.witnessSha256);
  assert.throws(() => verifyWitness({ ...w, title: 'changed' }));
});

test('reviewed witness maps into truthful SIA browser-observation record', () => {
  const w = record();
  const input = toSiaObservation(w);
  const saved = observation(input);
  assert.equal(saved.capture.method, 'browser-observation');
  assert.equal(saved.capture.rights, 'links-only');
  assert.equal(saved.facts.find(x => x.key === 'visible_content_sha256').value, w.contentSha256);
  assert.equal(saved.relations.length, 1);
});
