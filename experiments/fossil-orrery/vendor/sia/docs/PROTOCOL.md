# SIA 001 — Source, Matter, Metabolism, Descendant

Status: **Executable local protocol, unsigned.** Format names below are versioned and no remote adoption is implied.

## 1. Source boundaries

`SIA` is not a shadow owner of Suno, Bandcamp, YouTube, or any other host. The first vault stores **attributed, user-supplied metadata observations and pointers**, not copyrighted media or copied webpages. Importing an observation does not prove its correctness, license, or the operator's ownership. The chosen `rights` tag is a recorded *declaration*, not an authenticated permission grant. The consumer should still verify rights independently before using copyrighted inputs.

A source observation includes:

- `artifact`: an external stable identifier, kind, title, HTTPS URL and optional creator claim
- `capture`: source URL, evidence URL, UTC observation time, method (`manual-transcription`, `owner-export`, `api-response`), rights tag and notes
- `facts`: typed scalar key/value pairs with explicit basis (`source-visible`, `owner-export`, `owner-note`)
- `relations`: typed target links, their evidence URLs and basis
- `interpretations`: human/AI-author-labeled comments which are *never promoted to facts*

A **new snapshot** is a new object, not an update to an old observation. The current implementation deliberately has no retrieval agent; `api-response` is a metadata label for material someone supplies, not a claim that SIA fetched it.

## 2. Addressing and canonical data

- `sia/observation/v0` — validated capture normalized before hashing.
- `sia/recipe/v0` — deterministic transformation result.
- `sia/proposal/v0` — AI or human authored, untrusted creative candidate.
- `sia/review/v0` — deterministic local HOLD receipt; does not authorize publication.
- `sia/selection/v0` — explicit `--accept` local choice; does not sign or publish.
- `sia/derived/v0` — locally selected creative text, addressable and recyclable.

All objects use `sha256:<hex>` of `domain + NUL + canonical JSON body` for the applicable schema domain. Canonical JSON here is a **limited implementation** for integral numbers, strings, booleans, null, lists and key-sorted plain objects, not a claim of RFC 8785/JCS compliance. Content digests detect alterations, but **do not prove authenticity**. Implement real signatures, independent source verification, authenticated archival snapshots and trustworthy custody in *distinct future profiles*.

The local vault stores observations and locally harvested derived objects under `objects/`. It creates files exclusively (`wx`) and validates hashes on reads. Backup, encryption, synchronization, governance and retention are not implemented; a local file system cannot guarantee adversarial immutability.

## 3. Deterministic versus creative operations

For a fixed set of validated content IDs, mode, seed and engine version, SIA deterministically chooses:

1. Source ordering and retained relation/evidence links.
2. Source title and tagged-text tokens with back-references to the originating fields.
3. Four structural slots, each with a named function, focus token and supporting source ID.
4. Constraints, rights boundary, and the model-neutral AI brief.
5. A content-addressed recipe ID.

SIA currently does **not** analyze audio waveforms, infer BPM, extract images, run image or music models, or claim any access to raw media. Derived title tokens are not claims about actual lyrics, mood or sonic structure.

AI may fill the named slots in a separate proposal file. A validator checks envelope shape, recipe binding, exact slot sequence, bounded text, attribution of existing motifs and separation of newly invented motifs. This is **structural validation**, not fact checking, plagiarism detection, rights clearance or aesthetic judgment. A valid proposal produces a `HOLD` receipt. A local human can use `--accept` to select it as a derived creative text object.

**Reproducibility has two levels:** recipe generation is deterministic; preserving a proposal's exact bytes makes that proposal replayable. Running a generative model again with the same instructions is not guaranteed to produce identical content.

## 4. Metabolism loop and composition trace

```text
User-provided reference or export
    → normalized attributed observation
    → content-addressed local vault
    → deterministic motif / relation digestion
    → content-addressed recipe + AI prompt packet
    → externally authored AI/human proposal
    → structural review: HOLD
    → explicit human --accept
    → local derived particular + parent IDs
    ↘ fresh composition inputs (creative, not source-verified)
```

`source-claimed`, `locally-selected-proposal`, and `unsigned-local-selection` labels survive into later recipes. Provenance is not collapsed into one authoritative history.

## 5. Security and trust limits

- No network fetch, external embeds, AI calls, auth, telemetry, shell execution of generated content, or remote write.
- Inputs are bounded; only HTTPS source/evidence/target URLs without embedded credentials are accepted.
- Parser accepts a limited set of known schemas and fields, and refuses unrecognized facts, invalid rights, unsupported labels, malformed identifiers and wrong recipe IDs.
- Snapshots are locally content-addressed but their source provenance is still **asserted by the operator**.
- Recipe IDs can be calculated by anyone; never treat a hash as a signature.
- Imported AI proposals are untrusted strings; CLI returns JSON, not executed code.
- Inputs containing private or sensitive personal details should not be publicly committed. Local vaults are ignored by default but **not encrypted**.

## 6. Interoperability: possible future adapters

A future adapter can translate observations into webZ discovery particulars, GHoT work offers or reLATTE crossing envelopes. Each must preserve ownership, authority and transport differences. SIA's digest is not a portable authority grant; **a recipient must decide whether to accept or HOLD any material**.
