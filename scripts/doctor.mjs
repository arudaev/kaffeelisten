#!/usr/bin/env node
// Is the local instance actually healthy, and does it match the cloud?
//
//   npm run doctor            check everything, print a table
//   npm run doctor -- --json  machine-readable, for a watch loop or CI
//   npm run doctor -- --watch re-check every 5s until interrupted
//
// Every check answers one question a person would otherwise answer by
// clicking around: is the service up, does the schema match the migrations,
// is the app pointed at the right database, and did anything error.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const watch = args.includes('--watch')

const sh = (cmd, cmdArgs) => {
  try {
    return execFileSync(cmd, cmdArgs, { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch { return null }
}

const psql = (sql) =>
  sh('docker', ['exec', 'supabase_db_kaffeelisten', 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', `"${sql.replace(/"/g, '\\"')}"`])

async function http(url, headers = {}) {
  const started = Date.now()
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    return { code: r.status, ms: Date.now() - started }
  } catch {
    return { code: 0, ms: Date.now() - started }
  }
}

function ports() {
  const text = readFileSync('supabase/config.toml', 'utf8')
  const get = (section, key = 'port') => {
    const block = text.split(`[${section}]`)[1]?.split('\n[')[0] ?? ''
    return Number(block.match(new RegExp(`^\\s*${key}\\s*=\\s*(\\d+)`, 'm'))?.[1])
  }
  return { api: get('api'), db: get('db'), studio: get('studio'), mail: get('local_smtp') }
}

async function collect() {
  const p = ports()
  const checks = []
  const add = (name, ok, detail, hint) => checks.push({ name, ok, detail, hint })

  // --- services -------------------------------------------------------------
  const running = (sh('docker', ['ps', '--filter', 'name=_kaffeelisten', '--format', '{{.Names}}']) || '')
    .split('\n').filter(Boolean)
  add('Docker', sh('docker', ['info', '--format', '{{.ServerVersion}}']) !== null, 'daemon reachable', 'Start Docker Desktop.')
  add('Containers', running.length > 0, `${running.length} up`, 'npm run dev:local')

  const unhealthy = (sh('docker', ['ps', '--filter', 'name=_kaffeelisten', '--filter', 'health=unhealthy', '--format', '{{.Names}}']) || '')
    .split('\n').filter(Boolean)
  add('Container health', unhealthy.length === 0, unhealthy.length ? unhealthy.join(', ') : 'none unhealthy', 'docker logs <name>')

  const restarting = (sh('docker', ['ps', '--filter', 'name=_kaffeelisten', '--filter', 'status=restarting', '--format', '{{.Names}}']) || '')
    .split('\n').filter(Boolean)
  add('Restart loops', restarting.length === 0, restarting.length ? restarting.join(', ') : 'none', 'A container restarting in a loop never reports unhealthy.')

  // --- endpoints ------------------------------------------------------------
  const api = await http(`http://127.0.0.1:${p.api}/rest/v1/`)
  add('Supabase API', api.code === 200, `${api.code} in ${api.ms}ms`, `Nothing on :${p.api}. Is the stack up?`)
  const studio = await http(`http://127.0.0.1:${p.studio}`)
  add('Studio', studio.code > 0 && studio.code < 500, `${studio.code}`, `Nothing on :${p.studio}.`)
  const mail = await http(`http://127.0.0.1:${p.mail}`)
  add('Mail catcher', mail.code === 200, `${mail.code} — every email lands here`, `Nothing on :${p.mail}.`)
  const app = await http('http://127.0.0.1:5173')
  add('App (vite)', app.code === 200, app.code === 0 ? 'not running' : `${app.code}`, 'npm run dev — optional for a backend-only check.')

  // --- schema ---------------------------------------------------------------
  const applied = Number(psql('select count(*) from supabase_migrations.schema_migrations') ?? -1)
  const onDisk = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).length
  add('Migrations', applied === onDisk, `${applied} applied / ${onDisk} on disk`,
    applied < onDisk ? 'supabase db reset' : 'The database is ahead of the repository.')

  const pgLocal = (psql('show server_version') ?? '').split(' ')[0]
  const wantMajor = readFileSync('supabase/config.toml', 'utf8').match(/^\s*major_version\s*=\s*(\d+)/m)?.[1]
  add('Postgres version', pgLocal.startsWith(String(wantMajor)), `local ${pgLocal || '?'}, config wants ${wantMajor}, cloud runs 17`,
    'A migration proved on a different major version has not been proved.')

  const rlsOff = psql(`select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where t.schemaname='public' and not c.relrowsecurity`)
  add('RLS', rlsOff === '0', rlsOff === '0' ? 'enabled on every public table' : `${rlsOff} table(s) without RLS`,
    'Every table in an exposed schema needs RLS.')

  // --- data -----------------------------------------------------------------
  const members = psql('select count(*) from public.members')
  const noEmail = psql(`select count(*) from public.members where work_email is null and kind <> 'house'`)
  add('Seed data', members !== null && Number(members) > 0, `${members ?? 0} members`, 'supabase db reset')
  add('Member emails', noEmail === '0', noEmail === '0' ? 'all present' : `${noEmail} missing work_email`,
    'migration 034 requires work_email unless kind = house')

  // --- pointing at the right place -----------------------------------------
  const envUrl = (() => {
    try {
      return readFileSync('apps/web/.env.local', 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim() ?? ''
    } catch { return '' }
  })()
  const local = envUrl.includes('127.0.0.1') || envUrl.includes('localhost')
  const prod = envUrl.includes('fdnfdscpefxqvtggbbbr')
  add('.env.local target', !prod,
    prod ? 'PRODUCTION - stop' : (local ? 'local stack' : 'a remote project (dev:local overrides it)'),
    prod ? 'apps/web/.env.local points at ITC1 production. Change it before running anything.'
         : 'npm run dev:local overrides this per run, so the UI talks to the local stack either way.')

  return { checks, ports: p }
}

function render({ checks }) {
  const pad = Math.max(...checks.map((c) => c.name.length))
  const failed = checks.filter((c) => !c.ok)
  console.log('')
  for (const c of checks) {
    const mark = c.ok ? '  ok  ' : ' FAIL '
    console.log(`${mark} ${c.name.padEnd(pad)}  ${c.detail}`)
  }
  console.log('')
  if (failed.length) {
    console.log(`  ${failed.length} problem${failed.length > 1 ? 's' : ''}:`)
    for (const c of failed) if (c.hint) console.log(`    ${c.name}: ${c.hint}`)
    console.log('')
  }
  return failed.length
}

async function once() {
  const result = await collect()
  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
    return result.checks.filter((c) => !c.ok).length
  }
  return render(result)
}

if (watch) {
  for (;;) {
    process.stdout.write('\x1Bc')
    console.log(`  kaffeelisten doctor — ${new Date().toLocaleTimeString()}  (ctrl-c to stop)`)
    await once()
    await new Promise((r) => setTimeout(r, 5000))
  }
} else {
  process.exit((await once()) > 0 ? 1 : 0)
}
