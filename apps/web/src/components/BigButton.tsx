import { ReactNode, useState } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface BigButtonProps {
  variant?: Variant
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  type?: 'button' | 'submit'
}

const base =
  'inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-lg font-semibold text-lg transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

const variants: Record<Variant, { default: string; hover: string; disabled: string }> = {
  primary: {
    default: 'bg-accent text-white border border-transparent',
    hover: 'hover:bg-accent-hover',
    disabled: 'opacity-40 cursor-not-allowed',
  },
  secondary: {
    default: 'bg-surface text-fg border border-border font-medium',
    hover: 'hover:bg-surface-2',
    disabled: 'opacity-40 cursor-not-allowed',
  },
  ghost: {
    default: 'bg-transparent text-fg border border-transparent font-medium',
    hover: 'hover:bg-surface-2',
    disabled: 'opacity-40 cursor-not-allowed',
  },
}

export default function BigButton({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  icon,
  type = 'button',
}: BigButtonProps) {
  const [hover, setHover] = useState(false)
  const v = variants[variant]
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className={[
        base,
        v.default,
        !disabled && hover ? v.hover : '',
        disabled ? v.disabled : '',
        fullWidth ? 'w-full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
      {children}
    </button>
  )
}
