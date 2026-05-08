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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
        selected
          ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-600'
          : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-400 cursor-pointer',
      ].join(' ')}
    >
      <span className={selected ? 'text-amber-700' : 'text-stone-600'}>
        <Icon name={icon} size={28} />
      </span>
      <span className="flex-1" />
      <span className="text-lg font-semibold text-stone-900">{name}</span>
      {selected ? (
        <div
          className="flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-stone-600">{price}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemove}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              aria-label="Weniger"
            >
              −
            </button>
            <span className="w-6 text-center text-base font-bold text-stone-900">{quantity}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              aria-label="Mehr"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <span className="text-sm text-stone-600">{price}</span>
      )}
    </div>
  )
}
