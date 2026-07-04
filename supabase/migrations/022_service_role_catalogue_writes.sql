-- Migration 022: grant service_role the catalogue write privileges the admin
-- panel needs.
--
-- Background: migration 006 granted service_role only SELECT on members,
-- companies and items (it needed just reads for the report at the time). When
-- migration 015 locked down RLS it revoked the anon role's INSERT/UPDATE on
-- those tables and moved ALL admin writes to the PIN-protected, service-role
-- endpoint apps/web/api/admin/data.ts. But service_role was never granted the
-- matching INSERT/UPDATE, so every admin create/edit of a member, company or
-- item failed at the database with `permission denied for table <t>` (500),
-- while reads (GET) kept working. This restores the missing grants.
--
-- Scope: INSERT + UPDATE only. The admin panel soft-deletes via the `active`
-- flag (an UPDATE); it never issues a hard DELETE, so DELETE is deliberately
-- withheld (least privilege). transactions/transactions_archive writes were
-- already granted in migration 006 and are unaffected.

grant insert, update on public.members   to service_role;
grant insert, update on public.companies to service_role;
grant insert, update on public.items     to service_role;
