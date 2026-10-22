import { useEffect, useMemo, useRef, useState } from "react";
import { clownNote, layoutFlute } from "@/lib/orrery/layout";
import { documentedEdges, foodStrings, makeAnnotation, makeHypothesis, project, tokenizerReport } from "@/lib/orrery/model";
import { toneHz } from "@/lib/orrery/tones";
import { useVault } from "./store";

let audio: AudioContext | null = null;

function breathe(ids: string[]) {
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  if (!audio) audio = new Context();
  if (audio.state === "suspended") void audio.resume();
  const now = audio.currentTime;
  ids.slice(0, 6).forEach((id, index) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = index % 2 ? "triangle" : "sine";
    osc.frequency.value = toneHz(id);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    osc.connect(gain).connect(audio!.destination);
    osc.start(now);
    osc.stop(now + 1.1);
  });
}

export function BoneFlute() {
  const vault = useVault();
  const items = useMemo(() => Object.values(vault.objects).map((obj) => project(obj)), [vault.objects]);
  const edges = useMemo(() => documentedEdges(items, vault.hypotheses), [items, vault.hypotheses]);
  const flute = useMemo(() => layoutFlute(items), [items]);
  const [inner, setInner] = useState(0.28);
  const [outer, setOuter] = useState(0.62);
  const [includeUndated, setIncludeUndated] = useState(false);
  const drag = useRef<"inner" | "outer" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sounding = flute.nodes.filter((node) => {
    if (!node.inTime) return includeUndated;
    return node.radius >= Math.min(inner, outer) && node.radius <= Math.max(inner, outer);
  });
  const note = clownNote(sounding.filter((node) => node.inTime), edges);
  const residue = sounding[0] ? tokenizerReport(foodStrings(sounding[0])) : null;

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
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--color-ink").trim() || "#14120e";
      const bone = css.getPropertyValue("--color-bone").trim() || "#f3ead7";
      const mute = css.getPropertyValue("--color-mute").trim() || "#a39884";
      const amber = css.getPropertyValue("--color-amber").trim() || "#e3a04a";
      const line = css.getPropertyValue("--color-line").trim() || "#3c352b";
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2 + 8;
      const scale = Math.min(width, height) * 0.42;
      ctx.strokeStyle = line;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = mute;
      ctx.font = "12px IBM Plex Mono, ui-monospace, monospace";
      ctx.fillText("CORE = OLDEST", cx - 48, cy + 4);
      const lo = Math.min(inner, outer);
      const hi = Math.max(inner, outer);
      ctx.beginPath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = amber;
      ctx.arc(cx, cy, scale * hi, 0, Math.PI * 2);
      ctx.arc(cx, cy, scale * lo, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.globalAlpha = 1;
      const pos = (radius: number, angle: number) => [cx + Math.cos(angle) * scale * radius, cy + Math.sin(angle) * scale * radius];
      for (const edge of edges) {
        const a = flute.nodes.find((node) => node.id === edge.from);
        const b = flute.nodes.find((node) => node.id === edge.to);
        if (!a || !b || !a.inTime || !b.inTime) continue;
        const [x1, y1] = pos(a.radius, a.angle);
        const [x2, y2] = pos(b.radius, b.angle);
        ctx.beginPath();
        ctx.strokeStyle = amber;
        ctx.setLineDash(edge.kind === "documented" ? [] : [4, 4]);
        ctx.globalAlpha = edge.kind === "hypothesis" ? 0.9 : 0.55;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const node of flute.nodes) {
        if (!node.inTime) continue;
        const [x, y] = pos(node.radius, node.angle);
        const on = sounding.some((item) => item.id === node.id);
        ctx.beginPath();
        ctx.fillStyle = on ? amber : bone;
        ctx.arc(x, y, node.kind === "album" ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const radius of [lo, hi]) {
        ctx.beginPath();
        ctx.strokeStyle = amber;
        ctx.arc(cx, cy, scale * radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = amber;
        ctx.arc(cx + scale * radius, cy, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [flute, edges, inner, outer, sounding]);

  const setHandle = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - (rect.height / 2 + 8);
    const scale = Math.min(rect.width, rect.height) * 0.42;
    const radius = Math.hypot(x, y) / scale;
    if (drag.current === "inner") setInner(Math.min(0.9, Math.max(0.18, radius)));
    if (drag.current === "outer") setOuter(Math.min(0.92, Math.max(0.2, radius)));
  };

  const fileNote = () => {
    if (!note || note.items.length < 2) return;
    const hypothesis = makeHypothesis(note.items[0].id, note.items[1].id, [note.token]);
    vault.addHypothesis(hypothesis);
    vault.setNotice(`Filed a hypothesis for “${note.token}”. It is not ancestry and it was not written into either observation.`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="relative min-h-64 flex-1">
        <canvas
          aria-label="Bone flute"
          className="h-full w-full touch-none"
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const scale = Math.min(rect.width, rect.height) * 0.42;
            const radius = Math.hypot(x, event.clientY - rect.top - (rect.height / 2 + 8)) / scale;
            drag.current = Math.abs(radius - inner) < Math.abs(radius - outer) ? "inner" : "outer";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current) setHandle(event);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          ref={canvasRef}
        />
      </div>
      <aside className="max-h-[48%] overflow-auto border-t border-line bg-panel p-4 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
        <p className="font-mono text-xs tracking-widest text-amber">04 — MADDCL0WN</p>
        <h2 className="font-serif text-3xl leading-tight">Bone flute</h2>
        <p className="mt-2 text-sm text-mute">
          Drag the two amber rings. The band between them is an era, oldest at the core. Tones come from content hashes, not from the recordings. Shared words that were never linked are hypotheses.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" data-primary="true" data-testid="breathe" onClick={() => breathe(sounding.map((item) => item.id))} type="button">
            Breathe
          </button>
          <button
            className="btn"
            disabled={sounding.length < 2}
            onClick={() => {
              vault.setPins(sounding.slice(0, 2).map((item) => item.id));
              vault.setInstrument("metabolizer");
            }}
            type="button"
          >
            Send pair to metabolizer
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 font-mono text-xs text-mute">
          <input checked={includeUndated} onChange={(event) => setIncludeUndated(event.target.checked)} type="checkbox" />
          Include undated artifacts. They stay outside the time disk.
        </label>
        <p className="mt-4 font-mono text-xs text-mute">{sounding.length} artifacts in this breath</p>
        <ul className="mt-2 max-h-32 space-y-1 overflow-auto font-mono text-xs">
          {sounding.slice(0, 12).map((item) => (
            <li key={item.id} className="text-bone">
              {item.inTime ? item.chrono.label : "undated"} · {item.title}
            </li>
          ))}
        </ul>
        <section className="mt-4 border-t border-line pt-3">
          <h3 className="font-serif text-xl">Clown's note</h3>
          {note ? (
            <>
              <p className="mt-1 text-sm text-bone">
                “{note.token}” is shared by {note.items.length} artifacts in this era that have no documented relation. This is a hypothesis, not a discovery of intent.
              </p>
              <button className="btn mt-2" data-testid="file-hypothesis" onClick={fileNote} type="button">
                File hypothesis
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-mute">No unclaimed shared token in this band.</p>
          )}
        </section>
        {residue && (
          <section className="mt-4 border-t border-line pt-3">
            <h3 className="font-serif text-xl">Refused words</h3>
            <p className="mt-1 text-sm text-mute">The metabolizer will not treat these as motifs. Keeping one writes an annotation, not a fact.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {residue.refused.slice(0, 8).map((word) => (
                <button
                  key={word}
                  className="btn"
                  onClick={() => {
                    if (!sounding[0]) return;
                    vault.addAnnotation(makeAnnotation(sounding[0].id, `Tokenizer residue kept by hand: ${word}`, "tokenizer-residue"));
                    vault.setNotice(`“${word}” is now a local annotation. The observation was not rewritten.`);
                  }}
                  type="button"
                >
                  {word}
                </button>
              ))}
            </div>
          </section>
        )}
        <p className="mt-4 font-mono text-xs text-mute">{vault.hypotheses.length} hypotheses on file. None of them are source relations.</p>
      </aside>
    </div>
  );
}
