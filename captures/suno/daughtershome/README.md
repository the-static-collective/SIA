# Daughter's Home / Hailey Lu — owner-directed public album captures

**Evidence date:** October 21, 2026 (United States); UTC observation timestamps in JSON. These records preserve what two individually supplied public Suno album share pages **displayed**, not independently authenticated publication records.

| Album | Public page | Displayed description | Tracks | Sum of displayed durations |
| --- | --- | --- | ---: | ---: |
| TESTIMONY S00E07 | https://suno.com/s/Fi6dhIQQSiRJMhxj | end of pt. 0 | 7 | 26:17 |
| TESTIMONY S00E06 | https://suno.com/s/dsog00YrzRFX08SW | another beginning | 6 | 21:34 |

The saved page readings resolved these album IDs:

- S00E07: `425951a5-71f1-498c-9326-81a269649926`
- S00E06: `10648f9e-af80-44d5-950b-1b601d5aa596`

Each `testimony-*-public-snapshot.json` holds the observed title, ordered tracks, visible durations, Suno model labels and the seven/six ordered song links. Track URLs are paired to track titles by matching returned link order against returned displayed song order; **individual tracks have not been opened to validate pairing**. Neither album's audio was retrieved.

The `../albums/daughtershome-testimony-s00e0*.observation.json` files are schema-valid `sia/observation/v0` input. The method is `manual-transcription` (read-only page extraction mediated by an assistant), **not** FISHBONE automated crawling, official Suno API, or owner export. Rights: `links-only`.

## An important chronology distinction

Both album pages display **Released October 21, 2026**. Separately, the owner reports **S00E07 was released before S00E06**, deliberately offering two experienced beginnings and endings, with **S00E06 starting another subchapter**. An album release *day* cannot establish intra-day sequence; the chronology and artistic rationale remain owner-reported and should not be replaced with numerical episode order.

The [owner-notes JSON](owner-album-inventory-2026-10-21.json) also preserves the seven visible album titles from an owner-supplied screenshot and the stated upcoming release plan (Season 2 and S03E01 ready; Season 1 afterward). The screenshot image itself is **not** committed. Those other albums' missing URLs and track lists remain unknown.

## Reproduce in a local SIA vault

```bash
npm run ingest:suno
npm run sia -- catalog
npm test
```

The existing `ingest:suno` command imports `*.observation.json` from `captures/suno/albums/`, including these two, and is idempotent. This commits evidence records only: no media or hidden data, no assumption of commercial rights, no automated access to Suno, and no canonical publication authority.

## Third owner-directed public album: AUTO S01E01

A single explicitly supplied public album share link was read without crawling: https://suno.com/s/avMfwaqO6G2wTWWh

| Album | Suno album ID | Displayed release day | Tracks | Total displayed time |
| --- | --- | --- | ---: | ---: |
| AUTO S01E01 | `cf6d9c0b-3a1b-4d64-8793-74de8fbf0138` | 2026-10-21 | 8 | 28:49 |

No album description was shown; the field remains **unknown** rather than invented. All eight tracks displayed Suno model **V5.5** and no COVER badges. Preserve the ordered track names, durations and associated ordered song links in [the public snapshot](auto-s01e01-public-snapshot.json) and [its schema-valid SIA observation](../albums/daughtershome-auto-s01e01.observation.json).

**Owner-reported total:** On October 21, 2026 the creator said their Suno collection held **21 albums**. See [the dated owner count](owner-album-count-2026-10-21.json). This is **not** a claim that this repository independently verified all 21 records. The SIA collection at this stage has **nine album observations across two profiles**, only **three** of which are the separately visited Daughter's Home albums. Do not merge the two totals or interpret the unretrieved 18 as missing/deleted.

The only evidence of the new album is metadata accessible at the single supplied URL. The song URLs were aligned with displayed song titles by link sequence, but the individual song pages weren't opened or verified. This is source-labeled archival metadata, not a claim of official Suno API access.
