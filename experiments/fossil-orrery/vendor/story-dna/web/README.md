# STATIC STORY DNA 001 — The Cross-Collective Character / Setting / Plot Thread Bank

**Status: offline editorial prototype, not an operational cross-repository integration, publishing system, canonical lore registry, signed ledger, or authorized crossover.**

Open `index.html` in a browser. No dependencies, servers, accounts or API keys. On some Android devices local HTML opens in a viewer that disables scripts; opening with Chrome or serving the files locally over HTTP may be necessary.

## Working controls

- **Six seed classes:** character, setting, plot thread, motif, artifact, relation.
- **Three crossing postures:** ECHO (thematic parallel), ENCOUNTER (explicit noncanonical crossover), FORK (a new descendant preserving both origins).
- Deterministic roll from a seed, mode and roll counter; lock or explicitly choose individual seed cards; reroll the rest.
- Rule-based 5-beat candidate script, title, logline, reader question and origin receipts. **The script is scaffolding**, not a semantic AI composition or a coherent authored scene by itself.
- Local-only custom seed creation, search, inspection and JSON export/import. Data remains in browser localStorage until exported or deleted; exporting a bank is an intentional transfer of that data to a local file.
- Export candidate JSON (`static-story-dna/v1`) containing all six exact parent cards, their source URLs, lineages, crossing mode, seed and 5 proposed beats.
- Export shot list Markdown and a **Panel Loom** import file (`panel-loom/v1`) that maps beats to panels. It can be imported into the previously built `manga_scene_lab/index.html` via its JSON Import button.
- Print candidate treatment with browser print. None of this constitutes publication.

## Source fidelity

The example bank references two externally verified, **unadmitted** creative-source families and two previously described contexts:

- `UNFINISHED BUSINESS — CASE ZERO` in lemonPRESS [PR #47](https://github.com/the-static-collective/lemonPRESS/pull/47). Neri Vale, Tallow, the Forecloser, Bureau, suspended train, Side B cassette, blank ticket.
- `THE ROOM INSIDE THE ROOM` incubating GitBook seed, drawing from Renji/Deuce/substitute/animals/roomspace passages. [Source](https://app.gitbook.com/s/HILTtUulCBDqDzXXk6RQ/the-pet-sitter-featured-story-seed/the-room-inside-the-room-multimedia-project-seed).
- `Thread of Gold / Ocean Blue` — user-provided lyrics, previously adapted into a candidate five-panel scene. No external link is asserted.
- `The Static Collective / recurring motifs` — recurring house, porch, invitation, Open E 022100 imagery. This is a reference to motifs, not a claim of canonical story characters.

The source materials are original works or creative proposals; their appearance here does not assert rights to release, shared fictional continuity or story approval. Custom seed rights must be separately checked. All authored suggestions are review candidates only.

## Critical design distinction

One seed card is an **identified particular**. Its identity and source remain inspectable. `ECHO` juxtaposes without asserting contact; `ENCOUNTER` makes a proposed crossover; `FORK` proposes a separately sourced descendant. The recombination recipe is a proposed path through content, **not** an automatic rewrite or merge of source-world histories.

The complete upstream architecture might later map to SIA (song motifs), LemonPRESS (story sources and publishable editions), reLATTE (crossing receipts), and Panel Loom (scene drafts). None of those direct integrations is implemented in this offline file.

## Known limitations

- Seed selection and output text are deterministic templates, not actual linguistic reasoning, character consistency checking or procedural graphics.
- No cross-repo ingestion or automatic indexing, no canonical schema negotiation, no cryptographic provenance, no connected Google Drive, and no authenticated authorship.
- Current built-ins intentionally comprise a small illustrative set and may not be exhaustive or current.
- Source link syntax is checked only for URL form, not authenticity, availability, legal status or permissions.
- Browser localStorage is device/profile scoped and can be cleared. Export often.
- The browser app does not render finished manga art or import another project's private story material.

## Proposed next integration

Create source-adapter readers (read-only) for LemonPRESS story treatments and author-approved SIA lyrical scenes, keep a review queue for human admission to the seed bank, resolve duplicate/reused identities explicitly, and pass emitted exact-origin candidate packets to Panel Loom. Leave source mutation and canon decisions with each owning project.