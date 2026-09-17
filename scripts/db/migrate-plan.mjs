// Pure planning for scripts/db/migrate.mjs; tested in apps/web/test/migrate-plan.test.ts.
// History is Supabase CLI compatible: supabase_migrations.schema_migrations(version, name, statements).

const NAME_RE = /^(\d+)_(.+)\.sql$/

export function parseMigrationName(file) {
  const m = NAME_RE.exec(file)
  return m ? { version: m[1], name: m[2] } : null
}

/**
 * @param {string[]} files  migration filenames in supabase/migrations
 * @param {string[]} applied  versions recorded in schema_migrations
 * @returns {{ pending: { file: string, version: string, name: string }[], errors: string[] }}
 */
export function planMigrations(files, applied) {
  const done = new Set(applied)
  const errors = []
  const parsed = files
    .map(file => ({ file, ...parseMigrationName(file) }))
    .filter(m => m.version)
    .sort((a, b) => a.version.localeCompare(b.version))

  const known = new Set(parsed.map(m => m.version))
  for (const v of applied) {
    if (!known.has(v)) errors.push(`database has migration ${v}, which is not in the repository`)
  }

  const highestApplied = applied.length ? [...applied].sort().at(-1) : null
  const pending = parsed.filter(m => !done.has(m.version))
  for (const m of pending) {
    // Applying an older file after newer ones ran means someone merged out of order.
    if (highestApplied && m.version < highestApplied) {
      errors.push(`${m.file} is older than already-applied ${highestApplied}; renumber it above ${highestApplied}`)
    }
  }
  return { pending, errors }
}

/** One transaction: the migration plus its history row, so a failure records nothing. */
export function wrapMigration(sql, version, name) {
  const dollar = '$kl_migration$'
  if (sql.includes(dollar)) throw new Error(`${version}_${name}: contains reserved quote tag ${dollar}`)
  return [
    'begin;',
    sql,
    ';',
    `insert into supabase_migrations.schema_migrations (version, name, statements) values ('${version}', '${name.replace(/'/g, "''")}', array[${dollar}${sql}${dollar}]);`,
    'commit;',
  ].join('\n')
}

export const HISTORY_DDL = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);`
