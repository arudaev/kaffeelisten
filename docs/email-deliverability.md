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

## 1. DNS records to add

Add these at the DNS registrar for `kaffeelisten.de`, exactly as Resend issued them. Host names are
**relative to the domain** — depending on the registrar you enter either the short label (`send`) or
the fully-qualified name (`send.kaffeelisten.de`); both forms are shown.

| Type | Host (short)        | Host (FQDN)                          | Value                                                   | Priority |
|------|---------------------|--------------------------------------|---------------------------------------------------------|----------|
| TXT  | `resend._domainkey` | `resend._domainkey.kaffeelisten.de`  | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC6rMSKiJR1i/KokKxlCSWn4F3Kp3COrJwnG6D7OBgaL52JpGoXUpYSiqI5UHh5IZ/gLs5jJqwDLns/s2cbxSAdGSjuKQHR5EEHBVIvOGL1QhNaGTQlLFH2ppCZgM9UTX/kgXncfw/UnRcw/L1+AdarIhdVOenHPmouU6+U3E5k2wIDAQAB` | —  |
| MX   | `send`              | `send.kaffeelisten.de`               | `feedback-smtp.eu-west-1.amazonses.com`                 | 10       |
| TXT  | `send`              | `send.kaffeelisten.de`               | `v=spf1 include:amazonses.com ~all`                     | —        |
| TXT  | `_dmarc`            | `_dmarc.kaffeelisten.de`             | `v=DMARC1; p=none;`                                      | —        |

Notes:
- **DKIM (`resend._domainkey`)** — paste the `p=…` value as **one unbroken string**. Some registrars
  split long TXT records at 255 characters automatically; that's fine, but never insert line breaks
  or spaces yourself.
- **The `send` MX/SPF pair** governs only the bounce / return-path **subdomain** (`send.kaffeelisten.de`).
  It does **not** touch the root-domain MX, so it will not interfere with any mailbox hosting on
  `kaffeelisten.de` itself.
- **DMARC `p=none`** is monitoring-only: it reports alignment but does not quarantine anything. Leave
  it at `none` for the first few monthly sends, then, once the Resend dashboard shows DKIM + SPF
  consistently aligned, tighten to `p=quarantine` and eventually `p=reject` for full protection.

## 2. Verify on Resend

1. Resend dashboard → **Domains** → `kaffeelisten.de`.
2. Click **Verify DNS Records**. DKIM and SPF must both read **Verified** (green). DNS propagation
   can take from minutes up to ~48h depending on the registrar's TTL.
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
