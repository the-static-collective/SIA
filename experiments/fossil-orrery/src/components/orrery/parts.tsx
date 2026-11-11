import { FlaskConical, Inbox, Orbit, Wind } from "lucide-react";
import type { Instrument } from "./store";
import { foodStrings, project, tokenizerReport, type Item } from "@/lib/orrery/model";

export const INSTRUMENTS: { id: Instrument; label: string; hint: string; icon: typeof Orbit }[] = [
  { id: "harvester", label: "Harvester", hint: "Intake", icon: Inbox },
  { id: "orrery", label: "Orrery", hint: "Time", icon: Orbit },
  { id: "metabolizer", label: "Metabolizer", hint: "Propose", icon: FlaskConical },
  { id: "maddclown", label: "Maddcl0wn", hint: "Flute", icon: Wind },
];

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Chip({ children, tone = "mute" }: { children: string; tone?: "mute" | "amber" | "line" }) {
  const toneClass =
    tone === "amber" ? "border-amber text-amber" : tone === "line" ? "border-line text-bone" : "border-line text-mute";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 font-mono text-xs tracking-wide ${toneClass}`}>
      {children}
    </span>
  );
}

export function evidenceLabel(evidence: Item["evidence"]) {
  if (evidence === "synthetic-fixture") return "SYNTHETIC FIXTURE";
  if (evidence === "derived-local") return "LOCAL SELECTION";
  return "SOURCE OBSERVATION";
}

export function Inspector({
  item,
  pinned,
  onPin,
  onClose,
  annotations,
}: {
  item: Item;
  pinned: boolean;
  onPin: () => void;
  onClose: () => void;
  annotations: { aboutId?: string; text?: string; kind?: string; status?: string }[];
}) {
  const notes = annotations.filter((note) => note.aboutId === item.id);
  const residue = tokenizerReport(foodStrings(item));
  return (
    <aside className="flex max-h-[70%] flex-col overflow-hidden border-t border-line bg-panel md:max-h-none md:w-96 md:border-t-0 md:border-l">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-widest text-mute">{item.kind}</p>
          <h2 className="font-serif text-2xl leading-tight">{item.title}</h2>
        </div>
        <button className="btn" data-quiet="true" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Chip tone={item.evidence === "source-observation" ? "amber" : "line"}>{evidenceLabel(item.evidence)}</Chip>
        <Chip>{item.chrono.kind === "source-claimed" ? `SOURCE TIME ${item.chrono.label}` : item.chrono.label.toUpperCase()}</Chip>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 pb-4 font-mono text-xs leading-relaxed text-mute">
        <p className="break-all text-bone">{item.id}</p>
        {item.url && (
          <p>
            Locator{" "}
            <a className="text-amber underline-offset-2 hover:underline" href={item.url} rel="noreferrer" target="_blank">
              {item.url}
            </a>
          </p>
        )}
        {item.capture && (
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1">
            <dt>Method</dt>
            <dd className="text-bone">{item.capture.method}</dd>
            <dt>Rights</dt>
            <dd className="text-bone">{item.capture.rights}</dd>
            <dt>Captured</dt>
            <dd className="text-bone">{item.capture.observedAt}</dd>
            <dt>Evidence</dt>
            <dd className="break-all text-bone">{item.capture.evidenceUrl}</dd>
          </dl>
        )}
        {item.capture?.notes && <p className="text-bone">{item.capture.notes}</p>}
        <section>
          <h3 className="mb-1 text-bone">Facts</h3>
          {item.facts.length === 0 && <p>No facts recorded.</p>}
          <ul className="space-y-1">
            {item.facts.map((fact) => (
              <li key={fact.key}>
                <span className="text-bone">{fact.key}</span> · {fact.basis} · {String(fact.value)}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-bone">Documented relations</h3>
          {item.links.length === 0 && <p>None. Absence is not a hypothesis.</p>}
          <ul className="space-y-1">
            {item.links.map((link) => (
              <li key={link.type + link.target}>
                {link.type} → <span className="break-all text-bone">{link.target}</span> · {link.basis}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-bone">Interpretations — not facts</h3>
          {item.interpretations.length === 0 && notes.length === 0 && <p>None attached to this record.</p>}
          <ul className="space-y-2">
            {item.interpretations.map((note) => (
              <li key={note.text}>
                <Chip>{note.by}</Chip> <span className="text-bone">{note.text}</span>
              </li>
            ))}
            {notes.map((note) => (
              <li key={note.text}>
                <Chip>local annotation</Chip> <span className="text-bone">{note.text}</span>
              </li>
            ))}
          </ul>
        </section>
        {item.parentIds.length > 0 && (
          <section>
            <h3 className="mb-1 text-bone">Unsigned local parents</h3>
            <ul>
              {item.parentIds.map((id) => (
                <li key={id} className="break-all">
                  {id}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="mb-1 text-bone">Tokenizer residue</h3>
          <p>Refused by the metabolizer: {residue.refused.length ? residue.refused.join(" ") : "none"}</p>
        </section>
      </div>
      <div className="border-t border-line p-3">
        <button className="btn w-full" data-primary={pinned ? undefined : "true"} onClick={onPin} type="button">
          {pinned ? "Unpin from metabolism" : "Pin for metabolism"}
        </button>
      </div>
    </aside>
  );
}

export function itemFrom(obj: any) {
  return project(obj);
}
