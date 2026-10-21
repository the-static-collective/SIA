# Fossil Orrery — GrokBuild 001 (experimental)
 
An isolated, review-only import of the GrokBuild Fossil Orrery workspace delivered by the project owner on 2026-10-21. The complete application and its SIA / Story DNA vendored engines are retained in this directory; **existing SIA source files are unchanged**.

## Instruments
- **Harvester** — import JSON/CSV/owner-export observations with local IndexedDB vault.
- **Orrery** — source-labeled chronological sky and record inspector.
- **Metabolizer** — SIA and Story DNA proposals, HOLD review and explicit selection.
- **Bone Flute** — a hash-toned, time-band audio instrument with hypothesis proposals.

## Provenance and source custody
Source ZIP SHA-256: `785a2a2c39805573ce099df5ca68831287b9bf235e5bc571efa6b9f3c9bb644f`.
`SOURCE-MANIFEST.json` lists the 179 imported files with original SHA-256 checksums and lengths. The transfer retained file bytes; only tool-specific scaffolding (.grok workspace instructions/settings, AGENTS.md, .tanstack generated cache, .project_id) was excluded. `vendor/PROVENANCE.md` identifies the embedded upstream SIA / Story DNA revisions.

## Run and verify
This is the original GrokBuild TanStack/React workspace, **not yet integrated into SIA's runtime**.
```sh
cd experiments/fossil-orrery
npm ci
npm run dev
node --experimental-strip-types --test tests/orrery.test.mjs
node --test vendor/sia/tests/*.test.mjs vendor/story-dna/test/*.test.mjs
```
Prior source review reported 40 passing engine tests (9 Orrery + 31 vendor), but no verified full UI build: npm registry access was unavailable in the review environment. Some Grok-specific scaffold checks depend on excluded internal platform metadata, so `npm test` is not represented as a fully passing workflow.

## Known gates before merge
- Undated node collision after 54 items in sky layout; needs bucket/drill-down for ~15,000 records.
- Raw text SHA-256 values in imported bundles aren't reverified during read.
- Advertised drag/drop isn't implemented; mobile complete-cycle browser QA remains unproved.
- Review scaffold-specific auth and deployment settings before live release; imported bundles are private and never auto-admitted to SIA.

See `REVIEW-001.md`. This work is a **candidate instrument**, not published canon, production code or owner-authorized external ingestion.
