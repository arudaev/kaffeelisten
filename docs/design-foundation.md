# Design Foundation — Kaffeelisten

Creative brief for the Kaffeelisten UI/UX system.

Use this as the single source of truth for all design decisions, Claude Design sessions, and component work.

---

## Product identity

**What it is:** A digital coffee and snack consumption logger for ITC1 Deggendorf campus.  
**Who uses it:** Campus coworkers (quick, frictionless log), campus administrator (monthly report).  
**Where it lives:** Mounted iPad on the wall + any browser (PWA).  
**When it's used:** Multiple times per day, briefly.

The interface must feel like a calm, professional tool — not a startup demo, not a kiosk machine, not a generic dashboard.

---

## Visual direction

**Mood:** Warm, minimal, readable, grounded, professional. Lightly hacker-inspired through precision and rhythm, not through terminal aesthetics.

**Regional grounding:** Bavarian Wald, Bavaria, Deggendorf, ITC1, THD-adjacent academic-tech culture. Abstract and atmospheric — not tourist clichés.

**Signature visual language:** one-line SVG illustrations, custom icons, coffee motifs as playful detail.

**Tone:** Professional, direct, warm, concise. No emojis. German-first copy.

---

## Reference direction

Use as inspiration only. Do not copy.

| Reference | Learn from | Do not copy |
|---|---|---|
| Tomorrow Bank | Calm whitespace, editorial structure, product trust, human warmth | Exact layouts, banking semantics |
| B4Y3RW4LD event site | Coded name energy, coffee/maker motifs, black line drawings | Event schedule structure, organizer content |
| Bavarian Wald | Grounded atmosphere, forest depth, local warmth | Tourist clichés, rustic textures |
| THD / ITC1 Deggendorf | Academic-tech credibility, startup ecosystem energy | Official logos, protected assets |

---

## Art direction

The visual system should combine:

- High readability at a glance — critical for a wall-mounted iPad in a busy kitchen
- Generous whitespace and clear visual hierarchy
- Strong typography, disciplined CTAs
- One-line vector art and custom SVG icons
- Coffee as a playful recurring motif
- Bavarian Wald / Deggendorf atmosphere in color and illustration

Avoid:
- Emojis anywhere in the UI
- Cyberpunk or terminal aesthetics
- Generic SaaS gradients
- Stock illustration styles
- Overly rustic or regional decoration that reduces clarity
- Clutter — every element on screen must earn its place

---

## UI/UX principles

**1. Speed above all for the member flow**  
Every tap target must be large and obvious. The member should not need to think. The interface is used in passing, often while holding a cup.

**2. Calm, not sparse**  
Whitespace is intentional. The admin panel should feel professional and organized, not austere.

**3. Playful through craft**  
Personality comes from coffee icons, one-line illustrations, and microcopy rhythm — not from gimmicks.

**4. Regional without costume**  
B4Y3RW4LD / Bavarian Wald cues should be abstract and contemporary. Atmosphere over souvenir.

**5. Accessible by default**  
Strong contrast, large touch targets (minimum 44x44px), visible focus states, no information conveyed by color alone. The wall iPad may be used at a distance.

**6. German-first**  
All member-facing and admin-facing copy is German. English only in code comments and dev-facing labels.

---

## Screen inventory

### Member-facing (primary surface)

| Screen | Description |
|---|---|
| Home / company select | Large company tiles, clean list |
| Member select | Member list filtered by selected company |
| Item select | Available items grid with name and price |
| Confirmation | Review before submit |
| Success | Logged confirmation, auto-reset in 3s |

### Admin-facing

| Screen | Description |
|---|---|
| PIN entry | Simple keypad, server-validated |
| Dashboard | Month-to-date summary: total transactions, top companies, top items |
| Transaction log | Full table: date, member, company, item, quantity — filterable |
| Company summary | Aggregated totals per company for the current month |
| Send report modal | Confirm before triggering email + archive + reset |
| Manage companies | CRUD list |
| Manage members | CRUD list, linked to company |
| Manage items | CRUD list with price and unit label |

### Shared / pitch surface

| Screen | Description |
|---|---|
| Landing page | Hackathon pitch surface. German copy. Explains the problem, the solution, the tech. |
| What / why / how sections | Editorial explainer for the pitch |
| Support / future development CTA | Path for continued development after the hackathon |

---

## Visual system requirements

Define the following design tokens and apply them through the Tailwind config:

**Color roles:**
- Background (primary, secondary, subtle)
- Surface (card, elevated)
- Border (default, strong, interactive)
- Text (primary, secondary, muted, inverse)
- Brand / accent (coffee-warm, regional)
- Semantic (success, warning, error, info)
- Interactive states (hover, active, focus, disabled)

**Typography:**
- Scale: xs / sm / base / lg / xl / 2xl / 3xl / 4xl
- Weights: regular (400), medium (500), semibold (600), bold (700)
- Use a clean, readable sans-serif — Inter or Geist preferred
- Member flow: large text for wall readability (minimum 18px body)
- Admin panel: standard product text sizes

**Spacing:** 4px base grid, standard Tailwind scale.

**Radius:** Soft but not pill-shaped. 8–12px for cards, 6–8px for buttons, 4px for inputs.

**Icons:** Custom one-line SVG style. Consistent stroke weight (1.5px). No fill except for defined accent cases.

**Illustration:** Spot SVGs for landing, empty states, and success screen. One-line vector discipline.

---

## Component requirements

Member flow:
- Company tile (large tap target, company name, optional logo placeholder)
- Member tile (large tap target, name)
- Item card (name, unit label, price, tap to select)
- Quantity control (+ / - buttons)
- Confirmation row (item, quantity, price)
- Primary action button (large, full-width on mobile)
- Success animation / confirmation state

Admin panel:
- Data table (sortable columns, row hover, empty state)
- Filter bar (search input + dropdown filters)
- Summary card (metric, label, trend indicator)
- Modal / dialog (confirm destructive actions)
- CRUD form (add/edit companies, members, items)
- PIN keypad
- Status badge (active / inactive)
- Month selector

Shared:
- Navigation (admin sidebar)
- Alert / notice (success, warning, error)
- Loading state
- Empty state (with illustration)
- Error state

---

## Icon and SVG requirements

Create a minimal custom SVG set:

- Coffee motifs: espresso cup, cappuccino, takeaway cup, coffee beans, steam
- Navigation: home, log, admin, settings, report, back
- Actions: confirm, undo, send, download, add, edit, delete, filter
- Status: success (checkmark), error, warning, info
- Item categories: drink, food, snack
- Bavarian Wald / campus motifs: abstract spot illustrations for landing and empty states

Rules:
- Consistent 1.5px stroke weight
- 24x24px base grid
- Readable at 16px (small badge use)
- No emoji-like faces or novelty expressions
- Filled accent only where the design system explicitly defines it

---

## Copy direction

**Member flow (German):**
- "Wer bist du?" → company select heading
- "Was hast du genommen?" → item select heading
- "Bestätigen" → confirm button
- "Gespeichert." → success message
- Tone: direct, friendly, zero friction

**Admin panel (German):**
- "Monatsübersicht" → dashboard heading
- "Bericht senden" → send report button
- "Alle Einträge" → transaction log heading
- "Unternehmen verwalten" → manage companies
- Tone: professional, functional, clear

**Landing / pitch (German):**
- Lead with the problem: Zettel an der Wand ist nicht mehr zeitgemäß.
- Solution in one sentence.
- Tech confidence without jargon.
- Pitch: "Nicht noch ein Tool. Kaffee digital."

---

## Quality bar

The design is done when:

- The member flow feels like it can be completed in 15 seconds without reading instructions
- The admin panel looks like a real, trustworthy internal tool
- The landing page communicates the product immediately in the first viewport
- Icons and illustrations feel custom and consistent, not generic
- Coffee and regional motifs add personality without reducing professionalism
- German copy is reviewed and correct
- The system works on an iPad 10-inch landscape without any layout issues
