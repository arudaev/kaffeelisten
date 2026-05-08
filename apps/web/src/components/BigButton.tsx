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
  'inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-lg font-semibold text-lg transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'

const variants: Record<Variant, { default: string; hover: string; disabled: string }> = {
  primary: {
    default: 'bg-amber-600 text-white border border-transparent',
    hover: 'hover:bg-amber-700',
    disabled: 'opacity-40 cursor-not-allowed',
  },
  secondary: {
    default: 'bg-white text-stone-900 border border-stone-200 font-medium',
    hover: 'hover:bg-stone-50',
    disabled: 'opacity-40 cursor-not-allowed',
  },
  ghost: {
    default: 'bg-transparent text-stone-700 border border-transparent font-medium',
    hover: 'hover:bg-stone-100',
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
