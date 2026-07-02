// App logo: an accent (currentColor) rounded square with a white brand mark. The
// square uses `currentColor` so it follows the accent token; the mark stays white
// for contrast. Inlined (not an <img>) so it can theme. The mark follows the
// active brand palette (cappuccino by default, Death Star for the "Imperium"
// palette). The installed favicon / PWA icons remain the static amber PNG/SVG.

import { useTheme } from '../lib/theme-context'

interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  const { palette } = useTheme()
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <rect width="200" height="200" rx="40" ry="40" fill="currentColor" />
      {palette.mark === 'deathstar' ? (
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="100" cy="100" r="56" />
          <circle cx="76" cy="76" r="14" />
          <circle cx="76" cy="76" r="4" fill="#ffffff" stroke="none" />
          <path d="M45 108 H155" />
          <path d="M49 122 H151" />
        </g>
      ) : (
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0,20)"
        >
          <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
          <ellipse cx="83" cy="60" rx="43" ry="6" />
          <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
          <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12" />
          <path d="M70 28c-3 6 3 12 0 18" />
          <path d="M83 22c-3 6 3 12 0 18" />
          <path d="M96 28c-3 6 3 12 0 18" />
        </g>
      )}
    </svg>
  )
}
