-- Migration 040: live progress for the monthly run and email delivery status.
--
-- deploy: pre
--
-- The manual send takes up to a few minutes, and the admin saw nothing until it
-- finished. Two additions let the admin panel show how far along it is:
--
-- 1. report_runs.progress: the run's plan (how many invoices, statements and
--    information copies it will send), its current phase, failures, and the
--    Resend message ids of the administration report and the CEO archive.
--    Documents already sent are counted from document_deliveries.
--
-- 2. email_delivery_events: what Resend reports after sending (delivered,
--    bounced, …), received through the Resend webhook (api/resend-webhook.ts).
--    document_deliveries stays append-only (migration 037), so delivery status
--    is not written onto it; this is an append-only event log keyed by the
--    Resend message id. service_role may select and insert only.

alter table public.report_runs add column if not exists progress jsonb;

comment on column public.report_runs.progress is
  'Live progress of the run: phase, planned document counts, failures, report/archive message ids. Written by the monthly run.';

create table if not exists public.email_delivery_events (
  id                bigint generated always as identity primary key,
  resend_message_id text not null check (length(resend_message_id) between 1 and 200),
  event             text not null check (event in ('delivered', 'delayed', 'bounced', 'complained', 'failed')),
  occurred_at       timestamptz not null,
  received_at       timestamptz not null default now()
);

comment on table public.email_delivery_events is
  'Delivery events reported by the Resend webhook, per message id. Append-only. Service-role select/insert only.';

create index if not exists email_delivery_events_message_idx on public.email_delivery_events (resend_message_id);
create index if not exists document_deliveries_message_idx on public.document_deliveries (resend_message_id);

alter table public.email_delivery_events enable row level security;
revoke all on public.email_delivery_events from anon, authenticated;
grant select, insert on public.email_delivery_events to service_role;
revoke update, delete on public.email_delivery_events from service_role;
