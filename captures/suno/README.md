# Suno albums — 2026-10-13 observed collection

The initial five files were **SIA source observations**, transcribed from the album collection on [The Static Collective's Suno profile](https://suno.com/@thestaticcollective) by a read-only TinyFish browser session on 2026-10-13.

| Observed album title | Track count | Source URL |
| --- | ---: | --- |
| Bloom | 7 | https://suno.com/album/c3def66e-4b17-42d2-9777-dbf289529547 |
| sunday jam | 7 | https://suno.com/album/19a953c0-d366-4402-ab98-1ffcaa8aa879 |
| another day | 6 | https://suno.com/album/fa866bbc-0282-4dee-9397-ebbdc1c01576 |
| a week together | 14 | https://suno.com/album/7c2ca64a-32ed-4477-a7cb-e00d1a14c9bf |
| midwestern post-internet ecclesiastical dadcore | 9 | https://suno.com/album/c504141a-0e4f-47cb-a4e8-89f242343200 |

**Initial snapshot scope:** 5 albums and 43 listed track positions. The observed collection had no visible pagination or load-more control. This supports *complete among albums shown on that profile at capture time*, not a claim about deleted, draft, private, or other unlisted releases.

**Initial evidence boundaries:** Titles, links and track counts were visible. Release dates, visibility flags, complete track lists, artwork ownership, audio files, and album descriptions were **not captured**. An absent field remains unknown; SIA does not manufacture it.

**Capture method:** `manual-transcription` means assistant-mediated transcription of the browser-observed public-facing page, not a direct Suno API response or native owner export. Rights declaration is `links-only`, not a license to copy audio.

## Sixth album — later observation (same day)

| Observed album title | Track count | Source URL |
| --- | ---: | --- |
| Blue Night Morning | 9 | https://suno.com/album/cab6b253-5f5b-4eb1-ae59-ac74c890b04d |

Later on **2026-10-13**, a read-only Suno album visit showed the nine-track sequence, individual displayed titles and durations, and creation date. Its exact album snapshot is in [`albums/blue-night-morning.observation.json`](albums/blue-night-morning.observation.json).

The earlier [five-song playlist](https://suno.com/playlist/e299cdb9-8d81-47a7-af94-3daf5042b647?sh=lkeMmJWbzdab5tn4) and the nine-song album are **different Suno entities**. We preserve their [observed overlap and ordering](blue-night-morning-history.md) as a separate history note, without claiming an authenticated conversion or production lineage.

**Current committed collection:** 6 album observations / 52 album track positions (these are not guaranteed to be 52 distinct recordings).

## Ingest all six into a local SIA vault

```bash
npm run ingest:suno
npm run sia -- catalog
```

To choose a different local vault, use `npm run ingest:suno -- --vault /path/to/vault`. Rerunning the import is idempotent; previously recorded, identical observations remain content-addressed. SIA vaults are git-ignored and local; the **committed observation JSON files** provide the portable archive seed.

All six albums have `artifact.kind = "album"`. Their title tokens can feed SIA's existing deterministic composition recipes, but a track count is not an audio analysis. New observations from later visits should be recorded as **new time-stamped snapshots**, not overwrite this historical capture.
