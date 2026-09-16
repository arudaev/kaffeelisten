-- Migration 035: per-company, per-month payment tracking.
--
-- member_payments (migration 027) is keyed (member_id, report_month), so it can
-- only say "this person paid". When a company pays for all of its people, there
-- is one payment for the whole company, and ticking each employee separately
-- misrepresents what happened. The Mitarbeitende tab now shows a single paid tick
-- on the company's row for company_paid companies, and it writes here.
--
-- Same shape and least-privilege grants as member_payments: amount_cents is an
-- optional snapshot (the API derives amounts live from transactions + archive);
-- service_role may select/insert/update but never delete — a payment record is
-- not removed on its own, and the cascade handles a deleted company.

create table if not exists public.company_payments (
  company_id   uuid not null references public.companies(id) on delete cascade,
  report_month text not null,                        -- e.g. "2026-08"
  amount_cents integer,                              -- optional snapshot; NULL = derive live
  paid         boolean not null default false,
  paid_at      timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (company_id, report_month)
);

comment on table public.company_payments is
  'Per-company, per-month paid flag for companies that pay for their people. Service-role only.';

create index if not exists company_payments_month_idx on public.company_payments (report_month);

-- RLS on with no policies: anon and authenticated are denied. service_role
-- bypasses RLS but still needs object grants, and Supabase's bootstrap would
-- otherwise give it DELETE too — revoked explicitly for the reason above.
alter table public.company_payments enable row level security;
revoke all on public.company_payments from anon, authenticated;
grant select, insert, update on public.company_payments to service_role;
revoke delete on public.company_payments from service_role;
