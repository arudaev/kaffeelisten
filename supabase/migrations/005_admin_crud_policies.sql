-- Admin CRUD write permissions via anon key.
-- The admin route is PIN-protected server-side; RLS is hardened in Phase 1
-- with session-based auth instead of stateless PIN.

grant insert, update on public.companies to anon;
grant insert, update on public.members   to anon;
grant insert, update on public.items     to anon;

create policy "anon_insert_companies" on public.companies
  for insert to anon with check (true);

create policy "anon_update_companies" on public.companies
  for update to anon using (true) with check (true);

create policy "anon_update_members" on public.members
  for update to anon using (true) with check (true);

create policy "anon_insert_items" on public.items
  for insert to anon with check (true);

create policy "anon_update_items" on public.items
  for update to anon using (true) with check (true);
