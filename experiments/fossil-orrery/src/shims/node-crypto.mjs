// @ts-nocheck
import { sha256Hex } from "../lib/orrery/sha256.mjs";

function toBytes(data, encoding) {
  if (typeof data === "string") {
    if (encoding === "hex") {
      const clean = data.length % 2 ? "0" + data : data;
      const out = new Uint8Array(clean.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    return new TextEncoder().encode(data);
  }
  if (data instanceof Uint8Array) return data;
  throw new Error("Unsupported hash input");
}

export function createHash(algorithm) {
  if (algorithm !== "sha256") throw new Error("Only sha256 is implemented");
  const parts = [];
  return {
    update(data, encoding) {
      parts.push(toBytes(data, encoding));
      return this;
    },
    digest(encoding = "hex") {
      if (encoding !== "hex") throw new Error("Only hex digests are implemented");
      const len = parts.reduce((n, p) => n + p.length, 0);
      const all = new Uint8Array(len);
      let o = 0;
      for (const p of parts) {
        all.set(p, o);
        o += p.length;
      }
      return sha256Hex(all);
    },
  };
}
