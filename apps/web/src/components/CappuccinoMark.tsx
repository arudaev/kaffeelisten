// Inline cappuccino-with-steam line illustration. Uses `stroke="currentColor"`
// so it adapts to the theme when colored via a text-* token class (an <img> of
// the same SVG can't inherit the page's color, so it never themed in dark mode).

interface CappuccinoMarkProps {
  className?: string
}

export default function CappuccinoMark({ className }: CappuccinoMarkProps) {
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
      <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
      <ellipse cx="83" cy="60" rx="43" ry="6" />
      <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
      <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12" />
      <path d="M70 28c-3 6 3 12 0 18" />
      <path d="M83 22c-3 6 3 12 0 18" />
      <path d="M96 28c-3 6 3 12 0 18" />
    </svg>
  )
}
