import type { ReactNode } from 'react'

type IllustrationName = 'beans' | 'campus' | 'emptyCup' | 'cappuccino' | 'pine'

interface IllustrationProps {
  name: IllustrationName
  className?: string
  strokeWidth?: number
}

const illustrations: Record<IllustrationName, { viewBox: string; paths: ReactNode }> = {
  cappuccino: {
    viewBox: '0 0 200 160',
    paths: (
      <>
        <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
        <ellipse cx="83" cy="60" rx="43" ry="6" />
        <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
        <path d="M126 70h12c10 0 18 8 18 18s-8 18-18 18h-12" />
        <path d="M70 28c-3 6 3 12 0 18" />
        <path d="M83 22c-3 6 3 12 0 18" />
        <path d="M96 28c-3 6 3 12 0 18" />
      </>
    ),
  },
  beans: {
    viewBox: '0 0 200 120',
    paths: (
      <>
        <ellipse cx="55" cy="60" rx="22" ry="36" transform="rotate(-30 55 60)" />
        <path d="M60 32c-6 12-10 28-4 50" transform="rotate(-30 55 60)" />
        <ellipse cx="100" cy="70" rx="22" ry="36" transform="rotate(15 100 70)" />
        <path d="M105 42c-6 12-10 28-4 50" transform="rotate(15 100 70)" />
        <ellipse cx="148" cy="55" rx="22" ry="36" transform="rotate(-10 148 55)" />
        <path d="M153 27c-6 12-10 28-4 50" transform="rotate(-10 148 55)" />
      </>
    ),
  },
  campus: {
    viewBox: '0 0 240 120',
    paths: (
      <>
        <path d="M10 100h220" />
        <path d="M20 100V60h28v40" />
        <path d="M48 100V40l16-10 16 10v60" />
        <path d="M80 100V70h22v30" />
        <path d="M102 100V52h26v48" />
        <path d="M128 100V62h18v38" />
        <path d="M146 100V46h22v54" />
        <path d="M168 100V68h28v32" />
        <path d="M196 100V58h22v42" />
        <path d="M30 70v30" />
        <path d="M40 75v25" />
        <path d="M58 60v40" />
        <path d="M68 55v45" />
        <path d="M88 80v20" />
        <path d="M112 65v35" />
        <path d="M120 65v35" />
        <path d="M154 60v40" />
        <path d="M162 60v40" />
        <path d="M180 80v20" />
        <path d="M204 70v30" />
        <path d="M212 70v30" />
      </>
    ),
  },
  emptyCup: {
    viewBox: '0 0 200 160',
    paths: (
      <>
        <path d="M50 60h70l-4 60c-1 8-7 14-15 14h-32c-8 0-14-6-15-14z" />
        <path d="M120 75h10c8 0 14 6 14 14s-6 14-14 14h-10" />
        <path d="M48 60h74" />
        <path d="M85 22v14" />
        <path d="M70 30c4 4 4 8 0 12" />
        <path d="M100 30c-4 4-4 8 0 12" />
      </>
    ),
  },
  pine: {
    viewBox: '0 0 200 160',
    paths: (
      <>
        <path d="M55 130 100 22l45 108" />
        <path d="m70 96 30-30 30 30" />
        <path d="m62 116 38-38 38 38" />
        <path d="M100 130v18" />
        <path d="M40 148h120" />
        <path d="M22 148h8" />
        <path d="M170 148h8" />
      </>
    ),
  },
}

export default function Illustration({
  name,
  className = '',
  strokeWidth = 2,
}: IllustrationProps) {
  const illustration = illustrations[name]

  return (
    <svg
      viewBox={illustration.viewBox}
      className={['kl-illustration', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {illustration.paths}
      </g>
    </svg>
  )
}
