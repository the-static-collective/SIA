import { tokenizeKept, type Edge, type Item } from "./model.ts";

export type SkyNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  r: number;
  band: "dated" | "undated" | "derived" | "bucket";
  sourceBand: "dated" | "undated" | "derived";
  count: number;
  memberIds: string[];
};

type SkyBand = "dated" | "undated" | "derived";
type Region = { x0: number; x1: number; y0: number; y1: number };
const MIN_SPACING = 22;
const MAX_VISIBLE_PER_BAND = 64;
const MAX_BUCKETS_PER_BAND = 16;

function region(band: SkyBand, width: number, height: number): Region {
  const top = 46;
  const bottom = Math.max(top + 22, height * 0.73);
  if (band === "dated") return { x0: 18, x1: width * 0.73 - 14, y0: top, y1: bottom };
  if (band === "undated") return { x0: width * 0.76, x1: width - 12, y0: top, y1: bottom };
  return { x0: 18, x1: width - 12, y0: height * 0.81, y1: height - 22 };
}

function bandCapacity(r: Region) {
  const cols = Math.max(1, Math.floor(Math.max(1, r.x1 - r.x0) / MIN_SPACING));
  const rows = Math.max(1, Math.floor(Math.max(1, r.y1 - r.y0) / MIN_SPACING));
  return Math.max(2, Math.min(MAX_VISIBLE_PER_BAND, cols * rows));
}

function compareTitle(a: Item, b: Item) {
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

/**
 * Bounded, reversible strata. Each bucket is a subset of a single evidence/time band;
 * its member IDs are the only drill-down authority. No missing date is inferred.
 * Repeating on a focused bucket subdivides again until every artifact is visible.
 */
function strata(items: Item[], band: SkyBand, capacity: number): SkyNode[] {
  if (items.length <= capacity) {
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      x: 0,
      y: 0,
      r: item.kind === "album" ? 6 : 5,
      band,
      sourceBand: band,
      count: 1,
      memberIds: [item.id],
    }));
  }
  const bucketCount = Math.min(MAX_BUCKETS_PER_BAND, capacity, Math.ceil(items.length / capacity));
  const chunkSize = Math.ceil(items.length / bucketCount);
  const nodes: SkyNode[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    const group = items.slice(start, start + chunkSize);
    nodes.push({
      id: `bucket:${band}:${group[0].id}:${group.length}`,
      title: `${band === "dated" ? "Source-claimed time" : band === "undated" ? "Chronology unresolved" : "Local selection"}: ${group.length} artifacts`,
      x: 0,
      y: 0,
      r: 9,
      band: "bucket",
      sourceBand: band,
      count: group.length,
      memberIds: group.map((item) => item.id),
    });
  }
  return nodes;
}

function place(nodes: SkyNode[], box: Region): SkyNode[] {
  if (!nodes.length) return [];
  const w = Math.max(1, box.x1 - box.x0);
  const h = Math.max(1, box.y1 - box.y0);
  const maxCols = Math.max(1, Math.floor(w / MIN_SPACING));
  const maxRows = Math.max(1, Math.floor(h / MIN_SPACING));
  let cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(nodes.length * w / h))));
  let rows = Math.ceil(nodes.length / cols);
  if (rows > maxRows) {
    cols = Math.min(maxCols, Math.ceil(nodes.length / maxRows));
    rows = Math.ceil(nodes.length / cols);
  }
  const pitch = Math.min(w / cols, h / rows);
  return nodes.map((node, i) => ({
    ...node,
    x: box.x0 + (Math.floor(i / rows) + 0.5) * w / cols,
    y: box.y0 + ((i % rows) + 0.5) * h / rows,
    r: node.band === "bucket" ? Math.min(12, Math.max(6, pitch * 0.3)) : node.r,
  }));
}

export function layoutSky(items: Item[], edges: Edge[], width: number, height: number, focusIds: string[] | null) {
  const allowed = focusIds ? new Set(focusIds) : null;
  const pool = allowed ? items.filter((item) => allowed.has(item.id)) : items;
  const dated = pool.filter((item) => item.chrono.kind === "source-claimed")
    .sort((a, b) => (a.chrono.sort ?? 0) - (b.chrono.sort ?? 0) || compareTitle(a, b));
  const undated = pool.filter((item) => item.chrono.kind === "unresolved").sort(compareTitle);
  const derived = pool.filter((item) => item.chrono.kind === "derived").sort(compareTitle);
  const nodes: SkyNode[] = [];
  for (const [band, records] of [
    ["dated", dated], ["undated", undated], ["derived", derived],
  ] as const) {
    const box = region(band, width, height);
    nodes.push(...place(strata(records, band, bandCapacity(box)), box));
  }
  // Aggregate lines would imply a relationship between entire groups. Draw only
  // original edges for records currently individually visible in the sky.
  const visible = new Set(nodes.filter((node) => node.count === 1).map((node) => node.id));
  const drawn = edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to));
  return { nodes, edges: drawn, dated: dated.length, undated: undated.length, derived: derived.length };
}

export type FluteNode = Item & { angle: number; radius: number; inTime: boolean };

export function layoutFlute(items: Item[]) {
  const dated = items.filter((item) => item.chrono.kind === "source-claimed").sort((a, b) => a.chrono.sort! - b.chrono.sort! || a.title.localeCompare(b.title));
  const others = items.filter((item) => item.chrono.kind !== "source-claimed");
  const min = dated[0]?.chrono.sort ?? 0;
  const max = dated[dated.length - 1]?.chrono.sort ?? 1;
  const span = Math.max(1, max - min);
  const nodes: FluteNode[] = dated.map((item) => {
    const t = (item.chrono.sort! - min) / span;
    const n = parseInt(item.id.slice(7, 11), 16);
    return { ...item, radius: 0.18 + t * 0.74, angle: (n / 65535) * Math.PI * 2, inTime: true };
  });
  others.forEach((item, index) => {
    nodes.push({
      ...item,
      radius: 1.08,
      angle: (index / Math.max(1, others.length)) * Math.PI * 2,
      inTime: false,
    });
  });
  return { nodes, hasTime: dated.length > 0 };
}

export function clownNote(sounding: Item[], edges: Edge[]) {
  const counts = new Map<string, Item[]>();
  for (const item of sounding) {
    const tokens = new Set(tokenizeKept([item.title, ...item.facts.filter((fact) => fact.key === "style_tags" || fact.key === "motif").map((fact) => String(fact.value))].join(" ")));
    for (const token of tokens) {
      const list = counts.get(token) ?? [];
      list.push(item);
      counts.set(token, list);
    }
  }
  let best: { token: string; items: Item[] } | null = null;
  for (const [token, group] of counts) {
    const unlinked: Item[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const linked = edges.some(
          (edge) =>
            edge.kind === "documented" &&
            ((edge.from === group[i].id && edge.to === group[j].id) ||
              (edge.from === group[j].id && edge.to === group[i].id)),
        );
        if (linked) continue;
        for (const item of [group[i], group[j]]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            unlinked.push(item);
          }
        }
      }
    }
    if (unlinked.length < 2) continue;
    if (!best || unlinked.length > best.items.length) best = { token, items: unlinked };
  }
  return best;
}
