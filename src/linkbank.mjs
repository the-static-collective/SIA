// SIA LINKBANK 001: public link references, not archival proof or permissions.
export const LINKBANK_SCHEMA = 'sia/linkbank/v0';
const ID = /^[a-z0-9](?:[a-z0-9-]{2,38}[a-z0-9])$/;
const TYPES = new Set(['music', 'witness', 'page', 'other']);
const STATUSES = new Set(['active', 'held']);
const keys = (obj, allowed, name) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error(name + ' must be an object');
  for (const key of Object.keys(obj)) if (!allowed.includes(key)) throw Error(name + ' unexpected field: ' + key);
};
const short = (value, name, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error(name + ' invalid');
  return value;
};
const ident = (value, name) => {
  if (typeof value !== 'string' || !ID.test(value)) throw Error(name + ' invalid');
  return value;
};
const timestamp = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw Error('location timestamp must be exact UTC ISO');
  return value;
};
export function safePublicUrl(value) {
  if (typeof value !== 'string' || value.length > 1600) throw Error('Invalid URL');
  let u;
  try { u = new URL(value); } catch { throw Error('Invalid URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname || u.href !== value)
    throw Error('Only canonical public HTTPS URLs without credentials are allowed');
  for (const key of u.searchParams.keys()) {
    if (/^(?:access_token|token|key|api_key|signature|sig|secret|password|code)$/i.test(key))
      throw Error('Credential-like query parameter rejected');
  }
  return value;
}
export function validateRegistry(registry) {
  keys(registry, ['schema', 'assets', 'packets'], 'registry');
  if (registry.schema !== LINKBANK_SCHEMA) throw Error('Unsupported registry schema');
  if (!Array.isArray(registry.assets) || registry.assets.length > 10000 ||
      !Array.isArray(registry.packets) || registry.packets.length > 10000)
    throw Error('Invalid registry collections');
  const assets = new Map();
  for (const asset of registry.assets) {
    keys(asset, ['id', 'type', 'title', 'status', 'locations'], 'asset');
    ident(asset.id, 'asset ID');
    if (assets.has(asset.id)) throw Error('Duplicate asset ID');
    if (!TYPES.has(asset.type) || !STATUSES.has(asset.status)) throw Error('Invalid asset type/status');
    short(asset.title, 'asset title');
    if (!Array.isArray(asset.locations) || asset.locations.length < 1 || asset.locations.length > 100)
      throw Error('Asset must have bounded location history');
    let previous = '';
    for (const entry of asset.locations) {
      keys(entry, ['url', 'since', 'reason'], 'location');
      safePublicUrl(entry.url);
      timestamp(entry.since);
      short(entry.reason, 'location reason', 240);
      if (entry.since <= previous) throw Error('Location events must be strictly ordered');
      previous = entry.since;
    }
    assets.set(asset.id, asset);
  }
  const ids = new Set();
  for (const packet of registry.packets) {
    keys(packet, ['id', 'title', 'note', 'items'], 'packet');
    ident(packet.id, 'packet ID');
    if (ids.has(packet.id)) throw Error('Duplicate packet ID');
    ids.add(packet.id);
    short(packet.title, 'packet title');
    if (packet.note !== undefined && (typeof packet.note !== 'string' || packet.note.length > 300))
      throw Error('Packet note invalid');
    if (!Array.isArray(packet.items) || packet.items.length < 1 || packet.items.length > 8)
      throw Error('Packet needs 1–8 items');
    const used = new Set();
    for (const item of packet.items) {
      keys(item, ['asset_id'], 'packet item');
      ident(item.asset_id, 'asset reference');
      if (!assets.has(item.asset_id)) throw Error('Unknown asset: ' + item.asset_id);
      if (used.has(item.asset_id)) throw Error('Duplicate asset in packet');
      used.add(item.asset_id);
    }
  }
  return registry;
}
export function resolvePacket(registry, packetId) {
  validateRegistry(registry);
  ident(packetId, 'packet ID');
  const packet = registry.packets.find(p => p.id === packetId);
  if (!packet) return null;
  return {
    id: packet.id, title: packet.title, note: packet.note || '',
    items: packet.items.map(item => {
      const asset = registry.assets.find(a => a.id === item.asset_id);
      return { id: asset.id, type: asset.type, title: asset.title, status: asset.status,
        url: asset.status === 'active' ? asset.locations.at(-1).url : null };
    })
  };
}
export function repointAsset(registry, assetId, newUrl, since, reason) {
  validateRegistry(registry);
  ident(assetId, 'asset ID');
  safePublicUrl(newUrl);
  timestamp(since);
  short(reason, 'reason');
  const output = JSON.parse(JSON.stringify(registry));
  const asset = output.assets.find(a => a.id === assetId);
  if (!asset) throw Error('Unknown asset');
  const latest = asset.locations.at(-1);
  if (latest.url === newUrl) throw Error('Already points to that URL');
  if (latest.since >= since) throw Error('Repoint timestamp must follow previous observation');
  asset.locations.push({ url: newUrl, since, reason });
  return validateRegistry(output);
}
export function addPacket(registry, packet) {
  validateRegistry(registry);
  const output = JSON.parse(JSON.stringify(registry));
  output.packets.push(packet);
  return validateRegistry(output);
}
