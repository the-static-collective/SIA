# FISHBONE-001 · Local browser witness

**Status: experimental, opt-in; not a production crawler.**

FISHBONE is a one-page, local Playwright observer that hands **reviewed observations** to the Static Internet Archive. It does not automate logins, import sessions, crawl recursively, download media, or run on a schedule.

## First run

From the SIA repository root, with Node.js 22+ and Chromium available:

```bash
npm install --no-save playwright
npx playwright install chromium
npm test
node tools/fishbone/cli.mjs capture https://example.org/ --allow-domain example.org
```

The capture prints the local file path under `.fishbone/captures/`. It is **not** ingested automatically.

```bash
node tools/fishbone/cli.mjs preview .fishbone/captures/<witnessSha256>.json
node tools/fishbone/cli.mjs admit .fishbone/captures/<witnessSha256>.json --reviewed --vault .sia
npm run sia -- catalog
```

Review the title, visible excerpt, source locator, captured time and link relations before running `admit`. The `--reviewed` flag records the operator's local choice, **not** independent verification that the page or its claims are authentic.

## Capture contract

- **Scope:** one public HTTPS URL, on a single **exactly allowlisted hostname**; no credentials, nonstandard ports, local domains, IP literals, external navigations or third-party requests.
- **Respect:** `robots.txt` is read before capture and checked again after navigation; unavailable/error responses HOLD, except 404/410. Sites that forbid extraction in their terms must not be automated. Suno is explicitly blocked.
- **Witness:** local JSON with observed URL, time, title, bounded visible text, up to 24 same-host links, HTTP status, robots decision, and canonical-content SHA-256. Witness JSON has its own integrity hash. Hashes detect local edits; they **do not** authenticate the website or a source.
- **SIA crossing:** `preview` leaves the record at HOLD; `admit --reviewed` uses SIA's existing immutable vault, with method `browser-observation`, rights `links-only` and evidence reference to the externally hosted URL. The local witness remains outside the SIA vault and must be backed up separately.
- **Privacy:** each capture uses an isolated browser context without imported cookies. Local snapshots may contain page-visible personal data; inspect and protect them. Captures are ignored by Git.

## Known limitations / next hardening gates

This is **not** yet a hardened sandbox for malicious domains. It validates hostname syntax but **does not independently pin or reject private resolved IP addresses**, nor protect fully against DNS rebinding. Only run against sites you trust and explicitly have permission to observe, on machines/networks appropriate to that risk. The minimal robots matcher supports the common groups / Allow / Disallow / wildcard / end-anchor subset, not the complete robots protocol. No retry policy, concurrency limits, crawl delay handling, authenticated sessions, screenshots, or storage retention controls exist.

The public site `https://example.org/` is a convenient smoke-test target when permitted, not a guarantee of availability or a substitute for testing on a site you own. No live Chromium navigation was performed during initial implementation; pure Node tests check contracts and transformation.

For restricted platforms (including **Suno**), use manual annotations or approved owner-export importers, preserving their real acquisition method. Don't mislabel automation as an API response.

## What FISHBONE deliberately does not do

It does not grant third-party rights, scrape restricted services, authenticate claims, prove media ownership, sign reLATTE receipts, or promote observations to public canon. It is a witness instrument feeding SIA, not SIA itself.

## FISHBONE-002 · Temporal witnesses and change reports

Every explicit `capture` invocation creates a **new timestamped, immutable evidence file**, even if the page content is unchanged. It then computes a local HOLD comparison against the immediately previous capture of that exact final URL (when timestamps establish an unambiguous order). It never schedules the next visit.

```bash
# Run the capture a second time later (for an eligible domain you control or may inspect):
npm run fishbone -- capture https://example.org/ --allow-domain example.org

# Compare any two saved captures without going online:
npm run fishbone -- compare .fishbone/captures/OLDER.json .fishbone/captures/NEWER.json

# Reconstruct the local chronological witness timeline without fetching the page:
npm run fishbone -- history https://example.org/ --allow-domain example.org
# Or select a specific directory:
npm run fishbone -- history https://example.org/ --allow-domain example.org --from .fishbone/captures
```

`compare` requires exactly the same **final URL**, two verified witness hashes, and strictly increasing capture timestamps. Its `fishbone/change/v1` report includes the before/after witness IDs, times, content hashes, a `CHANGED`/`UNCHANGED` verdict, title/status changes, first-difference text excerpts and sorted added/removed same-origin links. The change report receives a deterministic content hash and remains **HOLD**; it is not an authenticated archive or a finding about anything beyond the captured viewport/text/links.

`history` scans only hash-named JSON witnesses in a local capture directory (up to 256), validates every witness and filename, restricts the results to one exact final URL, orders them chronologically, and computes adjacent comparisons. Two different witnesses with the same timestamp remain separate with `AMBIGUOUS_SAME_TIMESTAMP`; they are **not** silently ordered into a causal chain. If a file is altered, history fails instead of hiding damage.

**Important:** the 12,000-character visible-text window and 24-link cap are deliberate. `UNCHANGED` means those bounded observed properties (plus page title and HTTP status) were identical across captures—not that the entire site, hidden content, media or external backlinks were unchanged. A changed excerpt is not a full textual diff. Browser HTML, artwork and audio are not preserved. The files are local and gitignored, so an operator must back them up to retain the timeline. The timestamps are local clock readings, not independently attested time.

**Current status:** no autonomous re-crawl, remote synchronization, change notifications, selective site monitoring or stable external provenance signatures. The operator supplies each permitted revisit. Production deployment still requires browser network isolation against private IP/DNS rebinding and fuller robots protocol behavior; see the earlier security limitations.
