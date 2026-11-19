# SIA × HUMKIN MESH — stable references across distributed music storage

This adapter is an additive consumer of SIA's existing `sia/linkbank/v0` model. It does not replace or weaken the authoritative archive, source observations, existing packets, human review, or historical location records.

HUMKIN MESH inventories audio physically (SHA-256), identifies where replicas were last seen, and only allows permanent public references for explicitly **approved, published, enabled** radio tracks. HUMKIN's stable route `https://humkin.abundent.org/m/?id=<slug>` resolves that approved public audio destination dynamically; local recordings, stems, unapproved drafts and private filenames never appear on it.

The HUMKIN owner interface at `https://humkin.abundent.org/fm/mesh/` can export a minimal `humkin-mesh-sia-bridge.json` containing only reference ID, title, active/held status and the fixed public link. No recipient information, owner tokens, private paths, uploads, or rights assertion is included.

## Merge locally after review

Export the public link list from HUMKIN, inspect it, and run from the SIA repository root:

```bash
node scripts/import-humkin-mesh.mjs --file /path/to/humkin-mesh-sia-bridge.json --since 2026-11-19T00:00:00.000Z --reason "owner-reviewed published HUMKIN link"
```

This **previews only**, returning new and updated reference counts. If the contents are accurate and approved, repeat the same command with `--reviewed --write`. This edits only SIA's local `site/registry.json`; no Git commit, deployment, permission grant, public QR print or registration happens automatically. Dates should be the actual current owner-review UTC time, not copied from this example.

MESH link slugs are preserved verbatim as SIA music asset IDs. Existing SIA packets and immutable location-history entries are not discarded. Reimporting the same doorway is idempotent. A HELD source becomes a held SIA asset without providing an unrelated fallback. Changed URLs append a timestamped location history event only when operator-reviewed and later than the last entry.

The **first SIA packet pilot** is mirrored into HUMKIN's deployed website at `/p/?id=radio-surprise-001`. This is a HUMKIN-hosted mirror, not proof that `abundent.org/p/` is routed. Before printing permanent packets, separately check URL, browser response and playback on at least two devices and prove that repointing/holding preserves the original QR.

The two systems serve distinct purposes: MESH is a private physical index and music resolver; SIA is the public human-reference and packet-composition layer. Neither implies ownership or streaming rights from a mere file hash.
