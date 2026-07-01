// Inline Death Star line illustration — the brand mark for the "Imperium"
// (Death Star) palette. Uses `stroke="currentColor"` so it adapts to the theme
// when colored via a text-* token class, matching CappuccinoMark.

interface DeathStarMarkProps {
  className?: string
}

export default function DeathStarMark({ className }: DeathStarMarkProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* battle-station sphere */}
      <circle cx="100" cy="80" r="58" />
      {/* superlaser dish (upper-left quadrant) */}
      <circle cx="75" cy="55" r="15" />
      <circle cx="75" cy="55" r="4.5" fill="currentColor" stroke="none" />
      {/* equatorial trench + a lower surface band */}
      <path d="M43 90 H157" />
      <path d="M48 104 H152" />
    </svg>
  )
}
