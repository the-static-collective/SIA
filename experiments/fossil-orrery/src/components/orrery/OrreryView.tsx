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
  const [focus, setFocus] = useState<string[] | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [ledger, setLedger] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SkyNode[]>([]);
  const selected = items.find((item) => item.id === vault.selectedId) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const paint = colors();
      const layout = layoutSky(items, edges, width, height, focus);
      nodesRef.current = layout.nodes;
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
      ctx.fillText("UNDATED", width * 0.78, 22);
      if (layout.derived) ctx.fillText("LOCAL SELECTION — NOT SOURCE TIME", 16, height - 12);
      const at = new Map(layout.nodes.flatMap((node) => node.memberIds.map((id) => [id, node])));
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
        const hot = node.memberIds.includes(vault.selectedId ?? "") || node.memberIds.some((id) => vault.pins.includes(id));
        ctx.beginPath();
        ctx.fillStyle = node.band === "undated" ? paint.panel : paint.bone;
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
        if (node.band === "undated") {
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
          ctx.fillText(String(node.count), node.x - 6, node.y + 3);
        }
      }
      const label = layout.nodes.find((node) => node.id === hovered || node.memberIds.includes(hovered ?? ""));
      if (label) {
        ctx.fillStyle = paint.panel;
        const text = label.band === "bucket" ? `${label.count} in this stratum` : label.title;
        const w = Math.min(280, ctx.measureText(text).width + 16);
        ctx.fillRect(Math.min(label.x + 8, width - w - 8), label.y - 22, w, 20);
        ctx.fillStyle = paint.bone;
        ctx.fillText(text, Math.min(label.x + 14, width - w), label.y - 8);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [items, edges, focus, hovered, vault.selectedId, vault.pins]);

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
          <p className="font-mono text-xs text-mute">Oldest first. Solid lines are documented. Dashes are hypotheses or unsigned selections.</p>
          <div className="flex gap-2">
            <button className="btn" data-quiet="true" onClick={() => setLedger((value) => !value)} type="button">
              {ledger ? "Sky" : "Ledger"}
            </button>
            {focus && (
              <button className="btn" onClick={() => setFocus(null)} type="button">
                All strata
              </button>
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
                  setFocus(node.memberIds);
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
  const dated = items.filter((item) => item.chrono.kind === "source-claimed").sort((a, b) => a.chrono.sort! - b.chrono.sort!);
  const undated = items.filter((item) => item.chrono.kind === "unresolved").sort((a, b) => a.title.localeCompare(b.title));
  const derived = items.filter((item) => item.chrono.kind === "derived");
  const section = (title: string, rows: Item[]) => (
    <section>
      <h3 className="sticky top-0 bg-ink py-2 font-mono text-xs tracking-widest text-amber">{title}</h3>
      <ul>
        {rows.map((item) => (
          <li key={item.id}>
            <button
              className="flex min-h-11 w-full items-baseline justify-between gap-3 border-b border-line py-2 text-left"
              onClick={() => vault.select(item.id)}
              type="button"
            >
              <span className="font-serif text-lg leading-tight">{item.title}</span>
              <span className="shrink-0 font-mono text-xs text-mute">{item.chrono.kind === "source-claimed" ? item.chrono.label : item.evidence}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="h-[calc(100%-3.5rem)] overflow-auto px-4 pb-6">
      {section("Source-claimed time, oldest first", dated)}
      {section("Chronology unresolved", undated)}
      {section("Local selections", derived)}
    </div>
  );
}
