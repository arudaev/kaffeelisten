# claude.ai/design — paste-ready prompt

Paste the prompt below into claude.ai/design. Then paste the contents of
[`phase-2-design-brief.md`](phase-2-design-brief.md) underneath it (or attach the
file) so it has the full brand + screen spec.

---

## Short prompt

> Design the **admin Settings page** for **Kaffeelisten**, a warm, minimal
> German-language PWA that replaces the paper coffee-consumption sheet at the ITC1
> Deggendorf startup campus. It has a PIN-protected admin dashboard (left sidebar:
> Übersicht, Einträge, Unternehmen, Mitarbeitende, Items, Einstellungen) styled in
> calm stone neutrals with a single amber accent (`#D97706`), Inter type, 8px card
> radius, generous whitespace — professional but warm. Match that system exactly.
>
> **Primary screen — Settings page** ("Einstellungen"), a scrollable column of
> grouped setting cards:
> 1. **Berichts-Empfänger** — manage the list of email addresses that receive the
>    monthly report (removable chips + add-with-validation; empty state).
> 2. **Geschäftsführung (CEO)** — a CEO email field + a toggle "in CC bei jedem
>    Bericht" (on by default).
> 3. **Mitglieder-Monatsbericht** — a toggle so each member gets their own itemized
>    statement at month-end.
> 4. **Sicherheit — Admin-PIN** — shows "6-stellig", a "PIN ändern" button and a
>    "PIN zurücksetzen" link.
> 5. **Bericht-Status** — read-only: last report sent / next automatic send.
> Show the populated state, the recipients empty state, an inline email-validation
> error, and a success toast.
>
> **Then design these supporting frames:**
> - **PIN ändern** modal (aktuelle / neue / neue bestätigen — 6-digit).
> - **PIN zurücksetzen** flow (2 steps: send one-time code to recipients →
>   enter code + set new PIN; plus a "Notfall-Code" escape hatch).
> - **6-stelliger PIN-Login** keypad (update of the current 4-dot keypad to 6 dots;
>   include the error-shake state).
> - **Per-member monthly statement email** (responsive, table-based, amber header,
>   itemized lines + total; German; informational, no CTA).
>
> German copy throughout, no emojis, money as `€ 4,80`. Keep everything within the
> existing component vocabulary (cards, labelled inputs, toggles, modals, badges,
> toasts) — extend the language, don't reinvent it. Full spec follows below.

---

## Tips for driving the tool

- Generate the **Settings page first** and iterate on it before asking for the
  supporting frames — it's the screen we most need right.
- If it drifts cold/generic, remind it: "warmer, more whitespace, amber used
  sparingly as a single accent, stone-neutral, Bavarian-campus friendly."
- Ask for a **desktop** frame first, then a **tablet** variant of the Settings page.
- Hand the exported frames / redlines back here and we'll wire them to the
  `app_settings` table and the Phase 2 API endpoints.
