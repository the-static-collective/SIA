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

## RELAY-001 — Fifth organ: the song becomes a history

**Experimental review branch.** SIA now accepts an already-verified four-organ RELAY-001 local source packet as a fifth native contribution. It preserves one original song observation and five linked, content-addressed project events in the **existing SIA vault**. This neither republishes the MP3 nor converts a signed reLATTE HOLD to ADMIT.

```
LOADOUT BIND → GHoT EXECUTE → reLATTE RECEIVE/HOLD → webZ OBSERVE → SIA INDEX
```

The bounded importer validates the original MP3 and embedded derivative hashes; task/receipt identity; a cryptographic verification by the pinned webZ verifier; and the exact JSON evidence bytes before writing to SIA. Repeated intake is idempotent. An offline HTML timeline displays what each of five projects did and preserves **34 other candidates as proposed, not executed**.

Run the synthetic-native CI workflow or read [RELAY001-FIFTH-ORGAN.md](docs/RELAY001-FIFTH-ORGAN.md) for the local source-packet command, explicit no-admission boundary, source provenance requirements, and security cautions. No connected Suno scraping, music copying, or production deployment is implied.

## Suno albums — first collected inventory

Six albums (52 total album track positions) are now committed as immutable-input **observation records** under [`captures/suno/albums/`](captures/suno/README.md). The first five (43 track positions) were observed on The Static Collective's [Suno profile](https://suno.com/@thestaticcollective) on 2026-10-13. The sixth, [*Blue Night Morning*](https://suno.com/album/cab6b253-5f5b-4eb1-ae59-ac74c890b04d), was observed later that day and includes its nine displayed song titles, order and durations. Unobserved release dates, visibility and media rights remain unknown.

```bash
npm run ingest:suno          # 6 album observations → content-addressed local .sia vault
npm run sia -- catalog       # view source-labeled collection
```

The import is local and idempotent; it neither calls Suno nor downloads media. Revisit [the capture inventory](captures/suno/README.md) for evidence boundaries and [the Blue Night Morning playlist→album witness](captures/suno/blue-night-morning-history.md) for separately observed creative ordering. This is the first album-kind capture, **not** a claim that SIA now has a crawler or owner-export integration.

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

## FISHBONE-001 — reviewable browser witness (experimental)

[`tools/fishbone/`](tools/fishbone/README.md) now contains an opt-in Playwright browser witness: one public page on an explicitly allowlisted HTTPS hostname, robots check, a local content-hashed snapshot, HOLD preview, and a human-reviewed bridge into SIA's `browser-observation` records.

```bash
npm install --no-save playwright
npx playwright install chromium
npm run fishbone -- capture https://example.org/ --allow-domain example.org
# Follow the printed witness file path:
npm run fishbone -- preview .fishbone/captures/<witnessSha256>.json
npm run fishbone -- admit .fishbone/captures/<witnessSha256>.json --reviewed
```

This is **not** recursive crawling, an authenticated session extractor, or a production-hardened network sandbox. Suno is excluded from automation under its current terms. Use owner exports/manual observations for restricted platforms; retain local witness files separately. See the [FISHBONE constraints and threat model](tools/fishbone/README.md).

### FISHBONE-002: remember what changed

Repeat an explicit permitted capture on the same URL to preserve another local timestamped witness. FISHBONE now reports differences from the previous observation without overwriting either record. Offline analysis is available:

```bash
npm run fishbone -- compare .fishbone/captures/OLDER.json .fishbone/captures/NEWER.json
npm run fishbone -- history https://example.org/ --allow-domain example.org
```

Both return source-bound **HOLD** evidence, not a published/canonical claim. The new `fishbone/change/v1` records include witness IDs, content hashes and bounded differences. See the [FISHBONE-002 runbook](tools/fishbone/README.md) for limitations.
