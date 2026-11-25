import { useMemo, useState } from "react";
import { exportBundle } from "@/lib/orrery/bundle";
import {
  hashText,
  isRole,
  mapRows,
  sniff,
  suggestRoles,
  trySunoPlan,
  unresolvedReport,
  type Role,
} from "@/lib/orrery/intake";
import { UNFAMILIAR_CSV, sunoSampleExport } from "@/lib/orrery/sample";
import { validateThread } from "@/lib/orrery/engine";
import { downloadJson } from "./parts";
import { useVault } from "./store";
import { FieldTrial } from "./FieldTrial";

const ROLES: Role[] = ["ignore", "title", "url", "externalId", "creator", "createdAt", "styleTags", "duration", "notes"];

type TableJob = { filename: string; text: string; rows: Record<string, string>[]; sunoMessage: string | null };

export function Harvester() {
  const vault = useVault();
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("pasted.json");
  const [table, setTable] = useState<TableJob | null>(null);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [rights, setRights] = useState<"" | "links-only" | "owned-media" | "licensed-media">("");
  const [observedAt, setObservedAt] = useState("");
  const [includePrompts, setIncludePrompts] = useState(false);
  const [sunoPlan, setSunoPlan] = useState<any>(null);
  const [manual, setManual] = useState(false);
  const report = useMemo(() => (table ? unresolvedReport(Object.keys(table.rows[0] ?? {}), roles) : null), [table, roles]);

  const captureStamp = () => {
    if (!observedAt) return null;
    const date = new Date(observedAt);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  };

  const stageText = (name: string, body: string) => {
    setFilename(name);
    setText(body);
    setSunoPlan(null);
    setTable(null);
    const found = sniff(body);
    if (found.kind === "error" || found.kind === "empty") {
      vault.setError(found.kind === "empty" ? "The file was empty." : found.message);
      return;
    }
    if (found.kind === "choose-collection") {
      vault.setError(`This file has ${found.choices.length} collections. Pick one instead of guessing.`);
      setTable(null);
      return;
    }
    if (found.kind === "table") {
      const stamp = captureStamp() ?? "2026-01-01T00:00:00Z";
      const suno = trySunoPlan(body, stamp, includePrompts);
      if (suno.ok) {
        setSunoPlan(suno.plan);
        vault.setNotice("Suno owner-export adapter recognized this file. Nothing is saved until you commit.");
        return;
      }
      const nextRoles = suggestRoles(Object.keys(found.rows[0] ?? {}));
      setRoles(nextRoles);
      setTable({ filename: name, text: body, rows: found.rows, sunoMessage: suno.message });
      vault.setNotice("Unfamiliar table. Map columns. Unmapped fields stay in the raw snapshot only.");
      return;
    }
    vault.setNotice(`Recognized ${found.kind.replaceAll("-", " ")}. Commit to keep it.`);
    setTable({ filename: name, text: body, rows: [], sunoMessage: null });
  };

  const commitKnown = () => {
    const found = sniff(text);
    const sha = vault.rememberRaw(filename, text);
    if (found.kind === "sia-observations" || found.kind === "derived") {
      const result = vault.ingestObjects(found.items);
      vault.setNotice(`Kept raw ${sha.slice(0, 18)}…. ${result.added} new, ${result.reused} already in the vault.`);
      return;
    }
    if (found.kind === "bundle") {
      vault.importBundle(found.bundle);
      return;
    }
    if (found.kind === "threads") {
      let added = 0;
      for (const thread of found.threads) {
        try {
          vault.addThread(validateThread(thread));
          added += 1;
        } catch (error) {
          vault.setError(error instanceof Error ? error.message : "thread refused");
          return;
        }
      }
      vault.setNotice(`Stored ${added} Story DNA thread${added === 1 ? "" : "s"}. They are not source observations.`);
      return;
    }
    if (found.kind === "proposal") {
      vault.setNotice("This is a proposal, not history. Open the Metabolizer and review it against a recipe.");
      return;
    }
    vault.setError("Nothing in this file was committed.");
  };

  const commitSuno = () => {
    const stamp = captureStamp();
    if (!stamp || !rights) {
      vault.setError("Set a capture time and a rights declaration before committing.");
      return;
    }
    if (rights !== "links-only") {
      vault.setNotice("The Suno adapter records links-only. It will not upgrade rights because a file parsed.");
    }
    const suno = trySunoPlan(text, stamp, includePrompts);
    if (!suno.ok) {
      vault.setError(suno.message);
      return;
    }
    const sha = vault.rememberRaw(filename, text);
    const result = vault.ingestObjects(suno.plan.selected.map((row: { object: unknown }) => row.object));
    setSunoPlan(suno.plan);
    vault.setNotice(
      `Suno plan committed. Raw ${sha.slice(0, 18)}…. ${result.added} new, ${result.reused} reused, ${suno.plan.rejected.length} rejected, ${suno.plan.undated} undated.`,
    );
  };

  const commitMap = () => {
    if (!table) return;
    const stamp = captureStamp();
    if (!stamp || !rights) {
      vault.setError("Capture time and rights are required. They are not copied from missing columns.");
      return;
    }
    const mapped = mapRows(table.rows, roles, { observedAt: stamp, rights, kind: "song" });
    if (!mapped.accepted.length) {
      vault.setError(mapped.rejected[0]?.reason ?? "No rows could be mapped.");
      return;
    }
    const sha = vault.rememberRaw(table.filename, table.text);
    const result = vault.ingestObjects(mapped.accepted);
    vault.setNotice(
      `Mapped ${result.added} new records. Raw snapshot ${sha.slice(0, 18)}…. ${mapped.rejected.length} rows refused. No relations were created.`,
    );
  };

  const columns = table ? Object.keys(table.rows[0] ?? {}) : [];

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
        <div>
          <p className="font-mono text-xs tracking-widest text-amber">01 — HARVESTER</p>
          <h2 className="font-serif text-3xl leading-tight">Bring a record in without sanding off its edges.</h2>
          <p className="mt-2 max-w-xl text-mute">
            Suno exports, SIA observations, vault bundles, and unfamiliar tables. Original bytes stay intact. Missing dates and ancestry stay missing.
          </p>
        </div>
        <FieldTrial />
        <label
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-panel px-4 py-6 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={async (event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file) return;
            if (!/\.(json|csv|txt)$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
              vault.setError("Choose a JSON/CSV/TXT file no larger than 24 MiB. Split larger exports locally.");
              return;
            }
            try { stageText(file.name, await file.text()); }
            catch { vault.setError("File could not be read locally."); }
          }}
        >
          <span className="font-mono text-xs text-bone">Drop a JSON or CSV file</span>
          <span className="font-mono text-xs text-mute">or choose one from this device</span>
          <input
            accept=".json,.csv,application/json,text/csv,text/plain"
            className="sr-only"
            data-testid="file-import"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 24 * 1024 * 1024) { vault.setError("File exceeds 24 MiB; split it locally."); return; }
              try { stageText(file.name, await file.text()); }
              catch { vault.setError("File could not be read locally."); }
            }}
            type="file"
          />
        </label>
        <textarea
          data-testid="paste-import"
          onChange={(event) => setText(event.target.value)}
          placeholder="Or paste JSON / CSV"
          value={text}
        />
        <div className="flex flex-wrap gap-2">
          <button className="btn" data-primary="true" onClick={() => stageText(filename, text)} type="button">
            Read paste
          </button>
          <button className="btn" onClick={() => stageText("unfamiliar.csv", UNFAMILIAR_CSV)} type="button">
            Load unfamiliar CSV specimen
          </button>
          <button
            className="btn"
            onClick={() => stageText("suno-owner-export.sample.json", JSON.stringify(sunoSampleExport))}
            type="button"
          >
            Load Suno fixture
          </button>
          <button className="btn" data-quiet="true" onClick={() => setManual((value) => !value)} type="button">
            Enter one record
          </button>
        </div>
        <label className="grid gap-1 font-mono text-xs text-mute">
          Capture time — when you observed this file, not the work's birthday
          <input
            data-testid="capture-time"
            onChange={(event) => setObservedAt(event.target.value)}
            type="datetime-local"
            value={observedAt}
          />
        </label>
        <label className="grid gap-1 font-mono text-xs text-mute">
          Rights declaration
          <select onChange={(event) => setRights(event.target.value as typeof rights)} value={rights}>
            <option value="">Unresolved until you choose</option>
            <option value="links-only">links-only</option>
            <option value="owned-media">owned-media</option>
            <option value="licensed-media">licensed-media</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-mono text-xs text-mute">
          <input checked={includePrompts} onChange={(event) => setIncludePrompts(event.target.checked)} type="checkbox" />
          Include Suno prompt excerpts as owner-export facts. Off keeps them only in the raw snapshot.
        </label>

        {sunoPlan && (
          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="font-serif text-2xl">Suno adapter preview</h3>
            <p className="mt-1 font-mono text-xs text-amber">Private owner-supplied export — browser only. Never upload source files or raw vault snapshots to GitHub.</p>
            <p className="mt-1 font-mono text-xs text-mute">
              {sunoPlan.eligible} eligible · {sunoPlan.undated} undated · {sunoPlan.rejected.length} rejected · oldest known creation first
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-mute">
              {sunoPlan.selected.slice(0, 8).map((row: any) => (
                <li key={row.object.id}>
                  {row.sourceCreatedAt ?? "undated"} · {row.title}
                  {row.object.facts?.some((fact: any) => fact.key === "locator_constructed") ? " · constructed locator" : ""}
                </li>
              ))}
            </ul>
            {sunoPlan.rejected.length > 0 && (
              <p className="mt-2 font-mono text-xs text-amber">
                Refused row {sunoPlan.rejected[0].sourcePosition}: {sunoPlan.rejected[0].reason}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" data-primary="true" data-testid="commit-suno" onClick={commitSuno} type="button">
                Commit Suno observations
              </button>
              <button
                className="btn"
                onClick={() => {
                  const found = sniff(text);
                  if (found.kind !== "table") return;
                  setSunoPlan(null);
                  setRoles(suggestRoles(Object.keys(found.rows[0] ?? {})));
                  setTable({ filename, text, rows: found.rows, sunoMessage: "Operator chose column mapping." });
                }}
                type="button"
              >
                Map columns instead
              </button>
            </div>
          </section>
        )}

        {table && table.rows.length > 0 && !sunoPlan && (
          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="font-serif text-2xl">Column map</h3>
            {table.sunoMessage && <p className="mt-1 font-mono text-xs text-mute">Suno adapter did not claim this file: {table.sunoMessage}</p>}
            <div className="mt-3 grid gap-2">
              {columns.map((column) => (
                <label key={column} className="grid grid-cols-[1fr_9rem] items-center gap-2 font-mono text-xs">
                  <span className="truncate text-bone">{column}</span>
                  <select
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!isRole(value)) return;
                      setRoles((current) => ({ ...current, [column]: value }));
                    }}
                    value={roles[column] ?? "ignore"}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {report && (
              <div className="mt-3 font-mono text-xs text-mute">
                <p>Unresolved: {report.missing.join(" · ") || "none"}</p>
                <p>Ignored columns stay raw: {report.ignoredColumns.join(", ") || "none"}</p>
                <p>{report.relations}</p>
              </div>
            )}
            <div className="mt-3 overflow-auto">
              <table className="w-full text-left font-mono text-xs">
                <tbody>
                  {table.rows.slice(0, 4).map((row, index) => (
                    <tr key={index} className="border-t border-line">
                      {columns.map((column) => (
                        <td key={column} className="max-w-40 truncate px-2 py-2 text-mute">
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn mt-3" data-primary="true" data-testid="commit-map" onClick={commitMap} type="button">
              Commit mapped rows
            </button>
          </section>
        )}

        {table && table.rows.length === 0 && !sunoPlan && (
          <button className="btn" data-primary="true" data-testid="commit-known" onClick={commitKnown} type="button">
            Commit recognized records
          </button>
        )}

        {manual && <ManualEntry />}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button className="btn" data-testid="export-vault" onClick={() => downloadJson("fossil-orrery-vault.json", exportBundle(vault))} type="button">
            Export vault
          </button>
          <button className="btn" onClick={() => vault.loadSample()} type="button">
            Merge sample trench
          </button>
          <button className="btn" data-quiet="true" onClick={() => vault.forget()} type="button">
            Forget this browser vault
          </button>
        </div>
        <p className="font-mono text-xs text-mute">Raw snapshots kept: {Object.keys(vault.raw).length}. Hash {hashText("fossil").slice(0, 16)} is a local digest, not a signature.</p>
      </div>
    </div>
  );
}

function ManualEntry() {
  const vault = useVault();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [externalId, setExternalId] = useState("");
  const [creator, setCreator] = useState("");
  const [kind, setKind] = useState("song");
  const [rights, setRights] = useState("links-only");
  const [notes, setNotes] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [factKey, setFactKey] = useState("");
  const [factValue, setFactValue] = useState("");
  const [interpretation, setInterpretation] = useState("");

  const save = () => {
    if (!observedAt) {
      vault.setError("A capture time is required.");
      return;
    }
    const stamp = new Date(observedAt).toISOString().replace(/\.\d{3}Z$/, "Z");
    const facts = factKey && factValue ? [{ key: factKey, value: factValue, basis: "owner-note" }] : [];
    const interpretations = interpretation ? [{ text: interpretation, by: "human" }] : [];
    const result = vault.ingestObjects([
      {
        schema: "sia/observation/v0",
        artifact: { externalId: externalId || title, kind, title, url, creator },
        capture: {
          sourceUrl: url,
          evidenceUrl: url,
          observedAt: stamp,
          method: "manual-transcription",
          rights,
          notes,
        },
        facts,
        relations: [],
        interpretations,
      },
    ]);
    if (result.added || result.reused) vault.setNotice(result.added ? "Manual observation sealed." : "That observation was already sealed.");
  };

  return (
    <form
      className="grid gap-2 rounded-xl border border-line bg-panel p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <h3 className="font-serif text-2xl">Manual observation</h3>
      <input onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
      <input onChange={(event) => setUrl(event.target.value)} placeholder="https source URL" value={url} />
      <input onChange={(event) => setExternalId(event.target.value)} placeholder="External id" value={externalId} />
      <input onChange={(event) => setCreator(event.target.value)} placeholder="Creator claim, if any" value={creator} />
      <div className="grid grid-cols-2 gap-2">
        <select onChange={(event) => setKind(event.target.value)} value={kind}>
          {["song", "album", "text", "page", "other"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select onChange={(event) => setRights(event.target.value)} value={rights}>
          <option value="links-only">links-only</option>
          <option value="owned-media">owned-media</option>
          <option value="licensed-media">licensed-media</option>
        </select>
      </div>
      <input onChange={(event) => setObservedAt(event.target.value)} type="datetime-local" value={observedAt} />
      <input onChange={(event) => setNotes(event.target.value)} placeholder="Capture notes" value={notes} />
      <div className="grid grid-cols-2 gap-2">
        <input onChange={(event) => setFactKey(event.target.value)} placeholder="fact key" value={factKey} />
        <input onChange={(event) => setFactValue(event.target.value)} placeholder="fact value" value={factValue} />
      </div>
      <textarea onChange={(event) => setInterpretation(event.target.value)} placeholder="Interpretation, kept out of facts" value={interpretation} />
      <button className="btn" data-primary="true" type="submit">
        Seal observation
      </button>
    </form>
  );
}
