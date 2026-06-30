# Claude Design Prompts — Kaffeelisten

Use these prompts when generating the Kaffeelisten UI with Claude Design. Read `docs/design-foundation.md` and `docs/design-system.md` before any session.

---

## Design system setup

```
Set up a design system for Kaffeelisten — a digital coffee consumption logger
for ITC1 Deggendorf campus.

Read the attached design-foundation.md and design-system.md.

The system has two distinct surfaces:
1. Member-facing flow (wall-mounted iPad, zero friction, large tap targets, 
   completed in under 15 seconds)
2. Admin panel (professional internal tool, data tables, report triggers)

Visual direction: warm, minimal, readable, professionally grounded. Bavarian
Wald / ITC1 atmosphere as abstract detail — not decoration. Coffee motifs as
the signature playful element. One-line SVG illustrations.

All UI copy in German. No emojis. No lorem ipsum. Use realistic German copy
per docs/design-foundation.md.
```

---

## Member flow — full screen set

```
Generate the complete member-facing flow for Kaffeelisten:

1. Home / company select — large company tiles on a clean background
2. Member select — filtered by selected company, same large tile style
3. Item select — grid of item cards (name, unit label, price, custom icon)
4. Confirmation — review screen before submit
5. Success — "Gespeichert." confirmation with coffee icon, auto-reset in 3s
6. Error state — failed submission with retry option

Design constraints:
- Minimum 44x44px tap targets on every interactive element
- All text minimum text-lg (18px) for wall readability
- Layout works on iPad 10-inch landscape (1024x768)
- Warm stone/amber color palette per design-system.md
- Custom coffee SVG icons for item categories
- German copy throughout

The flow must feel like it can be completed in 15 seconds without reading 
instructions.
```

---

## Admin panel — full screen set

```
Generate the complete admin panel for Kaffeelisten:

1. PIN entry — numeric keypad, minimal, server-validated
2. Dashboard — month-to-date summary cards (total transactions, total value, 
   top company, top item), quick actions
3. Transaction log — full table (date, member, company, item, quantity), 
   sortable columns, search, filter by company
4. Company summary — aggregated totals per company, current month
5. Send report modal — confirm before triggering email + archive + reset,
   clear warning about database reset
6. Manage companies — CRUD list with active/inactive status
7. Manage members — CRUD list linked to company, active/inactive
8. Manage items — CRUD list with price, unit label, category, active/inactive

Design constraints:
- Professional internal tool aesthetic — not a startup marketing page
- Sidebar navigation, standard admin layout
- Warm stone neutral palette, amber accents for CTAs
- Destructive actions (reset, delete) clearly marked in red
- German copy throughout
- Responsive down to tablet (768px) — sidebar collapses to top nav
```

---

## Landing page (pitch surface)

```
Generate a landing page for Kaffeelisten for the B4Y3RW4LD Hackathon pitch.

Sections:
1. Hero — product name, one-sentence problem statement, one-sentence solution, 
   primary CTA "Demo ansehen", custom one-line SVG illustration
2. Das Problem — the paper-on-wall tracking problem at ITC1, 2-3 bullet points
3. Die Lösung — how Kaffeelisten works, 3-step visual flow
4. Für wen — campus members (fast log) and campus admin (monthly report)
5. Technik — Vercel, Supabase, Resend — kostenlos, wartungsarm, sicher
6. Zukunft — what comes after the hackathon (Phase 1–3 roadmap teaser)
7. Kontakt / Support CTA — "Das Projekt weiterentwickeln" backing/support section
8. Footer

Tone: confident, warm, professional. Not startup-hype. Not tourist Bavaria.
German-first. One-line SVG illustrations. Coffee motifs. B4Y3RW4LD energy.
```

---

## Icon and SVG set

```
Create a custom icon and one-line SVG illustration set for Kaffeelisten.

Required icons (24x24, 1.5px stroke):
- Coffee: espresso cup, cappuccino cup, takeaway cup, coffee beans, steam
- Actions: confirm/check, undo, send, download CSV, add (+), edit (pencil), 
  delete (trash), filter, search
- Navigation: home, admin panel, transaction log, settings, report, back arrow
- Status: success (checkmark circle), error (X circle), warning (triangle)
- Item categories: hot drink, cold drink, snack, food, other

Required spot illustrations (landing + empty states):
- Landing hero: coffee cup with ITC1/campus atmosphere, one-line style
- Member flow success: simple coffee cup with steam, celebratory but minimal
- Admin empty state: empty table / clipboard, minimal
- Error state: broken connection or warning, minimal

Rules:
- Consistent 1.5px stroke weight throughout
- Minimal filled areas — line art discipline
- No emoji-like expressions
- Bavarian Wald atmosphere in 1-2 abstract motifs for landing/empty states
- All SVGs clean and exportable as individual files
```

---

## Accessibility and responsive review

```
Review the Kaffeelisten prototype for accessibility and responsiveness.

Member flow checks:
- All tap targets minimum 44x44px
- Color contrast minimum 4.5:1 for all text on backgrounds
- Selected state not conveyed by color alone (add checkmark or border)
- Focus states visible on all interactive elements
- Text minimum 18px (text-lg) throughout
- No horizontal scroll on iPad 10-inch landscape (1024px)

Admin panel checks:
- Table rows readable at 14px (text-sm)
- Filter and sort controls accessible by keyboard
- Destructive action (send report + reset) requires confirmation step
- Error messages clearly associated with their inputs
- Sidebar navigation keyboard-accessible

Apply all necessary fixes and document any compromises.
```

---

## Component extraction

```
Extract the Kaffeelisten design system into a reusable component library.

For each component, specify:
- Component name
- Props/variants
- Default state
- Hover/focus/active states
- Error/empty/loading state (where applicable)
- Responsive behavior

Components to extract:
- CompanyTile
- MemberTile
- ItemCard
- QuantityControl
- ConfirmationRow
- PrimaryButton / SecondaryButton / DestructiveButton
- PINKeypad
- AdminTable (with sort, filter)
- SummaryCard
- StatusBadge
- Modal
- CRUDForm
- EmptyState
- LoadingState
- SuccessState

Format output as a component spec sheet suitable for handoff to a React developer.
```
