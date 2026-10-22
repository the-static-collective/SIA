// @ts-nocheck
class Bytes extends Uint8Array {
  static from(value, encoding) {
    if (value instanceof Uint8Array) return new Bytes(value);
    if (typeof value === "string") {
      if (encoding === "hex") {
        const out = new Bytes(Math.ceil(value.length / 2));
        const clean = value.length % 2 ? "0" + value : value;
        for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        return out;
      }
      return new Bytes(new TextEncoder().encode(value));
    }
    if (Array.isArray(value) || value instanceof ArrayBuffer) return new Bytes(value);
    throw new Error("Unsupported Buffer.from input");
  }
  static isBuffer(value) {
    return value instanceof Bytes;
  }
  toString(encoding = "utf8") {
    if (encoding === "hex") return [...this].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (encoding !== "utf8") throw new Error("Unsupported Buffer encoding");
    return new TextDecoder().decode(this);
  }
  equals(other) {
    const b = other instanceof Uint8Array ? other : Bytes.from(other);
    if (b.length !== this.length) return false;
    for (let i = 0; i < this.length; i++) if (b[i] !== this[i]) return false;
    return true;
  }
}

export function installBuffer() {
  if (typeof globalThis.Buffer !== "undefined") return;
  globalThis.Buffer = Bytes;
}
