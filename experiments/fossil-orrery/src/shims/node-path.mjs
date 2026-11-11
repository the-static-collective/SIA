// @ts-nocheck
export function join(...parts) {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}
export function resolve(...parts) {
  return join(...parts);
}
export function dirname(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? "." : p.slice(0, i);
}
