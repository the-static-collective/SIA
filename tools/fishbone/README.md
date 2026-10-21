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
