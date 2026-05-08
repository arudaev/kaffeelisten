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
  selected?: boolean
  onClick: () => void
}

export default function ItemCard({ name, price, category, selected = false, onClick }: ItemCardProps) {
  const icon = categoryIcon[category] ?? 'beans'
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col gap-2 p-4 min-h-[124px] text-left',
        'rounded-xl border shadow-sm',
        'transition-[background,border-color,box-shadow] duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
        selected
          ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-600'
          : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-400',
      ].join(' ')}
    >
      <span className={selected ? 'text-amber-700' : 'text-stone-600'}>
        <Icon name={icon} size={28} />
      </span>
      <span className="flex-1" />
      <span className="text-lg font-semibold text-stone-900">{name}</span>
      <span className="text-sm text-stone-600">{price}</span>
    </button>
  )
}
