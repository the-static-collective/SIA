# STORY DNA 002 — Relationship Passenger (incubation)

**Status:** new, experimental code in an SIA feature branch, **not** native STORYSHIP functionality or a new adopted cross-Collective constitution. No deployment, publication, external provider operations, or human decision is made by this code.

## Why this lives here temporarily

The long-term owner should be an independent `the-static-collective/story-dna` repository because this grammar is consumed by SIA, lemonPRESS, Storyship, Panel Loom, and future story/game/music instruments. **SIA is only the incubator**: it already knows how to turn attributed observations into deterministic recipes, HOLD proposals, and separately selected descendants. Do not make SIA silently own STORYSHIP voyages, source books, or publication.

Existing owned responsibilities remain distinct:

| Surface | Owns |
|---|---|
| SIA | attributed external observations, motifs, deterministic recipe IDs and locally selected descendants |
| Story DNA (future dedicated repo) | fictional relationship-thread contracts, explicitly scoped recombination candidates, source bindings |
| STORYSHIP | its own append-only voyages, branch replay, navigator decisions and history; **not** cross-media canon |
| lemonPRESS | story/edition review, admission, release, print and publication |
| Panel Loom | visual storyboard authoring and page drafts |
| autodiscography-vault | exact audio preservation and source bytes, not semantic extraction |

## Smallest working example

Two **unadmitted, public fictional proposals** are used as declared source seeds:
- Neri and the passengers in *UNFINISHED BUSINESS — Case Zero*;
- Renji and two rats at a voluntary doorway in *The Room Inside the Room*.

Their working *interpretations* become two separate relationship threads. They are **not authenticated canonical character/relationship definitions**. The fixture has no signed licenses and sets `characterCrossingAllowed:false`.

The first `echo` composes the question: **How can a passage be offered without taking another being's choice?** That question is an authored interpretation, not a claim that the worlds have crossed.

## Commands

Run from the repository root (Node.js 22+, zero dependencies):

```bash
node --test experiments/story-dna-002/test.mjs
node experiments/story-dna-002/cli.mjs echo 325 > story-dna-proposal.json
node experiments/story-dna-002/cli.mjs fork 325 > story-dna-fork.json
node experiments/story-dna-002/cli.mjs encounter 325
```

`encounter` intentionally **fails** on the provided fixture: neither originating fiction grants the necessary character-use declaration. The successful commands return a deterministic candidate packet, a read-only STORYSHIP-inspired navigational projection, and a five-panel `panel-loom/v1` draft. To avoid overwriting a saved proposal, provide an output filename as the third CLI argument; the CLI uses exclusive creation in that mode.

## Boundary laws

1. **RELATIONSHIP != CHARACTER**. An analogous dilemma may travel without transferring an originating cast.
2. **ECHO != ENCOUNTER**. Mere resemblance is not shared-world continuity.
3. **SOURCE != INTERPRETATION**. Every thread has its own exact or explicitly non-frozen source revision and claims a classification.
4. **PROPOSAL != HISTORICAL EVENT**. No recombinator result appends STORYSHIP voyage events.
5. **CHOICE != ADMISSION**. A human could select a creative candidate, but lemonPRESS or any destination still decides locally.
6. **UNRESOLVED != MISSING**. Unknown, silence, refusal, or incomplete provenance are not generic openings to generate at will.
7. **RIGHTS DECLARATION != VERIFIED LICENSE**. Public Git visibility and content hashes do not grant adaptation permissions.
8. **PERSON != FICTIONAL ACTOR**. The current engine deliberately permits direct cross-world character encounters only when both inputs are fictional and explicitly cleared.
9. **PARENT SURVIVES DESCENDANT**. New choices and renderings never mutate either originating record.

## What actually executes

- Schema-scoped input validation and source revision labels;
- Canonical stable content IDs (`SHA-256` over sorted JSON with a domain separator);
- Source-preserving `echo` and `fork` proposals, `encounter` behind explicit fictional-character-use gates;
- A pair of conflicting, attributable interpretations as **read-only** navigation guidance;
- A five-beat `panel-loom/v1` output (no pixel artwork);
- Tests for reproducibility, source tampering, rights gates, private sources, false canonical state and carrier boundaries.

## Integration phases (proposed, not present)

1. Source adapter reads **actual** SIA observations or selected fictional-source excerpts; never infer fictional character history from a song title.
2. Story DNA holds source-bound entities (characters, places, plot threads, relationship passengers) and can recover ancestry of any candidate.
3. An optional STORYSHIP **projection-only** adapter navigates the candidate branch possibilities; any native generic-voyage support requires a separately approved contract and no change to historical Suno launch/selector/customs.
4. Panel Loom receives reviewed scenes; lemonPRESS reviews the particular edition.
5. Selected and published descendants return to source-aware archives as **new** objects, not revisions of an original album or manuscript.

**Proposed name for the eventual canonical repository:** `the-static-collective/story-dna`. The standalone repository is **not created yet**. This feature branch is an experimentally executable bridge; ownership should be explicitly transferred rather than retroactively relabelled.
