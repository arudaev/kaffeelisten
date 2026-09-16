// Pure rules for supabase/migrations. The CLI wrapper is scripts/lint-migrations.mjs;
// the tests are apps/web/test/migration-lint.test.ts. Rules and their reasons are
// documented in docs/environments.md.

/** Migrations before this number were applied to production by hand and predate the phase tags. */
export const FIRST_TAGGED = 30

const NAME_RE = /^(\d{3})_[a-z0-9_]+\.sql$/
const PHASE_RE = /^--\s*deploy:\s*(pre|post)\s*$/im
const DESTRUCTIVE_RE = /\b(drop\s+(table|column|schema)|delete\s+from|truncate)\b/i
const DESTRUCTIVE_OK_RE = /^--\s*destructive:\s*approved\b/im

/** Strip `--` line comments so a statement mentioned in prose is not flagged. */
function stripComments(sql) {
  return sql
    .split('\n')
    .map(line => line.replace(/--.*$/, ''))
    .join('\n')
}

export function phaseOf(sql) {
  const m = PHASE_RE.exec(sql)
  return m ? m[1].toLowerCase() : null
}

/**
 * @param {{ name: string, sql: string }[]} files  every migration on this branch
 * @param {string[]} mainNames  migration filenames already on main
 * @returns {string[]} human-readable errors; empty when the set is valid
 */
export function lintMigrations(files, mainNames) {
  const errors = []
  const onMain = new Set(mainNames)
  const mainMax = Math.max(0, ...mainNames.map(n => Number(NAME_RE.exec(n)?.[1] ?? 0)))
  const seen = new Map()

  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))
  for (const f of sorted) {
    const m = NAME_RE.exec(f.name)
    if (!m) {
      errors.push(`${f.name}: name must look like 040_short_description.sql`)
      continue
    }
    const num = Number(m[1])
    if (seen.has(num)) errors.push(`${f.name}: number ${m[1]} is already used by ${seen.get(num)}`)
    seen.set(num, f.name)

    if (num >= FIRST_TAGGED && !phaseOf(f.sql)) {
      errors.push(`${f.name}: missing "-- deploy: pre" or "-- deploy: post" header`)
    }
    if (!onMain.has(f.name) && num <= mainMax) {
      errors.push(`${f.name}: new migration must be numbered above ${String(mainMax).padStart(3, '0')} (highest on main)`)
    }
    if (num >= FIRST_TAGGED && DESTRUCTIVE_RE.test(stripComments(f.sql)) && !DESTRUCTIVE_OK_RE.test(f.sql)) {
      errors.push(`${f.name}: drops or deletes data; add "-- destructive: approved" after owner review`)
    }
  }

  // The CLI applies pending migrations strictly in order. A post-deploy migration
  // followed by a pre-deploy one in the same change cannot be split around the deploy.
  const pending = sorted.filter(f => !onMain.has(f.name) && NAME_RE.test(f.name))
  let firstPost = null
  for (const f of pending) {
    const phase = phaseOf(f.sql)
    if (phase === 'post' && !firstPost) firstPost = f.name
    if (phase === 'pre' && firstPost) {
      errors.push(`${f.name}: pre-deploy migration after post-deploy ${firstPost}; move ${firstPost} to a follow-up PR`)
    }
  }
  return errors
}
