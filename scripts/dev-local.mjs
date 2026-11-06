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

const status = capture('supabase', ['status']) ?? ''
const apiUrl = status.match(/API URL:\s*(\S+)/)?.[1]
if (apiUrl) {
  console.log(`\n  API      ${apiUrl}`)
  console.log(`  Studio   ${status.match(/Studio URL:\s*(\S+)/)?.[1] ?? '?'}`)
  console.log(`  Inbucket ${status.match(/(?:Inbucket|Mailpit) URL:\s*(\S+)/)?.[1] ?? '?'}  (every email lands here, nothing is sent)`)
}

if (noDev) {
  console.log('\n  Stack is up. Skipping vite (--no-dev).\n')
  process.exit(0)
}

console.log('\n  Starting vite against the local stack...\n')
run('npm', ['run', 'dev'])
