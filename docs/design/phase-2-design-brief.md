# Phase 2 — Design delivery record

> **This was a design brief; it is now a record of what shipped.** The Phase 2
> screens were designed via claude.ai/design and implemented on `feat/admin-settings`.
> Tokens and component specs live in [`../design-system.md`](../design-system.md)
> (the source of truth); product/data details in [`../phase-2-production.md`](../phase-2-production.md).

## Product context

Kaffeelisten is a warm, minimal, German-first PWA that replaces the paper coffee
sheet at the ITC1 Deggendorf campus. Members log consumption with zero login; the
admin manages everything from a PIN-protected dashboard and receives a monthly
report. Visual language: calm neutral surfaces + a single warm accent, Inter type,
8px card radius, generous whitespace — professional but warm. No emojis. Money as
`€ 4,80`.

## What shipped

### Admin Settings page (`/admin` → Einstellungen)
A scrollable column of grouped cards:
- **Erscheinungsbild** — default mode (Hell/Dunkel/System) + brand-palette picker
  (3 presets + 3 custom palettes, each light + dark accent), instant preview.
- **Berichts-Empfänger** — recipient chips (validated add / remove); read-only
  "Server" chips for the `ADMIN_EMAIL` fallback; empty-state warning.
- **Geschäftsführung (CEO)** — CEO email + "in CC bei jedem Bericht" toggle.
- **Mitglieder-Monatsbericht** — per-member statement toggle.
- **Sicherheit — Admin-PIN** — 6-digit; "PIN ändern"; recovery is on the login page.
- **Bericht-Status** — read-only next-send / member-statement status.
- **Automatischer Versand** — on/off toggle + calendar-style day grid (1–28 / last day).
- **Berichts-Format** — company + member subject/intro with placeholder chips
  (`{monat}`, `{jahr}`, `{name}`, `{gesamt}`) and a live "Beispiel:" line; PDF/Excel
  attachment toggles; "Vorschau" opening the rendered email.
- A sticky **Speichern** bar; a success **Toast**.

### PIN & auth
- **6-digit PIN login** keypad (length-configurable) with error-shake.
- **PIN ändern** modal (aktuelle / neue / neue bestätigen — segmented digit inputs).
- **PIN reset** as a **lockout-gated recovery on the login page**: after 5 failed
  attempts (or via "PIN vergessen?") the admin enters their email; a one-time code is
  sent only to that admin (or the `ADMIN_RECOVERY_PIN` backstop) → set a new PIN → in.

### Emails
- **Company report** (admin + CEO cc) and **per-member statement** — responsive,
  table-based, accent header, itemized lines + total; German, informational, no CTA.
  The accent follows the brand palette (light variant).

### Theming (whole app + emails)
- Semantic CSS-variable token system → **Light / Dark / System**, per-device switch
  (member start + admin sidebar), admin-set default + brand palette. Logo and
  illustrations recolor. See [`../design-system.md`](../design-system.md).

## States
Populated + empty (recipients), inline email-validation error, success toast, PIN
error-shake, and both **light and dark** for every surface.

## Constraints
German copy; no emojis; `€ x,yz`; semantic tokens only (no literal `stone-*`/`amber-*`);
extend the existing component vocabulary (cards, labelled inputs, toggles, segmented
controls, chips, preview cards, modals, badges, toasts).
