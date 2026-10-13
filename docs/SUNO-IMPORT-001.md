# SIA / SUNO-IMPORT-001 — Owner-supplied chronology and metadata digestion

## Objective

Turn a Suno export that a person has lawfully obtained into a **private raw witness**, a deterministic ordered intake plan and a set of bounded, source-labeled observations usable by the existing Metabolizer. This is an offline ingest adapter, **not** a Suno integration, API client, crawler or media backup service.

## Accepted surfaces

- UTF-8 JSON: a top-level array, or exactly one array named `songs`, `clips`, `tracks` or `items`, optionally within `data` or `export`.
- UTF-8 CSV: a unique nonempty header row and records; quoted commas, escaped quotes, CRLF and embedded newlines are supported.
- Individual records: song metadata or an inner `clip`/`song` object. Accept a supported `https://suno.com/song/<id>` or `/s/<id>` link; when no link was supplied, a full UUID allows a *constructed* `/song/<uuid>` locator, explicitly labeled in `locator_constructed`.
- Valid source chronology: UTC or offset-aware ISO timestamps, Unix epoch seconds or milliseconds, or date-only `YYYY-MM-DD`. Timezone-naive timestamps are **not ranked**. Published/released dates remain separate facts and cannot substitute for a creation date.

This importer is deliberately not an undocumented universal schema guesser. If an actual Suno export uses a different envelope, retain its raw bytes and extend the adapter with a fixture from the real structure; never quietly discard fields to force an apparently successful import.

## Scope and receipts

`node src/cli.mjs suno-import FILE --dry-run --limit 20` produces a deterministic intake preview (apart from the chosen capture timestamp included inside observation IDs; batch identity remains stable). It writes nothing. Live import writes:

- `raw/<sha256 of literal input bytes>.bin`, private mode 0600;
- `imports/<sha256 batch recipe>.json`, including source row count, rejects, source positions, chosen order and normalized observation IDs;
- `objects/<content hash>.json`, using SIA's existing content-addressed observation store.

Each observation states `capture.method=owner-export`, `rights=links-only`, the raw SHA, original source position and a note that this is an **operator-supplied** file, not provider-authenticated metadata. Unknown fields and values survive exclusively in the untouched local raw snapshot. Nothing is extracted from song audio or artwork. No attribution or source-claim basis is upgraded because an import succeeded.

For each batch, sort records with an explicit creation date first (ascending), using source position as a stable tie-break; undated records follow in original input order. `--limit N` chooses the first N after that ordering, without deleting the remainder from the original raw snapshot. Different limits and `--include-prompts` settings produce distinct batch manifests referencing the same raw file.

## Important limits

- JSON/CSV file size 24 MiB, 20,000 records maximum. Existing SIA observations limit facts and strings.
- Duplicate provider IDs, rejected entries, and undated records are reported. Invalid rows do not become fabricated songs. A completely unsupported file fails closed.
- No automatic encryption; user exports often contain private prompts, lyrics, identifiers or unrelated personal details. The raw files are ignored by Git but storage custody remains the operator's responsibility.
- No generated material is treated as source-observed fact. The Metabolizer still distinguishes proposals, explicit human choice and any later derived particular.
- The raw snapshot's content-address is **not a signature** or authenticated assertion about Suno.

## Useful future gates

1. Ingest one *real, authorized* Suno export and create fixtures covering its actual keys and missingness.
2. Separate creative metadata affordances (style tags, generation settings, duration, links, version ancestry) by basis: source-reported, owner-note, measured from licensed bytes, AI-inferred.
3. Reconcile multiple owner exports over time without overwriting contradictory observations; add inspection tools for source drift.
4. Introduce opt-in media capture, storage budgets and rights checks separately; don't silently download audio or photos.
5. Export verified discovery proposals into the Navigation Composer without treating a source citation as permission to publish or cross a world boundary.
