import { observation, parseCsv, planSunoImport, sourceTime, verifyDerived, verifyObservation } from "./engine.ts";
import { sha256Hex } from "./sha256.mjs";

export type Role = "ignore" | "title" | "url" | "externalId" | "creator" | "createdAt" | "styleTags" | "duration" | "notes";

const ROLE_LIST: Role[] = ["ignore", "title", "url", "externalId", "creator", "createdAt", "styleTags", "duration", "notes"];

export function isRole(value: string): value is Role {
  return (ROLE_LIST as string[]).includes(value);
}

function norm(header: string) {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Suggestions only. published/release columns are never treated as creation time. */
export function suggestRoles(columns: string[]): Record<string, Role> {
  const roles: Record<string, Role> = {};
  for (const col of columns) {
    const key = norm(col);
    if (["title", "name", "song_title", "song_name", "track_title"].includes(key)) roles[col] = "title";
    else if (["url", "song_url", "link", "page", "source_url"].includes(key)) roles[col] = "url";
    else if (["id", "external_id", "song_id", "uuid"].includes(key)) roles[col] = "externalId";
    else if (["creator", "artist", "artist_name", "creator_label", "display_name"].includes(key)) roles[col] = "creator";
    else if (["created_at", "created", "creation_time", "when_made", "source_created_at"].includes(key)) roles[col] = "createdAt";
    else if (["tags", "style_tags", "style", "genre", "vibe"].includes(key)) roles[col] = "styleTags";
    else if (["duration", "duration_seconds"].includes(key)) roles[col] = "duration";
    else if (["notes", "note", "private_note"].includes(key)) roles[col] = "notes";
    else roles[col] = "ignore";
  }
  return roles;
}

export function unresolvedReport(columns: string[], roles: Record<string, Role>) {
  const used = new Set(Object.values(roles));
  const missing: string[] = [];
  if (!used.has("title")) missing.push("title");
  if (!used.has("url")) missing.push("url — a locator will not be invented");
  if (!used.has("createdAt")) missing.push("createdAt — chronology stays unresolved");
  const duplicates = ROLE_LIST.filter((role) => role !== "ignore" && columns.filter((c) => roles[c] === role).length > 1);
  return {
    missing,
    ignoredColumns: columns.filter((c) => !roles[c] || roles[c] === "ignore"),
    duplicateRoles: duplicates,
    relations: "none — column mapping never creates ancestry",
  };
}

function columnFor(roles: Record<string, Role>, role: Role) {
  return Object.entries(roles).find(([, value]) => value === role)?.[0] ?? null;
}

export function mapRows(
  rows: Record<string, string>[],
  roles: Record<string, Role>,
  opts: { observedAt: string; rights: "links-only" | "owned-media" | "licensed-media"; kind: "song" | "album" | "text" | "other" },
) {
  const accepted: ReturnType<typeof observation>[] = [];
  const rejected: { sourcePosition: number; reason: string }[] = [];
  const report = unresolvedReport(Object.keys(rows[0] ?? roles), roles);
  if (report.duplicateRoles.length) {
    return { accepted, rejected: [{ sourcePosition: 0, reason: `Each field can be mapped once: ${report.duplicateRoles.join(", ")}` }], report };
  }
  rows.forEach((row, index) => {
    try {
      const get = (role: Role) => {
        const col = columnFor(roles, role);
        if (!col) return null;
        const value = row[col];
        if (value === undefined || value === null || String(value).trim() === "") return null;
        return String(value).trim();
      };
      const title = get("title");
      const url = get("url");
      if (!title) throw new Error("missing title");
      if (!url) throw new Error("missing url — locator not fabricated");
      const facts: { key: string; value: string | number | boolean; basis: "owner-export" }[] = [];
      const created = get("createdAt");
      if (created) {
        const parsed = sourceTime(created);
        if (!parsed) throw new Error("created time is not a ranked timestamp — refused rather than coerced");
        facts.push({ key: "source_created_at", value: parsed.text, basis: "owner-export" });
        facts.push({ key: "source_created_precision", value: parsed.precision, basis: "owner-export" });
      }
      const tags = get("styleTags");
      if (tags) facts.push({ key: "style_tags", value: tags.slice(0, 600), basis: "owner-export" });
      const duration = get("duration");
      if (duration && /^\d+(?:\.\d+)?$/.test(duration)) {
        const ms = Math.round(Number(duration) * 1000);
        if (Number.isSafeInteger(ms)) facts.push({ key: "reported_duration_ms", value: ms, basis: "owner-export" });
      }
      const externalId = (get("externalId") ?? `mapped:${index + 1}`).slice(0, 200);
      const note = get("notes");
      accepted.push(
        observation({
          schema: "sia/observation/v0",
          artifact: {
            externalId,
            kind: opts.kind,
            title: title.slice(0, 240),
            url,
            creator: (get("creator") ?? "").slice(0, 160),
          },
          capture: {
            sourceUrl: url,
            evidenceUrl: url,
            observedAt: opts.observedAt,
            method: "owner-export",
            rights: opts.rights,
            notes: `Mapped by an operator from an unfamiliar export. Unmapped columns remain only in the raw snapshot. ${note ?? ""}`.slice(0, 600),
          },
          facts,
          relations: [],
          interpretations: [],
        }),
      );
    } catch (error) {
      rejected.push({ sourcePosition: index + 1, reason: error instanceof Error ? error.message : "refused" });
    }
  });
  return { accepted, rejected, report };
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function childArrays(value: Record<string, unknown>, prefix: string) {
  const found: { key: string; rows: Record<string, unknown>[] }[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) && child.every(isPlain)) found.push({ key: prefix ? `${prefix}.${key}` : key, rows: child as Record<string, unknown>[] });
  }
  return found;
}

export type Sniff =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "sia-observations"; items: unknown[] }
  | { kind: "derived"; items: unknown[] }
  | { kind: "bundle"; bundle: Record<string, unknown> }
  | { kind: "threads"; threads: unknown[] }
  | { kind: "proposal"; proposal: Record<string, unknown> }
  | { kind: "table"; rows: Record<string, string>[]; format: "csv" | "json" }
  | { kind: "choose-collection"; choices: { key: string; rows: Record<string, unknown>[] }[] };

export function sniff(text: string): Sniff {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { kind: "empty" };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return sniffValue(JSON.parse(trimmed));
    } catch (error) {
      return { kind: "error", message: error instanceof Error ? error.message : "JSON did not parse" };
    }
  }
  try {
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    return { kind: "table", format: "csv", rows };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "CSV did not parse" };
  }
}

function sniffValue(json: unknown): Sniff {
  if (Array.isArray(json)) {
    if (json.length && json.every((item) => isPlain(item) && item.schema === "sia/observation/v0")) {
      return { kind: "sia-observations", items: json };
    }
    if (json.length && json.every(isPlain)) return { kind: "table", format: "json", rows: objectsToRows(json) };
    return { kind: "error", message: "JSON array is not a list of records" };
  }
  if (!isPlain(json)) return { kind: "error", message: "Unsupported JSON" };
  if (json.schema === "sia/observation/v0") return { kind: "sia-observations", items: [json] };
  if (json.schema === "sia/derived/v0") return { kind: "derived", items: [json] };
  if (json.schema === "fossil-orrery/vault/v0") return { kind: "bundle", bundle: json };
  if (json.schema === "story-dna/relationship-thread/v0") return { kind: "threads", threads: [json] };
  if (json.schema === "story-dna/exchange/v0" && Array.isArray(json.threads)) return { kind: "threads", threads: json.threads };
  if (json.schema === "story-dna/fixture/v0" && Array.isArray(json.threads)) return { kind: "threads", threads: json.threads };
  if (json.schema === "sia/proposal/v0") return { kind: "proposal", proposal: json };
  const arrays = [
    ...childArrays(json, ""),
    ...(isPlain(json.data) ? childArrays(json.data, "data") : []),
    ...(isPlain(json.export) ? childArrays(json.export, "export") : []),
  ];
  if (arrays.length === 1) return { kind: "table", format: "json", rows: objectsToRows(arrays[0].rows) };
  if (arrays.length > 1) return { kind: "choose-collection", choices: arrays };
  return { kind: "error", message: "No supported record list. Nothing was invented from this file." };
}

function objectsToRows(rows: Record<string, unknown>[]): Record<string, string>[] {
  return rows.map((row) => {
    const flat: Record<string, string> = {};
    const source = isPlain(row.clip) ? (row.clip as Record<string, unknown>) : isPlain(row.song) ? (row.song as Record<string, unknown>) : row;
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") flat[key] = String(value);
    }
    for (const [key, value] of Object.entries(row)) {
      if (key === "clip" || key === "song") continue;
      if (!(key in flat) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) flat[key] = String(value);
    }
    return flat;
  });
}

export function trySunoPlan(text: string, observedAt: string, includePrompts = false) {
  try {
    const plan = planSunoImport(text, { observedAt, includePrompts, limit: 20000 });
    return { ok: true as const, plan };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Suno adapter refused the file" };
  }
}

export function acceptStored(item: any) {
  if (item?.schema === "sia/derived/v0") return verifyDerived(item);
  if (item?.schema === "sia/observation/v0" && typeof item.id === "string") return verifyObservation(item);
  if (item?.schema === "sia/observation/v0") return observation(item);
  throw new Error("Unsupported object schema");
}

export function hashText(text: string) {
  return "sha256:" + sha256Hex(new TextEncoder().encode(text));
}
