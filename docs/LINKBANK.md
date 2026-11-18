# SIA LINKBANK 001 × LITTLE PACKET

Status: **review-branch implementation; not a hosted resolver, deployed QR service, or field proof**.

The SIA archive remains a local-first source-observation and composition engine. This is a separate public-reference profile with owner-reviewed mutable pointers. Historical locations remain in order; packet identities do not change when pointers move. Git commits preserve changes. It does not assert that a content hash proves rights or that a domain will exist forever.

## Components

- src/linkbank.mjs: validation, lookup, controlled URL revisions and packet composition, no network.
- site/registry.json: public, owner-reviewed references.
- site/p/index.html: accessible, no-autoplay gift page; fetches registry, never auto-redirects.
- scripts/linkbank.mjs: inspect, resolve, preview packet additions and pointer changes; --write edits local JSON only.
- scripts/print-packets.py: six-up printable HTML with real QR matrices (Python qrcode 8.2).
- tests/linkbank.test.mjs: stable IDs and refusal tests.

## Try without publishing

Run npm test, then:

    node scripts/linkbank.mjs validate
    node scripts/linkbank.mjs resolve radio-surprise-001
    python3 -m pip install "qrcode==8.2"
    python3 scripts/print-packets.py --id radio-surprise-001 --base-url https://example.org/p/ --count 6 --out /tmp/packet-preview.html

example.org is a DRY RUN, never a distributable QR. Open the generated HTML locally to inspect print layout.

Test the local resolver:

    python3 -m http.server 8765 --directory site

Visit http://localhost:8765/p/?id=radio-surprise-001

## Owner and durable URL requirement

Before printing for others, choose and verify an operator-controlled HTTPS route, for example https://abundent.org/p/ (proposed only; NOT deployed). Host site/ at that route and test on separate devices. Do NOT print speculative Abundent URLs. Each actual QR target is BASE-URL?id=PACKET-ID.

Moving a hostname later does NOT automatically preserve an old QR. Print only when domain renewal, route hosting, backup and migration redirect ownership are clear. A previous domain must keep working or redirect indefinitely for its printed cards to survive.

## Editing with owner review

Preview a new packet using existing approved public assets:

    node scripts/linkbank.mjs add winter-gift-001 "A little warmth" humkin-surprise

Preview a new location for an asset (must be a DIFFERENT verified HTTPS URL and later timestamp):

    node scripts/linkbank.mjs repoint humkin-surprise https://example.org/new-song 2026-11-19T00:00:00.000Z "reviewed new location"

Use --write only for an intentionally authorized local change. A file edit is not a live deployment. WITNESS media must be approved and genuinely hosted before adding its public URL. No live WITNESS source is invented.

## Privacy, authority and honesty

Public registry is public: no recipient names, private notes, unreleased recordings, tokens, signed URLs, private consent records or household details. A personalized recipient message belongs only on the local printable sheet, not in the public registry. Do not treat unique packet IDs as tracking codes.

SIA can reference HUMKIN and WITNESS but does not own their permissions or media. An active link is an operator decision to display the URL, not independent rights authentication. Missing or held assets show unavailable states instead of unrelated substitutions. The linkbank is not a media backup, broadcasting service, proof of delivery, or autonomous distribution agent.

No analytics, accounts, autoplay, payment or publication occurs on QR scan. Normal hosting may observe network requests. Rights and human permissions remain source-owned.

## Field test

1. Run tests, generate a six-up preview, scan sample URLs only within a working test deployment.
2. Authorize one stable HTTPS route and verify the exact public path before printing final cards.
3. Publish only reviewed public items, and measure link opens and actual playback manually on two devices.
4. Repoint the asset with a verified new URL while the packet ID stays fixed; scan the same QR again.
5. Record before/after URL, registry Git SHA, screenshots or independent user observations.

This is SIA's first public-link consumer profile, not a new universal service or a claim of archival authority.
