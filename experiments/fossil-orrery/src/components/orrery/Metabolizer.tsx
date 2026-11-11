import { useMemo, useState } from "react";
import { bankExport, compose, composeRelationship, navigationProjection, panelLoomDraft, promptPackage, validateThread } from "@/lib/orrery/engine";
import { acceptDraft, reviewDraft, structuralDraft } from "@/lib/orrery/draft";
import { project } from "@/lib/orrery/model";
import { exampleProposal } from "@/lib/orrery/sample";
import specimen from "../../../vendor/story-dna/fixtures/relationship-passenger.json" with { type: "json" };
import { downloadJson } from "./parts";
import { useVault } from "./store";

type Mode = "visual" | "music" | "narrative";

const ARC = ["desire", "relationship", "conflict", "choice", "consequence", "remainder"] as const;

function blankThread(item: ReturnType<typeof project> | null, index: number) {
  return {
    schema: "story-dna/relationship-thread/v0",
    key: item ? `local-${item.id.slice(7, 15)}` : `thread-${index + 1}`,
    title: item?.title ?? "",
    world: "",
    source: {
      locator: item?.url ?? "",
      revision: "unresolved — not supplied",
      basis: "Operator-authored thread. Characters and events were not inferred from a title.",
      classification: item?.evidence === "derived-local" ? "derived" : "observed",
      visibility: "private",
      rights: "unverified",
    },
    participants: [""],
    arc: { desire: "", relationship: "", conflict: "", choice: "", consequence: "", remainder: "" },
    constraints: ["no character or event crosses unless an encounter is explicitly allowed"],
    controls: { fictional: false, analogyAllowed: false, characterCrossingAllowed: false },
  };
}

export function Metabolizer() {
  const vault = useVault();
  const pinned = vault.pins.map((id) => vault.objects[id]).filter(Boolean);
  const [mode, setMode] = useState<Mode>("visual");
  const [seed, setSeed] = useState(325);
  const [recipe, setRecipe] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [held, setHeld] = useState<any>(null);
  const [accept, setAccept] = useState(false);
  const [threads, setThreads] = useState<any[]>(() => [blankThread(null, 0), blankThread(null, 1)]);
  const [candidate, setCandidate] = useState<any>(null);
  const items = useMemo(() => pinned.map((obj) => project(obj)), [pinned]);

  const runCompose = () => {
    try {
      const next = compose(pinned, { mode, seed: Number(seed) });
      setRecipe(next);
      setProposal(null);
      setHeld(null);
      setAccept(false);
      vault.setNotice(`Recipe ${next.id.slice(0, 18)}… is deterministic. It is not a recording and not a selection.`);
      vault.setError(null);
    } catch (error) {
      vault.setError(error instanceof Error ? error.message : "compose refused");
    }
  };

  const loadDraft = () => {
    if (!recipe) return;
    setProposal(structuralDraft(recipe));
    setHeld(null);
    vault.setNotice("Local structural draft. Human-authored, not a model, not history.");
  };

  const loadExample = () => {
    setProposal(structuredClone(exampleProposal));
    setHeld(null);
    vault.setNotice("Illustrative AI proposal from the SIA examples. It stays a proposal until you review it.");
  };

  const review = () => {
    if (!recipe || !proposal) return;
    try {
      const result = reviewDraft(recipe, proposal);
      setHeld(result);
      setProposal(result.proposal);
      vault.addReview(result.receipt);
      vault.setNotice(`HOLD. ${result.receipt.reason}`);
      vault.setError(null);
    } catch (error) {
      setHeld(null);
      vault.setError(error instanceof Error ? error.message : "review refused");
    }
  };

  const harvestNow = () => {
    if (!recipe || !proposal || !accept) return;
    try {
      const derived = acceptDraft(recipe, proposal, true);
      vault.ingestObjects([derived]);
      vault.addReview({ disposition: "LOCAL_SELECTION", derivedId: derived.id, recipeId: recipe.id });
      vault.setNotice(`Local selection sealed as ${derived.id.slice(0, 18)}…. It does not publish or verify the sources.`);
      vault.setError(null);
    } catch (error) {
      vault.setError(error instanceof Error ? error.message : "selection refused");
    }
  };

  const labelFromPins = () => {
    setThreads([blankThread(items[0] ?? null, 0), blankThread(items[1] ?? null, 1)]);
    vault.setNotice("Titles and locators were copied as labels. Story fields are still empty on purpose.");
  };

  const loadSpecimen = () => {
    setThreads(specimen.threads.map((thread) => structuredClone(thread)));
    vault.setNotice(specimen.note);
  };

  const relate = (dnaMode: "echo" | "fork" | "encounter") => {
    try {
      const a = validateThread(threads[0]);
      const b = validateThread(threads[1]);
      vault.addThread(a);
      vault.addThread(b);
      const next = composeRelationship(a, b, { mode: dnaMode, seed: Number(seed) });
      setCandidate(next);
      vault.addCandidate(next);
      vault.setNotice(`${dnaMode.toUpperCase()} candidate is HOLD / admission NONE. Worlds were not merged.`);
      vault.setError(null);
    } catch (error) {
      setCandidate(null);
      vault.setError(error instanceof Error ? error.message : "Story DNA refused");
    }
  };

  const exportBank = () => {
    const albums = Object.values(vault.objects).filter((obj) => obj.artifact?.kind === "album").slice(0, 100);
    try {
      downloadJson("story-dna-bank.json", bankExport(albums));
      vault.setNotice("Story DNA bank cards exported. They are title echoes, not characters.");
    } catch (error) {
      vault.setError(error instanceof Error ? error.message : "bank export refused");
    }
  };

  const updateThread = (index: number, path: string, value: string | boolean) => {
    setThreads((current) => {
      const next = structuredClone(current);
      const parts = path.split(".");
      let cursor = next[index];
      for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
      cursor[parts[parts.length - 1]] = value;
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5">
        <div>
          <p className="font-mono text-xs tracking-widest text-amber">03 — METABOLIZER</p>
          <h2 className="font-serif text-3xl leading-tight">A proposal is not a parent.</h2>
          <p className="mt-2 text-mute">
            {pinned.length} pinned. Compose with the SIA engine, review until it says HOLD, then make an explicit local selection. Story DNA exchanges travel beside the archive, not inside its facts.
          </p>
        </div>

        <section className="rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap gap-2">
            {(["visual", "music", "narrative"] as Mode[]).map((item) => (
              <button key={item} aria-pressed={mode === item} className="btn" data-primary={mode === item ? "true" : undefined} onClick={() => setMode(item)} type="button">
                {item}
              </button>
            ))}
            <label className="flex items-center gap-2 font-mono text-xs text-mute">
              seed
              <input
                className="w-28"
                data-testid="seed"
                min={0}
                onChange={(event) => setSeed(Number(event.target.value))}
                type="number"
                value={seed}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" data-primary="true" data-testid="compose" disabled={!pinned.length} onClick={runCompose} type="button">
              Compose recipe
            </button>
            <button className="btn" disabled={!recipe} onClick={loadDraft} type="button">
              Structural draft
            </button>
            <button className="btn" data-testid="load-example-proposal" disabled={!recipe} onClick={loadExample} type="button">
              Load illustrative proposal
            </button>
          </div>
          {recipe && (
            <div className="mt-4 space-y-2 font-mono text-xs text-mute">
              <p className="break-all text-bone">{recipe.id}</p>
              <p>{recipe.constraints.assetPolicy} · {recipe.constraints.treatment}</p>
              <ol className="space-y-1">
                {recipe.slots.map((slot: any) => (
                  <li key={slot.index}>
                    {slot.index}. {slot.name} · focus {slot.focus}
                  </li>
                ))}
              </ol>
              <p>Motifs: {recipe.atoms.map((atom: any) => atom.token).join(", ")}</p>
              <button className="btn" onClick={() => downloadJson("recipe-prompt.json", promptPackage(recipe))} type="button">
                Export prompt packet
              </button>
            </div>
          )}
        </section>

        {proposal && (
          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="font-serif text-2xl">{proposal.title}</h3>
            <p className="font-mono text-xs text-mute">
              Author {proposal.author?.kind}: {proposal.author?.name}. {proposal.sourceAssertion}
            </p>
            <div className="mt-3 grid gap-3">
              {proposal.sections?.map((section: any, index: number) => (
                <label key={section.index} className="grid gap-1 font-mono text-xs text-mute">
                  {section.slot}
                  <textarea
                    onChange={(event) => {
                      const sections = proposal.sections.map((item: any, itemIndex: number) =>
                        itemIndex === index ? { ...item, text: event.target.value } : item,
                      );
                      setProposal({ ...proposal, sections });
                      setHeld(null);
                    }}
                    value={section.text}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" data-primary="true" data-testid="review-hold" onClick={review} type="button">
                Review — expect HOLD
              </button>
            </div>
            {held && (
              <p className="mt-3 font-mono text-xs text-amber" data-testid="hold-receipt">
                {held.receipt.disposition}: {held.receipt.reason}
              </p>
            )}
            <label className="mt-3 flex items-start gap-2 font-mono text-xs text-bone">
              <input checked={accept} data-testid="accept-check" onChange={(event) => setAccept(event.target.checked)} type="checkbox" />
              I select this locally. This does not verify, publish, or rewrite the sources.
            </label>
            <button className="btn mt-2" data-testid="harvest" disabled={!held || !accept} onClick={harvestNow} type="button">
              Record local selection
            </button>
          </section>
        )}

        <section className="rounded-xl border border-line bg-panel p-4">
          <h3 className="font-serif text-2xl">Story DNA exchange</h3>
          <p className="mt-1 text-sm text-mute">
            Echo and fork need public threads that allow analogy. Encounter also needs fictional sources, declared rights, and explicit character crossing. The engine refuses the rest.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={labelFromPins} type="button">
              Label from pins
            </button>
            <button className="btn" onClick={loadSpecimen} type="button">
              Load specimen threads
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {threads.map((thread, index) => (
              <fieldset key={index} className="grid gap-2 border border-line p-3">
                <legend className="px-1 font-mono text-xs text-mute">Thread {index + 1}</legend>
                <input onChange={(event) => updateThread(index, "title", event.target.value)} placeholder="Title" value={thread.title} />
                <input onChange={(event) => updateThread(index, "world", event.target.value)} placeholder="World — required, not inferred" value={thread.world} />
                <input
                  onChange={(event) => updateThread(index, "participants.0", event.target.value)}
                  placeholder="Participant — do not invent from a song title"
                  value={thread.participants[0] ?? ""}
                />
                {ARC.map((part) => (
                  <input
                    key={part}
                    onChange={(event) => updateThread(index, `arc.${part}`, event.target.value)}
                    placeholder={part}
                    value={thread.arc[part]}
                  />
                ))}
                <label className="flex items-center gap-2 font-mono text-xs">
                  <input checked={thread.source.visibility === "public"} onChange={(event) => updateThread(index, "source.visibility", event.target.checked ? "public" : "private")} type="checkbox" />
                  public
                </label>
                <label className="flex items-center gap-2 font-mono text-xs">
                  <input checked={thread.controls.analogyAllowed} onChange={(event) => updateThread(index, "controls.analogyAllowed", event.target.checked)} type="checkbox" />
                  analogy allowed
                </label>
                <label className="flex items-center gap-2 font-mono text-xs">
                  <input checked={thread.controls.fictional} onChange={(event) => updateThread(index, "controls.fictional", event.target.checked)} type="checkbox" />
                  fictional
                </label>
                <label className="flex items-center gap-2 font-mono text-xs">
                  <input
                    checked={thread.controls.characterCrossingAllowed}
                    onChange={(event) => updateThread(index, "controls.characterCrossingAllowed", event.target.checked)}
                    type="checkbox"
                  />
                  character crossing allowed
                </label>
                <select onChange={(event) => updateThread(index, "source.rights", event.target.value)} value={thread.source.rights}>
                  <option value="unverified">rights unverified</option>
                  <option value="owner-declared">rights owner-declared</option>
                  <option value="licensed">rights licensed</option>
                </select>
              </fieldset>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" data-primary="true" data-testid="echo" onClick={() => relate("echo")} type="button">
              ECHO
            </button>
            <button className="btn" data-testid="fork" onClick={() => relate("fork")} type="button">
              FORK
            </button>
            <button className="btn" data-testid="encounter" onClick={() => relate("encounter")} type="button">
              ENCOUNTER
            </button>
            <button
              className="btn"
              onClick={() =>
                downloadJson("story-dna-exchange.json", {
                  schema: "story-dna/exchange/v0",
                  threads: vault.threads,
                  candidate,
                  note: "Candidate is not admission, publication, or source ancestry.",
                })
              }
              type="button"
            >
              Export exchange
            </button>
            <button className="btn" onClick={exportBank} type="button">
              Export album title cards
            </button>
          </div>
          {candidate && (
            <div className="mt-4 font-mono text-xs text-mute" data-testid="candidate">
              <p className="text-amber">
                {candidate.mode} · {candidate.posture} · admission {candidate.admission} · publication {candidate.publication}
              </p>
              <p className="mt-2 text-bone">{candidate.logline}</p>
              <ul className="mt-2 space-y-1">
                {candidate.beats.map((beat: string) => (
                  <li key={beat}>{beat}</li>
                ))}
              </ul>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-mute">{JSON.stringify(navigationProjection(candidate), null, 2)}</pre>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-mute">{JSON.stringify(panelLoomDraft(candidate), null, 2)}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
