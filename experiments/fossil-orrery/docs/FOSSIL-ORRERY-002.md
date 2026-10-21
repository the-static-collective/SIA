# Fossil Orrery 002 — bounded strata & raw evidence verification

**Status:** candidate hardening on the existing experimental SIA pull request; no production admission, publication or upstream SIA / Story DNA engine changes.

## 001 / Import integrity

`readBundle` checks every raw snapshot's exact UTF-8 text against its declared `sha256:<64-lowercase-hex>` digest before storage. It rejects malformed entries, content/hash mismatches, and malformed raw collections; identical valid digests deduplicate. Invalid raw snapshots stay out of the vault even when other entries in the bundle pass review. Negative tests cover wrong contents, wrong digest, wrong types and duplicate entries. The digest establishes local byte integrity, **not** truth, rights, identity, or external provenance.

## 002 / The 15,000-artifact sky

`layoutSky` keeps **source-claimed**, **chronology unresolved**, and **derived-local** in separate bands. Dated artifacts sort by source-claimed creation time; undated stay undated and sort only by title/ID. Each band draws at most 64 records or at most 16 aggregate buckets; clicks drill into nonoverlapping, smaller subsets until an original record can be selected. Bucket membership is exact and reversible via Back / All strata. Aggregate groups never become source records and **do not draw aggregate relation lines**. Small-screen capacity decreases safely.

The accessible ledger provides title/locator/ID search across the full archive, band filters and pages of 100 items rather than rendering 15,000 interactive DOM rows at once. Hover repaint uses memoized layout rather than sorting all records on every pointer movement.

## Verification actually run

```sh
node --experimental-strip-types --test tests/orrery.test.mjs
# 11 passed / 0 failed
node --test vendor/sia/tests/*.test.mjs vendor/story-dna/test/*.test.mjs
# 31 passed / 0 failed
```

The new synthetic 15,000-record fixture (12,600 undated, 1,800 source-claimed, 600 derived) recursively visits every bucket at desktop (1280x800) and small-mobile (360x540) dimensions. It asserts unique visible coordinates, original ID reachability exactly once, no cross-band grouping, bounded canvas nodes, and deterministic repeat layout. Passing this **geometry and traversal contract** does not prove a browser can ingest/persist 15,000 real owner exports quickly; full browser smoke, IDB quota and import/round-trip checks remain open.

**Still HOLD:** npm UI build/typecheck in an installed workspace, real browser QA, drag/drop, private-data policy, and real-owner-export throughput measurement. Do not merge or deploy before those checks.
