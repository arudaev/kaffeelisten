# claude.ai/design — prompts

> **Status (2026-07):** The original Phase 2 screens (Settings page, PIN flows,
> 6-digit login, member statement email) were designed via claude.ai/design and
> have **shipped** — see [`phase-2-design-brief.md`](phase-2-design-brief.md) for
> what was delivered. The historical prompt is kept at the bottom for reference.
> The app is now built directly in code against the semantic token system in
> [`../design-system.md`](../design-system.md); a claude.ai/design pass is optional.

---

## Current prompt — appearance & themable Settings (if you want a design pass)

Use this only if you want fresh visual exploration of the newer surfaces. The app
already implements all of it; this is for iterating on look, not net-new screens.

> Refine the **Kaffeelisten** admin **Settings → Erscheinungsbild** section and the
> **Report-Format** section. Kaffeelisten is a warm, minimal German PWA for the ITC1
> Deggendorf campus with a **full theming system**: semantic tokens, **Light / Dark /
> System** modes, and an admin **brand palette** (accent for light + dark). Design in
> BOTH light and dark.
>
> - **Erscheinungsbild card:** a segmented **Standard-Modus** control (Hell / Dunkel /
>   System); a **Marken-Palette** picker showing preset palettes (Standard-Amber,
>   ITC1, Wald) plus **3 custom palettes**, each previewed as light + dark accent
>   swatches;
>   when a custom palette is selected, an inline editor with a name and two colour
>   pickers (Akzent Hell / Akzent Dunkel). Selecting previews instantly.
> - **Report-Format card:** subject + intro fields for the company report and the
>   member statement, each with **placeholder chips** (`{monat}`, `{jahr}`, `{name}`,
>   `{gesamt}`) that insert at the caret and a live **"Beispiel:"** line; attachment
>   toggles (PDF / Excel); "Vorschau" buttons opening the rendered email.
> - **Automatischer Versand card:** an on/off toggle and a **calendar-style day grid**
>   (1–28 + "Letzter Tag des Monats").
>
> German copy, no emojis, money as `€ 4,80`. Use the semantic tokens (surfaces,
> borders, accent) so everything works in light and dark. Extend the existing
> component vocabulary (cards, labelled inputs, toggles, segmented controls, chips,
> preview cards) — don't reinvent it.

---

## Historical prompt (Phase 2 — already shipped)

> Design the **admin Settings page** for **Kaffeelisten**, a warm, minimal
> German-language PWA that replaces the paper coffee-consumption sheet at the ITC1
> Deggendorf startup campus. PIN-protected admin dashboard (sidebar: Übersicht,
> Einträge, Unternehmen, Mitarbeitende, Items, Einstellungen), calm stone neutrals
> with a single amber accent (`#D97706`), Inter type, 8px card radius.
>
> Settings cards: **Berichts-Empfänger** (removable chips + validated add; empty
> state), **Geschäftsführung (CEO)** (email + "in CC" toggle), **Mitglieder-
> Monatsbericht** (toggle), **Sicherheit — Admin-PIN** (6-stellig; ändern / zurücksetzen),
> **Bericht-Status** (read-only). Plus: PIN-ändern modal, 2-step PIN-reset flow,
> 6-digit login keypad with error-shake, and the per-member statement email.
