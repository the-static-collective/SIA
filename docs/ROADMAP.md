# SIA — Progressive Gates

## Gate 001 · CLOSED LOOP (implemented)

Source-labeled local metadata snapshots → reproducible generative recipes → optional AI proposals → structural HOLD → explicit local selection → derived particulars → new recipe. The first inputs are two published song references, not audio files. All without network traffic, accounts, or dependencies.

## Gate 002 · Owner-export importers (planned)

Support consented files from Suno, Bandcamp, YouTube and site exports using separate source-specific adapters. Importers preserve **original field names, exact source/export references, unknown fields, captured time and tool version**, and do not turn missing or inferred fields into facts. Track failures explicitly. Add media hashes only when the owner provides permitted bytes.

## Gate 003 · Temporal source witnesses (planned)

Multiple observations of the same external URL over time, including changed titles, removed pages, new descriptions or contradictory claims. Preserve separate observations and show differences; do not erase or silently reconcile conflicting history. Add durable archive export and backup with operator-controlled storage.

## Gate 004 · Affordance discovery (planned)

Schema-mapped creative capabilities: title, duration, lyrics (if authorized), measured BPM/key (if media owned), palette from permitted images, provenance of stems/remixes, creation-parameter boundaries, textual motifs, temporal relations. Each affordance must declare whether measured, source-reported, user-asserted or model-inferred, plus the originating fields or evidence.

## Gate 005 · Media and inference adapters (planned)

Local tool-calling for ffprobe/ImageMagick/Whisper/LLM and remote optional generation with explicit authorization, budget, licensing checks and model metadata. Preserve prompts, inference parameters, model revisions, selected outputs, source IDs and media hashes. Deterministic scheduling never implies guaranteed model reproducibility.

## Gate 006 · Public interface (planned)

Explore an interactive field in which source particulars, human decisions and AI proposals have visibly different affordances. *Navigation itself* can construct compositions and fork new particular nodes. Start with a reviewable local prototype before adding public publishing.

## Gate 007 · Sovereign crossings (planned)

Offer user-selected, bounded and verified SIA parcels to webZ and reLATTE. Keep inspection, transport, receipt, admission and canon distinct. A local selection should never be mistaken for another world's acceptance.

## Proposed first measurable experiment

Run ten different recipe seeds across the same two real metadata records. Verify ten reproducible recipes, then let an AI propose ten visual storyboards. Measure novelty, repeated motifs, source-boundary errors, human favorite selections and how the chosen descendants change the second-generation recipe space.

## FISHBONE-001 · Browser witness prototype (proposed implementation)

A separate, opt-in Playwright worker captures **one** allowed public HTTPS page after an explicit exact-domain scope and robots.txt check. It writes a local, content-hashed witness under `.fishbone/captures/` and stops at HOLD. `preview` displays the intended SIA observation; `admit --reviewed` records a source-attributed `browser-observation` in SIA without claiming authentication, media rights, or remote publication. There is no batch crawling, authentication/session import, recursive traversal, scheduling, or deployable worker yet. Never automate sites that prohibit scraping (including Suno); use owner exports or manual capture instead.

See [`tools/fishbone/README.md`](../tools/fishbone/README.md). Before broader deployment, harden DNS/IP resolution, complete robots protocol conformance, rate limits, and retention/access control.

## FISHBONE-002 · Temporal evidence trail (implemented in stacked PR)

The local one-page witness can now be revisited manually to produce a fresh, immutable snapshot. The optional comparison layer reconstructs per-URL chronology and local HOLD change reports from paired, verified witness files. Title, bounded visible text, selected same-host links and HTTP status are compared. Hash-stable content snapshots can show `UNCHANGED` while the captures remain separate time-stamped events. Timestamp ties are explicitly ambiguous; source redirects are compared only when final URLs match exactly.

This is a **partial** implementation toward SIA Gate 003, not completion of archival backup, independent time/source authentication, durable global history, or automatic crawling. New `compare` and `history` commands operate offline; `capture` can print the change since its prior stored observation while remaining HOLD. Details and limits: [Fishbone temporal witness](../tools/fishbone/README.md).
