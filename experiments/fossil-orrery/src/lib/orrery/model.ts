import { canonical } from "./engine.ts";
import { sha256Hex } from "./sha256.mjs";

export type Chronology = {
  kind: "source-claimed" | "unresolved" | "derived";
  sort: number | null;
  label: string;
  precision: string | null;
};

export type Evidence = "synthetic-fixture" | "source-observation" | "derived-local";

export type ItemLink = { type: string; target: string; basis: string; evidenceUrl: string | null };

export type Item = {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  creator: string;
  evidence: Evidence;
  chrono: Chronology;
  links: ItemLink[];
  parentIds: string[];
  facts: { key: string; value: unknown; basis: string }[];
  interpretations: { text: string; by: string }[];
  capture: {
    method: string;
    rights: string;
    observedAt: string;
    sourceUrl: string;
    evidenceUrl: string;
    notes: string;
  } | null;
  raw: Record<string, unknown>;
};

export type EdgeKind = "documented" | "local-selection" | "hypothesis";

export type Edge = { from: string; to: string; kind: EdgeKind; label: string };

type Fact = { key?: string; value?: unknown; basis?: string };

function fact(obj: { facts?: Fact[] }, key: string) {
  return obj.facts?.find((f) => f.key === key);
}

export function evidenceClass(obj: { schema?: string; capture?: { notes?: string }; artifact?: { url?: string; creator?: string } }): Evidence {
  if (obj?.schema === "sia/derived/v0") return "derived-local";
  const notes = `${obj?.capture?.notes ?? ""} ${obj?.artifact?.url ?? ""} ${obj?.artifact?.creator ?? ""}`;
  if (notes.includes("SYNTHETIC") || notes.includes("example.com/fossil-orrery")) return "synthetic-fixture";
  return "source-observation";
}

/** Source creation time only. Capture time and publish time are not birthdays. */
export function chronology(obj: {
  schema?: string;
  facts?: Fact[];
  capture?: { observedAt?: string };
}): Chronology {
  if (obj.schema === "sia/derived/v0") {
    return { kind: "derived", sort: null, label: "local selection — not a source date", precision: null };
  }
  const created = fact(obj, "source_created_at") ?? fact(obj, "album_created_date");
  const precisionFact = fact(obj, "source_created_precision");
  if (created && (typeof created.value === "string" || typeof created.value === "number")) {
    const text = String(created.value);
    const sort = Date.parse(text.length === 10 ? `${text}T00:00:00Z` : text);
    if (Number.isFinite(sort)) {
      const precision =
        typeof precisionFact?.value === "string"
          ? precisionFact.value
          : /^\d{4}-\d{2}-\d{2}$/.test(text)
            ? "day"
            : "stated";
      return { kind: "source-claimed", sort, label: text, precision };
    }
  }
  return { kind: "unresolved", sort: null, label: "chronology unresolved", precision: null };
}

export function project(obj: Record<string, any>): Item {
  const derived = obj.schema === "sia/derived/v0";
  return {
    id: obj.id,
    title: derived ? obj.title : obj.artifact.title,
    kind: derived ? "creative-text" : obj.artifact.kind,
    url: derived ? null : obj.artifact.url,
    creator: derived ? "" : (obj.artifact.creator ?? ""),
    evidence: evidenceClass(obj),
    chrono: chronology(obj),
    links: derived
      ? []
      : (obj.relations ?? []).map((r: any) => ({
          type: r.type,
          target: r.target,
          basis: r.basis,
          evidenceUrl: r.evidenceUrl ?? null,
        })),
    parentIds: derived ? [...(obj.parents?.sourceObservationIds ?? [])] : [],
    facts: derived ? [] : [...(obj.facts ?? [])],
    interpretations: derived ? [] : [...(obj.interpretations ?? [])],
    capture: derived
      ? null
      : {
          method: obj.capture.method,
          rights: obj.capture.rights,
          observedAt: obj.capture.observedAt,
          sourceUrl: obj.capture.sourceUrl,
          evidenceUrl: obj.capture.evidenceUrl,
          notes: obj.capture.notes ?? "",
        },
    raw: obj,
  };
}

export function fossilDigest(domain: string, value: unknown) {
  return "sha256:" + sha256Hex(new TextEncoder().encode(domain + "\0" + canonical(value)));
}

export function makeHypothesis(fromId: string, toId: string, tokens: string[]) {
  const [a, b] = [fromId, toId].sort();
  const body = {
    schema: "fossil-orrery/hypothesis/v0",
    status: "HYPOTHESIS",
    basis: "token-overlap-not-source-claim",
    fromId: a,
    toId: b,
    sharedTokens: [...new Set(tokens)].sort(),
    meaning:
      "Unclaimed resonance from shared title or tag tokens. Not a source relation, not ancestry, not intent.",
  };
  return { ...body, id: fossilDigest("fossil-orrery/hypothesis/v0", body) };
}

export function makeAnnotation(aboutId: string, text: string, kind: "tokenizer-residue" | "owner-note") {
  const body = {
    schema: "fossil-orrery/annotation/v0",
    aboutId,
    kind,
    text,
    by: "human",
    status: "interpretation-not-fact",
  };
  return { ...body, id: fossilDigest("fossil-orrery/annotation/v0", body) };
}

export function documentedEdges(items: Item[], hypotheses: { fromId: string; toId: string; sharedTokens?: string[] }[] = []): Edge[] {
  const byUrl = new Map<string, string[]>();
  for (const item of items) {
    if (!item.url) continue;
    const list = byUrl.get(item.url) ?? [];
    list.push(item.id);
    byUrl.set(item.url, list);
  }
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string, kind: EdgeKind, label: string) => {
    if (!a || !b || a === b) return;
    const key = [a, b].sort().join("|") + "|" + kind + "|" + label;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from: a, to: b, kind, label });
  };
  for (const item of items) {
    for (const link of item.links) {
      for (const target of byUrl.get(link.target) ?? []) add(item.id, target, "documented", link.type);
    }
    for (const parent of item.parentIds) add(item.id, parent, "local-selection", "unsigned local selection");
  }
  for (const ids of byUrl.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) add(ids[0], ids[i], "documented", "same locator, distinct snapshot");
  }
  for (const h of hypotheses) add(h.fromId, h.toId, "hypothesis", "HYPOTHESIS");
  return edges;
}

export function hasDocumentedLink(a: Item, b: Item, edges: Edge[]) {
  return edges.some(
    (e) =>
      e.kind === "documented" &&
      ((e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)),
  );
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "for", "of", "by", "in", "on", "at", "it", "my", "your",
  "with", "from", "this", "that", "where", "we", "our", "is", "be", "me", "you", "i", "there", "let",
]);

export function tokenizeKept(str: string) {
  return (str.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w)).slice(0, 40);
}

export function tokenizerReport(strings: string[]) {
  const kept: string[] = [];
  const refused: string[] = [];
  for (const str of strings) {
    const raw = str.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const w of raw) {
      if (w.length < 3 || STOP.has(w)) refused.push(w);
      else kept.push(w);
    }
  }
  return { kept: kept.slice(0, 40), refused };
}

export function foodStrings(item: Item) {
  const strings = [item.title];
  for (const factRow of item.facts) {
    if (
      typeof factRow.value === "string" &&
      (factRow.key === "style_tags" || factRow.key === "motif" || factRow.key === "subject" || factRow.key === "prompt_excerpt")
    ) {
      strings.push(factRow.value);
    }
  }
  return strings;
}
