import { SelectHTMLAttributes, useId } from 'react'

type Variant = 'form' | 'filter'

export interface SelectOption {
  value: string
  label: string
}

interface AdminSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Field label rendered above the select (form variant) or as the accessible name (filter variant). */
  label?: string
  /** Helper text shown below the select. */
  hint?: string
  /** Error message; also switches the border to the error colour. */
  error?: string
  /** Options to render. Alternatively pass `<option>` children. */
  options?: SelectOption[]
  /** `form` = tall field for modals/forms; `filter` = compact field for toolbars. */
  variant?: Variant
}

const selectBase =
  'w-full border outline-none transition-colors text-fg cursor-pointer ' +
  'focus:border-accent focus:ring-1 focus:ring-accent'

const variantClasses: Record<Variant, string> = {
  form: 'h-11 px-3 bg-surface-2 rounded text-base focus:bg-surface',
  filter: 'h-9 px-3 bg-surface rounded-md text-sm',
}

export default function AdminSelect({
  label,
  hint,
  error,
  options,
  variant = 'form',
  className,
  id,
  children,
  ...rest
}: AdminSelectProps) {
  const reactId = useId()
  const selectId = id ?? reactId
  const border = error ? 'border-error' : 'border-border'

  const select = (
    <select
      id={selectId}
      aria-label={!label ? (rest['aria-label'] as string | undefined) : undefined}
      className={[selectBase, variantClasses[variant], border, className ?? ''].join(' ')}
      {...rest}
    >
      {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
    </select>
  )

  if (variant === 'filter' && !label) return select

  return (
    <label htmlFor={selectId} className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
          {label}{rest.required && <span className="text-error"> *</span>}
        </span>
      )}
      {select}
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-fg-muted">{hint}</span>
      ) : null}
    </label>
  )
}
