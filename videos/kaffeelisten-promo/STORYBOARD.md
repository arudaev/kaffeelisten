# Storyboard

**Format:** 1920x1080  
**Audio:** Music-only. Warm 96 BPM instrumental beat with soft kick, clap, hats, rounded bass, and gentle pad stabs.  
**Direction:** No spoken narration. Product meaning comes from on-screen German copy, real screenshots, and beat-synced transitions.  
**Style basis:** `DESIGN.md` plus the captured `kaffeelisten.de` landing page and repo product screenshots.

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `capture/assets/cappuccino-with-steam.svg` | SVG mark | Beat 1, Beat 5 | Opening and closing coffee identity |
| `capture/assets/favicon.svg` | SVG mark | Beat 5 | Small browser/product mark |
| `assets/logo.svg` | SVG logo | Beat 5 | CTA lockup |
| `assets/member-start.png` | Screenshot | Beat 1 | Live landing page reference |
| `assets/member-company.png` | Screenshot | Beat 2 | Company choice in the tap flow |
| `assets/member-item-selection.png` | Screenshot | Beat 2, Beat 3 | Item cards and quantities |
| `assets/member-confirmation.png` | Screenshot | Beat 3 | Receipt confirmation |
| `assets/admin-dashboard.png` | Screenshot | Beat 4 | Monthly dashboard and report action |
| `assets/icon-coffee-cup.svg` | SVG icon | Beat 2 | Product category accent |
| `assets/icon-drink.svg` | SVG icon | Beat 2 | Product category accent |
| `assets/icon-snack.svg` | SVG icon | Beat 2 | Product category accent |
| `assets/pine-silhouette.svg` | SVG texture | Beat 1, Beat 5 | Bavarian Wald grounding |

## Beat 1 - Cold Open (0.00-3.80s)

**Music cue:** Filtered intro, soft kick ghosted under a warm pad. First amber pulse at 0.70s.

**Concept:** The old paper list is implied by a large empty stone field, then the digital coffee mark draws itself into being. The first frame should feel familiar, useful, and faster than a form on a clipboard.

**Visual description:** Full stone canvas with faint pine silhouettes sitting low on the horizon. The cappuccino line icon draws on stroke by stroke. A large title lands below it, then the amber CTA grows into place. Small metadata "ITC1 Deggendorf / B4Y3RW4LD" anchors the bottom like the live site. On-screen line: "Kaffee, Getränke, Snacks."

**Mood direction:** Minimal Bavarian workspace, paper-to-product, warm but not cute.

**Assets:** `capture/assets/cappuccino-with-steam.svg`, `assets/member-start.png`, `assets/pine-silhouette.svg`.

**Animation choreography:** Pine line drifts slowly. Cup stroke DRAWS. Title DROPS in with weight. CTA FILLS from amber wash to amber. Footer label TYPES on.

**Transition:** Velocity-matched upward into Beat 2.

**Depth layers:** BG stone + pine, MG cup and title, FG CTA and footer metadata.

## Beat 2 - Three-Tap Flow (3.80-8.00s)

**Music cue:** Full beat enters: kick on one, clap on two and four, tight hats. Three amber taps land on the rhythm.

**Concept:** The product becomes tactile. We see the iPad flow as a set of floating screens, with the amber selection state becoming the visual rhythm.

**Visual description:** Three tilted product panels fan across the frame: company selection, item selection, and a close-up strip of the selected Cappuccino/Espresso cards. Coffee, drink, and snack icons orbit gently around the panels. A kinetic label "3 Taps" counts up while three amber dots light in sequence.

**Mood direction:** Fast campus utility, precise touch targets, no-login simplicity.

**Assets:** `assets/member-company.png`, `assets/member-item-selection.png`, `assets/icon-coffee-cup.svg`, `assets/icon-drink.svg`, `assets/icon-snack.svg`.

**Animation choreography:** Panels CASCADE in at different z-depths. Icons SLIDE along short SVG guide lines. The "3" COUNTS up. Progress dots PULSE one after another.

**Transition:** Blur-through crossfade into Beat 3.

**Depth layers:** BG oversized amber wash circles, MG screenshots, FG counter and icons.

## Beat 3 - Confirm and Done (8.00-12.20s)

**Music cue:** Bass line becomes warmer and more rounded. Confirmation total lands on a clap.

**Concept:** The speed promise becomes concrete: identity, selection, receipt. The viewer should understand the whole member flow without reading a paragraph.

**Visual description:** A horizontal path line is drawn from "Unternehmen" to "Person" to "Artikel" to "Bestätigen". The confirmation receipt screenshot settles center stage while selected item chips slide underneath: Cappuccino, Espresso, 0,80 Euro.

**Mood direction:** Clean operational certainty, like watching a checklist complete.

**Assets:** `assets/member-company.png`, `assets/member-item-selection.png`, `assets/member-confirmation.png`.

**Animation choreography:** Path line DRAWS. Step labels SNAP on. Receipt FLOATS forward with perspective. Item chips STACK and the total COUNTS to 0,80.

**Transition:** Directional blur to Beat 4, moving left like a dashboard reveal.

**Depth layers:** BG thin path and step labels, MG receipt, FG amber chips and total.

## Beat 4 - Admin Report (12.20-16.50s)

**Music cue:** Small lift with brighter hats and a short amber hit at the report-send moment.

**Concept:** The product shifts from the wall-mounted iPad to the person who has to close the month. The dashboard feels calm: totals, companies, recent entries, report button.

**Visual description:** Admin dashboard screenshot fills the right two-thirds, angled slightly like a tabletop screen. On the left, three large metric callouts count in: 10 Einträge, 4,80 Euro, 5 Unternehmen. An amber paper-plane line travels from the metrics into the screenshot's "Bericht senden" button. On-screen headline: "Monatsbericht bereit."

**Mood direction:** Responsible, tidy, admin relief.

**Assets:** `assets/admin-dashboard.png`.

**Animation choreography:** Dashboard GLIDES in. Metrics COUNT up. Table rows SHIMMER subtly. Paper-plane path DRAWS and LANDS on the report button.

**Transition:** Warm amber cover wipe into Beat 5.

**Depth layers:** BG stone grid, MG dashboard, FG metric cards and report path.

## Beat 5 - CTA Lockup (16.50-20.00s)

**Music cue:** Beat strips back to pad, bass, and final clap. Last amber underline resolves at 19.10s.

**Concept:** Return to the simplicity of the landing page, but with the product proof now behind it. The final frame should be clean enough to screenshot.

**Visual description:** Product screenshots recede into a soft stack. The coffee mark and Kaffeelisten wordmark lock up in the center. The URL appears as a strong amber underline, followed by the German promise "Kurz tippen, fertig."

**Mood direction:** Confident, local, ready to use.

**Assets:** `capture/assets/cappuccino-with-steam.svg`, `assets/logo.svg`, `assets/pine-silhouette.svg`.

**Animation choreography:** Screenshots SETTLE backward. Logo BREATHES once. URL TYPES on. Amber underline DRAWS left to right. Final tagline FADES up and holds.

**Transition:** Final fade to stone at 19.70s.

**Depth layers:** BG faint product stack and pine line, MG logo and URL, FG amber underline.

## Production Architecture

```
kaffeelisten-promo/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── narration.txt
├── narration.wav
├── transcript.json
├── assets/
├── capture/
└── snapshots/
```
