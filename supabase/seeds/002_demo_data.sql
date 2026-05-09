-- ─────────────────────────────────────────────────────────────────────────────
-- Kaffeelisten — ITC1 Deggendorf demo seed data
-- File: supabase/seeds/002_demo_data.sql
--
-- Run this against the Supabase project to populate realistic demo data.
-- Safe to re-run: deletes all existing data first.
--
-- Companies:    28  (20 Gewerbepark established + 8 Gründerzentrum startups)
-- Members:    ~239  (10–12 per established company, 2–5 per startup)
-- Items:        12  (4 coffee, 4 drinks, 4 snacks/food)
-- Transactions: ~350 (May 2026 — 7 working days, 1–3 per member, first always coffee)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 0. Clear existing data ────────────────────────────────────────────────────
DELETE FROM transactions;
DELETE FROM transactions_archive;
DELETE FROM members;
DELETE FROM items;
DELETE FROM companies;


-- ── 1. Companies ──────────────────────────────────────────────────────────────
-- UUID scheme: 00000000-0000-0000-0002-{padded index}
--   Gewerbepark (established): 01–20  |  Gründerzentrum (startups): 21–28

INSERT INTO companies (id, name, active) VALUES
  -- Gewerbepark — established tenants
  ('00000000-0000-0000-0002-000000000001', '4process AG',                    true),
  ('00000000-0000-0000-0002-000000000002', 'ADLINK Technology GmbH',         true),
  ('00000000-0000-0000-0002-000000000003', 'bildschnitt TV',                 true),
  ('00000000-0000-0000-0002-000000000004', 'B-plus GmbH',                    true),
  ('00000000-0000-0000-0002-000000000005', 'Donau Energietechnik GmbH',      true),
  ('00000000-0000-0000-0002-000000000006', 'EDGECON GmbH',                   true),
  ('00000000-0000-0000-0002-000000000007', 'EFCO Electronics GmbH',          true),
  ('00000000-0000-0000-0002-000000000008', 'Epax Solar GmbH',                true),
  ('00000000-0000-0000-0002-000000000009', 'fivefingergames GmbH',           true),
  ('00000000-0000-0000-0002-000000000010', 'Gramm GmbH',                     true),
  ('00000000-0000-0000-0002-000000000011', 'Hoeller Electronics GmbH',       true),
  ('00000000-0000-0000-0002-000000000012', 'Klughammer GmbH',                true),
  ('00000000-0000-0000-0002-000000000013', 'Level51 GmbH',                   true),
  ('00000000-0000-0000-0002-000000000014', 'Medtronic GmbH',                 true),
  ('00000000-0000-0000-0002-000000000015', 'NIEDERBAYERN TV',                true),
  ('00000000-0000-0000-0002-000000000016', 'OCQ-Soft GmbH',                  true),
  ('00000000-0000-0000-0002-000000000017', 'PartSpace GmbH',                 true),
  ('00000000-0000-0000-0002-000000000018', 'Pellucere Technologies GmbH',    true),
  ('00000000-0000-0000-0002-000000000019', 'TG alpha GmbH',                  true),
  ('00000000-0000-0000-0002-000000000020', 'TÜV NORD Diagnostics GmbH',      true),
  -- Gründerzentrum — startups
  ('00000000-0000-0000-0002-000000000021', 'Career Captain GmbH',            true),
  ('00000000-0000-0000-0002-000000000022', 'malmachen GbR',                  true),
  ('00000000-0000-0000-0002-000000000023', 'PBI Planung Bau Innovation GmbH',true),
  ('00000000-0000-0000-0002-000000000024', 'Dalion Watersports UG',          true),
  ('00000000-0000-0000-0002-000000000025', 'MOVEMASTER GmbH',                true),
  ('00000000-0000-0000-0002-000000000026', 'Quimedo GmbH',                   true),
  ('00000000-0000-0000-0002-000000000027', 'Social Marketing Theresia',      true),
  ('00000000-0000-0000-0002-000000000028', 'The Blockchain Academy GmbH',    true);


-- ── 2. Items ──────────────────────────────────────────────────────────────────
-- UUID scheme: 00000000-0000-0000-0001-{padded index}
-- Layout: coffee 1–4 | drinks 5–8 | snacks/food 9–12
-- (Transaction generator relies on these index ranges.)

INSERT INTO items (id, name, unit_label, price_cents, category, active) VALUES
  -- Coffee
  ('00000000-0000-0000-0001-000000000001', 'Filterkaffee',      'Tasse',    80, 'coffee', true),
  ('00000000-0000-0000-0001-000000000002', 'Espresso',          'Tasse',    70, 'coffee', true),
  ('00000000-0000-0000-0001-000000000003', 'Cappuccino',        'Tasse',    90, 'coffee', true),
  ('00000000-0000-0000-0001-000000000004', 'Latte Macchiato',   'Glas',    100, 'coffee', true),
  -- Drinks
  ('00000000-0000-0000-0001-000000000005', 'Wasser (0,5 l)',    'Flasche',  60, 'drink',  true),
  ('00000000-0000-0000-0001-000000000006', 'Cola (0,33 l)',     'Dose',    100, 'drink',  true),
  ('00000000-0000-0000-0001-000000000007', 'Radler (0,5 l)',    'Flasche', 130, 'drink',  true),
  ('00000000-0000-0000-0001-000000000008', 'Apfelsaft (0,2 l)','Glas',     80, 'drink',  true),
  -- Snacks / Food
  ('00000000-0000-0000-0001-000000000009', 'Donut',             'Stück',   120, 'snack',  true),
  ('00000000-0000-0000-0001-000000000010', 'Croissant',         'Stück',   150, 'food',   true),
  ('00000000-0000-0000-0001-000000000011', 'Brezel',            'Stück',   100, 'snack',  true),
  ('00000000-0000-0000-0001-000000000012', 'Müsliriegel',       'Stück',    80, 'snack',  true);


-- ── 3. Members ────────────────────────────────────────────────────────────────
-- Deterministic via setseed(0.271828).
-- Established companies (idx 1–20): 10–12 members each.
-- Startups (idx 21–28): 2–5 members each.
-- Emails: lowercase(first).(last)@domain — umlauts transliterated.

DO $$
DECLARE
  v_cids    uuid[]  := ARRAY[
    '00000000-0000-0000-0002-000000000001'::uuid,
    '00000000-0000-0000-0002-000000000002'::uuid,
    '00000000-0000-0000-0002-000000000003'::uuid,
    '00000000-0000-0000-0002-000000000004'::uuid,
    '00000000-0000-0000-0002-000000000005'::uuid,
    '00000000-0000-0000-0002-000000000006'::uuid,
    '00000000-0000-0000-0002-000000000007'::uuid,
    '00000000-0000-0000-0002-000000000008'::uuid,
    '00000000-0000-0000-0002-000000000009'::uuid,
    '00000000-0000-0000-0002-000000000010'::uuid,
    '00000000-0000-0000-0002-000000000011'::uuid,
    '00000000-0000-0000-0002-000000000012'::uuid,
    '00000000-0000-0000-0002-000000000013'::uuid,
    '00000000-0000-0000-0002-000000000014'::uuid,
    '00000000-0000-0000-0002-000000000015'::uuid,
    '00000000-0000-0000-0002-000000000016'::uuid,
    '00000000-0000-0000-0002-000000000017'::uuid,
    '00000000-0000-0000-0002-000000000018'::uuid,
    '00000000-0000-0000-0002-000000000019'::uuid,
    '00000000-0000-0000-0002-000000000020'::uuid,
    '00000000-0000-0000-0002-000000000021'::uuid,
    '00000000-0000-0000-0002-000000000022'::uuid,
    '00000000-0000-0000-0002-000000000023'::uuid,
    '00000000-0000-0000-0002-000000000024'::uuid,
    '00000000-0000-0000-0002-000000000025'::uuid,
    '00000000-0000-0000-0002-000000000026'::uuid,
    '00000000-0000-0000-0002-000000000027'::uuid,
    '00000000-0000-0000-0002-000000000028'::uuid
  ];
  v_sizes   int[]   := ARRAY[
    -- established (10–12 each)
    12, 10, 10, 12, 10, 10, 10, 10, 12, 10, 10, 10, 12, 12, 10, 10, 10, 10, 10, 12,
    -- startups (2–5 each)
     4,  3,  4,  2,  3,  5,  2,  4
  ];
  v_domains text[]  := ARRAY[
    '4process.de',           'adlinktech.com',       'bildschnitt.de',       'b-plus.com',
    'donau-energietechnik.de','edgecon.de',           'efco.de',              'epax-solar.de',
    'fivefingergames.com',   'gramm-gmbh.de',        'hoeller-electronics.de','klughammer.de',
    'level51.de',            'medtronic.com',         'niederbayern.tv',      'ocq-soft.de',
    'partspace.de',          'pellucere.com',         'tg-alpha.de',          'tuev-nord.de',
    'careercaptain.de',      'malmachen.de',          'pbi-deggendorf.de',    'dalion.de',
    'movemaster.de',         'quimedo.de',            'sm-theresia.de',       'blockchain-academy.de'
  ];
  -- 20 male + 20 female first names — common German, no umlauts for clean emails
  v_m text[] := ARRAY[
    'Alexander','Andreas','Christian','Daniel','Felix',
    'Florian','Jan','Jonas','Klaus','Lukas',
    'Markus','Max','Michael','Patrick','Peter',
    'Robert','Stefan','Thomas','Tobias','Tim'
  ];
  v_f text[] := ARRAY[
    'Andrea','Anna','Christine','Claudia','Eva',
    'Hannah','Julia','Katharina','Laura','Lea',
    'Lisa','Maria','Marie','Miriam','Nina',
    'Sandra','Sarah','Sophie','Stephanie','Lena'
  ];
  -- 35 surnames — no umlauts so emails stay clean
  v_s text[] := ARRAY[
    'Bauer','Berger','Braun','Fischer','Franke',
    'Hartmann','Herrmann','Hoffmann','Huber','Klein',
    'Koch','Kramer','Krause','Lang','Lange',
    'Lehmann','Maier','Meyer','Mueller','Richter',
    'Roth','Sauer','Schmidt','Schneider','Schreiber',
    'Schulz','Schwarz','Simon','Stein','Vogel',
    'Wagner','Walter','Weber','Wolf','Zimmermann'
  ];

  v_c   int; v_m_i int;
  v_fn  text; v_ln  text;
BEGIN
  PERFORM setseed(0.271828);

  FOR v_c IN 1..28 LOOP
    FOR v_m_i IN 1..v_sizes[v_c] LOOP
      IF random() < 0.45 THEN
        v_fn := v_f[1 + floor(random() * 20)::int];
      ELSE
        v_fn := v_m[1 + floor(random() * 20)::int];
      END IF;
      v_ln := v_s[1 + floor(random() * 35)::int];

      INSERT INTO members (id, company_id, name, work_email, active)
      VALUES (
        gen_random_uuid(),
        v_cids[v_c],
        v_fn || ' ' || v_ln,
        lower(v_fn) || '.' || lower(v_ln) || '@' || v_domains[v_c],
        true
      );
    END LOOP;
  END LOOP;
END $$;


-- ── 4. Transactions ───────────────────────────────────────────────────────────
-- Period: May 2026, 7 days (Fr 01 Feiertag, Mo 04–Fr 08, Sa 09 Hackathon).
-- 78 % of members log at least once; 1–3 transactions each.
-- Rule: first transaction per member is always a coffee (items 1–4),
--       additional ones split 45 % drink (5–8) / 55 % snack-food (9–12).
-- Morning bias: coffee logged 07–10 h; extras 09–16 h.

DO $$
DECLARE
  v_mem   RECORD;
  v_items uuid[] := ARRAY[
    '00000000-0000-0000-0001-000000000001'::uuid,   -- Filterkaffee
    '00000000-0000-0000-0001-000000000002'::uuid,   -- Espresso
    '00000000-0000-0000-0001-000000000003'::uuid,   -- Cappuccino
    '00000000-0000-0000-0001-000000000004'::uuid,   -- Latte Macchiato
    '00000000-0000-0000-0001-000000000005'::uuid,   -- Wasser (0,5 l)
    '00000000-0000-0000-0001-000000000006'::uuid,   -- Cola (0,33 l)
    '00000000-0000-0000-0001-000000000007'::uuid,   -- Radler (0,5 l)
    '00000000-0000-0000-0001-000000000008'::uuid,   -- Apfelsaft (0,2 l)
    '00000000-0000-0000-0001-000000000009'::uuid,   -- Donut
    '00000000-0000-0000-0001-000000000010'::uuid,   -- Croissant
    '00000000-0000-0000-0001-000000000011'::uuid,   -- Brezel
    '00000000-0000-0000-0001-000000000012'::uuid    -- Müsliriegel
  ];
  v_days  date[] := ARRAY[
    '2026-05-01'::date,   -- Fr  (Tag der Arbeit — light attendance)
    '2026-05-04'::date,   -- Mo
    '2026-05-05'::date,   -- Di
    '2026-05-06'::date,   -- Mi
    '2026-05-07'::date,   -- Do
    '2026-05-08'::date,   -- Fr  (Hackathon Day 1)
    '2026-05-09'::date    -- Sa  (Hackathon Day 2)
  ];
  v_n    int;  -- total tx for this member
  v_i    int;  -- tx counter
  v_iidx int;  -- item index (1-based into v_items)
  v_didx int;  -- day index  (1-based into v_days)
  v_h    int;  -- hour
  v_min  int;  -- minute
  v_ts   timestamptz;
BEGIN
  PERFORM setseed(0.314159);

  FOR v_mem IN SELECT id, company_id FROM members ORDER BY id LOOP
    CONTINUE WHEN random() >= 0.78;   -- 22 % skip May entirely

    v_n := 1 + floor(random() * 3)::int;   -- 1, 2 or 3 total transactions

    FOR v_i IN 1..v_n LOOP
      v_didx := 1 + floor(random() * 7)::int;

      IF v_i = 1 THEN
        -- First transaction: always coffee, morning slot
        v_iidx := 1 + floor(random() * 4)::int;
        v_h    := 7 + floor(random() * 4)::int;    -- 07–10
      ELSIF random() < 0.45 THEN
        -- Drink
        v_iidx := 5 + floor(random() * 4)::int;
        v_h    := 10 + floor(random() * 7)::int;   -- 10–16
      ELSE
        -- Snack or food
        v_iidx := 9 + floor(random() * 4)::int;
        v_h    := 9  + floor(random() * 7)::int;   -- 09–15
      END IF;

      v_min := floor(random() * 60)::int;
      v_ts  := ( v_days[v_didx]::text || ' '
               || lpad(v_h::text,   2, '0') || ':'
               || lpad(v_min::text, 2, '0') || ':00 Europe/Berlin'
               )::timestamptz;

      INSERT INTO transactions (id, member_id, company_id, item_id, quantity, logged_at)
      VALUES (gen_random_uuid(), v_mem.id, v_mem.company_id, v_items[v_iidx], 1, v_ts);
    END LOOP;
  END LOOP;
END $$;
