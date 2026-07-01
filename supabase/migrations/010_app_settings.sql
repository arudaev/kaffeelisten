-- Migration: 010_app_settings
-- Introduces a single-row settings table that moves admin configuration out of
-- environment variables and into the database, so the admin can manage it from
-- the dashboard (Phase 2). Covers:
--   • the admin PIN (now 6-digit, hashed — never stored or returned in clear)
--   • a self-service PIN reset token (email-based reset flow)
--   • the CEO / billing recipient that is CC'd on every monthly report
--   • the list of report recipients (admin inboxes)
--   • feature toggles for the new per-member monthly statements
--
-- Security model: this table holds secrets (PIN hash, reset token). It is
-- service-role only. NO anon GRANT and NO anon RLS policy is created, so the
-- browser bundle can never read or write it. All access goes through the
-- PIN-protected serverless functions in apps/web/api/admin/ using the
-- service-role key. See docs/phase-2-production.md §PIN management.

create extension if not exists "pgcrypto";   -- already enabled in 001; idempotent

create table if not exists app_settings (
  -- Enforced singleton: only the row with id = 1 may ever exist.
  id                       smallint primary key default 1 check (id = 1),

  -- Admin PIN — bcrypt hash via pgcrypto crypt(pin, gen_salt('bf')).
  -- NULL until the admin sets a PIN; until then verify-pin falls back to the
  -- ADMIN_PIN env var (migration bridge — see docs runbook).
  admin_pin_hash           text,
  pin_length               smallint not null default 6 check (pin_length between 4 and 8),
  pin_updated_at           timestamptz,

  -- Self-service PIN reset (email flow). Token is hashed; only the hash lives
  -- here. The clear token is emailed once and never persisted.
  pin_reset_token_hash     text,
  pin_reset_expires_at     timestamptz,

  -- Recipients. report_recipients are the admin inbox(es) that receive the full
  -- monthly company report. ceo_email is CC'd on every report when
  -- cc_ceo_on_reports is true.
  report_recipients        text[]  not null default '{}',
  ceo_email                text,
  cc_ceo_on_reports        boolean not null default true,

  -- Per-member monthly statements (Phase 2 feature). When enabled, each member
  -- who logged at least one transaction in the report month is emailed their own
  -- itemized statement at month-end (in addition to the company report).
  member_statements_enabled boolean not null default true,

  updated_at               timestamptz not null default now()
);

comment on table app_settings is
  'Singleton (id=1) admin configuration: hashed PIN, reset token, report recipients, CEO CC, feature toggles. Service-role only — never exposed to anon.';

-- Seed the singleton row. PIN hash stays NULL so the system keeps working via
-- the ADMIN_PIN env fallback until the admin sets a real PIN from the dashboard.
insert into app_settings (id) values (1)
  on conflict (id) do nothing;

-- RLS on, no policies → anon and authenticated are fully denied; service_role
-- bypasses RLS and is the only path in.
alter table app_settings enable row level security;

-- service_role bypasses RLS but still needs object-level grants to run queries.
grant select, insert, update on public.app_settings to service_role;
