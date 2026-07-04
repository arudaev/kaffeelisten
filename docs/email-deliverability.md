# Email deliverability — `kaffeelisten.de` (Resend)

All Kaffeelisten mail is sent from `bericht@kaffeelisten.de` via **Resend** (EU region,
`eu-west-1`): the monthly company report, the per-member statements, the admin PIN-reset code, and
the member email-confirmation link. For those to reach inboxes and not spam, the domain must pass
**SPF**, **DKIM**, and (recommended) **DMARC**. These are DNS + Resend-dashboard settings — they
**cannot be verified from this repository**. This document is the checklist to complete and audit
them.

> Reply-to: outgoing mail now sets `Reply-To` to the first address in the `ADMIN_EMAIL` env var (see
> `apps/web/api/_lib/mail.ts`). A from-address that silently drops replies hurts reputation, so make
> sure `ADMIN_EMAIL`'s first entry is a real, monitored mailbox.

## 0. Your DNS setup (context)

`kaffeelisten.de` runs three services off one zone; keep them mentally separate so you don't "fix"
one by breaking another:

- **Web → Vercel:** `A @ → 216.198.79.1`, `CNAME www → cname.vercel-dns.com`. (Production confirmation
  links resolve here.)
- **Mailboxes → Hetzner:** `MX @ → www4.your-server.de`, root `TXT @ → "v=spf1 +a +mx ?all"`, plus the
  `autoconfig` / `_autodiscover` / `_imaps` / `_pop3s` / `_submission` records. This is real mail
  **from** `@kaffeelisten.de`.
- **Transactional → Resend (AWS SES, `eu-west-1`):** uses the **`send.` subdomain** for the bounce /
  return-path and a **root-domain DKIM key** (`resend._domainkey`). It does **not** use the root MX or
  root SPF, so it neither needs nor touches the Hetzner records above.

## 1. DNS records — current status

All four records are **live and correct** — the three Resend requires (DKIM, `send` MX, `send` SPF)
plus the recommended DMARC policy. Verified with `nslookup` (see §3). DMARC resolves on Google's
resolver; a lag on other resolvers (e.g. Cloudflare `1.1.1.1`) is just propagation on the 7200s TTL.

| Status | Type | Host (FQDN)                          | Value                                   |
|--------|------|--------------------------------------|-----------------------------------------|
| ✅ live | TXT  | `resend._domainkey.kaffeelisten.de`  | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC6rMSKiJR1i/KokKxlCSWn4F3Kp3COrJwnG6D7OBgaL52JpGoXUpYSiqI5UHh5IZ/gLs5jJqwDLns/s2cbxSAdGSjuKQHR5EEHBVIvOGL1QhNaGTQlLFH2ppCZgM9UTX/kgXncfw/UnRcw/L1+AdarIhdVOenHPmouU6+U3E5k2wIDAQAB` |
| ✅ live | MX   | `send.kaffeelisten.de`               | `10 feedback-smtp.eu-west-1.amazonses.com` |
| ✅ live | TXT  | `send.kaffeelisten.de`               | `v=spf1 include:amazonses.com ~all`     |
| ✅ live | TXT | `_dmarc.kaffeelisten.de`           | `v=DMARC1; p=none; rua=mailto:hlexhelftd@gmail.com; fo=1` |

**Ongoing:**
- The DMARC record turns on aggregate reporting (`rua=` sends the daily XML reports to
  `hlexhelftd@gmail.com`; `fo=1` asks for failure samples). Watch a few of those reports and confirm
  both Resend **and** your Hetzner mailbox mail align, **then** tighten the policy from `p=none` →
  `p=quarantine` → `p=reject`. Nothing further to add in DNS.

Notes:
- **DMARC covers the whole domain**, including your Hetzner mailbox mail. Resend already passes via
  **DKIM alignment** (`d=kaffeelisten.de`). Keep `p=none` until you've watched a few `rua` reports and
  confirmed your Hetzner mail also aligns, **then** tighten to `p=quarantine` and eventually `p=reject`.
- **Root SPF is `?all` (neutral)** — very permissive. Harmless for Resend (which doesn't rely on it),
  but once you're confident in your senders you may want to tighten the root `@` record to `~all`.
- **Do not** add `include:amazonses.com` to the **root** SPF or change the root MX — Resend's SPF lives
  on the `send.` subdomain by design.

## 2. Verify on Resend

1. Resend dashboard → **Domains** → `kaffeelisten.de`.
2. Click **Verify DNS Records**. DKIM and SPF should read **Verified** (green) immediately, since those
   records are already live. (DMARC is not required for Resend to verify.)
3. Send a test from the dashboard (or add a member in the admin panel) and confirm delivery to a real
   inbox — check that it lands in the inbox, not spam.

## 3. Self-check propagation from the CLI

```bash
# DKIM public key present?
dig +short txt resend._domainkey.kaffeelisten.de

# SPF on the bounce subdomain?
dig +short txt send.kaffeelisten.de
dig +short mx  send.kaffeelisten.de

# DMARC policy?
dig +short txt _dmarc.kaffeelisten.de
```

(On Windows without `dig`: `nslookup -type=txt resend._domainkey.kaffeelisten.de`.)

## 4. Deliverability hygiene (already in code)

- Consistent from-address (`bericht@kaffeelisten.de`) across all senders.
- `Reply-To` set to a monitored mailbox (`ADMIN_EMAIL[0]`).
- Member statements are sent sequentially with a light throttle to respect rate limits and avoid a
  sudden burst that can trip spam filters (`apps/web/api/_lib/report.ts`).
- Emails have a plain, real German subject and body — no all-image content.

## 5. Ownership

DNS records and Resend verification are performed by the domain owner (currently `hlexhelftd@gmail.com`).
The application code cannot read or confirm these records; treat section 2's "Verified" status as the
source of truth.
