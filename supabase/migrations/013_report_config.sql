-- Migration: 013_report_config
-- Adds admin-controllable scheduling and light report-format customization to the
-- app_settings singleton (id = 1). All columns have safe defaults so existing
-- behaviour is preserved until the admin changes anything from the Settings page.
--
--   Scheduling
--     auto_report_enabled  — master on/off for the month-end cron send
--     auto_report_day      — day of month to send; NULL = last day of month
--
--   Format (NULL text = use the built-in default copy)
--     report_accent        — hex accent colour used in the email headers
--     report_subject       — company report email subject ({monat} placeholder)
--     report_intro         — company report intro paragraph ({monat})
--     report_include_pdf   — attach the PDF to the company report
--     report_include_excel — attach the Excel workbook to the company report
--     member_subject       — member statement subject ({monat})
--     member_intro         — member statement intro line ({monat}, {name})
--
-- Service-role only, same as the rest of app_settings (migration 010).

alter table app_settings
  add column if not exists auto_report_enabled  boolean  not null default true,
  add column if not exists auto_report_day       smallint,
  add column if not exists report_accent         text     not null default '#D97706',
  add column if not exists report_subject        text,
  add column if not exists report_intro          text,
  add column if not exists report_include_pdf    boolean  not null default true,
  add column if not exists report_include_excel  boolean  not null default true,
  add column if not exists member_subject        text,
  add column if not exists member_intro          text;

-- Day is 1..28 (kept ≤ 28 so it exists in every month) or NULL for "last day".
alter table app_settings
  drop constraint if exists app_settings_auto_report_day_check;
alter table app_settings
  add constraint app_settings_auto_report_day_check
  check (auto_report_day is null or (auto_report_day between 1 and 28));

-- Accent must be a #RRGGBB hex colour.
alter table app_settings
  drop constraint if exists app_settings_report_accent_check;
alter table app_settings
  add constraint app_settings_report_accent_check
  check (report_accent ~ '^#[0-9A-Fa-f]{6}$');
