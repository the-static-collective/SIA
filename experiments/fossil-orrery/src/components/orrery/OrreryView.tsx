import { useEffect, useMemo, useRef, useState } from "react";
import { documentedEdges, project, type Item } from "@/lib/orrery/model";
import { layoutSky, type SkyNode } from "@/lib/orrery/layout";
import { Inspector } from "./parts";
import { useVault } from "./store";

type Paint = { ink: string; bone: string; mute: string; amber: string; line: string; panel: string };

function colors(): Paint {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick("--color-ink", "#14120e"),
    bone: pick("--color-bone", "#f3ead7"),
    mute: pick("--color-mute", "#a39884"),
    amber: pick("--color-amber", "#e3a04a"),
    line: pick("--color-line", "#3c352b"),
    panel: pick("--color-panel", "#1c1914"),
  };
}

export function OrreryView() {
  const vault = useVault();
  const items = useMemo(() => Object.values(vault.objects).map((obj) => project(obj)), [vault.objects]);
  const edges = useMemo(() => documentedEdges(items, vault.hypotheses), [items, vault.hypotheses]);
  const [focusStack, setFocusStack] = useState<string[][]>([]);
  const focus = focusStack.at(-1) ?? null;
  const [viewport, setViewport] = useState({ width: 900, height: 600 });
  const layout = useMemo(
    () => layoutSky(items, edges, viewport.width, viewport.height, focus),
    [items, edges, viewport, focus],
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [ledger, setLedger] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SkyNode[]>([]);
  nodesRef.current = layout.nodes;
  const hotNodeIds = useMemo(() => {
    const highlighted = new Set(vault.pins);
    if (vault.selectedId) highlighted.add(vault.selectedId);
    return new Set(layout.nodes.filter((node) => node.memberIds.some((id) => highlighted.has(id))).map((node) => node.id));
  }, [layout, vault.selectedId, vault.pins]);
  const selected = useMemo(
    () => items.find((item) => item.id === vault.selectedId) ?? null,
    [items, vault.selectedId],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      setViewport((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [ledger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = viewport;
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(width * dpr));
      const pixelHeight = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const paint = colors();
      ctx.fillStyle = paint.ink;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = paint.line;
      ctx.beginPath();
      ctx.moveTo(width * 0.74, 24);
      ctx.lineTo(width * 0.74, height * 0.74);
      ctx.stroke();
      ctx.fillStyle = paint.mute;
      ctx.font = "12px IBM Plex Mono, ui-monospace, monospace";
      ctx.fillText("OLDEST SOURCE TIME", 16, 22);
      ctx.fillText("UNDATED", Math.min(width - 70, width * 0.78), 22);
      if (layout.derived) ctx.fillText("LOCAL SELECTION — NOT SOURCE TIME", 16, height - 12);
      const at = new Map(layout.nodes.filter((node) => node.count === 1).map((node) => [node.id, node]));
      for (const edge of layout.edges) {
        const a = at.get(edge.from);
        const b = at.get(edge.to);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.strokeStyle = paint.amber;
        ctx.globalAlpha = edge.kind === "hypothesis" ? 0.85 : 0.7;
        ctx.setLineDash(edge.kind === "documented" ? [] : edge.kind === "hypothesis" ? [4, 4] : [1, 3]);
        ctx.lineWidth = edge.kind === "documented" ? 1.4 : 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const node of layout.nodes) {
        const hot = hotNodeIds.has(node.id);
        ctx.beginPath();
        ctx.fillStyle = node.sourceBand === "undated" ? paint.panel : paint.bone;
        ctx.strokeStyle = hot ? paint.amber : paint.line;
        ctx.lineWidth = hot ? 2 : 1;
        if (node.band === "derived") {
          ctx.rect(node.x - node.r, node.y - node.r, node.r * 2, node.r * 2);
        } else if (node.band === "bucket") {
          ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        } else {
          ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        if (node.sourceBand === "undated") {
          ctx.beginPath();
          ctx.strokeStyle = paint.amber;
          ctx.arc(node.x, node.y, node.r + 3, 0, Math.PI * 2);
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (node.band === "bucket") {
          ctx.fillStyle = paint.ink;
          ctx.font = "11px IBM Plex Mono, ui-monospace, monospace";
          const countText = node.count >= 1000 ? `${Math.round(node.count / 100) / 10}k` : String(node.count);
          ctx.fillText(countText, node.x - ctx.measureText(countText).width / 2, node.y + 3);
        }
      }
      const label = layout.nodes.find((node) => node.id === hovered || node.memberIds.includes(hovered ?? ""));
      if (label) {
        ctx.fillStyle = paint.panel;
        const text = label.title;
        const w = Math.min(280, ctx.measureText(text).width + 16);
        ctx.fillRect(Math.min(label.x + 8, width - w - 8), label.y - 22, w, 20);
        ctx.fillStyle = paint.bone;
        ctx.fillText(text, Math.min(label.x + 14, width - w), label.y - 8);
      }
    };
    draw();
  }, [layout, viewport, hovered, hotNodeIds]);

  const hit = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return nodesRef.current.find((node) => Math.hypot(node.x - x, node.y - y) <= node.r + 8) ?? null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="font-mono text-xs text-mute">
            {focus ? `Stratum ${focusStack.length} · ${focus.length} records · ` : `${items.length} records · `}
            Solid = documented; dashes = hypotheses/selections. Select a cluster to drill in.
          </p>
          <div className="flex gap-2">
            <button className="btn" data-quiet="true" onClick={() => setLedger((value) => !value)} type="button">
              {ledger ? "Sky" : "Ledger"}
            </button>
            {focus && (
              <>
                <button className="btn" onClick={() => setFocusStack((stack) => stack.slice(0, -1))} type="button">
                  Back
                </button>
                <button className="btn" onClick={() => setFocusStack([])} type="button">
                  All strata
                </button>
              </>
            )}
          </div>
        </div>
        {ledger ? (
          <Ledger items={items} />
        ) : (
          <div className="absolute inset-x-0 bottom-0 top-14">
            <canvas
              aria-label="Archive orrery"
              className="h-full w-full touch-none"
              onPointerDown={(event) => {
                const node = hit(event);
                if (!node) return;
                if (node.band === "bucket") {
                  setFocusStack((stack) => [...stack, node.memberIds]);
                  return;
                }
                vault.select(node.id);
              }}
              onPointerMove={(event) => setHovered(hit(event)?.id ?? null)}
              ref={canvasRef}
            />
          </div>
        )}
      </div>
      {selected && (
        <Inspector
          annotations={vault.annotations}
          item={selected}
          onClose={() => vault.select(null)}
          onPin={() => vault.togglePin(selected.id)}
          pinned={vault.pins.includes(selected.id)}
        />
      )}
    </div>
  );
}

function Ledger({ items }: { items: Item[] }) {
  const vault = useVault();
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("all");
  const [page, setPage] = useState(0);
  const perPage = 100;
  const rows = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const order = { "source-claimed": 0, unresolved: 1, derived: 2 };
      const delta = order[a.chrono.kind] - order[b.chrono.kind];
      if (delta) return delta;
      if (a.chrono.kind === "source-claimed") {
        const date = (a.chrono.sort ?? 0) - (b.chrono.sort ?? 0);
        if (date) return date;
      }
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
    const needle = query.trim().toLocaleLowerCase();
    return sorted.filter((item) =>
      (band === "all" || item.chrono.kind === band) &&
      (!needle || [item.title, item.id, item.url ?? ""].some((field) => field.toLocaleLowerCase().includes(needle))),
    );
  }, [items, query, band]);
  const maxPage = Math.max(0, Math.ceil(rows.length / perPage) - 1);
  const current = Math.min(page, maxPage);
  const shown = rows.slice(current * perPage, (current + 1) * perPage);
  return (
    <div className="flex h-[calc(100%-3.5rem)] min-h-0 flex-col px-4 pb-4">
      <div className="flex flex-wrap items-end gap-3 border-b border-line py-3">
        <label className="flex min-w-36 flex-1 flex-col gap-1 font-mono text-xs text-mute" htmlFor="fossil-ledger-search">
          Find title, source locator, or content ID
          <input
            className="w-full rounded border border-line bg-panel px-3 py-2 text-bone"
            id="fossil-ledger-search"
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="Search entire archive"
            type="search"
            value={query}
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs text-mute" htmlFor="fossil-ledger-band">
          Source-time status
          <select
            className="rounded border border-line bg-panel px-3 py-2 text-bone"
            id="fossil-ledger-band"
            onChange={(event) => { setBand(event.target.value); setPage(0); }}
            value={band}
          >
            <option value="all">Every record</option>
            <option value="source-claimed">Source-claimed time</option>
            <option value="unresolved">Chronology unresolved</option>
            <option value="derived">Local selections</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 py-2 font-mono text-xs text-mute" aria-live="polite">
        <span>{rows.length} matching · {rows.length ? current * perPage + 1 : 0}–{Math.min((current + 1) * perPage, rows.length)} visible</span>
        <div className="flex items-center gap-2">
          <button className="btn" type="button" disabled={current === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
          <span>{current + 1} / {maxPage + 1}</span>
          <button className="btn" type="button" disabled={current >= maxPage} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ul>
          {shown.map((item) => (
            <li key={item.id}>
              <button
                className="flex min-h-11 w-full items-baseline justify-between gap-3 border-b border-line py-2 text-left"
                onClick={() => vault.select(item.id)}
                type="button"
              >
                <span className="font-serif text-lg leading-tight">{item.title}</span>
                <span className="shrink-0 font-mono text-xs text-mute">
                  {item.chrono.kind === "source-claimed" ? item.chrono.label : item.chrono.kind === "unresolved" ? "UNRESOLVED" : "LOCAL"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!rows.length && <p className="py-8 text-mute">No matching records. Source dates were not inferred.</p>}
      </div>
    </div>
  );
}
