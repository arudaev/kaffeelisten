// Which deployment is this, and is it allowed to touch what it is configured for?
// Shared by the browser bundle (src/lib/supabase.ts) and the serverless API
// (api/_lib/adminAuth.ts, api/_lib/mail.ts). Rules: docs/environments.md.

/**
 * Supabase project ref of PRODUCTION. Not a secret: it is part of the public
 * project URL and already named in supabase/config.toml.
 */
export const PRODUCTION_SUPABASE_REF = 'fdnfdscpefxqvtggbbbr'

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

/** Subject prefix that makes a non-production email unmistakable. */
export function subjectFor(subject: string, vercelEnv: string | undefined): string {
  return isProductionDeployment(vercelEnv) ? subject : `[STAGING] ${subject}`
}
