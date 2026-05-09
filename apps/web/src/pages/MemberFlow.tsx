// Member-facing logging flow: start → company → member → item → confirm → success
// Design spec: docs/design-foundation.md, ui_kits/member-flow/

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import BigButton from '../components/BigButton'
import Tile from '../components/Tile'
import ItemCard from '../components/ItemCard'
import FlowShell from '../components/FlowShell'
import SuccessScreen from '../components/SuccessScreen'
import Icon from '../components/Icon'

type Company = Database['public']['Tables']['companies']['Row']
type Member = Database['public']['Tables']['members']['Row']
type Item = Database['public']['Tables']['items']['Row']
type Step = 'start' | 'company' | 'member' | 'item' | 'confirm' | 'success'

type CartEntry = { item: Item; quantity: number }

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

// Letter-color bands A–Z (P-Q-R = purple, as expected)
const ALPHA_COLORS: [string, string][] = [
  ['ABC', '#D97706'],
  ['DEF', '#16A34A'],
  ['GHI', '#2563EB'],
  ['JKL', '#7C3AED'],
  ['MNO', '#DB2777'],
  ['PQR', '#9333EA'],
  ['STU', '#EA580C'],
  ['VWX', '#0D9488'],
  ['YZ',  '#78716C'],
]

function getLetterColor(name: string): string {
  // Normalize to strip diacritics so Ü→U, Ä→A, Ö→O pick the right color band
  const ch = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()[0] ?? 'A'
  for (const [band, color] of ALPHA_COLORS) {
    if (band.includes(ch)) return color
  }
  return '#78716C'
}

function CompanyInitial({ name }: { name: string }) {
  return (
    <span
      style={{ backgroundColor: getLetterColor(name) }}
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base select-none"
      aria-hidden="true"
    >
      {name[0] ?? '?'}
    </span>
  )
}

// localStorage-backed "Meine Firma" shortcut — only surfaces when ≥90% of
// last 10 choices are the same company (self-suppresses on shared iPads).
const HISTORY_KEY = 'kl_company_history'
const HISTORY_MAX = 10
const SHORTCUT_THRESHOLD = 0.9

function readHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function recordChoice(id: string) {
  const h = readHistory()
  h.push(id)
  if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

function getSuggestedCompany(companies: Company[]): Company | null {
  const h = readHistory()
  if (h.length < 3) return null
  const counts: Record<string, number> = {}
  for (const id of h) counts[id] = (counts[id] ?? 0) + 1
  const [topId, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (topCount / h.length >= SHORTCUT_THRESHOLD) {
    return companies.find(c => c.id === topId) ?? null
  }
  return null
}

// Capitalize first letter of each word, lowercase the rest ("anna müller" → "Anna Müller").
function capitalizeName(s: string): string {
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// Compute the shortest unique abbreviated display name for a stored full name.
// Uses the last word as surname; everything before it is the display given name.
// e.g. "Anna Müller"       → "Anna M."
//      "Anna Maria Müller" → "Anna Maria M."  (no conflict with "Anna Müller")
//      "Anna Müller" vs "Anna Maier" → "Anna Mü." / "Anna Ma."
// otherNames must already exclude the current member (caller filters by id).
function getDisplayName(fullName: string, otherNames: string[]): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const displayFirst = parts.slice(0, -1).join(' ')
  const surname = parts[parts.length - 1]
  for (let n = 1; n <= surname.length; n++) {
    const abbrev = surname.charAt(0).toUpperCase() + surname.slice(1, n).toLowerCase()
    const candidate = `${displayFirst} ${abbrev}.`
    const conflict = otherNames.some(other => {
      const op = other.trim().split(/\s+/)
      if (op.length < 2) return false
      const otherFirst = op.slice(0, -1).join(' ')
      const otherSurname = op[op.length - 1]
      if (otherFirst.toLowerCase() !== displayFirst.toLowerCase()) return false
      const otherAbbrev = otherSurname.charAt(0).toUpperCase() + otherSurname.slice(1, n).toLowerCase()
      return `${otherFirst} ${otherAbbrev}.`.toLowerCase() === candidate.toLowerCase()
    })
    if (!conflict) return candidate
  }
  return fullName // identical full name — nothing to abbreviate further
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
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map())
  const [activeCategory, setActiveCategory] = useState<string>('coffee')
  const [submitting, setSubmitting] = useState(false)

  // Self-registration modal
  const [addSelfOpen, setAddSelfOpen] = useState(false)
  const [selfFirstName, setSelfFirstName] = useState('')
  const [selfLastName, setSelfLastName] = useState('')
  const [selfEmail, setSelfEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [addSelfError, setAddSelfError] = useState<string | null>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)

  const cartEntries = [...cart.values()]
  const cartCount = cartEntries.reduce((sum, e) => sum + e.quantity, 0)
  const cartTotal = cartEntries.reduce((sum, e) => sum + e.item.price_cents * e.quantity, 0)

  // Load companies + items on mount
  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingCompanies(true)
      setLoadingItems(true)
      const cosResult = await supabase.from('companies').select('*').eq('active', true).order('name')
      setLoadingCompanies(false)
      const itsResult = await supabase.from('items').select('*').eq('active', true).order('name')
      setLoadingItems(false)
      const cosErr = cosResult.error
      const itsErr = itsResult.error
      if (cosErr || itsErr) {
        setError('Daten konnten nicht geladen werden.')
        return
      }
      setCompanies((cosResult.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'de')))
      setItems(itsResult.data ?? [])
      const cats = [...new Set((itsResult.data ?? []).map(i => i.category))]
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

  // Focus first name input when modal opens
  useEffect(() => {
    if (addSelfOpen) {
      setTimeout(() => firstNameRef.current?.focus(), 50)
    }
  }, [addSelfOpen])

  const reset = () => {
    setStep('start')
    setSelectedCompany(null)
    setSelectedMember(null)
    setCart(new Map())
    setError(null)
    const cats = [...new Set(items.map(i => i.category))]
    if (cats.length > 0) setActiveCategory(cats[0])
  }

  const addToCart = (item: Item) => {
    setCart(prev => {
      const next = new Map(prev)
      const entry = next.get(item.id)
      next.set(item.id, { item, quantity: (entry?.quantity ?? 0) + 1 })
      return next
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const next = new Map(prev)
      const entry = next.get(itemId)
      if (!entry) return prev
      if (entry.quantity <= 1) {
        next.delete(itemId)
      } else {
        next.set(itemId, { ...entry, quantity: entry.quantity - 1 })
      }
      return next
    })
  }

  const handleConfirm = async () => {
    if (!selectedMember || !selectedCompany || cartEntries.length === 0) return
    setSubmitting(true)
    const rows = cartEntries.map(e => ({
      member_id: selectedMember.id,
      company_id: selectedCompany.id,
      item_id: e.item.id,
      quantity: e.quantity,
    }))
    const { error: err } = await supabase.from('transactions').insert(rows)
    setSubmitting(false)
    if (err) { setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.'); return }
    setStep('success')
  }

  const openAddSelf = () => {
    setSelfFirstName('')
    setSelfLastName('')
    setSelfEmail('')
    setAddSelfError(null)
    setAddSelfOpen(true)
  }

  const handleAddSelf = async () => {
    const first = selfFirstName.trim()
    const last = selfLastName.trim()
    if (!first) { setAddSelfError('Vorname fehlt.'); return }
    if (!selectedCompany) return
    setAddingMember(true)
    setAddSelfError(null)
    const storedName = last ? `${capitalizeName(first)} ${capitalizeName(last)}` : capitalizeName(first)
    const email = selfEmail.trim() || null
    const { data, error: err } = await supabase
      .from('members')
      .insert({ company_id: selectedCompany.id, name: storedName, work_email: email, active: true })
      .select()
      .single()
    setAddingMember(false)
    if (err || !data) { setAddSelfError('Konnte nicht gespeichert werden. Bitte erneut versuchen.'); return }
    setMembers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedMember(data)
    setAddSelfOpen(false)
    setCart(new Map())
    setStep('item')
  }

  const availableCategories = [...new Set(items.map(i => i.category))]
  const filteredItems = items.filter(i => i.category === activeCategory)
  const stepIndex = { start: 0, company: 0, member: 1, item: 2, confirm: 3, success: 3 }[step]

  const successSummary = selectedMember && selectedCompany
    ? [getDisplayName(selectedMember.name, members.filter(x => x.id !== selectedMember.id).map(x => x.name)), selectedCompany.name, cartEntries.map(e => e.quantity + 'x ' + e.item.name).join(', ')].join(' - ')
    : ''

  if (step === 'success') {
    return (
      <SuccessScreen
        summary={successSummary}
        onUndo={() => setStep('confirm')}
        onReset={reset}
      />
    )
  }

  if (step === 'start') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-7 p-6 sm:p-10 font-sans relative">
        <img
          src="/assets/illustrations/cappuccino-with-steam.svg"
          alt=""
          className="w-28 sm:w-40"
          style={{ color: '#44403C' }}
        />
        <div className="text-center max-w-xl">
          <h1 className="text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight">Kaffeelisten</h1>
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
        ) : (() => {
          const suggested = getSuggestedCompany(companies)
          const selectCompany = (c: Company) => {
            recordChoice(c.id)
            setSelectedCompany(c)
            setSelectedMember(null)
            setCart(new Map())
            setStep('member')
          }
          return (
            <div className="flex flex-col gap-3">
              {suggested && (
                <>
                  <Tile
                    key={`shortcut-${suggested.id}`}
                    label={suggested.name}
                    leading={<CompanyInitial name={suggested.name} />}
                    onClick={() => selectCompany(suggested)}
                  />
                  <hr className="border-stone-200" />
                </>
              )}
              {companies.map(c => (
                <Tile
                  key={c.id}
                  label={c.name}
                  leading={<CompanyInitial name={c.name} />}
                  onClick={() => selectCompany(c)}
                />
              ))}
            </div>
          )
        })()}
      </FlowShell>
    )
  }

  if (step === 'member') {
    const twoCol = members.length > 4
    const previewFullName = selfFirstName.trim()
      ? (selfLastName.trim() ? `${selfFirstName.trim()} ${selfLastName.trim()}` : selfFirstName.trim())
      : ''
    const previewName = previewFullName
      ? getDisplayName(previewFullName, members.map(m => m.name))
      : ''

    return (
      <>
        <FlowShell
          step={stepIndex}
          totalSteps={4}
          onBack={() => {
            setSelectedMember(null)
            setCart(new Map())
            setStep('company')
          }}
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
            <div className="flex flex-col gap-4">
              <div className={twoCol ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                {members.map(m => (
                  <Tile
                    key={m.id}
                    label={getDisplayName(m.name, members.filter(x => x.id !== m.id).map(x => x.name))}
                    onClick={() => {
                      setSelectedMember(m)
                      setCart(new Map())
                      setStep('item')
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={openAddSelf}
                className="mt-2 self-start flex items-center gap-2 px-4 h-11 rounded-lg text-base font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                <span className="text-xl leading-none">+</span>
                Ich bin noch nicht dabei
              </button>
            </div>
          )}
        </FlowShell>

        {/* Self-registration modal */}
        {addSelfOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setAddSelfOpen(false)}
          >
            <div
              className="bg-white rounded-2xl p-7 w-full max-w-[440px] shadow-lg flex flex-col gap-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold text-stone-900">Namen hinzufügen</h2>
                <button
                  type="button"
                  onClick={() => setAddSelfOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  aria-label="Schließen"
                >
                  <Icon name="close" size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-stone-700" htmlFor="self-first">
                    Vorname
                  </label>
                  <input
                    ref={firstNameRef}
                    id="self-first"
                    type="text"
                    autoComplete="given-name"
                    value={selfFirstName}
                    onChange={e => setSelfFirstName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSelf() }}
                    placeholder="z. B. Max"
                    className="h-12 px-4 rounded-xl border border-stone-200 text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-stone-700" htmlFor="self-last">
                    Nachname
                  </label>
                  <input
                    id="self-last"
                    type="text"
                    autoComplete="family-name"
                    value={selfLastName}
                    onChange={e => setSelfLastName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSelf() }}
                    placeholder="z. B. Mustermann"
                    className="h-12 px-4 rounded-xl border border-stone-200 text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-stone-700" htmlFor="self-email">
                    Arbeits-E-Mail
                  </label>
                  <input
                    id="self-email"
                    type="email"
                    autoComplete="work email"
                    value={selfEmail}
                    onChange={e => setSelfEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSelf() }}
                    placeholder="z. B. max.mustermann@firma.de"
                    className="h-12 px-4 rounded-xl border border-stone-200 text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                  />
                </div>
              </div>

              {previewName && (
                <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-4 py-2.5">
                  Dein Name in der Liste: <strong className="text-stone-900">{previewName}</strong>
                </p>
              )}

              {addSelfError && (
                <p className="text-sm text-red-600">{addSelfError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddSelfOpen(false)}
                  className="h-11 px-5 rounded-xl text-base font-medium text-stone-700 hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleAddSelf}
                  disabled={addingMember || !selfFirstName.trim()}
                  className="h-11 px-5 rounded-xl text-base font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  {addingMember ? 'Speichern…' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (step === 'item') {
    return (
      <FlowShell
        step={stepIndex}
        totalSteps={4}
        onBack={() => {
          setCart(new Map())
          setStep('member')
        }}
        header={
          <>
            <p className="text-sm font-medium text-stone-600 uppercase tracking-[0.06em]">
              {selectedMember ? getDisplayName(selectedMember.name, members.filter(x => x.id !== selectedMember.id).map(x => x.name)) : ''} · {selectedCompany?.name}
            </p>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Was hast du genommen?</h1>
          </>
        }
        footer={
          cartCount > 0 ? (
            <>
              <span className="text-base font-medium text-stone-700">
                {cartCount} {cartCount === 1 ? 'Artikel' : 'Artikel'} · {formatPrice(cartTotal)}
              </span>
              <div className="flex-1" />
              <BigButton variant="secondary" onClick={() => setCart(new Map())}>
                Auswahl löschen
              </BigButton>
              <BigButton variant="primary" onClick={() => setStep('confirm')}>
                Weiter
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                name={item.name}
                price={formatPrice(item.price_cents)}
                category={item.category as 'coffee' | 'drink' | 'snack' | 'food' | 'other'}
                quantity={cart.get(item.id)?.quantity ?? 0}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>
        </div>
      </FlowShell>
    )
  }

  if (step === 'confirm' && selectedMember && selectedCompany && cartEntries.length > 0) {
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
          <div className="flex justify-between items-center border-b border-stone-200 pb-3.5">
            <span className="text-sm text-stone-600 uppercase tracking-[0.06em]">Person</span>
            <span className="text-xl font-semibold text-stone-900">{getDisplayName(selectedMember.name, members.filter(x => x.id !== selectedMember.id).map(x => x.name))}</span>
          </div>
          <div className="flex justify-between items-center border-b border-stone-200 pb-3.5">
            <span className="text-sm text-stone-600 uppercase tracking-[0.06em]">Unternehmen</span>
            <span className="text-xl font-semibold text-stone-900">{selectedCompany.name}</span>
          </div>
          {cartEntries.map(({ item, quantity }) => (
            <div
              key={item.id}
              className="flex justify-between items-center border-b border-stone-200 pb-3.5 last:border-0 last:pb-0"
            >
              <span className="text-base text-stone-700">{quantity} × {item.name}</span>
              <span className="text-xl font-semibold text-stone-900">{formatPrice(item.price_cents * quantity)}</span>
            </div>
          ))}
          {cartEntries.length > 1 && (
            <div className="flex justify-between items-center pt-1 border-t border-stone-200">
              <span className="text-sm font-medium text-stone-900 uppercase tracking-[0.06em]">Gesamt</span>
              <span className="text-xl font-bold text-stone-900">{formatPrice(cartTotal)}</span>
            </div>
          )}
        </div>
      </FlowShell>
    )
  }

  return null
}
