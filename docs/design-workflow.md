# Design Workflow — Kaffeelisten

Use this workflow when creating or iterating on the Kaffeelisten UI.

---

## When to run this

**Block 1 of the hackathon sprint — in parallel with infra setup (14:00–16:00, Fri May 8).**

Do not wait until after the member flow is built. The design system needs to exist before components are written, so the output directly informs the Tailwind config and component structure. One person sets up Supabase/Vercel while the other runs this session.

---

**Company name and blurb:**
```
Kaffeelisten — digital coffee and snack consumption logger for ITC1 Deggendorf 
campus. A PWA used on a wall-mounted iPad and any browser. Two surfaces: 
(1) member logging flow — company → member → item → confirm, completed in under 
15 seconds, zero friction; (2) admin panel — monthly transaction report, PIN-
protected, professional internal tool. Warm, minimal, readable. Bavarian Wald 
and campus atmosphere. German-first UI copy. Coffee as a playful motif.
```

**notes:**
```
Design tokens are pre-specified in docs/design-system.md — use those as the 
starting point. Stone/amber/white palette. Inter font. Member flow needs large 
tap targets (min 44px) and min 18px text for wall-mount readability. Admin panel 
uses standard product text sizes. One-line SVG illustrations for spot art. 
Custom coffee icons. No emojis. All UI copy in German.
```

---

## Step 1: Design system setup

Run the "Design system setup" prompt from `docs/archive/prompts.md` (hackathon-era reference).

Output should include:
- Color palette (matches design-system.md tokens)
- Typography scale
- Spacing and radius reference
- Button, input, and card baseline states
- Icon stroke style sample
- One-line SVG illustration direction

Choose the direction that best combines warm minimalism, German-campus professionalism, and coffee/Bavarian Wald atmosphere. Do not pick a direction that looks like a generic SaaS product.

---

## Step 2: Member flow first

Generate the member-facing screen set before the admin panel. It is the primary surface and the pitch demo centerpiece.

Run the "Member flow — full screen set" prompt.

Review checklist:
- [ ] Company tiles are large enough to tap without precision
- [ ] Item cards are visually distinct with custom SVG icons
- [ ] Confirmation screen clearly shows what will be logged
- [ ] Success screen is warm and immediate
- [ ] Every text element is minimum text-lg (18px)
- [ ] Layout works on iPad 10-inch landscape without horizontal scroll
- [ ] German copy is correct and natural (Fares to review)
- [ ] No emojis anywhere

---

## Step 3: Admin panel

Run the "Admin panel — full screen set" prompt.

Review checklist:
- [ ] Dashboard summary cards give a clear month-to-date picture at a glance
- [ ] Transaction log is sortable and filterable
- [ ] "Bericht senden" button is prominent but clearly destructive (includes warning about reset)
- [ ] CRUD forms are clean and functional
- [ ] Status badges distinguish active / inactive records
- [ ] German copy is correct (Fares to review)

---

## Step 4: Landing page

Run the "Landing page (pitch surface)" prompt.

This screen is for the hackathon pitch — it should sell the product story to mentors and judges in 30 seconds.

Review checklist:
- [ ] Problem is stated in the hero — a person who sees this immediately understands what pain it solves
- [ ] Solution is shown visually (3-step flow)
- [ ] Custom SVG illustration in the hero — not a stock image
- [ ] Tech stack section is honest and concise (free tier, low maintenance)
- [ ] "Zukunft" section teases the roadmap without over-promising
- [ ] German copy is pitch-quality (Fares to review)
- [ ] No emojis, no generic SaaS language, no lorem ipsum

---

## Step 5: Icons and SVGs

Run the "Icon and SVG set" prompt.

Review checklist:
- [ ] Stroke weight is consistent across all icons (1.5px)
- [ ] Icons are readable at 16px (small badge use case)
- [ ] Coffee motifs are playful but not childish
- [ ] Bavarian Wald spot illustration looks like atmosphere, not clipart
- [ ] All icons are clean and exportable

---

## Step 6: Accessibility and responsive review

Run the "Accessibility and responsive review" prompt.

Do this before exporting anything for the pitch.

---

## Step 7: Export and save

Save all outputs to the repo under:

```
exports/
  prototype-v1.html        Main prototype export
  pitch-deck-v1.pdf        Optional pitch one-pager
  icon-set-v1.svg          Full icon SVG sprite
  member-flow-v1.png       Member flow screens
  admin-panel-v1.png       Admin screens
  landing-v1.png           Landing page

assets/generated/
  icons/                   Individual icon SVGs
  illustrations/           Spot illustration SVGs
```

Use clear version numbers. Do not overwrite an existing export — increment the version.

---

## Iteration rules

- Pick one visual direction early and commit to it.
- If something feels wrong, identify the specific rule it breaks (from design-foundation.md) before changing anything.
- German copy changes must be reviewed by Fares before export.
- Do not add new screens during the hackathon sprint unless a P0 requirement is uncovered.
- Quality over quantity — one strong member flow beats five mediocre screens.
