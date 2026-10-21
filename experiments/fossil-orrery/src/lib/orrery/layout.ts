import { tokenizeKept, type Edge, type Item } from "./model.ts";

export type SkyNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  r: number;
  band: "dated" | "undated" | "derived" | "bucket";
  count: number;
  memberIds: string[];
};

const pad = (n: number, width: number) => Math.min(width - 28, Math.max(28, n));

export function layoutSky(items: Item[], edges: Edge[], width: number, height: number, focusIds: string[] | null) {
  const pool = focusIds ? items.filter((item) => focusIds.includes(item.id)) : items;
  const dated = pool.filter((item) => item.chrono.kind === "source-claimed").sort((a, b) => (a.chrono.sort! - b.chrono.sort!) || a.title.localeCompare(b.title));
  const undated = pool.filter((item) => item.chrono.kind === "unresolved").sort((a, b) => a.title.localeCompare(b.title));
  const derived = pool.filter((item) => item.chrono.kind === "derived").sort((a, b) => a.title.localeCompare(b.title));
  const nodes: SkyNode[] = [];
  const derivedTop = derived.length ? height * 0.78 : height - 16;
  const datedBottom = derivedTop - 16;

  if (!focusIds && dated.length > 700) {
    const buckets = 36;
    const min = dated[0].chrono.sort!;
    const max = dated[dated.length - 1].chrono.sort!;
    const span = Math.max(1, max - min);
    const groups: Item[][] = Array.from({ length: buckets }, () => []);
    for (const item of dated) {
      const index = Math.min(buckets - 1, Math.floor(((item.chrono.sort! - min) / span) * buckets));
      groups[index].push(item);
    }
    groups.forEach((group, index) => {
      if (!group.length) return;
      nodes.push({
        id: `bucket:${index}`,
        title: `${group.length} artifacts`,
        x: pad(40 + (index / (buckets - 1)) * (width * 0.68), width),
        y: height * 0.42,
        r: Math.min(28, 8 + Math.sqrt(group.length) * 2),
        band: "bucket",
        count: group.length,
        memberIds: group.map((item) => item.id),
      });
    });
  } else if (dated.length) {
    const min = dated[0].chrono.sort!;
    const max = dated[dated.length - 1].chrono.sort!;
    const span = Math.max(1, max - min);
    const left = 40;
    const right = width * (undated.length ? 0.7 : 0.94);
    dated.forEach((item, index) => {
      const n = parseInt(item.id.slice(7, 11), 16) || index;
      const x = left + ((item.chrono.sort! - min) / span) * Math.max(1, right - left);
      const y = 36 + (n % 1000) / 1000 * Math.max(40, datedBottom - 56);
      nodes.push({
        id: item.id,
        title: item.title,
        x,
        y,
        r: item.kind === "album" ? 8 : 5,
        band: "dated",
        count: 1,
        memberIds: [item.id],
      });
    });
  }

  undated.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    nodes.push({
      id: item.id,
      title: item.title,
      x: width * 0.78 + col * 28,
      y: 40 + (row % 18) * 22,
      r: 5,
      band: "undated",
      count: 1,
      memberIds: [item.id],
    });
  });
  derived.forEach((item, index) => {
    nodes.push({
      id: item.id,
      title: item.title,
      x: 40 + (index % 12) * 48,
      y: height * 0.9,
      r: 6,
      band: "derived",
      count: 1,
      memberIds: [item.id],
    });
  });

  const visible = new Set(nodes.flatMap((node) => node.memberIds));
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
