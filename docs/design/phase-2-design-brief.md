# Phase 2 — Design Brief (hand-off for claude.ai/design)

This brief describes the screens Kaffeelisten needs designed for Phase 2. Paste
the short prompt in [`claude-design-prompt.md`](claude-design-prompt.md) into
claude.ai/design and attach / paste this brief for the full context.

The single most important screen is the **Admin Settings page** (§3.1). The rest
(PIN flows, 6-digit login, member statement email) round out the phase.

---

## 1. Product context (one paragraph)

Kaffeelisten is a warm, minimal PWA that replaces the paper coffee-consumption
sheet at the ITC1 Deggendorf startup campus. Campus members tap what they consumed
on a wall-mounted iPad; at month-end the admin (and the campus CEO) receive a
formatted email report per company, and — new in Phase 2 — each member receives
their own itemized statement. There is a PIN-protected admin dashboard where the
admin manages companies, members, items, and now **settings**. German-first UI, no
emojis, professional but warm (Bavarian Wald / coffee character).

## 2. Design system (match this exactly)

**Feel:** warm, minimal, grounded, trustworthy. Lots of whitespace, calm stone
neutrals, a single amber accent used sparingly. Not flashy, not corporate-cold.

**Colors**
- Backgrounds: page `#FAFAF9` (stone-50), subtle `#F5F5F4` (stone-100), card `#FFFFFF`
- Borders/dividers: `#E7E5E4` (stone-200), strong `#A8A29E` (stone-400)
- Text: primary `#1C1917` (stone-900), secondary `#57534E` (stone-600), muted `#A8A29E`
- Brand accent: `#D97706` (amber-600), hover `#B45309` (amber-700), subtle bg `#FFFBEB` (amber-50)
- Success `#16A34A`, error/destructive `#DC2626`, info/links `#2563EB`

**Type:** Inter (fallback system-ui). Page heading 24px/700, section heading 18–20px/600,
body 16px/400, labels/secondary 14px/500, captions 12px. 1.5 line-height for body.

**Radius:** inputs/badges `rounded` (4px), buttons/small cards `rounded-md` (6px),
cards `rounded-lg` (8px), modals `rounded-2xl` (16px). **Shadows:** `sm` cards,
`lg` modals. **Spacing:** 4px grid; 32px desktop page padding, 24px section gaps.

**Existing admin components to reuse (keep visually consistent):** left **Sidebar**
nav (Übersicht, Einträge, Unternehmen, Mitarbeitende, Items, **Einstellungen**),
a **Topbar** with page title + eyebrow + right-aligned actions, **cards**,
**DataTable**, **Modal**, primary/secondary/ghost **buttons**, **Badge**
(active/inactive), labelled **text/select inputs** with a required asterisk,
an on/off **Toggle**, and a bottom-right **Toast**. The Settings page lives behind
the existing "Einstellungen" sidebar item (today it's an empty placeholder).

## 3. Screens to design

### 3.1 Admin Settings page  ← primary deliverable

Route: `/admin` → sidebar "Einstellungen". Desktop-first (admin uses a laptop),
but must hold up on tablet. Standard admin chrome: Sidebar + Topbar (title
"Einstellungen"). Body is a single scrollable column of grouped **setting cards**,
each with a heading, a one-line description, the control(s), and its own save
affordance (or a single sticky "Speichern" — your call; show the pattern).

Cards, in order:

1. **Berichts-Empfänger** (report recipients) — *this replaces the old
   environment-variable configuration.*
   - Purpose text: "Diese Adressen erhalten den monatlichen Bericht."
   - A list of email addresses shown as removable **chips/rows** (each with a
     remove "×"). An input + "Hinzufügen" button to add a new address (validate
     email shape, show inline error on bad input).
   - Empty state: "Noch keine Empfänger — der Bericht wird sonst an niemanden
     gesendet." (mildly cautionary, amber, not alarming).
   - Seed example values to show: 3–4 addresses.

2. **Geschäftsführung (CEO)** — CC on every report.
   - A single email input labelled "CEO-E-Mail (in Kopie bei jedem Bericht)".
   - A **Toggle**: "Geschäftsführung bei jedem Bericht in CC" (on by default).
   - Helper text explaining the CEO is CC'd automatically on both the manual and
     the automatic month-end send.

3. **Mitglieder-Monatsbericht** (per-member statements) — feature toggle.
   - **Toggle**: "Jede Person erhält am Monatsende ihre eigene Aufstellung"
     (on by default).
   - Helper text: "Zusätzlich zum Firmenbericht. Nur Personen mit hinterlegter
     Arbeits-E-Mail werden angeschrieben."

4. **Sicherheit — Admin-PIN**
   - Read-only line: "PIN-Länge: 6-stellig · zuletzt geändert am …".
   - Primary-ish button "PIN ändern" → opens the PIN-change modal (§3.2).
   - Text button "PIN zurücksetzen" → opens the reset flow (§3.3).

5. **Bericht-Status** (read-only info card)
   - "Letzter Bericht gesendet: Juni 2026" and "Nächster automatischer Versand:
     31. Juli 2026". Small, muted, informational.

Show these states for the page: default (populated), the recipients empty state,
an inline validation error on the add-email input, and a success **Toast**
("Einstellungen gespeichert.").

### 3.2 PIN ändern (modal)

A **Modal** (rounded-2xl, shadow-lg) over the Settings page. Three 6-digit inputs
stacked: "Aktuelle PIN", "Neue PIN", "Neue PIN bestätigen". Use a segmented
6-cell / masked style consistent with the login keypad look (dots or cells), or
plain masked inputs — show your recommendation. Validation: new = confirm, 6
digits, not equal to current. Primary "Speichern", secondary "Abbrechen". Error
state (e.g. "Aktuelle PIN ist falsch") and success toast.

### 3.3 PIN zurücksetzen (flow, 2 steps)

For a locked-out admin. Step 1: "PIN zurücksetzen" — explanatory text ("Wir senden
einen einmaligen Code an die hinterlegten Empfänger."), a "Code senden" button,
and a smaller escape hatch: "Ich habe einen Notfall-Code" (the env recovery PIN).
Step 2: enter the 6-digit code (or recovery code) + set a new 6-digit PIN twice.
Design both steps; can be a modal or a dedicated centered card like the login.

### 3.4 6-stelliger PIN-Login (update of existing keypad)

The existing login is a centered numeric keypad with **4** dots; Phase 2 makes it
**6**. Redraw the centered keypad screen with **6** dot indicators, the numeric
0–9 grid, "Löschen" and "OK", the "Kaffeelisten / Administration / PIN eingeben"
heading, and the error shake state (dots turn red). stone-50 background, amber "OK".

### 3.5 Per-member monthly statement (HTML email)

A responsive email (≤600px, table-based, works in Outlook). Warm amber header band
with the Kaffeelisten wordmark + small coffee-cup mark, "Deine Kaffeeliste — Juni
2026", a friendly one-line intro, an **itemized table** (Datum · Artikel · Menge ·
Einzelpreis · Betrag) grouped by nothing fancier than date order, a bold **total**
row, and a calm footer ("ITC1 Deggendorf · Diese Aufstellung dient deiner
Übersicht."). Mirror the tone/%colors of the existing company report email (amber
`#D97706` header, stone body, white card on `#FAFAF9`). No login/CTA — purely
informational. Show it with ~5 example line items and a total.

## 4. Constraints & notes

- German copy throughout (the strings above are usable as-is). No emojis.
- Money format: `€ 4,80` (comma decimal, German).
- Everything must be reachable/operable with the existing component vocabulary —
  don't introduce a new visual language, extend the current one.
- Deliver: the Settings page as the hero, then the modals/flows/email as
  supporting frames. Light + a11y-reasonable contrast; no dark mode needed.

## 5. What we'll do with the output

These designs become the Phase 2 implementation: a real Settings page backed by
`GET/POST /api/admin/settings`, the PIN endpoints (`change-pin`,
`request-pin-reset`, `reset-pin`), the 6-digit keypad, and the member-statement
email template. See [`../phase-2-production.md`](../phase-2-production.md) for the
technical plan and data model behind each screen.
