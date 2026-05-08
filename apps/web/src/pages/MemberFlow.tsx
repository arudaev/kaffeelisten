// Member-facing logging flow: start → company → member → item → confirm → success
// Design spec: docs/design-foundation.md, ui_kits/member-flow/

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import BigButton from '../components/BigButton'
import Tile from '../components/Tile'
import ItemCard from '../components/ItemCard'
import Stepper from '../components/Stepper'
import FlowShell from '../components/FlowShell'
import SuccessScreen from '../components/SuccessScreen'
import Icon from '../components/Icon'

type Company = Database['public']['Tables']['companies']['Row']
type Member = Database['public']['Tables']['members']['Row']
type Item = Database['public']['Tables']['items']['Row']
type Step = 'start' | 'company' | 'member' | 'item' | 'confirm' | 'success'

const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Kaffee',
  drink: 'Getränke',
  snack: 'Snacks',
  food: 'Speisen',
  other: 'Sonstiges',
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace('.', ',') + ' €'
}

export default function MemberFlow() {
  const [step, setStep] = useState<Step>('start')
  const [companies, setCompanies] = useState<Company[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeCategory, setActiveCategory] = useState<string>('coffee')
  const [submitting, setSubmitting] = useState(false)

  // Load companies + items on mount
  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingCompanies(true)
      setLoadingItems(true)
      const cosResult = await supabase.from('companies').select('*').eq('active', true).order('name')
      setLoadingCompanies(false)
      const itsResult = await supabase.from('items').select('*').eq('active', true).order('name')
      setLoadingItems(false)
      const cos = cosResult.data
      const its = itsResult.data
      const cosErr = cosResult.error
      const itsErr = itsResult.error
      if (cosErr || itsErr) {
        setError('Daten konnten nicht geladen werden.')
        return
      }
      setCompanies(cos ?? [])
      setItems(its ?? [])
      const cats = [...new Set((its ?? []).map(i => i.category))]
      if (cats.length > 0) setActiveCategory(cats[0])
    }
    fetchInitial()
  }, [])

  // Load members when company is selected
  useEffect(() => {
    if (!selectedCompany) return
    const fetchMembers = async () => {
      setLoadingMembers(true)
      const { data, error: err } = await supabase
        .from('members')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('active', true)
        .order('name')
      setLoadingMembers(false)
      if (err) { setError('Mitglieder konnten nicht geladen werden.'); return }
      setMembers(data ?? [])
    }
    fetchMembers()
  }, [selectedCompany])

  const reset = () => {
    setStep('start')
    setSelectedCompany(null)
    setSelectedMember(null)
    setSelectedItem(null)
    setQuantity(1)
    setError(null)
    const cats = [...new Set(items.map(i => i.category))]
    if (cats.length > 0) setActiveCategory(cats[0])
  }

  const handleConfirm = async () => {
    if (!selectedMember || !selectedCompany || !selectedItem) return
    setSubmitting(true)
    const { error: err } = await supabase.from('transactions').insert({
      member_id: selectedMember.id,
      company_id: selectedCompany.id,
      item_id: selectedItem.id,
      quantity,
    })
    setSubmitting(false)
    if (err) { setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.'); return }
    setStep('success')
  }

  const availableCategories = [...new Set(items.map(i => i.category))]
  const filteredItems = items.filter(i => i.category === activeCategory)
  const stepIndex = { start: 0, company: 0, member: 1, item: 2, confirm: 3, success: 3 }[step]

  if (step === 'success' && selectedItem && selectedMember && selectedCompany) {
    return (
      <SuccessScreen
        summary={`${quantity} × ${selectedItem.name} · ${selectedMember.name} · ${selectedCompany.name}`}
        onUndo={() => setStep('confirm')}
        onReset={reset}
      />
    )
  }

  if (step === 'start') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-7 p-10 font-sans relative">
        <img
          src="/assets/illustrations/cappuccino-with-steam.svg"
          alt=""
          className="w-40"
          style={{ color: '#44403C' }}
        />
        <div className="text-center max-w-xl">
          <h1 className="text-5xl font-bold text-stone-900 tracking-tight">Kaffeelisten</h1>
          <p className="text-xl text-stone-600 mt-2.5 leading-relaxed">
            Kaffee, Getränke, Snacks. Kurz tippen, fertig.
          </p>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}
        <BigButton
          variant="primary"
          onClick={() => setStep('company')}
          disabled={loadingCompanies || loadingItems}
        >
          {loadingCompanies || loadingItems ? 'Laden…' : 'Eintrag starten'}
        </BigButton>
        <p className="absolute bottom-6 left-0 right-0 text-center text-[12px] text-stone-500 uppercase tracking-[0.06em]">
          ITC1 Deggendorf · B4Y3RW4LD
        </p>
      </div>
    )
  }

  if (step === 'company') {
    return (
      <FlowShell
        step={stepIndex}
        totalSteps={4}
        onBack={() => setStep('start')}
        header={
          <>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Wer bist du?</h1>
            <p className="text-lg text-stone-600">Tippe auf dein Unternehmen.</p>
          </>
        }
      >
        {loadingCompanies ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map(c => (
              <Tile
                key={c.id}
                label={c.name}
                onClick={() => { setSelectedCompany(c); setStep('member') }}
              />
            ))}
          </div>
        )}
      </FlowShell>
    )
  }

  if (step === 'member') {
    const twoCol = members.length > 4
    return (
      <FlowShell
        step={stepIndex}
        totalSteps={4}
        onBack={() => setStep('company')}
        header={
          <>
            <p className="text-sm font-medium text-stone-600 uppercase tracking-[0.06em]">
              {selectedCompany?.name}
            </p>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Schön, dich zu sehen.</h1>
            <p className="text-lg text-stone-600">Wähle deinen Namen.</p>
          </>
        }
      >
        {loadingMembers ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={twoCol ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
            {members.map(m => (
              <Tile
                key={m.id}
                label={m.name}
                onClick={() => { setSelectedMember(m); setStep('item') }}
              />
            ))}
          </div>
        )}
      </FlowShell>
    )
  }

  if (step === 'item') {
    return (
      <FlowShell
        step={stepIndex}
        totalSteps={4}
        onBack={() => setStep('member')}
        header={
          <>
            <p className="text-sm font-medium text-stone-600 uppercase tracking-[0.06em]">
              {selectedMember?.name} · {selectedCompany?.name}
            </p>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Was hast du genommen?</h1>
          </>
        }
        footer={
          selectedItem ? (
            <>
              <Stepper value={quantity} onChange={setQuantity} />
              <div className="flex-1" />
              <BigButton variant="secondary" onClick={() => setSelectedItem(null)}>
                Auswahl löschen
              </BigButton>
              <BigButton variant="primary" onClick={() => setStep('confirm')}>
                Weiter — {quantity} × {selectedItem.name}
              </BigButton>
            </>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {availableCategories.map(cat => {
              const isActive = cat === activeCategory
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={[
                    'h-11 px-4 rounded-full text-base font-medium border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
                    isActive
                      ? 'bg-amber-50 text-amber-700 border-amber-600'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50',
                  ].join(' ')}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                name={item.name}
                price={formatPrice(item.price_cents)}
                category={item.category as 'coffee' | 'drink' | 'snack' | 'food' | 'other'}
                selected={selectedItem?.id === item.id}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
      </FlowShell>
    )
  }

  if (step === 'confirm' && selectedItem && selectedMember && selectedCompany) {
    const totalCents = selectedItem.price_cents * quantity
    const rows: [string, string][] = [
      ['Person', selectedMember.name],
      ['Unternehmen', selectedCompany.name],
      ['Item', `${quantity} × ${selectedItem.name}`],
      ['Preis', formatPrice(totalCents)],
    ]
    return (
      <FlowShell
        step={stepIndex}
        totalSteps={4}
        onBack={() => setStep('item')}
        header={
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Alles richtig?</h1>
        }
        footer={
          <>
            <BigButton variant="secondary" onClick={() => setStep('item')}>Zurück</BigButton>
            <div className="flex-1" />
            {error && <p className="text-sm text-red-600 mr-2">{error}</p>}
            <BigButton
              variant="primary"
              onClick={handleConfirm}
              disabled={submitting}
              icon={<Icon name="check" size={22} strokeWidth={2.5} />}
            >
              {submitting ? 'Speichern…' : 'Bestätigen'}
            </BigButton>
          </>
        }
      >
        <div className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm flex flex-col gap-4">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between items-center border-b border-stone-200 pb-3.5 last:border-0 last:pb-0"
            >
              <span className="text-sm text-stone-600 uppercase tracking-[0.06em]">{label}</span>
              <span className="text-xl font-semibold text-stone-900">{value}</span>
            </div>
          ))}
        </div>
      </FlowShell>
    )
  }

  return null
}
