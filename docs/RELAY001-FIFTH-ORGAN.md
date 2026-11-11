# RELAY-001 — SIA as the fifth organ

**Status: proposed SIA review branch.** The original source, the signed reLATTE crossing, and human authority remain owned by their respective projects.

## From four completed organs to one navigable SIA history

```
user-provided song (source bytes unchanged)
    └─ LOADOUT / native BIND
        └─ GHoT / native media.probe + unsigned execution receipt
            └─ reLATTE / P-256 crossing → RECEIVE → receiver-local HOLD
                └─ webZ / read-only signature observation
                    └─ SIA / immutable observation + five linked archive entries
```

This uses **SIA's existing observation/v0 and vault**, plus the new `sia/relay-entry/v0` content-addressed record family. Each entry carries its own digest, exact input and evidence file hashes, explicit parent link, verification scope, authority boundary, and local disposition. The catalog shows them as **relay events**, never as additional songs. Importing twice creates no new entries. Mutation of stored records fails digest verification.

The current mission has 39 candidate projects. Exactly five are counted as executed/integrated; the other 34 remain invitations. SIA does **not** revise earlier project receipts or change the external Suno source.

## Real song run

Start from the **four-organ RELAY-001 ZIP** unpacked to `PACKET`. Obtain an authenticated copy of the webZ verifier source (for this experiment, webZ PR #62 `app/relay-proof.mjs`; it imports `app/model.mjs` beside it). Do not execute or import arbitrary code extracted from a supplied packet. The verifier must be source-reviewed and pinned separately.

```sh
node scripts/ingest-relay.mjs \
  --packet PACKET \
  --vault .sia \
  --webz-verifier /trusted/checked/webZ/app/relay-proof.mjs \
  --observed-at 2026-10-13T15:40:00Z \
  --out .sia/relay001

node scripts/render-relay.mjs .sia/relay001/relay-index.json .sia/relay001/relay.html
node src/cli.mjs catalog --vault .sia
```

SIA reads the original MP3 and verifies the bytes against the source manifest but **does not copy them into its vault**. It also checks cover/lyric derivative hashes, native LOADOUT/GHoT task linkage, actual signed reLATTE HOLD and webZ verifier result, and all event evidence filenames and SHA-256 addresses.

Source observation metadata is owner-noted and marked `links-only`; the Suno page was not independently authenticated. A successful verification of the reLATTE signature proves the keyed sender/receiver records are internally consistent, not that a human owns the signing key or source media rights.

The output is a navigable **standalone offline HTML** document. It contains no MP3, private keys, unsigned authority claims, media publication mechanism or remote storage access. The original, earlier evidence, and local vault remain separable.

## CI

`.github/workflows/relay001-fifth-organ.yml` pins source revisions from LOADOUT, GHoT, reLATTE and webZ. It generates a short **synthetic MP3** and executes all five project interfaces end-to-end, including a fresh SIA observation+event chain. The adversarial tests reject altered audio bytes, altered signed HOLD receipts, changed event content, missing ancestry and invented admission. No user music or private reLATTE key is uploaded.

## Honest limits

- Five **interfaces executed**, but no automatic permanent deployments, service-to-service authentication or canon selection.
- SIA verifies a *record chain*; it cannot certify truth or ownership of the underlying Suno asset.
- Source SHA-256 preserves local particular identity, not copyright or authorization.
- A reLATTE HOLD explicitly has **no semantic effect** and is not an ADMIT.
- SIA remains a separate local archive, not the receiving world's sovereignty.
- The next creative step may use SIA's existing `compose` recipe interface; AI proposals and publication require their own reviews.

