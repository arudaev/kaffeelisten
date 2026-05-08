-- Migration: 004_anon_insert_members
-- Members can add themselves during the logging flow (member step).
-- Without INSERT permission the anon role gets a 403 when trying to
-- create a new member record from the client. The name is standardized
-- by the frontend (Vorname N. format) before insertion.

grant insert on public.members to anon;

create policy "anon_insert_members" on members
  for insert to anon
  with check (true);
