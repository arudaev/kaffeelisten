// Re-inserts members (with proper full names) and sample transactions.
// Companies and items must already exist (run only after reset-members.mjs or a fresh seed).
// Usage (from repo root):
//   node --env-file=.env scripts/reseed-members.mjs

const supabaseUrl = process.env.VITE_SUPABASE_URL
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl || !accessToken) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env')
  process.exit(1)
}

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

console.log(`Project: ${projectRef}\n`)

console.log('Inserting members...')
await sql(`
  INSERT INTO members (id, company_id, name) VALUES
    -- Movemaster GmbH
    ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Alexander Rudaev'),
    ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Fares Bermawy'),
    ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Maria Keller'),
    -- DEGDEV UG
    ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Jonas Wagner'),
    ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Sophie Lang'),
    -- INN.KUBATOR
    ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'Tobias Müller'),
    ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', 'Anna Petermann'),
    -- Level51 e.V.
    ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 'Lukas Fischer'),
    -- THD Startup Campus
    ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000005', 'Emma Schmidt'),
    ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005', 'Noah Decker')
`)
console.log('  ✓ 10 members inserted')

console.log('Inserting transactions...')
await sql(`
  INSERT INTO transactions (member_id, company_id, item_id, quantity, logged_at) VALUES
    ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 1, now() - interval '5 days'),
    ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 1, now() - interval '4 days'),
    ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004', 1, now() - interval '4 days'),
    ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 1, now() - interval '3 days'),
    ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000007', 1, now() - interval '3 days'),
    ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 1, now() - interval '2 days'),
    ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 1, now() - interval '2 days'),
    ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000002', 1, now() - interval '1 day'),
    ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000009', 1, now() - interval '1 day'),
    ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', 1, now() - interval '6 hours')
`)
console.log('  ✓ 10 transactions inserted')

console.log('\nDone.')
