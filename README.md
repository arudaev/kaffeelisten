# Kaffeelisten

Digital consumption log for shared office spaces. Members tap what they had — coffee, drinks, snacks. The admin gets a formatted monthly report. No accounts, no friction.

Built at [B4Y3RW4LD Hackathon](https://www.bayerwald-hackathon.de/) · ITC1 Deggendorf · May 2026

**[kaffeelisten.vercel.app](https://kaffeelisten.vercel.app)**

---

## How it works

```
Member opens app → picks company → picks name → picks items → done (< 15 seconds)

End of month → admin clicks "Bericht senden" (or cron fires automatically)
             → PDF + Excel land in the admin inbox, grouped by company and person
             → old records archive, live table resets
```

No registration. No login. No payment. Works on a wall-mounted iPad or any browser.

---

## Stack

| | |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel (serverless functions + cron) |
| Email + attachments | Resend — PDF report + Excel workbook |
| PWA | Vite PWA plugin (Workbox, offline shell) |

---

## Deploy your own

### 1. Services

You need three free accounts: [Supabase](https://supabase.com), [Resend](https://resend.com), [Vercel](https://vercel.com).

### 2. Database

Create a Supabase project, then run the migrations in order:

```bash
# from supabase/migrations/ — apply each file via the Supabase SQL editor or CLI
001_initial_schema.sql
002_rls_policies.sql
...
```

### 3. Environment variables

Set these in Vercel (Settings → Environment Variables):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `ADMIN_EMAIL` | The address that receives monthly reports |
| `ADMIN_PIN` | Numeric PIN for the `/admin` panel |
| `CRON_SECRET` | Any random string — used to authenticate the Vercel Cron call |

### 4. Deploy

```bash
# fork or clone, then:
vercel deploy --prod
```

The cron job fires automatically on the last day of each month at 22:00 UTC. You can also trigger a report manually from the admin panel at any time.

---

## Local development

```bash
git clone https://github.com/arudaev/kaffeelisten
cd kaffeelisten
cp .env.example .env          # fill in real values
npm install                   # from repo root (npm workspaces)
npm run dev                   # starts Vite dev server at localhost:5173
```

The serverless API functions require Vercel CLI for local testing:

```bash
npm i -g vercel
vercel dev                    # runs functions + frontend together
```

---

## Project layout

```
apps/web/
  src/          React frontend — member flow + admin panel
  api/          Vercel serverless functions (send-report, cron, admin PIN)
  public/       Static assets — icons, SVG illustrations, PWA manifest
supabase/
  migrations/   SQL — schema, RLS policies, grants
  seeds/        Demo data (ITC1 Deggendorf campus, 28 companies, 239 members)
docs/           PRD, design system, roadmap
```

---

## Admin panel

Route: `/admin` — PIN protected, server-side only.

- Transaction log with filters (company, member, item, date)
- Company-level summary cards
- Full CRUD for companies, members, and items
- Month selector — filters all views to any past month
- CSV export
- Manual report trigger

---

## Data model

```
companies   id · name · active
members     id · company_id · name · work_email · active
items       id · name · category · unit_label · price_cents · active
transactions          id · member_id · company_id · item_id · quantity · logged_at
transactions_archive  same + archived_at · report_month
```

RLS: anon role can read companies, members, items, transactions. Service role (serverless only) handles writes to the archive and report generation. The service key is never exposed to the client bundle.

---

## License

MIT
