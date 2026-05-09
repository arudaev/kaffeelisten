interface BrandMarkProps {
  alt?: string
  className?: string
  loading?: 'eager' | 'lazy'
  strokeWidth?: number
}

export default function BrandMark({
  alt = 'Kaffeelisten',
  className = '',
  strokeWidth = 2,
}: BrandMarkProps) {
  const accessible = alt.length > 0

  return (
    <svg
      viewBox="0 0 200 160"
      role={accessible ? 'img' : undefined}
      aria-hidden={accessible ? undefined : true}
      aria-label={accessible ? alt : undefined}
      focusable="false"
      className={['kl-brand-mark shrink-0', className].filter(Boolean).join(' ')}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
        <ellipse cx="83" cy="60" rx="43" ry="6" />
        <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
        <path d="M126 70h12c10 0 18 8 18 18s-8 18-18 18h-12" />
        <path d="M70 28c-3 6 3 12 0 18" />
        <path d="M83 22c-3 6 3 12 0 18" />
        <path d="M96 28c-3 6 3 12 0 18" />
      </g>
    </svg>
  )
}
