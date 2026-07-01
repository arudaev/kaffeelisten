-- ─────────────────────────────────────────────────────────────────────────────
-- Kaffeelisten — PRODUCTION seed template (ITC1 internal demo)
-- File: supabase/seed_production.template.sql
--
-- This is a TEMPLATE. Copy the rows below and replace the placeholders with the
-- real ITC1 companies, members and items + prices. Do NOT commit real personal
-- data (member names / emails) to the repo unless that is explicitly agreed —
-- prefer running the filled-in version directly against Supabase and keeping it
-- out of git (see .gitignore note at the bottom).
--
-- Prerequisites: run supabase/maintenance/clear_demo_data.sql first so these
-- inserts land in an empty database. Prices are in CENTS (e.g. 80 = 0,80 €).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Companies ────────────────────────────────────────────────────────────
-- Let the DB generate ids (gen_random_uuid()); reference companies by name below.
insert into companies (name, active) values
  ('<Firma 1 GmbH>',  true),
  ('<Firma 2 UG>',    true)
  -- … add the real ITC1 tenants here
;

-- ── 2. Items ─────────────────────────────────────────────────────────────────
-- category ∈ ('coffee','drink','snack','food','other'); price_cents in cents.
insert into items (name, unit_label, price_cents, category, active) values
  ('<Filterkaffee>',   'Tasse',   0, 'coffee', true),
  ('<Cappuccino>',     'Tasse',   0, 'coffee', true),
  ('<Wasser 0,5 l>',   'Flasche', 0, 'drink',  true)
  -- … add the real items + REAL prices here
;

-- ── 3. Members ────────────────────────────────────────────────────────────────
-- work_email is REQUIRED (per-member statements are sent to it). Join to the
-- company by name so you don't have to copy UUIDs around.
insert into members (company_id, name, work_email, active)
select c.id, v.name, v.work_email, true
from (values
  ('<Firma 1 GmbH>', 'Vorname Nachname', 'vorname.nachname@firma1.de'),
  ('<Firma 2 UG>',   'Vorname Nachname', 'vorname.nachname@firma2.de')
  -- … add the real members here
) as v(company_name, name, work_email)
join companies c on c.name = v.company_name;

commit;

-- After seeding real data, apply migration 011 to enforce work_email NOT NULL.
--
-- KEEPING REAL DATA OUT OF GIT: if you fill this template in with real names,
-- save the working copy as supabase/seed_production.local.sql and add
-- `supabase/seed_production.local.sql` to .gitignore. This committed template
-- stays placeholder-only.
