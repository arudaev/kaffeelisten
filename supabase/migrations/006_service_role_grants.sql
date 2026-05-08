-- Migration: 006_service_role_grants
-- service_role bypasses RLS but still needs object-level GRANT to run queries.
-- Required by the send-report and cron serverless functions.

grant select, insert, update on public.transactions                  to service_role;
grant select, insert, update on public.transactions_archive          to service_role;
grant select on public.members                                       to service_role;
grant select on public.companies                                     to service_role;
grant select on public.items                                         to service_role;