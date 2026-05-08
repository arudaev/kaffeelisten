# Claude Design Workflow — Kaffeelisten

Use this workflow when generating or iterating on the Kaffeelisten UI with Claude Design. It ensures every session produces consistent, pitch-ready output.

---

## Before you start

Read in this order:
1. `docs/design-foundation.md` — creative brief, screen inventory, principles
2. `docs/design-system.md` — color tokens, typography, component specs
3. `docs/prd.md` — product requirements and user stories
4. `docs/prompts.md` — ready-to-use Claude Design prompts

Do not start generating UI until you have read all four.

---

## Step 1: Design system setup

Run the "Design system setup" prompt from `docs/prompts.md`.

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
