import { createHash } from 'node:crypto';

// Small, intentionally scoped canonical JSON. Not an RFC 8785/JCS implementation.
// Only JSON values, safe integral numbers, Unicode strings, arrays and plain objects.
export function canonical(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw Error('Canonical JSON requires safe integer numbers');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',') + '}';
  }
  throw Error('Unsupported value in canonical JSON');
}

export function digest(domain, value) {
  if (!/^sia\/[a-z0-9-]+\/v[0-9]+$/.test(domain)) throw Error('Invalid hash domain');
  return 'sha256:' + createHash('sha256').update(domain+'\0'+canonical(value),'utf8').digest('hex');
}

export function uniqueSorted(values) { return [...new Set(values)].sort(); }
export function assertKeys(obj, keys, name) {
  for (const k of Object.keys(obj)) if (!keys.includes(k)) throw Error(`Unexpected ${name} field: ${k}`);
}
export function record(obj, name) {
  if (!obj || Array.isArray(obj) || typeof obj !== 'object' || Object.getPrototypeOf(obj)!==Object.prototype)
    throw Error(`${name} must be an object`);
  return obj;
}
export function boundedString(value,name,min=0,max=240) {
  if (typeof value !== 'string' || value.length < min || value.length > max || (min && !value.trim()))
    throw Error(`${name} must be text (${min}–${max} characters)`);
  return value;
}
export function httpsUrl(value,name) {
  boundedString(value,name,9,2000);
  let url;
  try { url = new URL(value); } catch { throw Error(`${name} is not a URL`); }
  if(url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw Error(`${name} must be a public https URL without credentials`);
  return value;
}
