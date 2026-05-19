export const FPS = 30;
export const W = 1920;
export const H = 1080;

// Scenes: absolute start frame + duration in frames (30 fps)
export const SCENES = {
  HOOK:         { from: 0,    dur: 150 },  // 0–5s
  PROBLEM:      { from: 150,  dur: 150 },  // 5–10s
  MEMBER_FLOW:  { from: 300,  dur: 750 },  // 10–35s
  INSTANT_STAT: { from: 1050, dur: 210 },  // 35–42s
  ADMIN:        { from: 1260, dur: 300 },  // 42–52s
  CTA:          { from: 1560, dur: 240 },  // 52–60s
} as const;

export const TOTAL_FRAMES = SCENES.CTA.from + SCENES.CTA.dur; // 1800

// Design tokens — matches the product and the existing promo prototype
export const C = {
  stone:    "#fafaf9",
  ink:      "#1c1917",
  border:   "#e5e7eb",
  amber:    "#d97706",
  amberDk:  "#b45309",
  amberWsh: "#fffbeb",
  muted:    "#a8a29e",
  stone6:   "#57534e",
  stone7:   "#44403c",
  green:    "#16a34a",
  greenBg:  "#dcfce7",
  white:    "#ffffff",
} as const;

// Shared extrapolation option — clamp on both ends
export const EX = {
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};
