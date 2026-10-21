# STORY DNA

**The Static Collective's cross-medium story-thread bank, character and setting catalog, and provenance-first recombinator.**

> The character remains. The relationship travels. The story grows.

## Intent

Story DNA is an independent creative instrument for preserving fictional particulars—characters, settings, narrative relationships, unanswered questions, visual motifs—and proposing new **echoes, forks, and encounters**. It helps discoveries in albums, manga, games, music, film and fiction inform one another without falsifying source ancestry or assigning another work new canon.

**Status:** new independent repository; first reproducible prototype is being extracted from the prior [SIA incubation branch / PR #5](https://github.com/the-static-collective/SIA/pull/5). Neither a generated premise nor a fork is published or canonized simply by being recorded here.

## Responsibilities

| Instrument | Owns |
| --- | --- |
| **Story DNA** (this repository) | Narrative seed schemas, attributed relationship threads, candidate recombination, lineage and export formats |
| [SIA](https://github.com/the-static-collective/SIA) | External metadata observations, motif recipes, local creative derivation |
| [STORYSHIP](https://github.com/the-static-collective/STORYSHIP) | Its own constitution, witnessed voyages, branch replay and steering receipts |
| [lemonPRESS](https://github.com/the-static-collective/lemonPRESS) | Editorial admission, edition and publication decisions |
| Panel Loom | Candidate storyboard/page editing and render handoff |

The engine deliberately separates **source/observation** from **interpretation**, **relationship analogy** from **character crossover**, and **proposal** from **admission**. Human beings' private autobiographical facts are not automatically fictional characters, seeds or remixable content.


## Try the working prototype

Requires **Node.js 22+**, no runtime dependencies.

```bash
npm test
npm run demo       # ECHO candidate + read-only navigator + Panel Loom draft
npm run fork       # independent fictional descendant
node cli/story-dna.mjs encounter 325  # expected REFUSAL on uncleared characters
```

The `echo` and `fork` commands return source-bound `story-dna/specimen-packet/v0` JSON containing:
- two independently identified fictional relationship ancestors;
- a repeatable five-beat candidate, with `HOLD` posture;
- two differently framed navigator interpretations (read-only STORYSHIP-inspired projection; **not** an actual Storyship voyage event);
- an editable `panel-loom/v1` manga draft;
- no character transfer, canon mutation, or release.

Use exact-output-safe redirection (`> proposal.json`) only for a location you intend to write.

### Feed SIA album metadata into the offline seed bank

```bash
node adapters/sia/cli.mjs \
  fixtures/sia/blue-night-morning.observation.json \
  fixtures/sia/a-week-together.observation.json > bank-import.json
```

This generates **eleven title-derived motif cards** for the local `static-story-dna-bank/v1` browser app from the October 13 album observations. These are *not* inferred lyrics, characters, or plot; they require review before use. The offline **Story DNA Bank 001** browser specimen is now preserved at [`web/index.html`](web/index.html), with an accompanying [`web/README.md`](web/README.md). Open that HTML file locally to import the generated JSON under **BANK → IMPORT**. It is **not live-deployed**; the two experiments remain separate code paths while their schema contract is reconciled.

The adapter is a read-only projection and never downloads Suno tracks or modifies SIA/Vault, STORYSHIP, or lemonPRESS.

## Build status and ownership

- Current branch: `feat/relationship-passenger-002` (awaiting review; unmerged).
- CI: `.github/workflows/verify.yml`; tests cover stable IDs, source-tamper refusal, privacy gates, fictional-character permissions, read-only navigation and SIA title metadata.
- First port from SIA PR #5 preserves its origin explicitly; subsequent changes here belong to this independent project.
- The existing STORYSHIP historical selector, provider launch budget, receipt law and destination customs are unchanged.

**Next gate:** review source identity and rights policy, define versioned canonical entities (character, setting, relationship, plot thread), then build opt-in bank↔navigator and character-continuity interfaces. No real-person seed harvesting.

## Initial design

A **relationship passenger** records `desire → relationship → conflict → choice → consequence → unresolved remainder`, bounded to an attributable source and revision. A recombination can propose an `ECHO` (analogy), `FORK` (independent narrative descendant), or permission-gated `ENCOUNTER` (proposed fictional crossover). Both original sources retain their own identities.

Read the first prototype's source and verification notes in the `feat/relationship-passenger-002` branch and upcoming draft PR. Nothing in that prototype modifies the historical STORYSHIP voyage runtime.

## Development principles

- Keep unadmitted and private sources out of public Git history.
- Record exact provenance where available, or explicitly mark missing revision/evidence.
- No automatic cross-world canon, rights grants, selection or publication.
- Source characters and real persons are not inferred from titles or motifs.
- No network calls, API keys or AI-provider expense required for the first deterministic test.
- Cross-project integration is an **adapter**, not hidden takeover of another project's authority.

**Predecessor:** [SIA: STORY DNA 002 experimental incubation](https://github.com/the-static-collective/SIA/pull/5). Ownership moved forward; origin does not move backward.
