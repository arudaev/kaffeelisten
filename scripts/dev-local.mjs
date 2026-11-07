#!/usr/bin/env node
// Bring up the whole instance locally, then run the app against it.
//
//   npm run dev:local              start the stack, reset the database, run vite
//   npm run dev:local -- --no-dev  stack and database only (for CI or tests)
//   npm run dev:local -- --reset   force a database reset even if one is not needed
//
// The Supabase CLI owns local migrations: `db reset` applies every file in
// supabase/migrations in order and then supabase/seed.sql. scripts/db/migrate.mjs
// is for remote projects through the Management API and has no local mode.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createConnection } from 'node:net'

const args = process.argv.slice(2)
const noDev = args.includes('--no-dev')
const forceReset = args.includes('--reset')

const CONFIG = 'supabase/config.toml'

function die(msg, ...rest) {
  console.error(`\n  ${msg}`)
  for (const line of rest) console.error(`  ${line}`)
  console.error('')
  process.exit(1)
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  if (r.status !== 0) die(`\`${cmd} ${cmdArgs.join(' ')}\` failed with status ${r.status}.`)
  return r
}

function capture(cmd, cmdArgs) {
  try {
    return execFileSync(cmd, cmdArgs, { encoding: 'utf8', shell: process.platform === 'win32' }).trim()
  } catch {
    return null
  }
}

/** Ports this project's config.toml asks for. */
function configuredPorts() {
  const text = readFileSync(CONFIG, 'utf8')
  const ports = new Set()
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:port|shadow_port)\s*=\s*(\d+)/)
    if (m) ports.add(Number(m[1]))
  }
  return [...ports].sort((a, b) => a - b)
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const done = (inUse) => { socket.destroy(); resolve(inUse) }
    socket.setTimeout(400)
    socket.on('connect', () => done(true))
    socket.on('timeout', () => done(false))
    socket.on('error', () => done(false))
  })
}

// --- preflight ---------------------------------------------------------------

if (!capture('docker', ['info', '--format', '{{.ServerVersion}}'])) {
  die('Docker is not running.', 'The local Supabase stack runs in containers; start Docker and try again.')
}

if (!capture('supabase', ['--version'])) {
  die('The Supabase CLI is not installed.', 'npm install -g supabase, or see supabase.com/docs/guides/local-development.')
}

// Containers this project already owns are fine; another project's are not.
const ours = (capture('docker', ['ps', '--filter', 'name=supabase_', '--format', '{{.Names}}']) || '')
  .split('\n').filter((n) => n.endsWith('_kaffeelisten'))
const alreadyUp = ours.length > 0

if (!alreadyUp) {
  const taken = []
  for (const port of configuredPorts()) if (await portInUse(port)) taken.push(port)
  if (taken.length) {
    const others = (capture('docker', ['ps', '--filter', 'name=supabase_', '--format', '{{.Names}}']) || '')
      .split('\n').filter(Boolean)
    const otherProjects = [...new Set(others.map((n) => n.replace(/^supabase_[a-z_]+_/, '')))]
    die(
      `Ports already in use: ${taken.join(', ')}.`,
      otherProjects.length
        ? `Another Supabase stack is running: ${otherProjects.join(', ')}.`
        : 'Something else is listening on them.',
      '',
      'This project deliberately uses the 544xx block so it can run alongside',
      'another local Supabase project. If these are still taken, either stop the',
      `other stack (supabase stop --project-id ${otherProjects[0] ?? '<id>'}) or move`,
      `the ports in ${CONFIG}.`,
    )
  }
}

// --- the stack ---------------------------------------------------------------

console.log(alreadyUp ? '\n  Stack already running.\n' : '\n  Starting the local stack...\n')
if (!alreadyUp) run('supabase', ['start'])

// `db reset` is destructive, which is the point locally: migrations from
// scratch, then the seed, so the database always matches the repository.
if (!alreadyUp || forceReset) {
  console.log('\n  Applying migrations and the seed...\n')
  run('supabase', ['db', 'reset'])
} else {
  console.log('  Skipping db reset (stack was already up). Pass --reset to force one.\n')
}

// --- a shape check, not a smoke test -----------------------------------------

// CLI v3 prints `status` as a JSON object (preceded by warnings and a
// "Stopped services" line); v2 printed an aligned "KEY: value" table. Parse
// whichever we get, so this works either side of the upgrade.
function readStatus() {
  const raw = capture('supabase', ['status']) ?? ''
  const brace = raw.indexOf('{')
  if (brace !== -1) {
    try {
      const j = JSON.parse(raw.slice(brace))
      return {
        api: j.API_URL,
        studio: j.STUDIO_URL,
        mail: j.MAILPIT_URL ?? j.INBUCKET_URL,
        anon: j.ANON_KEY ?? j.PUBLISHABLE_KEY,
        linked: j.linked_project?.project_ref,
      }
    } catch { /* fall through to the v2 shape */ }
  }
  return {
    api: raw.match(/API URL:\s*(\S+)/)?.[1],
    studio: raw.match(/Studio URL:\s*(\S+)/)?.[1],
    mail: raw.match(/(?:Inbucket|Mailpit) URL:\s*(\S+)/)?.[1],
    anon: raw.match(/anon key:\s*(\S+)/)?.[1],
    linked: undefined,
  }
}

const status = readStatus()
const apiUrl = status.api
if (apiUrl) {
  console.log(`\n  API      ${apiUrl}`)
  console.log(`  Studio   ${status.studio ?? '?'}`)
  console.log(`  Mail     ${status.mail ?? '?'}  (every email lands here, nothing is sent)`)
}

if (noDev) {
  console.log('\n  Stack is up. Skipping vite (--no-dev).\n')
  process.exit(0)
}

// Point the app at the local stack without touching apps/web/.env.local.
// Vite gives real environment variables precedence over .env files, so these
// override whatever that file says, for this process only.
//
// Without this the UI runs against whatever .env.local points at — which today
// is a remote project. "Running it locally" while the browser talks to staging
// is the kind of thing that looks fine and proves nothing.
const anonKey = status.anon
if (!apiUrl || !anonKey) {
  die('Could not read the local API URL and anon key from `supabase status`.',
      'The stack is up but not reporting itself. Try `supabase stop`, then this again.')
}

console.log('\n  Starting vite against the LOCAL stack.')
console.log('  apps/web/.env.local is left alone; these override it for this run only.\n')
run('npm', ['run', 'dev'], {
  env: { ...process.env, VITE_SUPABASE_URL: apiUrl, VITE_SUPABASE_ANON_KEY: anonKey },
})
