# Tech Design — Kaffeelisten Phase 2

The Phase 2 technical design document, as a self-contained HTML file meant to be
printed to PDF and sent to the team and the campus stakeholders.

## File

- [`kaffeelisten-phase-2-tdd.html`](kaffeelisten-phase-2-tdd.html) — open in any
  browser. Everything is inlined (no fonts, CDN, scripts, or build step). It is a
  plain read-only document — no forms, no buttons.

## How to send it

1. Open the file in a browser.
2. **Ctrl/Cmd + P → Save as PDF.** The print stylesheet handles margins, page
   breaks, and keeps the amber/colour styling, so the PDF looks clean.
3. Send the PDF.

## What it covers

Summary, goals/non-goals, current system, the data-model changes
(`app_settings`, required member email), PIN management (storage, functions,
reset flow), recipients & CEO CC, per-member statements, the settings screen,
security, the migration/rollout order, failure modes, alternatives considered,
the decisions taken plus a few points to confirm, and a file change map.

Written to stay readable for non-technical stakeholders while remaining a real
technical design doc. It is the engineering companion to the higher-level plan in
[`../phase-2-production.md`](../phase-2-production.md).
