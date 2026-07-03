-- Migration 015: RLS lockdown — remove the anonymous key's access to PII and
-- to admin data/operations.
--
-- Background: the member-facing flow is anonymous by design, so the `anon` role
-- (the public VITE_SUPABASE_ANON_KEY, shipped in the browser bundle) legitimately
-- needs a *narrow* slice of access. Migrations 002–005/009 granted it far more:
-- table-wide SELECT on members (incl. work_email) and transactions, plus
-- INSERT/UPDATE on companies, members and items. That let anyone with the public
-- key read every member's work email and every transaction, and corrupt the
-- catalogue — directly contradicting the privacy notice ("only campus admins
-- have access").
--
-- After this migration the anon role can ONLY:
--   • read active companies and items (for the selectors)
--   • read the non-PII columns (id, name, company_id, active) of active members
--   • insert its own member row (self-registration) and transactions (logging)
-- Everything else — reading work emails, reading transactions, and all
-- companies/members/items writes — now happens exclusively through the
-- PIN-protected, service-role serverless API (apps/web/api/admin/*).
--
-- NOTE: this does NOT yet validate the anon INSERT paths (quantity bounds,
-- member↔company consistency, rate limiting). That write-abuse hardening is a
-- separate follow-up (validated RPCs) tracked alongside the security audit.

-- ── transactions: drop anon read; keep anon insert (logging) ──────────────────
drop policy if exists anon_read_transactions on public.transactions;
revoke select on public.transactions from anon, authenticated;

-- ── members: expose only non-PII columns to anon; drop table-wide read/update ──
drop policy if exists anon_read_members       on public.members;
drop policy if exists anon_read_active_members on public.members;  -- legacy (pre-009)
drop policy if exists anon_update_members     on public.members;

revoke select, update on public.members from anon, authenticated;

-- Column-level SELECT: work_email (and created_at) are deliberately excluded, so
-- `select('*')` by the anon role now fails and only the whitelisted columns are
-- reachable. The member flow selects these columns explicitly.
grant select (id, name, company_id, active) on public.members to anon, authenticated;

-- Active members remain visible to the anonymous flow (name picker only).
create policy anon_read_members_public on public.members
  for select to anon
  using (active = true);

-- anon INSERT on members (self-registration) is retained from migration 004
-- (grant + policy anon_insert_members with check (true)).

-- ── companies / items: keep active-read for the selectors; drop all anon writes ─
drop policy if exists anon_insert_companies on public.companies;
drop policy if exists anon_update_companies on public.companies;
drop policy if exists anon_insert_items     on public.items;
drop policy if exists anon_update_items     on public.items;

revoke insert, update on public.companies from anon, authenticated;
revoke insert, update on public.items     from anon, authenticated;

-- companies/items SELECT (active-only, policies from migration 001) is unchanged.
