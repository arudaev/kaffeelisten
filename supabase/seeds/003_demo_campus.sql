-- ─────────────────────────────────────────────────────────────────────────────
-- Kaffeelisten — demo campus seed
-- File: supabase/seeds/003_demo_campus.sql
--
-- Populates the shared staging/demo database with a WHOLLY INVENTED campus, so
-- the demo can be shown to anyone without exposing a real roster.
--
-- WHY this file exists next to 002_demo_data.sql: that seed uses the real company
-- names of ITC1 Deggendorf tenants. A public demo must never present real
-- organisations as though they were customers, and no real person may appear.
-- Everything here is made up:
--   * company names are invented compounds, not businesses that exist;
--   * every email domain sits under the RFC 2606 reserved TLD `.example`, so a
--     misconfigured deployment cannot reach a real mailbox;
--   * member names are drawn at random from common German first names and
--     surnames, so they denote nobody.
--
-- Months come from now(), so the demo always has a live current month and two
-- closed months behind it. It never goes stale.
--
-- Safe to re-run: clears the campus tables first.
-- ─────────────────────────────────────────────────────────────────────────────

-- == 0. Clear the campus ======================================================
-- Children before parents.
delete from document_deliveries;
delete from billing_documents;
delete from billing_runs;
delete from member_payments;
delete from company_payments;
delete from email_delivery_events;
delete from report_runs;
delete from transactions;
delete from transactions_archive;
delete from members;
delete from items;
delete from companies;


-- == 1. Companies: 12 Gewerbepark tenants ====================================
-- The mode columns are deliberately varied, so every admin feature has a company
-- that exercises it: individual vs company-paid billing, member/company/both
-- checkout, document copies and the employee list both on and off.
insert into companies
  (id, name, active, billing_mode, checkout_mode,
   billing_contact_name, billing_contact_email, billing_notes,
   member_document_copies_enabled, employee_list_enabled)
values
  ('00000000-0000-0000-0003-000000000001', 'Nordwald Systeme GmbH',           true,  'company_paid', 'both',    'Verwaltung Nordwald',   'rechnung@nordwald-systeme.example',  'Sammelrechnung, Zahlung per Überweisung.',   true,  true),
  ('00000000-0000-0000-0003-000000000002', 'Auwiesen Elektronik GmbH',        true,  'individual',   'member',  null,                    null,                                 null,                                         false, false),
  ('00000000-0000-0000-0003-000000000003', 'Kastanienhof Medientechnik GmbH', true,  'individual',   'member',  'Buchhaltung',           'buchhaltung@kastanienhof.example',   null,                                         true,  false),
  ('00000000-0000-0000-0003-000000000004', 'Hirschgrund Antriebstechnik GmbH',true,  'company_paid', 'company', 'Team-Assistenz',        'office@hirschgrund.example',         'Nur Firmenkonto, keine Einzelabrechnung.',   false, true),
  ('00000000-0000-0000-0003-000000000005', 'Lindenkai Softwarehaus GmbH',     true,  'individual',   'both',    null,                    null,                                 null,                                         true,  true),
  ('00000000-0000-0000-0003-000000000006', 'Pfahlbau Sensorik GmbH',          true,  'individual',   'member',  null,                    null,                                 null,                                         true,  false),
  ('00000000-0000-0000-0003-000000000007', 'Moosbach Verfahrenstechnik GmbH', true,  'company_paid', 'company', 'Zentrale Beschaffung',  'einkauf@moosbach-vt.example',        null,                                         false, true),
  ('00000000-0000-0000-0003-000000000008', 'Silberdistel Optik GmbH',         true,  'individual',   'member',  null,                    null,                                 null,                                         false, false),
  ('00000000-0000-0000-0003-000000000009', 'Ziegelwerk Digital GmbH',         true,  'individual',   'member',  'Finanzen',              'finanzen@ziegelwerk-digital.example',null,                                         true,  true),
  ('00000000-0000-0000-0003-000000000010', 'Falkenstein Messtechnik GmbH',    true,  'company_paid', 'both',    'Kaufmännische Leitung', 'kl@falkenstein-mt.example',          'Rechnung bitte quartalsweise bündeln.',      true,  false),
  ('00000000-0000-0000-0003-000000000011', 'Birkenallee Logistik GmbH',       true,  'individual',   'member',  null,                    null,                                 null,                                         false, false),
  ('00000000-0000-0000-0003-000000000012', 'Steinbruch Studios GmbH',         false, 'individual',   'member',  null,                    null,                                 'Mietverhältnis beendet, Archiv behalten.',   false, false);


-- == 2. Items: the catalogue the iPad shows ===================================
-- Generic products, no brands. Coffee 1-4 | drinks 5-8 | snacks/food 9-12; the
-- transaction generators below rely on those index ranges.
insert into items (id, name, unit_label, price_cents, category, active) values
  ('00000000-0000-0000-0001-000000000001', 'Filterkaffee',      'Tasse',    80, 'coffee', true),
  ('00000000-0000-0000-0001-000000000002', 'Espresso',          'Tasse',    70, 'coffee', true),
  ('00000000-0000-0000-0001-000000000003', 'Cappuccino',        'Tasse',    90, 'coffee', true),
  ('00000000-0000-0000-0001-000000000004', 'Latte Macchiato',   'Glas',    100, 'coffee', true),
  ('00000000-0000-0000-0001-000000000005', 'Wasser (0,5 l)',    'Flasche',  60, 'drink',  true),
  ('00000000-0000-0000-0001-000000000006', 'Cola (0,33 l)',     'Dose',    100, 'drink',  true),
  ('00000000-0000-0000-0001-000000000007', 'Radler (0,5 l)',    'Flasche', 130, 'drink',  true),
  ('00000000-0000-0000-0001-000000000008', 'Apfelsaft (0,2 l)', 'Glas',     80, 'drink',  true),
  ('00000000-0000-0000-0001-000000000009', 'Donut',             'Stück',   120, 'snack',  true),
  ('00000000-0000-0000-0001-000000000010', 'Croissant',         'Stück',   150, 'food',   true),
  ('00000000-0000-0000-0001-000000000011', 'Brezel',            'Stück',   100, 'snack',  true),
  ('00000000-0000-0000-0001-000000000012', 'Müsliriegel',       'Stück',    80, 'snack',  true),
  -- one retired item, so the catalogue page has an inactive row to show
  ('00000000-0000-0000-0001-000000000013', 'Eistee (0,33 l)',   'Dose',    110, 'drink',  false);


-- == 3. Members ===============================================================
-- Invented people, deterministic via setseed so the demo is reproducible.
-- About two thirds have confirmed their work email, so the Members page shows
-- both states, and the largest tenants each have one leaver.
do $$
declare
  -- Twelve tenants, 4-8 people each: a campus you can read at a glance. The demo
  -- exists to be understood in a minute, not to prove the table scrolls, and
  -- every list on screen should fit without paging.
  v_sizes int[]  := array[8, 6, 7, 7, 5, 6, 7, 5, 6, 5, 5, 4];
  v_slugs text[] := array[
    'nordwald-systeme', 'auwiesen-elektronik', 'kastanienhof', 'hirschgrund',
    'lindenkai', 'pfahlbau-sensorik', 'moosbach-vt', 'silberdistel-optik',
    'ziegelwerk-digital', 'falkenstein-mt', 'birkenallee-logistik', 'steinbruch-studios'
  ];
  v_f text[] := array[
    'Andrea','Anna','Christine','Claudia','Eva','Hannah','Julia','Katharina','Laura','Lea',
    'Lisa','Maria','Marie','Miriam','Nina','Sandra','Sarah','Sophie','Stephanie','Lena'
  ];
  v_m text[] := array[
    'Alexander','Andreas','Christian','Daniel','Felix','Florian','Jan','Jonas','Klaus','Lukas',
    'Markus','Max','Michael','Patrick','Peter','Robert','Stefan','Thomas','Tobias','Tim'
  ];
  v_s text[] := array[
    'Bauer','Berger','Braun','Fischer','Franke','Hartmann','Herrmann','Hoffmann','Huber','Klein',
    'Koch','Kramer','Krause','Lang','Lange','Lehmann','Maier','Meyer','Mueller','Richter',
    'Roth','Sauer','Schmidt','Schneider','Schreiber','Schulz','Schwarz','Simon','Stein','Vogel',
    'Wagner','Walter','Weber','Wolf','Zimmermann'
  ];
  v_c int; v_i int; v_fn text; v_ln text; v_cid uuid; v_n int; v_make int;
  -- Index of the company the member flow shows first, i.e. the one whose name
  -- sorts first -- Auwiesen Elektronik, second in the list above.
  v_show constant int := 2;
  -- Where to start drawing given names for that company. Its roster has to read
  -- Alex R., Fares M., then everyone else, so nobody generated there may sort
  -- between the two: no Andrea, and no Alexander either, which sorts *after*
  -- "Alex R." because a space beats a letter. These offsets skip both arrays
  -- past F; every other company draws from the whole alphabet.
  v_lo_f int; v_lo_m int;
begin
  perform setseed(0.161803);

  -- The two of us, on the first screen a visitor actually reaches. A signature on
  -- the demo, and the only two names here that belong to anyone: abbreviated, on
  -- .example addresses like everybody else, never written where a real roster goes.
  --
  -- Auwiesen, not Nordwald, because the member flow lists companies by name: the
  -- company that comes first in this file is not the company anyone sees first.
  insert into members (id, company_id, name, work_email, active, email_verified_at, kind)
  values
    ('00000000-0000-0000-0004-000000000001',
     '00000000-0000-0000-0003-000000000002',
     'Alex R.', 'alex.r@auwiesen-elektronik.example', true, now() - interval '31 days', 'person'),
    ('00000000-0000-0000-0004-000000000002',
     '00000000-0000-0000-0003-000000000002',
     'Fares M.', 'fares.m@auwiesen-elektronik.example', true, now() - interval '29 days', 'person');

  for v_c in 1..12 loop
    v_cid := ('00000000-0000-0000-0003-' || lpad(v_c::text, 12, '0'))::uuid;
    -- The showcase company already has the two above, so its generated names
    -- start counting after them and it ends up the same size as planned.
    v_n := case when v_c = v_show then 2 else 0 end;
    v_make := v_sizes[v_c] - v_n;

    for v_i in 1..v_make loop
      v_lo_f := case when v_c = v_show then 6 else 1 end;  -- Hannah onwards
      v_lo_m := case when v_c = v_show then 5 else 1 end;  -- Felix onwards
      if random() < 0.46 then
        v_fn := v_f[v_lo_f + floor(random() * (array_length(v_f, 1) - v_lo_f + 1))::int];
      else
        v_fn := v_m[v_lo_m + floor(random() * (array_length(v_m, 1) - v_lo_m + 1))::int];
      end if;
      v_ln := v_s[1 + floor(random() * array_length(v_s, 1))::int];
      v_n := v_n + 1;

      insert into members (id, company_id, name, work_email, active, email_verified_at, kind)
      values (
        gen_random_uuid(),
        v_cid,
        v_fn || ' ' || v_ln,
        -- the counter keeps the address unique when the random draw repeats a name
        lower(v_fn) || '.' || lower(v_ln) || v_n::text || '@' || v_slugs[v_c] || '.example',
        -- one leaver per large tenant, so the Members page has an inactive row
        case when v_i = v_make and v_sizes[v_c] >= 7 then false else true end,
        case when random() < 0.66 then now() - (random() * 120)::int * interval '1 day' else null end,
        'person'
      );
    end loop;
  end loop;
end $$;

-- House accounts for the companies that check out on the company itself, so the
-- member flow's "on the company" path has something to book against.
do $$
declare v_row record;
begin
  for v_row in select id, name from companies where checkout_mode in ('company', 'both') loop
    insert into members (id, company_id, name, work_email, active, kind)
    values (gen_random_uuid(), v_row.id, v_row.name, null, true, 'house');
  end loop;
end $$;


-- == 4. Transactions: the open current month ==================================
-- Every weekday of this month up to today. The first booking per member per day
-- is always a coffee, which is how the campus actually behaves; extras split
-- between drinks and snacks. unit_price_cents is the snapshot migration 030 adds.
do $$
declare
  v_mem   record;
  v_items uuid[];
  v_day   date;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_start date := date_trunc('month', (now() at time zone 'Europe/Berlin')::date)::date;
  v_iidx  int; v_h int; v_min int; v_ts timestamptz;
begin
  select array_agg(id order by id) into v_items
    from items where id < '00000000-0000-0000-0001-000000000013';

  perform setseed(0.577215);

  for v_mem in select id, company_id from members where active and kind = 'person' order by id loop
    v_day := v_start;
    while v_day <= v_today loop
      -- weekdays only, and nobody is in every single day
      if extract(isodow from v_day) <= 5 and random() < 0.55 then
        v_iidx := 1 + floor(random() * 4)::int;
        v_h    := 7 + floor(random() * 4)::int;
        v_min  := floor(random() * 60)::int;
        v_ts   := (v_day::text || ' ' || lpad(v_h::text, 2, '0') || ':' || lpad(v_min::text, 2, '0') || ':00 Europe/Berlin')::timestamptz;
        insert into transactions (id, member_id, company_id, item_id, quantity, logged_at, unit_price_cents)
        select gen_random_uuid(), v_mem.id, v_mem.company_id, i.id, 1, v_ts, i.price_cents
          from items i where i.id = v_items[v_iidx];

        if random() < 0.42 then
          if random() < 0.45 then
            v_iidx := 5 + floor(random() * 4)::int;
            v_h    := 10 + floor(random() * 7)::int;
          else
            v_iidx := 9 + floor(random() * 4)::int;
            v_h    := 9 + floor(random() * 7)::int;
          end if;
          v_min := floor(random() * 60)::int;
          v_ts  := (v_day::text || ' ' || lpad(v_h::text, 2, '0') || ':' || lpad(v_min::text, 2, '0') || ':00 Europe/Berlin')::timestamptz;
          insert into transactions (id, member_id, company_id, item_id, quantity, logged_at, unit_price_cents)
          select gen_random_uuid(), v_mem.id, v_mem.company_id, i.id, 1 + floor(random() * 2)::int, v_ts, i.price_cents
            from items i where i.id = v_items[v_iidx];
        end if;
      end if;
      v_day := v_day + 1;
    end loop;
  end loop;
end $$;


-- == 5. transactions_archive: the two closed months behind it ================
-- The archive carries its own name/label/category copies (migrations 030-031),
-- because the catalogue may change after a month has been reported.
do $$
declare
  v_mem   record;
  v_items uuid[];
  v_month date;
  v_day   date;
  v_key   text;
  v_first date := date_trunc('month', (now() at time zone 'Europe/Berlin')::date)::date;
  v_iidx  int; v_h int; v_min int; v_ts timestamptz; v_k int;
begin
  select array_agg(id order by id) into v_items
    from items where id < '00000000-0000-0000-0001-000000000013';

  perform setseed(0.693147);

  for v_k in 1..2 loop
    v_month := (v_first - (v_k || ' month')::interval)::date;
    v_key   := to_char(v_month, 'YYYY-MM');

    for v_mem in select id, company_id from members where kind = 'person' order by id loop
      v_day := v_month;
      while v_day < (v_month + interval '1 month')::date loop
        if extract(isodow from v_day) <= 5 and random() < 0.3 then
          v_iidx := 1 + floor(random() * 4)::int;
          v_h    := 7 + floor(random() * 4)::int;
          v_min  := floor(random() * 60)::int;
          v_ts   := (v_day::text || ' ' || lpad(v_h::text, 2, '0') || ':' || lpad(v_min::text, 2, '0') || ':00 Europe/Berlin')::timestamptz;
          insert into transactions_archive
            (id, member_id, company_id, item_id, quantity, logged_at, archived_at,
             report_month, unit_price_cents, item_name, unit_label, item_category)
          select gen_random_uuid(), v_mem.id, v_mem.company_id, i.id, 1, v_ts,
                 (v_month + interval '1 month')::timestamptz,
                 v_key, i.price_cents, i.name, i.unit_label, i.category
            from items i where i.id = v_items[v_iidx];

          if random() < 0.25 then
            v_iidx := 5 + floor(random() * 8)::int;
            v_h    := 10 + floor(random() * 7)::int;
            v_min  := floor(random() * 60)::int;
            v_ts   := (v_day::text || ' ' || lpad(v_h::text, 2, '0') || ':' || lpad(v_min::text, 2, '0') || ':00 Europe/Berlin')::timestamptz;
            insert into transactions_archive
              (id, member_id, company_id, item_id, quantity, logged_at, archived_at,
               report_month, unit_price_cents, item_name, unit_label, item_category)
            select gen_random_uuid(), v_mem.id, v_mem.company_id, i.id, 1, v_ts,
                   (v_month + interval '1 month')::timestamptz,
                   v_key, i.price_cents, i.name, i.unit_label, i.category
              from items i where i.id = v_items[v_iidx];
          end if;
        end if;
        v_day := v_day + 1;
      end loop;
    end loop;
  end loop;
end $$;


-- == 6. Payment state, so the paid grid is not an empty board =================
-- The older of the two closed months is settled; the newer one is partly open.
do $$
declare
  v_first date := date_trunc('month', (now() at time zone 'Europe/Berlin')::date)::date;
  v_old   text := to_char((v_first - interval '2 month')::date, 'YYYY-MM');
  v_new   text := to_char((v_first - interval '1 month')::date, 'YYYY-MM');
begin
  perform setseed(0.414213);

  insert into member_payments (member_id, report_month, paid)
  select m.id, v_old, true
    from members m
   where m.kind = 'person'
     and m.company_id in (select id from companies where billing_mode = 'individual')
  on conflict do nothing;

  insert into member_payments (member_id, report_month, paid)
  select m.id, v_new, random() < 0.7
    from members m
   where m.kind = 'person'
     and m.company_id in (select id from companies where billing_mode = 'individual')
  on conflict do nothing;

  insert into company_payments (company_id, report_month, paid)
  select c.id, v_old, true from companies c where c.billing_mode = 'company_paid'
  on conflict do nothing;

  insert into company_payments (company_id, report_month, paid)
  select c.id, v_new, random() < 0.6 from companies c where c.billing_mode = 'company_paid'
  on conflict do nothing;
end $$;


-- == 7. Settings: demo-safe, invoice mode firmly off ==========================
-- report_recipients and ceo_email stay on example.com. Mail is suppressed in the
-- demo anyway, and a reserved domain means a misconfigured deployment cannot
-- reach a real inbox. Invoice mode stays unauthorised: AGENTS.md requires ITC1's
-- written authority before it is ever enabled, and never in a demo.
update app_settings set
  report_recipients                   = array['demo@example.com'],
  ceo_email                           = 'demo@example.com',
  cc_ceo_on_reports                   = true,
  member_statements_enabled           = true,
  auto_report_enabled                 = true,
  auto_report_day                     = 1,
  report_subject                      = null,
  report_intro                        = null,
  report_include_pdf                  = true,
  report_include_excel                = true,
  max_items_per_order                 = 6,
  issue_invoices                      = false,
  invoice_mode_authorized             = false,
  invoice_authority_note              = null,
  company_documents_enabled           = true,
  member_paid_grid_enabled            = true,
  company_paid_member_reports_enabled = true
where id = 1;

update app_theme set default_mode = 'system', active_palette = 'bayerwald' where id = 1;
