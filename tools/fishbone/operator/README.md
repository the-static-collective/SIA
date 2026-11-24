# FISHBONE 003 · The Operator

A **free, local, human-approved browser operator** built on FISHBONE's Playwright foundation. It is designed for signed-in owner dashboards, beginning with Supabase and Cloudflare configuration for STATIC ID.

**Status:** opt-in local pilot. No production accounts were modified by creating these files. The operator is not a remote browser service, ChatGPT browser connector, complete TinyFish replacement, autonomous agent, or hardened browser sandbox.

## What it does

- Opens a *separate* persistent Microsoft Edge (Windows) or Playwright Chromium browser profile.
- You sign in **in the visible browser**. Cookies remain on your computer, in the ignored `.fishbone/operator-profiles/<name>/` directory. Do not commit, share, sync, or publicly back up that directory.
- Runs a bounded **declarative plan** that supports only `open`, `observe`, `click` (exact accessible role and name), and `manual` (pause for human action).
- Every scripted step requires local keyboard approval. There is no `--yes`, scheduler, background daemon, remote callback, arbitrary JS, CSS injection, script upload, credential fill, or hidden browser action.
- Planned navigation is limited to exact HTTPS hosts for Supabase, Cloudflare, and Fileport. All other scripted clicks and observations HOLD when the current page isn't on the named allowlist. Third-party resources and human authentication redirects are **not** network-isolated; this is an action gate, not a hardened browsing sandbox.
- Writes private **metadata-only** receipts under `.fishbone/operator-receipts/`: timestamp, plan SHA-256, action type, executed/skipped/HOLD, hostname. No pages, screenshots, OAuth tokens, form fields, queries, URL fragments, passwords, TOTP codes or API credentials.

## Windows · the easy route

Get the SIA repo to your computer: <https://github.com/the-static-collective/SIA>. Download ZIP from **Code → Download ZIP**, extract it, and open the folder.

1. Double-click `tools/fishbone/operator/windows/SETUP-WINDOWS.cmd` once. It checks for Node.js 22+ and asks before installing the local Playwright browser. If Node is missing, install Node.js first from its official site.
2. Double-click `tools/fishbone/operator/windows/OPEN-STATIC-ID.cmd`. Confirm, then sign into Supabase in the browser. Press Enter in the small terminal window to close the browser when finished. The signed-in profile persists.
3. Double-click `tools/fishbone/operator/windows/RUN-STATIC-ID.cmd`. It opens the same profile, reads `plans/static-id.json`, asks before each scripted action, and pauses for the manual OAuth/Cloudflare setup.
4. Verify the output in the browser yourself. The plan will **not** handle your passwords or copy OAuth secrets between sites automatically.

There are **no TinyFish credits** involved. Playwright and Chromium are open-source tools and use your machine's computing/network connection. Browser download size is nonzero, but no paid browser API account is needed.

## Terminal route (all operating systems)

From the SIA repo root, with Node.js 22+:

```bash
npm install --no-save playwright
npx playwright install chromium
npm test
node tools/fishbone/operator/cli.mjs open --site static-id --profile static-id
node tools/fishbone/operator/cli.mjs run tools/fishbone/operator/plans/static-id.json --profile static-id
```

Use `--site supabase`, `--site cloudflare`, or `--site static-id` for the manual browser launcher. Scripts cannot automatically interact outside the exact selected site list. No password or OAuth code ever belongs in JSON or ChatGPT messages.

## Planning another site

Plans are data, not executable JS. Example:

```json
{
  "schema": "fishbone/operator-plan/v1",
  "title": "Read this owner page",
  "site": "static-id",
  "steps": [
    { "type": "open", "url": "https://dash.cloudflare.com/" },
    { "type": "manual", "note": "Sign in normally in the visible browser" },
    { "type": "observe" },
    { "type": "click", "role": "button", "name": "Save" }
  ]
}
```

The actual button name may differ; if the control isn't present and unambiguous, the operator returns HOLD instead of guessing. A click can have real consequences, so confirm it visually first. Don't run unreviewed plans from outside sources.

## Why FISHBONE instead of a new repo?

FISHBONE-001/002 already handles public one-page observation, integrity and temporal receipts with explicit human review. This `operator/` subdirectory is a **separate credentialed workflow**, not a stealth bypass of the existing public-capture robots/rights contract. Private account pages are **never** sent through FISHBONE public witness admission.

## What we still need for a genuine conversation-to-browser agent

A separately authenticated **local MCP/HTTP bridge**, with explicit human consent per tool/action, trust boundaries, session isolation, and audit controls. Today's runner accepts a reviewed local JSON plan; it **does not** give a ChatGPT session live control of your browser. That upgrade should be designed and security-reviewed independently, not by exposing a local web server or profile directory to the internet.

## Important limits

- A site can still load resources or redirect across hosts in its normal login process; the operator only restricts **scripted** actions. It is not a network firewall.
- Profile cookies are effectively account access. Protect your Windows account. Delete `.fishbone/operator-profiles/static-id` to discard that local profile entirely if needed.
- An explicit operator click may submit a form, purchase something, or change a service. Every click requires local approval. Avoid using this prototype with unknown websites.
- A signed-in browser profile doesn't itself prove that an OAuth client is registered, Cloudflare secrets are valid, or a deployment succeeded.
- Do not automate restricted third-party platforms using this operator. Use it for accounts and environments you control.
