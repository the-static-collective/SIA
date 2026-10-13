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


## Suno owner-export intake · Gate 002A

SIA can now import a local Suno-oriented JSON/CSV catalog without accessing an account, downloading media, or calling an AI model. Suno's public help describes per-song downloads and Studio media exports, but does **not** document an official bulk JSON/CSV library catalog. This adapter therefore expects a structured file the operator already has, such as an independently prepared owner inventory. It does not extract from Suno's private APIs.

```sh
# Inspect oldest-first candidates without writing anything
node src/cli.mjs suno-import /path/to/catalog.json --dry-run --limit 20

# Preserve exact original bytes in an ignored, private local vault
node src/cli.mjs suno-import /path/to/catalog.json --vault .sia --limit 20
node src/cli.mjs catalog --vault .sia

# Supply two imported observation IDs to the existing recipe engine
node src/cli.mjs compose sha256:ID1,sha256:ID2 --vault .sia --mode music --seed 325 --out recipe.json
node src/cli.mjs prompt recipe.json --out ai-prompt.json
```

An intake manifest tracks source positions, rejects, undated entries, IDs, and snapshot hashes. **Oldest** means an explicit creation date; missing dates follow in source order, and publication dates are not substituted. The untouched original file is preserved in `.sia/raw/`, including unknown metadata. Only bounded facts become source-labeled SIA observations. Prompt and lyric projection requires `--include-prompts`; there is no remote upload or inference. The vault is not encrypted, so preserve its privacy.

The example CSV and JSON use **fictional tracks, IDs and dates**. No personal Suno catalog has been imported by this PR. Read [the Suno intake guide](docs/SUNO-IMPORT-001.md). Source documentation: [Suno download FAQ](https://help.suno.com/en/articles/13614785).

## Build status

Tests cover idempotent intake, canonical object hashing, source tampering, rights/basis validation, recipe replay, contradictory AI provenance, HOLD, human selection, fresh derived material, and an end-to-end CLI run. GitHub Actions executes them on every push and pull request.

**Archive-before-inference, provenance-before-beauty, creativity-without-counterfeit-authority.**
