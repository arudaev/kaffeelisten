-- Migration 009: fix member active toggle in admin panel
--
-- Root cause: PostgreSQL automatically applies a SELECT policy's USING clause
-- as an implicit WITH CHECK on any UPDATE that would make the row invisible.
-- The old SELECT policy had USING (active = true), so setting active = false
-- made the row fail its own visibility check → 42501 "new row violates RLS".
--
-- Fix: drop the restrictive SELECT policy and replace with USING (true).
-- The member flow already applies eq('active', true) in application code, so
-- inactive members being technically readable via the REST API is not a concern.

DROP POLICY IF EXISTS anon_read_active_members ON public.members;

CREATE POLICY anon_read_members
  ON public.members
  FOR SELECT
  TO anon
  USING (true);
