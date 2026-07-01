// App logo: amber (accent) rounded square with a white cappuccino mark. The
// square uses `currentColor` so it follows the accent token (and a future custom
// palette); the mark stays white for contrast. Inlined (not an <img>) so it can
// theme. The installed favicon / PWA icons remain the static amber PNG/SVG.

interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <rect width="200" height="200" rx="40" ry="40" fill="currentColor" />
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
    </svg>
  )
}
