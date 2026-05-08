-- Migration: 003_anon_read_transactions
-- The admin dashboard reads transactions via the anon key (client-side Supabase).
-- Without a SELECT policy the anon role sees an empty table even though inserts
-- succeed, so the admin log and summary cards always show zero entries.

create policy "anon_read_transactions" on transactions
  for select to anon
  using (true);
