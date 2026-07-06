type IconName =
  | 'coffee-cup'
  | 'cappuccino'
  | 'takeaway'
  | 'beans'
  | 'drink'
  | 'food'
  | 'snack'
  | 'back'
  | 'check'
  | 'undo'
  | 'home'
  | 'install'
  | 'close'

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}

const paths: Record<IconName, React.ReactNode> = {
  'coffee-cup': (
    <>
      <path d="M5 9h11a3 3 0 0 1 0 6h-1" />
      <path d="M5 9v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9z" />
      <path d="M8 4c-.5 1 .5 2 0 3" />
      <path d="M11 4c-.5 1 .5 2 0 3" />
    </>
  ),
  cappuccino: (
    <>
      <ellipse cx="11" cy="10" rx="6" ry="2" />
      <path d="M5 10v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6" />
      <path d="M17 12h1a2 2 0 0 1 0 4h-1" />
    </>
  ),
  takeaway: (
    <>
      <path d="M6 7h12l-1.2 12.4a2 2 0 0 1-2 1.6h-5.6a2 2 0 0 1-2-1.6z" />
      <path d="M5 7h14" />
      <path d="M10 4h4" />
      <path d="M9 11h6" />
    </>
  ),
  beans: (
    <>
      <ellipse cx="9" cy="11" rx="3" ry="5" transform="rotate(-25 9 11)" />
      <ellipse cx="15" cy="14" rx="3" ry="5" transform="rotate(20 15 14)" />
    </>
  ),
  drink: (
    <>
      <path d="M7 4h10l-1 16a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
      <path d="M7.5 9h9" />
    </>
  ),
  food: (
    <>
      <path d="M4 11c0-3 3-6 8-6s8 3 8 6" />
      <path d="M3 11h18" />
      <path d="M5 14h14l-1 4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    </>
  ),
  snack: (
    <>
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 6V4" />
      <path d="M15 6V4" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
  check: <path d="M4 12l5 5 11-11" />,
  undo: (
    <>
      <path d="M9 14l-5-5 5-5" />
      <path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </>
  ),
  install: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 19h14" />
    </>
  ),
  close: (
    <>
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </>
  ),
}

export default function Icon({ name, size = 24, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
