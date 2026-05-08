// Deletes all transactions and members from Supabase so you can start fresh.
// Usage (from repo root):
//   node --env-file=.env scripts/reset-members.mjs
//
// Requires in .env:
//   VITE_SUPABASE_URL        (e.g. https://xxxx.supabase.co)
//   SUPABASE_ACCESS_TOKEN    (Management API token from supabase.com/dashboard/account/tokens)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl || !accessToken) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env')
  process.exit(1)
}

// Extract project ref from URL (https://<ref>.supabase.co)
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${JSON.stringify(body)}`)
  return body
}

console.log(`Project: ${projectRef}`)

console.log('Deleting transactions...')
await sql('DELETE FROM transactions')
console.log('  ✓ transactions cleared')

console.log('Deleting members...')
await sql('DELETE FROM members')
console.log('  ✓ members cleared')

console.log('\nDone. DB is clean — add fresh members through the UI.')
