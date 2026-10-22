# Fossil Orrery — first code review (2026-10-21)

Source: `grok-workspace-1.zip` provided by the owner. Review is source-level plus Node contract tests; **not** a visually verified browser QA or production build.

## What landed in the archive

- **Harvester:** pasted/uploaded JSON and CSV, operator-adjustable mapping, Suno owner-export planning, manual observation input, raw text snapshot preservation, IndexedDB vault, JSON export/import.
- **Orrery:** canvas chronological visualization, explicitly unresolved dates, documented links and dashed hypotheses, bucket focus for thousands of dated items, record inspector and pins.
- **Metabolizer:** invokes copied SIA recipe/proposal/harvest implementations, explicit HOLD review and human selection; Story DNA `echo`, `fork`, and gated `encounter` through copied engine.
- **MADDCL0WN / Bone Flute:** adjustable radial time band, hash-derived Web Audio tones, unlinked shared-token suggestions, explicit hypothesis filing, selection transfer to Metabolizer. It does **not** analyze source recordings.

Existing SIA and Story DNA engines are vendored rather than replaced; their pinned revisions are recorded in `vendor/PROVENANCE.md`.

## Verification actually performed

```sh
node --experimental-strip-types --test tests/orrery.test.mjs
# 9/9 pass
node --test vendor/sia/tests/*.test.mjs vendor/story-dna/test/*.test.mjs
# 31/31 pass
```

**40 passing source/engine tests**. A full dependency installation and build could not be tested here: `npm ci` failed on an inaccessible npm registry (`EAI_AGAIN`). Thus runtime UI and deploy correctness are unverified.

## Concrete hardening before admitting real bulk archives

1. **Undated records become visually inaccessible at scale.** In `src/lib/orrery/layout.ts`, undated items are placed in 3 columns with `(row % 18)`, reusing coordinates after 54 items. A 100-item undated fixture produces 46 exact position collisions. Group/bucket undated records, allow drill-in/search/virtualized ledger, and test 15,000 records including mostly undated imports; don't silently hide records.

2. **Raw bundle hashes are not checked on import.** `readBundle` in `src/lib/orrery/bundle.ts` accepts raw entries if `text` and `sha256` are strings, without verifying the digest. An intentionally wrong 64-hex hash was accepted with zero rejections. Recompute and compare `hashText(item.text)` on import. Add a mutation-negative test. Also validate or quarantine imported local annotations/review/candidate metadata; these are not source evidence.

3. **Finish actual device workflow QA.** The Harvester says “Drop a JSON or CSV file” but has file-picker input only (no drag/drop handlers). Validate import → orrery → pin → compose → HOLD → select → export → reload and verify on a mobile browser; test performance/IndexedDB quota when large raw files are retained. Review scaffold auth/DB/deployment features separately from the local-first archive to avoid unnecessary service dependencies.

## Recommendation

Preserve Grok's app on an isolated branch or stand-alone repo. Don't overwrite the current `SIA` or `story-dna` code. First run one real, owner-supplied Suno export through the complete flow, save a round-trip bundle, then address the bulk/undated collision and raw-hash validation before expanding integration.

## Suggested next Grok instruction

> Excellent first specimen. Retain the Bone Flute. Now prove the **15,000-item, mostly undated** case without visual coordinate collisions or browser lockups. Verify raw bundle SHA-256 digests on import and add negative tests. Make the advertised file drop real. Test a complete import → pin → compose → HOLD → explicit selection → export → reimport journey in browser, with screenshots and receipts. Do not modify upstream SIA or Story DNA directly. Propose a minimal isolated PR and report precisely what was executed vs only inspected.