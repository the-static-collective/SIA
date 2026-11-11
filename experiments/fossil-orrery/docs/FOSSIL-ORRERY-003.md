# Fossil Orrery 003 — Public-source field station / private-export gate

**Status:** experimental HOLD. Nothing in this milestone claims a successful live Suno owner-export test or production browser deployment.

## What we can attest now

The application already packages six public SIA Suno **album** observations from October 13, 2026 (five initial album-profile observations plus a later Blue Night Morning album page observation). The 52 reported track positions **are not** 52 independently identified recordings. Only one album has an observed album-created date; five remain chronologically unresolved. These captures are not owner-export data, a Suno API response, a media backup or a live observation made today.

The new **Field Station** in Harvester includes:

* **Merge observed six:** idempotently adds the six source observations to the existing local vault. It does not overwrite or delete anything, and it never creates synthetic recordings.
* **Run non-writing proof:** runs a deterministic scripted test entirely in memory: six source observations → Orrery layout and reachability → six Bone Flute frequency mappings → SIA deterministic recipe → human-unauthorized selection refused → proposal HOLD → **simulated** explicit local choice → vault serialization and re-import. It exports an audit receipt with `SCRIPTED_SIMULATION_NOT_FIELD_OBSERVATION`. No human choice is asserted and no test-created work is saved.
* **Check storage:** displays the browser's reported storage usage/quota and persistence status, or shows explicitly unknown. The IndexedDB write promise now resolves on **transaction completion** rather than request enqueue, and the Harvester exposes `pending`, `saved`, `memory-only` and `failed` save states.
* **Drag/drop:** supports local JSON/CSV/TXT selection and drop, with a 24 MiB front-end cap (matching Suno importer maximum). Files remain client-side; no scraping or credential use.

## Verification commands (from experiments/fossil-orrery/)

```sh
node --experimental-strip-types --test tests/orrery.test.mjs tests/field-trial.test.mjs
node --test vendor/sia/tests/*.test.mjs vendor/story-dna/test/*.test.mjs
```

The first suite has **15 tests** including a fully synthetic 15,000-record owner-export adapter/bundle identity round-trip; the second has **31** vendored SIA/Story DNA tests. Total **46 tests pass** in the Node 22 local environment as of 2026-10-21. The script-produced 15,000-row records are deliberately artificial IDs and song titles, not fetched or user-provided Suno data. Runtime estimates are machine-specific and cannot prove IndexedDB browser storage or rendering performance.

**Browser build and live walkthrough have not passed:** `npm ci --offline` failed because the package cache lacks `ajv` (no DNS for registry.npmjs.org). No browser deployment was executed. Do not advertise full UI QA as done.

## First private owner-data field trial (requires the owner's explicit export)

1. Obtain a supported owner-provided Suno JSON/CSV export through authorized means. **Do not commit the raw export to GitHub, upload it to a public ticket, or use it in a public screenshot.** Keep a separate local copy safely backed up.
2. In Harvester, check browser storage and download the existing vault. Drag/drop or select the export; review adapter recognition, counts, duplicates, undated/rejected rows, rights declaration and captured-at time.
3. Choose `links-only`, and leave **Include Suno prompt excerpts** off by default. Click Commit Suno observations explicitly. Observe the `Vault write: saved` indicator and any quota errors; this is a local durability observation, not source verification.
4. Open Orrery; navigate oldest source-claimed records then unresolved; verify actual owner-uploaded row counts and identities. Open Bone Flute; select/play a time band. Audio is algorithmic content-hash tones, **not** original Suno recordings.
5. Pin two owner-exported objects; compose a recipe in Metabolizer. Load structural draft, review/HOLD, then perform a deliberate local selection **only if desired**. Source claims and AI/human-created text remain separate.
6. Export full vault JSON, save it securely, then use a fresh browser/profile or cleared vault to import it. Re-check object counts and content IDs, confirmed source/derived distinctions, and private-data nonpublication.
7. Measure browser responsiveness, quota usage, reload continuity and refused/corrupted snapshots on that actual device. Treat any warnings or incomplete round trips as HOLD, not success.

## Remaining gates

- Verify a live npm build and mobile browser flows with dependencies installed.
- Check actual private owner-export structure and consented schema; the collector currently understands common fields, not every Suno variant.
- Test 15,000 real imported records end-to-end in browser, especially IndexedDB quotas, import pauses and re-entry after restart. The current vault stores its whole state in one IndexedDB object, which may become a limiting factor at scale.
- Consider splitting raw snapshots into durable independent blobs and incremental batching only after observing a real large import.
- Do not merge to main or deploy until the human validates the UX and security boundaries.

**Source ownership:** SIA owns its source claims; GrokBuild remains the experimental UI instrument; browser local choice does not grant publishing, rights or canon authority.
