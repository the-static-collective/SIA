# FISHBONE live field test — abundent.org (2026-10-21)

Status: **successful live browser test, NOT permanent source archive**. Owner-directed public-web observation. All entries below come from GitHub Actions execution logs, not a durable export of the original browser witness JSON.

## Evidence and method

- FISHBONE-001/002 merged into SIA `main` (PRs #6 and #7).
- Browser: real Playwright Chromium on a GitHub Actions Linux runner.
- Observer: `tools/fishbone/smoke-live.mjs`, two explicitly requested visits per URL; same-host allowlist and robots.txt checks.
- Run 1 (homepage): [GitHub Actions 39644530493](https://github.com/the-static-collective/SIA/actions/runs/39644530493)
- Run 2 (homepage + week room): [GitHub Actions 39644760289](https://github.com/the-static-collective/SIA/actions/runs/39644760289)
- Both runs passed. Source text is cropped by the browser witness to at most 12,000 characters; links are restricted to 24 same-host entries. These bounds limit all equality claims.

## Observations

### Homepage — https://abundent.org/

Title: **abundent. — Garden Workbench**. Both browser runs returned successful page observations. Across two consecutive visits each time, FISHBONE classified the captured content as `CHANGED`, with **no title change, no HTTP status change, and no changes in its five observed same-host links**.

Two distinct content hashes appeared repeatedly in reversed order in consecutive test runs:

| Variant | SHA-256 over bounded visible content | Visible-text characters |
| --- | --- | ---: |
| A | `93e0ab6fa9cb77fca048b90b398026cbbe7c65c3b9d6565362f04bb00002f512` | 2193 |
| B | `0de84b81b5d1d84bd7c388352efeaab2fe027e868f91eb98c39f3a031c52ede0` | 1119 |

The second run's first differing offset was 816. Around that offset, variant A displayed **"Root garden · depth 0"** and a field carousel with an **"ENTER / webZ"** card; variant B displayed **"Root garden"** and a shorter "Everything here has roots" block.

**Interpretation, not verified cause:** This is consistent with two render states, alternate content variants, or a hydration/runtime difference. Because the *same two exact hashes recur in reversed order within minutes*, a permanent site deployment is not established by these observations. FISHBONE correctly detected different visible snapshots, but needs a reviewable way to distinguish expected per-visit variation from meaningful releases.

### Listening room — https://abundent.org/week/

Title: **a week together · The Static Collective**.

- Two successful distinct browser visits on run 2.
- `UNCHANGED` bounded content across those visits.
- Observed visible text: **4,795 characters**.
- Same-host observed links: **18**, unchanged across visits.
- Content SHA-256: `537c8a3cba5ce6d7d7d9dbc8347e73c34e61d2781682a924040cf48542cb2e1f`.

These results establish repeatability of the **captured slice** of the room, not of hidden media, a backend, or every reachable page.

## Boundaries and next practical gate

Each test used temporary local captures that were discarded when the runner finished, and the owner-site result stayed **HOLD_NOT_ADMITTED**. The GitHub Actions logs preserve observed hashes, timestamps for the run and bounded change details, but **not the complete original witness files**. This field report is a secondary account of the runs, **not** a primary immutable SIA observation. No Suno automation was performed.

To make an actual durable SIA chronology, next implement an explicit operator-reviewed export of exact witness JSON and a persistent archive with backup, retention/visibility controls, and release/deploy correlation. Do not commit an unreviewed capture as canon. Consider grouping repeated render-state hashes before alerting; do not suppress them as fictional noise.
