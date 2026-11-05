// Which deployment is this, and is it allowed to touch what it is configured for?
// Shared by the browser bundle (src/main.tsx, via src/lib/environment.ts) and the serverless API
// (adminAuth.ts, mail.ts, report.ts). Rules: docs/environments.md.

/**
 * Supabase project ref of PRODUCTION. Not a secret: it is part of the public
 * project URL and already named in supabase/config.toml.
 */
export const PRODUCTION_SUPABASE_REF = 'fdnfdscpefxqvtggbbbr'

/**
 * Is this the public demo?
 *
 * The demo at demo.kaffeelisten.de runs the same code as a campus instance on
 * invented data, open to anyone. Because anyone can reach it, whole features are
 * switched off rather than merely hidden: it must not be able to send mail to a
 * real person, run a month end, or touch invoicing.
 *
 * Set DEMO_MODE=1 on that deployment and nowhere else. A campus instance and
 * production never set it.
 *
 * Takes the raw value rather than reading process.env, because this module is
 * also compiled into the browser bundle, where process does not exist.
 */
export function isDemoDeployment(demoMode: string | undefined): boolean {
  const v = demoMode?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Admin endpoints the demo refuses, by their path segment under /api/admin.
 *
 * Invoicing, documents and payments are meaningless without a real company and
 * are legally gated for ITC1; report progress only reports on a run the demo
 * never performs. Off here means 410 from the server, not merely hidden in the
 * interface - a public deployment should not rely on its own UI for that.
 */
export const DEMO_DISABLED_ADMIN_ROUTES = ['billing', 'documents', 'payments', 'report-progress'] as const

/**
 * Admin auth actions the demo refuses, by their `action` query value.
 *
 * All three change or recover the admin credential, and the demo's credential is
 * published on its own login screen. `request-reset` would mail a code to a real
 * address; `reset` and `change` would let one visitor rotate the PIN and lock out
 * everyone who comes next, including the person being shown the product.
 *
 * Off here means 410 from the server, not merely hidden in the interface.
 */
export const DEMO_DISABLED_AUTH_ACTIONS = ['request-reset', 'reset', 'change'] as const

/**
 * The demo's admin PIN, or null when this is not the demo.
 *
 * On the demo the PIN is NOT read from the database: a visitor must not be able
 * to lock out the next one, and the demo has to stay reachable across the data
 * resets that wipe `app_settings`. Takes raw values because this module is also
 * compiled into the browser bundle.
 */
export function demoAdminPin(demoMode: string | undefined, demoPin: string | undefined): string | null {
  if (!isDemoDeployment(demoMode)) return null
  const pin = demoPin?.trim()
  return pin ? pin : null
}

/** Vercel's VERCEL_ENV: 'production' | 'preview' | 'development'; undefined off Vercel. */
export function isProductionDeployment(vercelEnv: string | undefined): boolean {
  return vercelEnv === 'production'
}

export function isProductionDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname.split('.')[0] === PRODUCTION_SUPABASE_REF
  } catch {
    return false
  }
}

/**
 * A preview, `vercel dev` or local run must never read or write production data.
 * Returns a German error message when the configuration is not allowed, else null.
 */
export function databaseConfigError(url: string | undefined, vercelEnv: string | undefined): string | null {
  if (isProductionDeployment(vercelEnv) || !isProductionDatabaseUrl(url)) return null
  return 'Diese Vorschau ist mit der Produktionsdatenbank verbunden. Aus Sicherheitsgründen ist das gesperrt – bitte die Staging-Umgebungsvariablen setzen (docs/environments.md).'
}

export interface MailRecipients {
  to: string[]
  cc: string[]
  bcc: string[]
  blocked: string[]
}

/**
 * Outside production, keep only recipients whose address or domain is on the
 * allowlist (comma-separated, default `example.com`). In production, pass all.
 */
export function filterRecipients(
  input: { to: string | string[]; cc?: string | string[]; bcc?: string | string[] },
  vercelEnv: string | undefined,
  allowlist: string | undefined,
): MailRecipients {
  const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])
  const all = { to: list(input.to), cc: list(input.cc), bcc: list(input.bcc) }
  if (isProductionDeployment(vercelEnv)) return { ...all, blocked: [] }

  const allowed = (allowlist ?? 'example.com')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const ok = (addr: string): boolean => {
    // Accept "Name <a@b>" as well as a bare address.
    const email = (/<([^>]+)>/.exec(addr)?.[1] ?? addr).trim().toLowerCase()
    const domain = email.split('@')[1] ?? ''
    return allowed.some(a => (a.includes('@') ? a === email : domain === a || domain.endsWith(`.${a}`)))
  }
  const blocked: string[] = []
  const keep = (xs: string[]): string[] => xs.filter(x => (ok(x) ? true : (blocked.push(x), false)))
  return { to: keep(all.to), cc: keep(all.cc), bcc: keep(all.bcc), blocked }
}

/**
 * True when the allowlist names this exact address (not just its domain). Outside
 * production such a recipient is a real test inbox and receives the email itself,
 * even when MAIL_SINK redirects the domain-allowed test addresses.
 */
export function isExactlyAllowed(addr: string, allowlist: string | undefined): boolean {
  const email = (/<([^>]+)>/.exec(addr)?.[1] ?? addr).trim().toLowerCase()
  return (allowlist ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .some(a => a.includes('@') && a === email)
}

/** Subject prefix that makes a non-production email unmistakable. */
export function subjectFor(subject: string, vercelEnv: string | undefined): string {
  return isProductionDeployment(vercelEnv) ? subject : `[STAGING] ${subject}`
}
