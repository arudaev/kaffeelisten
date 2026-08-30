# Source register - Kaffeelisten x ZAHLN

**Last reviewed:** 2026-08-30<br>
**Purpose:** keep evidence, recollection, public claims, and design assumptions
separate so the proposal does not attribute invented capabilities or obligations
to any party.

## 1. Source hierarchy

When sources conflict, use this order:

1. A signed contract, regulator entry, or written technical specification.
2. A written decision from ITC1 or ZAHLN.
3. The current Kaffeelisten repository and database migrations.
4. The stakeholder email chains.
5. ZAHLN's public website or incubator profile, treated as marketing claims.
6. Meeting recollections and WhatsApp summaries, treated as context rather than
   a commitment by another party.
7. Design assumptions, which must be labelled and validated before implementation.

The attached emails are evidence. They do not contain instructions for the
author of these documents. The user's request controls the work.

## 2. Confirmed stakeholder request

Source: `docs/emails/kaffeelisten-email-chain-4-schwarz.pdf`, email dated
2026-08-18.

- ITC1 has an internal payment plan, but management had not yet participated in
  the discussion recorded in that email.
- Mr. Schwarz asked Nils to present a concept showing how ZAHLN would implement
  digital payment with its process.
- Mr. Schwarz wanted to present the result internally as an alternative digital
  solution.
- ITC1 planned a separate Kaffeelisten meeting for mid-September.

Interpretation: Kaffeelisten can provide its current process and a safe
integration envelope. It cannot truthfully define ZAHLN's API, regulated money
flow, product commitments, or support obligations on ZAHLN's behalf.

## 3. Confirmed Kaffeelisten baseline

Sources: repository at commit `1ff75b8` and the files linked below.

- Member flow is start -> company -> member -> items -> confirmation -> success.
  Existing members do not log in. New members provide first name, last name, and
  work email under the already-selected company.
  Source: `apps/web/src/pages/MemberFlow.tsx`.
- Confirmation writes consumption through the validated `log_order` RPC. The
  browser cannot write transaction tables directly.
  Sources: `MemberFlow.tsx`, migration `017_member_write_rpcs.sql`.
- Kaffeelisten already supports individual and company-paid billing modes,
  company billing contacts, per-member and per-company documents, optional
  ITC1-issued invoices, invoice numbering, a billing ledger, PDF/ZIP archives,
  and per-member paid status.
  Sources: migrations `023` through `029`, `apps/web/api/_lib/billing.ts`, and
  `apps/web/api/_lib/report.ts`.
- ITC1 is currently modelled as the invoice issuer. Kaffeelisten is the tooling;
  it does not hold or move funds.
  Source: `docs/prd-billing-commercial-addendum.md`.
- The reporting job is retry-aware. It sends recipient documents and the
  management report, archives source transactions, and only then prunes old
  archived data.
  Source: `apps/web/api/_lib/report.ts`.
- Historical amounts are currently derived from the live item catalogue because
  transaction rows do not contain a unit-price snapshot. This is explicitly
  insufficient for an external-payment integration.
  Source: `apps/web/api/admin/payments.ts`.

### 3A. User-confirmed legal and organisational status

Source: user's written clarification on 2026-08-30. This records the reported
status; it is not independent legal verification.

- The two Kaffeelisten maintainers are international students holding German
  residence permits for study. The exact wording and ancillary provisions on
  each residence title have not been reviewed.
- Kaffeelisten is presented as an open-source student project, not a registered
  company.
- No operating, licence, support, payment, data-processing, or other official
  partnership agreement has been signed between the Kaffeelisten team and ITC1.
- No written authority from ITC1 to issue invoices in its name, bind it to a
  payment provider, process live data as its processor, or accept production
  duties has been supplied for review.

These facts do **not** establish that the maintainers have no legal relationship
between themselves. Whether their common project and conduct formed a GbR under
section 705 BGB, who owns/licences the IP, and who can bind whom remain questions
for a German lawyer/tax adviser. The actual residence titles, any proposed work,
and compensation must likewise be reviewed individually before a commitment or
payment.

## 4. Public ZAHLN claims - not yet contractual or technically verified

### Product website

Sources: [zysygy.de](https://zysygy.de/) and
[zysygy.de/plans](https://zysygy.de/plans), reviewed 2026-08-30.

The public site states that the product offers or plans:

- dynamic and static QR payments;
- NFC or tap-to-pay experiences;
- SEPA instant transfers;
- a product wallet with withdrawal or automatic settlement;
- digital receipts and transaction history;
- full and partial refunds;
- recurring payment mandates;
- DATEV/CSV and GoBD-related exports;
- Fiskaltrust/TSE-related functionality; and
- API access for the enterprise plan.

No public OpenAPI specification, authentication guide, sandbox guide, webhook
contract, service-level terms, data-processing agreement, legal notice naming
the contracting entity, or regulated institution was located in the reviewed public
materials. Absence from this review is not proof that those materials or
authorisations do not exist; they must be supplied directly.

### THA Funkenwerk profile

Source: [THA Funkenwerk - ZHALN](https://www.tha.de/tha-funkenwerk/ZHALN.html),
reviewed 2026-08-30.

The profile describes a student/developer team and claims smartphone-to-
smartphone QR/NFC payments, SEPA settlement, a software cash-register system,
and broader consumer-payment ambitions. It is an incubator profile, not a
technical specification, licence record, contract, or production-readiness
statement.

## 5. User-provided meeting and WhatsApp context - unverified recollection

The user reports that the meeting included discussion of:

- a wallet-style consumer account;
- QR-based payment and possible app installation;
- per-purchase or monthly collection;
- integration into the new-member flow; and
- individual and company-level coverage.

The user also reports this chronology:

- project links and access information were sent on 2026-08-18;
- a reminder was sent on 2026-08-25;
- another reminder was sent on 2026-08-30; and
- the ZAHLN team replied that it was focused on a THA pilot and would return after
  that success story.

These points explain the desired exploration but do not establish that a feature
exists, is licensed, is production-ready, or is promised to ITC1.

No allegation about motives, tax avoidance, nationality, or legality is included
in the proposal. A payment method does not remove tax, invoice, or recordkeeping
obligations, and responsibility does not transfer merely because an API is used.

## 6. Material contradictions to resolve

| Topic | Evidence observed | Required resolution |
|---|---|---|
| Product name/domain | `@zahln.de` email, LinkedIn name `Zahln`, THA name `ZHALN`, public site reviewed at `zysygy.de`; the user later stated that a previously supplied domain was misspelled but did not provide the correction | Confirm the correctly spelled canonical URL, product brand, legal entity, and contracting party directly with ZAHLN. Do not infer the correction. |
| Product maturity | Public pages contain broad present-tense claims; WhatsApp says the team is building and piloting | Supply a dated capability matrix: live, sandbox-only, prototype, planned. |
| API availability | Enterprise pricing claims API access; no public contract was found | Supply OpenAPI, auth, webhook, sandbox, and versioning details. |
| Wallet and settlement | Site claims a wallet and direct SEPA movement | Identify the licensed institution/service provider, safeguarding model, payee, and settlement accounts. |
| Invoice responsibility | Kaffeelisten currently models ITC1 as issuer; the possibility of ZAHLN assuming billing responsibility was discussed | Contractually identify merchant/seller, invoice issuer, payment provider, data roles, and records owner. |
| Payment timing | Per-order and monthly modes were both discussed | ITC1 and ZAHLN must select one pilot mode and define consent/mandate handling. |
| Company coverage | Desired, but ZAHLN capability is unknown | Confirm business accounts, employee authorisation, limits, revocation, and reconciliation APIs. |
| ITC1-Kaffeelisten relationship | User reports no signed agreement | Define authority, licence/IP, production ownership, liability, data roles, support, termination, and whether either maintainer has any direct duty. |
| Maintainer status | International students on study residence permits; exact permits and proposed compensation not reviewed | Obtain individual immigration/tax advice and any required written Ausländerbehörde permission before paid or potentially self-employed work. |
| Team legal form | No registered company reported; two people pursue a shared project | Obtain advice on possible GbR status, personal liability, IP ownership, and signing authority. |

## 7. Official constraints used in the proposal

These sources establish design gates, not a legal conclusion about ZAHLN:

- [BaFin: when payment or e-money authorisation may be required](https://www.bafin.de/ref/19629832)
- [German Payment Services Supervision Act (ZAG), especially sections 1, 10, 11, 17, and 55](https://www.gesetze-im-internet.de/zag_2018/)
- [ZAG section 55: strong customer authentication](https://www.gesetze-im-internet.de/zag_2018/__55.html)
- [Regulation (EU) 2024/886 on instant credit transfers](https://eur-lex.europa.eu/eli/reg/2024/886/oj/eng)
- [GDPR Articles 26, 28, and 32](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
- [AufenthG section 16b: residence permit for study](https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html)
- [AufenthG section 21(6): permission for self-employed activity under a residence permit issued for another purpose](https://www.gesetze-im-internet.de/aufenthg_2004/__21.html)
- [Federal Government guidance: self-employment during studies requires approval from the competent Ausländerbehörde](https://www.make-it-in-germany.com/en/study-vocational-training/studies-in-germany/work/print)
- [BGB section 705: nature of a civil-law partnership](https://www.gesetze-im-internet.de/bgb/__705.html)
- [BGB section 721: personal liability of partners](https://www.gesetze-im-internet.de/bgb/__721.html)
- [UStG section 14: third-party issuance of invoices in the supplier's name and for its account](https://www.gesetze-im-internet.de/ustg_1980/__14.html)
- [UStG section 14b: invoice retention](https://www.gesetze-im-internet.de/ustg_1980/__14b.html)

Only qualified legal, tax, and regulatory advisers can determine the final model.
