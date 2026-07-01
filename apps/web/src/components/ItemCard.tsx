import Icon from './Icon'

type ItemCategory = 'coffee' | 'drink' | 'snack' | 'food' | 'other'

const categoryIcon: Record<ItemCategory, Parameters<typeof Icon>[0]['name']> = {
  coffee: 'cappuccino',
  drink: 'drink',
  snack: 'snack',
  food: 'food',
  other: 'beans',
}

interface ItemCardProps {
  name: string
  price: string
  category: ItemCategory
  quantity: number
  onAdd: () => void
  onRemove: () => void
}

export default function ItemCard({ name, price, category, quantity, onAdd, onRemove }: ItemCardProps) {
  const icon = categoryIcon[category] ?? 'beans'
  const selected = quantity > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!selected) onAdd() }}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !selected) onAdd() }}
      className={[
        'flex flex-col gap-2 p-4 min-h-[124px] text-left',
        'rounded-xl border shadow-sm select-none',
        'transition-[background,border-color,box-shadow] duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        selected
          ? 'bg-accent-subtle border-accent ring-2 ring-accent'
          : 'bg-surface border-border hover:bg-surface-2 hover:border-fg-subtle cursor-pointer',
      ].join(' ')}
    >
      <span className={selected ? 'text-accent' : 'text-fg-muted'}>
        <Icon name={icon} size={28} />
      </span>
      <span className="flex-1" />
      <span className="text-lg font-semibold text-fg">{name}</span>
      {selected ? (
        <div
          className="flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-fg-muted">{price}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemove}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-subtle text-accent hover:bg-accent-subtle text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Weniger"
            >
              −
            </button>
            <span className="w-6 text-center text-base font-bold text-fg">{quantity}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-subtle text-accent hover:bg-accent-subtle text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Mehr"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <span className="text-sm text-fg-muted">{price}</span>
      )}
    </div>
  )
}
