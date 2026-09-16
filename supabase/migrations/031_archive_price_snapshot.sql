-- Migration 031: carry the price snapshot, and the item's identity, into the archive.
--
-- transactions_archive is now permanent (the code no longer prunes it; the revoke follows in migration 039), so it must be able to
-- stand on its own: a reported month has to be reproducible years later even if
-- the item was since renamed, repriced or deactivated. The archive therefore
-- stores the price the member paid plus the item's name, unit and category as
-- they were when the month was reported.
--
-- api/_lib/report.ts archiveTransactions writes all four from the enriched
-- transaction it already holds. Depends on migration 030.
--
-- DEPLOY ORDER: apply 030 and 031 BEFORE deploying the report.ts that writes
-- these columns. Deployed first, that code's archive upsert fails on unknown
-- columns and aborts the monthly run after the reports were already emailed —
-- the month would be sent but never archived. (Migration 039, shipped in its own
-- follow-up PR, is the opposite: it must be applied AFTER this code is live.)
--
-- BACKFILL IS APPROXIMATE. Existing archive rows predate any snapshot, so they are
-- stamped with TODAY's catalogue values. The true historical price of those rows
-- is not recoverable from the database. Stamping once is still strictly better
-- than re-deriving from the live catalogue on every read, which drifted a little
-- further with each price change.

alter table public.transactions_archive
  add column if not exists unit_price_cents integer
    check (unit_price_cents is null or unit_price_cents >= 0),
  add column if not exists item_name     text,
  add column if not exists unit_label    text,
  add column if not exists item_category text;

update public.transactions_archive a
   set unit_price_cents = i.price_cents,
       item_name        = i.name,
       unit_label       = i.unit_label,
       item_category    = i.category
  from public.items i
 where i.id = a.item_id
   and a.unit_price_cents is null;

-- Live rows logged before migration 030 get the same one-time stamp, so a month
-- still in the live table when this is applied does not report differently from
-- one that was already archived.
update public.transactions t
   set unit_price_cents = i.price_cents
  from public.items i
 where i.id = t.item_id
   and t.unit_price_cents is null;

comment on column public.transactions_archive.unit_price_cents is
  'Price paid (cents). Snapshot from the live row; pre-031 rows backfilled from the catalogue at migration time (approximate).';
comment on column public.transactions_archive.item_name is
  'Item name as it was when the month was reported.';
