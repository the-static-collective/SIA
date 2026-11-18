import test from 'node:test';
import assert from 'node:assert/strict';
import { LINKBANK_SCHEMA, validateRegistry, resolvePacket, repointAsset, addPacket, safePublicUrl } from '../src/linkbank.mjs';
const fixture = () => ({
 schema: LINKBANK_SCHEMA,
 assets: [{ id: 'music-001', type: 'music', title: 'One song', status: 'active',
   locations: [{ url: 'https://example.org/old.mp3', since: '2026-11-18T00:00:00.000Z', reason: 'first location' }] }],
 packets: [{ id: 'gift-001', title: 'A gift', note: 'no tracking', items: [{ asset_id: 'music-001' }] }]
});
test('resolves a stable packet identity to current location', () => {
 const a = fixture();
 const before = resolvePacket(a, 'gift-001');
 const next = repointAsset(a, 'music-001', 'https://example.org/new.mp3', '2026-11-18T01:00:00.000Z', 'migrated host');
 const after = resolvePacket(next, 'gift-001');
 assert.equal(before.id, after.id);
 assert.equal(before.items[0].url, 'https://example.org/old.mp3');
 assert.equal(after.items[0].url, 'https://example.org/new.mp3');
 assert.equal(next.assets[0].locations.length, 2);
 assert.equal(a.assets[0].locations.length, 1);
});
test('unknown and held packets never redirect silently', () => {
 const a = fixture();
 assert.equal(resolvePacket(a, 'missing-001'), null);
 a.assets[0].status = 'held';
 assert.equal(resolvePacket(a, 'gift-001').items[0].url, null);
});
test('rejects unsafe or secret-bearing links', () => {
 for (const url of ['javascript:alert(1)', 'http://example.org/', 'https://u:p@example.org/a',
                   'https://example.org/?access_token=secret', 'https://example.org/?sig=123']) {
   assert.throws(() => safePublicUrl(url));
 }
});
test('rejects duplicate IDs, absent references, and malformed source records', () => {
 const a = fixture();
 a.packets.push({ ...a.packets[0] });
 assert.throws(() => validateRegistry(a), /Duplicate/);
 const b = fixture();
 b.packets[0].items[0].asset_id = 'unknown';
 assert.throws(() => validateRegistry(b), /Unknown/);
 const c = fixture();
 c.assets[0].locations.push({ url: 'https://example.org/new', since: '2020-01-01T00:00:00.000Z', reason: 'backdated' });
 assert.throws(() => validateRegistry(c), /ordered/);
});
test('can compose another packet using already-reviewed assets only', () => {
 const a = fixture();
 const b = addPacket(a, { id: 'gift-002', title: 'Another', items: [{ asset_id: 'music-001' }] });
 assert.equal(b.packets.length, 2);
 assert.equal(a.packets.length, 1);
 assert.throws(() => addPacket(a, { id: 'gift-002', title: 'Wrong', items: [{ asset_id: 'not-reviewed' }] }), /Unknown/);
});
test('registry rejects credential-like URLs even when destination is public', () => {
 const a = fixture();
 a.assets[0].locations[0].url = 'https://example.org/song?token=private';
 assert.throws(() => validateRegistry(a));
});
