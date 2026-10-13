# SIA — Static Internet Archive

**The Static Collective's local-first archive of references to web properties we don't control, and an executable metadata-to-creation engine.**

> A particular is observed. Its metadata becomes food. A recipe is determined. AI may propose a composition. A person may choose. A new particular enters the field without pretending to be the old one.

SIA 001 has two working organs:

- **Archive:** intake of manually recorded or owner-exported metadata from Suno, Bandcamp, YouTube, webpages, and other sources. Every capture is an immutable, content-addressed local observation with source locator, evidence locator, capture method, date, rights declaration, facts, relationships, and *separately labeled interpretations*. No scraping, audio download, or API credential is required. An observation is a record of a source **claim**, not independent authentication.
- **Metabolizer:** a deterministic composition engine turns those observations into repeatable, inspectable multimodal *recipes*, including a bounded prompt packet for an AI assistant. The assistant's writing is explicitly a **proposal**. SIA validates its shape and provenance labels, issues a local HOLD review, and permits an explicit human selection. The selected text becomes a fresh, locally owned **derived particular** that can feed the next recipe.

**Not yet:** a working web crawler, media backup system, AI API client, signed reLATTE receipts, a production browser UI, or a remote publication pipeline. Those are separate, reviewable extensions.

## Run the executable loop

Requirements: **Node.js 22+**, no package dependencies, no network access.

```bash
npm test
npm run demo
```

`npm run demo` writes two source observations into `.sia-demo/objects/` and emits:

- `.sia-demo/demo/recipe.json` — deterministic, source-bound *visual* generation plan with seed `325`
- `.sia-demo/demo/ai-prompt.json` — bounded instructions plus machine-readable response shape

The real-source example is **Rosemary Bloom** and **Where the Porch Boards Bend**, the two published song links in the first letter of *a week together*. No audio or Suno metadata beyond the published links/titles is assumed.

You can then play the AI-assistance and selection boundary:

```bash
node src/cli.mjs review \
  .sia-demo/demo/recipe.json examples/ai-proposal.visual.json

# Review produces HOLD, not canonical publication.
# A person must explicitly select a candidate for local reuse:
node src/cli.mjs harvest \
  .sia-demo/demo/recipe.json examples/ai-proposal.visual.json \
  --vault .sia-demo --accept

# Inspect the content ID printed by harvest, then:
node src/cli.mjs compose 'sha256:<HARVESTED_ID>' \
  --vault .sia-demo --mode narrative --seed 325 \
  --out .sia-demo/demo/second-generation.json
```

The example AI proposal was written for this experiment, not returned by a connected Suno or image-generation service. It is a **four-scene textual storyboard**, not a rendered image.

## Suno albums — first collected inventory

Five albums (43 tracks listed) were observed in The Static Collective's [Suno profile](https://suno.com/@thestaticcollective) on 2026-10-13 and are committed as immutable-input **observation records** under [`captures/suno/albums/`](captures/suno/README.md). These records preserve album source links, displayed titles and track counts. Release dates, visibility and audio contents were not established.

```bash
npm run ingest:suno          # 5 album observations → content-addressed local .sia vault
npm run sia -- catalog       # view source-labeled collection
```

The import is local and idempotent; it neither calls Suno nor downloads media. Revisit [the capture inventory](captures/suno/README.md) for links, evidence boundaries and historical snapshot policy. This is the first album-kind capture, **not** a claim that SIA now has a crawler or owner-export integration.

## Ingest your own metadata

Use `examples/rosemary.observation.json` as the contract:

```bash
node src/cli.mjs ingest path/to/your-source.observation.json --vault .sia
node src/cli.mjs catalog --vault .sia
node src/cli.mjs compose sha256:<ID> --vault .sia --mode music --seed 19 --out my-recipe.json
node src/cli.mjs prompt my-recipe.json --out ai-instructions.json
node src/cli.mjs review my-recipe.json candidate.json
```

Modes: `visual` (visual scenes), `music` (musical movements), `narrative` (story movements). A recipe constrains the **number, ordering, named function, focus token, and source references** of the output. The creative words remain non-deterministic unless the AI's specific proposal bytes are preserved.

The vault is **not committed** by default: `.sia/` and `.sia-demo/` are ignored. Archive files under `objects/<sha256>.json` cannot be overwritten through the SIA ingestion API; repeat ingestion is idempotent and tampering fails a digest check. File digests prove byte integrity relative to the local record, **not truthful source provenance, authorization, or identity**.

## Why not simply attach prompts to a database?

The metadata has distinct nutritional roles:

| Layer | Example | System treatment |
| --- | --- | --- |
| Captured source claim | Track title visible on a published listening letter | Preserve source locator, method, date, rights, basis |
| Derivation | `rosemary` token extracted from the title | Deterministic, reversible to originating field |
| Relationship | Two songs paired in the same letter | Keep the claimed source relation, don't invent causality |
| AI interpretation | Porch scene with an invented ceramic cup | Candidate only, new motifs separated from inherited ones |
| Human selection | Local choice to carry a storyboard onward | Explicit local selection, not public canon |
| New particular | Four-scene text artifact harvested from selection | New content address; inherits parent IDs, not source authority |

Every selected composition produces additional traceable metadata. SIA can ingest the resulting **derived** particular as new food without confusing it with a source observation.

### Founding distinctions

```text
SOURCE URL         ≠ SOURCE AUTHENTICATION
SOURCE CLAIM       ≠ VERIFIED FACT
CAPTURED METADATA  ≠ MEDIA OWNERSHIP
TITLE TOKEN        ≠ AUDIO FEATURE
RECIPE SEED        ≠ MODEL RANDOMNESS CONTROL
RECIPE REPLAY      ≠ MODEL OUTPUT REPRODUCTION
AI PROPOSAL        ≠ HUMAN SELECTION
LOCAL SELECTION    ≠ PUBLICATION OR CROSSING AUTHORITY
CONTENT HASH       ≠ SIGNATURE OR CONSENT
CREATIVE DESCENDANT ≠ ORIGINAL SOURCE
```

### Doors into the rest of the Collective

- **webZ / Navigation Composer:** consume *references* and source-labeled links as playable nodes; do not silently admit a visitor's output to sovereign worlds.
- **GHoT / Static OS:** future bounded capability executors for probing locally owned media, with resource contracts and receipts.
- **reLATTE:** a future explicit crossing adapter can transport a bounded SIA object. SIA does not pretend its local hashes are signed reLATTE receipts.
- **LemonPRESS / Toaster / Blender:** treat SIA recipes as proposals for audio, image, video, and story production; return new particulars, don't overwrite the source.

Read [the capture and metabolism protocol](docs/PROTOCOL.md) and [the next gates](docs/ROADMAP.md).

## Build status

Tests cover idempotent intake, canonical object hashing, source tampering, rights/basis validation, recipe replay, contradictory AI provenance, HOLD, human selection, fresh derived material, and an end-to-end CLI run. GitHub Actions executes them on every push and pull request.

**Archive-before-inference, provenance-before-beauty, creativity-without-counterfeit-authority.**
