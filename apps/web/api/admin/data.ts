// PIN-protected admin data API (service-role). Replaces the direct anon-key
// reads/writes the admin panel used to do client-side, which required leaving
// members/transactions/companies/items wide open to the public key (see
// migration 015). All admin data access now flows through here.
//
//   GET    /api/admin/data?resource=companies|items|members
//   GET    /api/admin/data?resource=dashboard         → { transactions, members, companies, items }
//   POST   /api/admin/data?resource=companies|items|members   body: { values }
//   PATCH  /api/admin/data?resource=companies|items|members   body: { id, values }
//
// Never exposes secrets. Reads work_email only for the admin (members/dashboard).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { resolveMx, resolve } from 'node:dns/promises'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'
import { sendMemberConfirmation } from '../_lib/confirmationEmail'

// Request origin (e.g. https://kaffeelisten.de) for building confirmation links.
function baseUrl(req: VercelRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'https'
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'kaffeelisten.de'
  return `${proto}://${host}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX = 120
const UNIT_MAX = 40
const PRICE_MAX = 1_000_000 // €10 000 in cents — generous upper bound
const CATEGORIES = ['coffee', 'drink', 'snack', 'food', 'other'] as const

type Resource = 'companies' | 'items' | 'members'
const RESOURCES: Resource[] = ['companies', 'items', 'members']

type Ok<T> = { value: T }
type Err = { error: string }
const isErr = <T>(r: Ok<T> | Err): r is Err => 'error' in r

function reqStr(v: unknown, field: string, max: number): Ok<string> | Err {
  if (typeof v !== 'string' && typeof v !== 'number') return { error: `${field} fehlt.` }
  const s = String(v).trim()
  if (s.length === 0) return { error: `${field} fehlt.` }
  if (s.length > max) return { error: `${field} ist zu lang (max. ${max} Zeichen).` }
  return { value: s }
}

// ── per-resource validation ───────────────────────────────────────────────────

interface CompanyValues { name: string; active: boolean }
function validateCompany(body: Record<string, unknown>, partial: boolean): Ok<Partial<CompanyValues>> | Err {
  const out: Partial<CompanyValues> = {}
  if (!partial || body.name !== undefined) {
    const name = reqStr(body.name, 'Name', NAME_MAX)
    if (isErr(name)) return name
    out.name = name.value
  }
  if (!partial || body.active !== undefined) out.active = Boolean(body.active ?? true)
  return { value: out }
}

interface ItemValues {
  name: string; unit_label: string; price_cents: number; category: string; active: boolean
}
function validateItem(body: Record<string, unknown>, partial: boolean): Ok<Partial<ItemValues>> | Err {
  const out: Partial<ItemValues> = {}
  if (!partial || body.name !== undefined) {
    const name = reqStr(body.name, 'Name', NAME_MAX)
    if (isErr(name)) return name
    out.name = name.value
  }
  if (!partial || body.unit_label !== undefined) {
    const unit = String(body.unit_label ?? '').trim()
    if (unit.length > UNIT_MAX) return { error: `Einheit ist zu lang (max. ${UNIT_MAX} Zeichen).` }
    out.unit_label = unit || 'Stück'
  }
  if (!partial || body.price_cents !== undefined) {
    const price = Number(body.price_cents)
    if (!Number.isInteger(price) || price < 0 || price > PRICE_MAX) {
      return { error: 'Preis muss eine ganze Zahl in Cent zwischen 0 und 1 000 000 sein.' }
    }
    out.price_cents = price
  }
  if (!partial || body.category !== undefined) {
    const cat = String(body.category)
    if (!CATEGORIES.includes(cat as (typeof CATEGORIES)[number])) {
      return { error: `Ungültige Kategorie: ${cat}` }
    }
    out.category = cat
  }
  if (!partial || body.active !== undefined) out.active = Boolean(body.active ?? true)
  return { value: out }
}

// Confirm the email domain can actually receive mail, so obvious typos
// (anna@gmial.com, chef@firma.col) are caught before a per-member statement is
// ever addressed to a dead domain. Checks MX records, falling back to A/AAAA
// per RFC 5321. Fails OPEN on transient DNS trouble (timeout, SERVFAIL): a flaky
// resolver must never block a legitimate save — only a domain that definitively
// does not exist / accepts no mail is rejected.
async function domainAcceptsMail(domain: string): Promise<Ok<true> | Err> {
  const NOT_DELIVERABLE = new Set(['ENOTFOUND', 'ENODATA', 'NOTFOUND'])
  const reject: Err = { error: 'Die E-Mail-Domain existiert nicht oder empfängt keine E-Mails.' }
  const withTimeout = <T>(p: Promise<T>) =>
    Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error('ETIMEOUT')), 3000))])
  try {
    const mx = await withTimeout(resolveMx(domain))
    return mx.length > 0 ? { value: true } : reject
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? ''
    if (!NOT_DELIVERABLE.has(code)) return { value: true } // transient → fail open
    // No MX record: RFC 5321 allows delivery to the A/AAAA host as a fallback.
    try {
      const addrs = await withTimeout(resolve(domain))
      return addrs.length > 0 ? { value: true } : reject
    } catch (err2) {
      const code2 = (err2 as NodeJS.ErrnoException).code ?? ''
      return NOT_DELIVERABLE.has(code2) ? reject : { value: true }
    }
  }
}

interface MemberValues { name: string; company_id: string; work_email: string; active: boolean }
async function validateMember(
  supabase: ReturnType<typeof makeAdminClient>,
  body: Record<string, unknown>,
  partial: boolean,
): Promise<Ok<Partial<MemberValues>> | Err> {
  const out: Partial<MemberValues> = {}
  if (!partial || body.name !== undefined) {
    const name = reqStr(body.name, 'Name', NAME_MAX)
    if (isErr(name)) return name
    out.name = name.value
  }
  if (!partial || body.work_email !== undefined) {
    const email = String(body.work_email ?? '').trim()
    if (!email || !EMAIL_RE.test(email)) return { error: 'Ungültige Arbeits-E-Mail-Adresse.' }
    if (email.length > NAME_MAX) return { error: 'E-Mail-Adresse ist zu lang.' }
    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
    const deliverable = await domainAcceptsMail(domain)
    if (isErr(deliverable)) return deliverable
    out.work_email = email
  }
  if (!partial || body.company_id !== undefined) {
    const cid = String(body.company_id ?? '').trim()
    if (!cid) return { error: 'Unternehmen fehlt.' }
    const { data, error } = await supabase.from('companies').select('id').eq('id', cid).maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Unbekanntes Unternehmen.' }
    out.company_id = cid
  }
  if (!partial || body.active !== undefined) out.active = Boolean(body.active ?? true)
  return { value: out }
}

function parseResource(req: VercelRequest): Resource | null {
  const raw = req.query.resource
  const r = Array.isArray(raw) ? raw[0] : raw
  return RESOURCES.includes(r as Resource) ? (r as Resource) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET'
  if (!['GET', 'POST', 'PATCH'].includes(method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const supabase = makeAdminClient()

    // ── GET ─────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const rawResource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource

      if (rawResource === 'dashboard') {
        const [txRes, membersRes, companiesRes, itemsRes] = await Promise.all([
          supabase.from('transactions').select('id, member_id, company_id, item_id, quantity, logged_at').order('logged_at', { ascending: false }),
          supabase.from('members').select('id, name, work_email'),
          supabase.from('companies').select('id, name, active').eq('active', true).order('name'),
          supabase.from('items').select('id, name, price_cents'),
        ])
        const firstErr = txRes.error || membersRes.error || companiesRes.error || itemsRes.error
        if (firstErr) throw new Error(firstErr.message)
        return res.status(200).json({
          transactions: txRes.data ?? [],
          members: membersRes.data ?? [],
          companies: companiesRes.data ?? [],
          items: itemsRes.data ?? [],
        })
      }

      const resource = parseResource(req)
      if (!resource) return res.status(400).json({ error: 'Unbekannte Ressource.' })

      if (resource === 'companies') {
        const { data, error } = await supabase.from('companies').select('id, name, active').order('name')
        if (error) throw new Error(error.message)
        return res.status(200).json({ companies: data ?? [] })
      }
      if (resource === 'items') {
        const { data, error } = await supabase.from('items').select('id, name, unit_label, price_cents, category, active').order('name')
        if (error) throw new Error(error.message)
        return res.status(200).json({ items: data ?? [] })
      }
      // members
      const { data, error } = await supabase.from('members').select('id, name, company_id, work_email, active, email_verified_at').order('name')
      if (error) throw new Error(error.message)
      return res.status(200).json({ members: data ?? [] })
    }

    // ── writes (POST create / PATCH update) ───────────────────────────────────
    const resource = parseResource(req)
    if (!resource) return res.status(400).json({ error: 'Unbekannte Ressource.' })

    // Manual resend of a member's confirmation email (POST ?resource=members&action=send-confirmation).
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action
    if (action === 'send-confirmation') {
      if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      if (resource !== 'members') return res.status(400).json({ error: 'Nur für Mitarbeitende möglich.' })
      const id = String((req.body as { id?: unknown })?.id ?? '').trim()
      if (!id) return res.status(400).json({ error: 'id fehlt.' })
      const { data: member, error } = await supabase
        .from('members').select('id, name, work_email').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      if (!member) return res.status(404).json({ error: 'Mitarbeitende(r) nicht gefunden.' })
      const ok = await sendMemberConfirmation(supabase, member, baseUrl(req))
      if (!ok) return res.status(502).json({ error: 'Bestätigungs-E-Mail konnte nicht gesendet werden.' })
      return res.status(200).json({ ok: true })
    }

    const body = (req.body ?? {}) as { id?: unknown; values?: unknown }
    const values = (body.values ?? {}) as Record<string, unknown>
    const partial = method === 'PATCH'

    let validated: Ok<Record<string, unknown>> | Err
    if (resource === 'companies') validated = validateCompany(values, partial)
    else if (resource === 'items') validated = validateItem(values, partial)
    else validated = await validateMember(supabase, values, partial)
    if (isErr(validated)) return res.status(400).json({ error: validated.error })

    if (method === 'POST') {
      if (resource === 'members') {
        // Capture the new id so we can send the confirmation email. The send is
        // non-fatal: the member is already created and the admin can resend.
        const { data, error } = await supabase
          .from('members').insert(validated.value as never).select('id, name, work_email').single()
        if (error) throw new Error(error.message)
        await sendMemberConfirmation(supabase, data, baseUrl(req))
        return res.status(201).json({ ok: true })
      }
      const { error } = await supabase.from(resource).insert(validated.value as never)
      if (error) throw new Error(error.message)
      return res.status(201).json({ ok: true })
    }

    // PATCH — requires an id
    const id = String(body.id ?? '').trim()
    if (!id) return res.status(400).json({ error: 'id fehlt.' })
    if (Object.keys(validated.value).length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen übermittelt.' })
    }

    if (resource === 'members') {
      const patch = { ...(validated.value as Record<string, unknown>) }
      let emailChanged = false
      if (typeof patch.work_email === 'string') {
        const { data: current, error: curErr } = await supabase
          .from('members').select('work_email').eq('id', id).maybeSingle()
        if (curErr) throw new Error(curErr.message)
        emailChanged = !current || current.work_email !== patch.work_email
        // A new address is unverified until the member confirms it.
        if (emailChanged) patch.email_verified_at = null
      }
      const { error } = await supabase.from('members').update(patch as never).eq('id', id)
      if (error) throw new Error(error.message)
      if (emailChanged) {
        const { data: member } = await supabase
          .from('members').select('id, name, work_email').eq('id', id).maybeSingle()
        if (member) await sendMemberConfirmation(supabase, member, baseUrl(req))
      }
      return res.status(200).json({ ok: true })
    }

    const { error } = await supabase.from(resource).update(validated.value as never).eq('id', id)
    if (error) throw new Error(error.message)
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/data]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
