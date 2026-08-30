# Kaffeelisten x ZAHLN digital-payment integration

**Document type:** stakeholder proposal and technical design<br>
**Status:** Kaffeelisten-side discovery draft - ZAHLN confirmation required<br>
**Version:** 0.2<br>
**Date:** 2026-08-30<br>
**Prepared for:** ITC1 management, Kaffeelisten maintainers, and the ZAHLN team<br>
**Decision represented:** none; this document does not authorise implementation

> This is not legal, tax, accounting, or regulatory advice. The document defines
> a safe technical and operational envelope. The final model must be confirmed by
> ITC1, ZAHLN, the regulated institution behind the money flow, and
> qualified advisers.

## Part I - Management summary

### 1. Why this document exists

On 18 August 2026, Mr. Schwarz asked Nils to present how ZAHLN would implement
digital payment together with Kaffeelisten, so that ITC1
could assess it as an alternative to its existing payment plan.

Kaffeelisten can define its current process, the user experience it can support,
and the safeguards required at the integration boundary. It cannot define or
promise ZAHLN's API, licence position, wallet mechanics, settlement model,
service level, or legal responsibilities. Those inputs have not yet been
provided.

Kaffeelisten is currently an open-source student project, not a registered
company. The maintainers report that they are international students holding
German residence permits for study, and that no operating, licence, support,
data-processing, or other partnership agreement has been signed between the
Kaffeelisten team and ITC1. Those facts are legal and operational constraints,
not administrative details.

This draft therefore answers two different questions separately:

1. **How could the products fit together safely?** This is technically feasible
   in principle through an optional server-side payment adapter.
2. **Is an ITC1 pilot using both systems ready to approve?** Not yet. The ZAHLN-specific
   technical, contractual, and regulatory evidence listed in section 6 is still
   required.

### 2. Proposed operating model

Kaffeelisten should remain the system of record for campus companies, members,
items, consumption, reporting, and ITC1's billing documents. ZAHLN should be an
optional payment and identity-linking service behind a narrow adapter.

This preserves the working product and prevents the campus from becoming
dependent on an unverified replacement platform.

```text
Campus member
    |
    v
Kaffeelisten PWA
    |
    v
Kaffeelisten server and ledger
    |                         \
    | optional adapter        \ existing reports/invoices/fallback
    v                           v
ZAHLN API and regulated rails   ITC1 administration
    |
    v
Signed status webhook back to Kaffeelisten
```

The integration must be removable by configuration. If ZAHLN is unavailable,
unlinked users and the existing monthly process must continue to work.

### 3. Recommended pilot scope

The recommended first ITC1 pilot is:

- optional ZAHLN linking for a small, named cohort;
- Kaffeelisten remains the consumption and reporting source of truth;
- one monthly settlement request for each linked individual, or one request for
  a company that explicitly covers its members;
- automatic paid status only after a signed ZAHLN webhook or successful
  server-to-server reconciliation;
- existing manual/invoice process for everyone else;
- feature flag, sandbox first, limited production rollout, and immediate rollback.

Monthly settlement is recommended for the first pilot because it preserves the
current under-15-second logging flow and matches Kaffeelisten's existing monthly
billing model. Per-purchase payment can be added only after ZAHLN demonstrates
the exact authorisation/SCA flow, response times, failure behaviour, and API.

This recommendation is Kaffeelisten's risk-minimising proposal. It is not a
statement of ZAHLN capability. If ITC1 prefers immediate payment, section 10
defines that alternative.

### 4. What changes for users

#### Existing or unlinked member

Nothing changes:

1. select company;
2. select name;
3. select items;
4. press `Bestätigen`;
5. receive the current success screen; and
6. receive the current monthly document according to ITC1 settings.

#### New member who wants to link ZAHLN

After `Ich bin noch nicht dabei`, the member can choose:

- `Mit ZAHLN verbinden`; or
- `Ohne ZAHLN hinzufügen`.

The ZAHLN option displays a short-lived QR code and deep link. The member
continues on their own phone, installs or opens the ZAHLN app if required,
completes ZAHLN's onboarding, and returns through a signed callback. Only an
opaque ZAHLN identifier is stored by Kaffeelisten. The existing manual
registration path remains available.

The exact deep-link and app-install experience is **ZAHLN confirmation
required**.

#### Linked member

The member tile and confirmation page may show a neutral `ZAHLN verbunden`
badge. It must not reveal wallet balance, email, bank details, or payment
credentials on the shared kiosk.

For monthly settlement, confirmation remains immediate and consumption is
marked for the monthly ZAHLN batch. For immediate payment, success is shown only
after the provider reaches the agreed confirmed state; delayed or failed payment
is shown honestly and remains visible to the administrator.

#### Company-paid member

If an ITC1 administrator has linked and authorised the company's business
account, member consumption can be routed to the company settlement without
requiring each employee to hold a ZAHLN account. The public kiosk must not allow
a user to activate company coverage. Company authorisation, limits, revocation,
and employee eligibility are **ZAHLN confirmation required**.

#### ITC1 administrator

The admin dashboard gains:

- integration health and last successful reconciliation;
- linked/unlinked/pending status for members and companies;
- payment mode and coverage source;
- pending, paid, failed, refunded, and disputed states;
- amount and reference matching;
- manual retry/reconciliation, but no ability to fabricate a provider
  confirmation; and
- an audit trail for automatic updates and authorised manual overrides.

### 5. Responsibility principle

Connecting a payment API does not automatically transfer commercial, tax,
invoice, privacy, or support responsibility.

Unless a written agreement explicitly establishes a different lawful model:

- ITC1 remains the seller/payment recipient and invoice issuer;
- Kaffeelisten remains technical tooling and a consumption/reporting ledger;
- ZAHLN and its regulated institution execute and evidence the payment;
- the developers do not hold customer money, access bank credentials, perform
  KYC, decide disputes, or manually attest that a payment occurred.

If ZAHLN proposes to become merchant of record or invoice issuer, that is a
different commercial and legal model. It requires a separate written proposal,
not a UI toggle.

### 5A. Legal and contractual position before any pilot

This section records blocking constraints, not final legal conclusions.

#### No authority from ITC1 has been documented

Without a signed agreement, the maintainers must not be represented as ITC1's
contractor, payment operator, authorised invoice agent, production support
provider, or GDPR processor. They currently have no documented authority to:

- bind ITC1 or accept terms in ITC1's name;
- contract with a payment provider on ITC1's behalf;
- receive, safeguard, route, or reconcile ITC1/customer funds;
- perform KYC/KYB or decide payment, refund, or dispute outcomes;
- issue invoices in ITC1's name and for its account;
- promise production availability, maintenance, incident response, or delivery
  dates; or
- process live ITC1 member data under an assumed controller/processor role.

Section 14 UStG permits a third party to create an invoice in the supplier's
name and for its account, but that does not create authority by itself. Invoice
mode must remain disabled until ITC1 gives written authorisation and its tax
adviser approves the issuer data, numbering, VAT treatment, delivery, correction,
and retention process.

#### Student residence permits

Section 16b(3) AufenthG permits limited **employment** during studies. It does
not by itself authorise self-employed or freelance activity. Under section
21(6), self-employed activity under a residence permit issued for another
purpose may be permitted, and the Federal Government's official guidance says
international students need approval from the competent Ausländerbehörde.

Accordingly, each maintainer must obtain advice based on their own residence
permit and written confirmation from the competent authority before accepting
paid implementation, a licence/handover fee, recurring maintenance, commercial
support, revenue share, or another role that may amount to self-employment. A
one-off payment, a low amount, an open-source licence, or the label "handover"
does not automatically make the activity permissible; the actual arrangement
and work performed matter.

#### Informal team status and personal liability

The absence of a registered company or written partnership agreement does not
prove that no partnership exists. Under section 705 BGB, an agreement to pursue
a common purpose can establish a civil-law partnership (GbR), and operating a
business under a common name creates a statutory presumption of participation
in legal transactions. If a GbR exists, section 721 BGB provides for personal,
joint-and-several liability of its partners for partnership obligations.

A German lawyer/tax adviser should therefore confirm whether the maintainers'
past and proposed conduct creates a GbR or another status, who owns and may
license the code and brand, who may sign, and whether either maintainer can bind
the other. Until then, neither maintainer should sign or promise obligations for
"the Kaffeelisten team" without the other's express written approval.

#### Required contract topology

The preferred allocation is:

| Relationship | Minimum written instrument | Purpose |
|---|---|---|
| ITC1 ↔ ZAHLN or its regulated institution | Merchant/payment-services and pilot agreement | KYC/KYB, payment authorisation, funds, settlement, refunds/disputes, support, SLA, exit |
| ITC1 ↔ each maintainer or an adviser-approved Kaffeelisten entity | Pilot/licence/handover and, if applicable, support agreement | Authority, scope, IP/licence, acceptance, liability, costs, production ownership, termination |
| ITC1 ↔ actual processor(s) | Article 28 AVV/DPA, or another documented GDPR allocation if the roles differ | Instructions, security, subprocessors, incidents, audit, return/deletion, data-subject requests |
| Maintainer ↔ maintainer | Internal written clarification reviewed by an adviser | IP ownership, decision/signing authority, expenses, compensation, liability, exit |

The Kaffeelisten agreement must not be signed and no paid work should start until
the residence-permit and tax questions have been cleared for each maintainer.
ITC1 should own or directly control the production domain and service accounts.

#### KYC/KYB boundary

ZAHLN or the named regulated institution must be solely accountable and
operationally responsible for payment-user/merchant KYC or KYB, sanctions and
fraud screening, payment credentials, strong customer authentication, and
regulatory records. Kaffeelisten may receive only an opaque provider subject,
link state, and signed payment/status references. It must not collect or retain
identity documents, selfies, bank credentials, proof-of-funds records, or KYC
case files.

### 6. Go/no-go gates

No production payment pilot should begin until all gates have written evidence:

| Gate | Evidence required | Owner |
|---|---|---|
| Legal identity | Contracting entity, legal notice, authorised signatory | ZAHLN |
| Regulatory model | BaFin authorisation/registration or named regulated institution/service provider, service scope, money-flow diagram | ZAHLN / regulated institution |
| Technical contract | Versioned API/OpenAPI, sandbox, auth, deep links, webhooks, status and reconciliation | ZAHLN |
| ITC1 authority | Signed ITC1-Kaffeelisten instrument defining the pilot, authority, IP/licence, production ownership, liability, support, and exit | ITC1 + maintainers/adviser-approved entity |
| Student status | Individual written immigration/tax advice and any required Ausländerbehörde permission before paid or potentially self-employed work | Each maintainer |
| Team legal status | Adviser-confirmed legal form/GbR analysis, IP ownership, and signing authority | Maintainers |
| Responsibility | Signed matrix for seller, payee, invoice issuer, KYC/KYB, support, refunds, disputes, retention, incidents | ITC1 + ZAHLN |
| Invoice authority | ITC1 written authorisation and tax-adviser approval before Kaffeelisten emits an ITC1 invoice | ITC1 |
| Data protection | Role-by-role controller/processor analysis; Article 28 AVV or Article 26 arrangement where applicable; subprocessors, hosting, retention, incident terms | ITC1 + all processing parties |
| Pilot decision | Per-order or monthly mode; individual/company coverage; cohort; success/exit criteria | ITC1 |
| Operational readiness | SLA, support contacts, outage/failure handling, export and exit plan | ZAHLN + ITC1 |
| Kaffeelisten readiness | Price snapshots, order identity, payment ledger, webhook verification, reconciliation, tests | Maintainers |

Public marketing pages and a clickable prototype do not satisfy these gates.

### 7. Management decision requested

At this stage, ITC1 is asked only to approve continued discovery under the
following boundary:

- Kaffeelisten prepares the current-system architecture and adapter design;
- ZAHLN supplies its actual process and evidence;
- the parties select one limited pilot model after reviewing both;
- discovery uses no live member/payment data and creates no operational duties;
- no production funds, payment data, ITC1 invoices, or paid maintainer work enter
  the integration before the gates in section 6 are closed.

No cost or delivery date should be committed before the ZAHLN inputs are
received and the pilot mode is selected.

## Part II - Product and technical design

### 8. Goals and non-goals

#### Goals

- Add optional digital payment without replacing the working Kaffeelisten flow.
- Preserve the under-15-second repeat-use target where the selected payment mode
  allows it.
- Support individual and company-funded settlement.
- Keep payment truth server-side, auditable, retry-safe, and provider-reconciled.
- Keep provider-specific code behind an adapter and feature flag.
- Make responsibilities and failure ownership explicit.
- Allow rollback to the existing monthly process without data loss.

#### Non-goals

- Replacing student IDs, campus access cards, exam identification, or discount
  credentials.
- Turning Kaffeelisten into a bank, wallet, payment institution, or KYC provider.
- Storing bank-login credentials, personalised security features, wallet
  credentials, or full provider payloads in the browser.
- Assuming that a wallet changes tax or invoice obligations.
- Replacing Kaffeelisten's companies, members, catalogue, consumption history,
  reporting, or admin controls with ZAHLN's platform.
- Supporting multiple campuses in this proposal.
- Promising a ZAHLN feature that has not been supplied in a written specification
  or contract.
- Assuming that the Kaffeelisten team is a registered company, an authorised
  ITC1 contractor, or free of possible GbR obligations merely because no formal
  partnership agreement has been signed.

### 9. Current Kaffeelisten architecture

Kaffeelisten already provides:

- a public no-login member flow;
- server-validated `log_order` and `undo_order` RPCs;
- protected administration;
- individual/company-paid billing configuration;
- member, company, and management documents;
- optional ITC1-issued invoice mode;
- idempotent report and billing-run ledgers;
- manual per-member monthly paid tracking; and
- archive and retention processing.

Two existing limitations must be fixed before accepting money:

1. A confirmation session has no durable `order_id`; it is represented by one or
   more transaction rows.
2. A transaction does not snapshot the price used at confirmation. Historical
   amounts can change when the item catalogue price changes.

An external payment must always reference one immutable order and amount.

### 10. Payment-mode options

| Model | User experience | Advantages | Risks/requirements | Pilot position |
|---|---|---|---|---|
| Per-purchase | `Bestätigen` creates one payment for the order; member authorises or wallet is charged | Immediate settlement and exact order matching | SCA/consent, kiosk delay, provider outage at checkout, refunds for order corrections | Phase 2 unless ZAHLN demonstrates a fast compliant flow |
| Monthly individual | Consumption remains instant; one month-end amount per linked member | Matches current process, low kiosk risk, simple reconciliation | Mandate/consent, insufficient funds, month-end retry and notices | Recommended first pilot |
| Monthly company | One month-end amount for all covered company members | Lowest employee friction, matches current company-paid mode | Business authorisation, member eligibility, limits, cost allocation | Recommended where company explicitly opts in |
| Hybrid | Company chooses monthly; individuals choose per-order or monthly | Flexible | Highest support, reporting, and state complexity | Do not pilot first |

The final choice must be recorded per company and must not silently change for an
existing user with outstanding consumption.

### 11. Identity-linking design

#### 11.1 Trust model

- Kaffeelisten identifies its own member and company records.
- ZAHLN identifies and onboards its payment user/business.
- Linking stores a stable opaque ZAHLN subject, never a wallet password or
  bank credential.
- Email is display/contact data, not a cross-system primary key.
- The callback is accepted only for a short-lived, single-use, server-created
  linking session.

#### 11.2 New-member sequence

1. User selects an existing Kaffeelisten company.
2. User selects `Ich bin noch nicht dabei`.
3. User chooses ZAHLN or manual registration.
4. Kaffeelisten server creates a single-use linking session containing a random
   nonce, selected company ID, expiry, and return context.
5. Kaffeelisten renders the ZAHLN authorisation URL as QR and deep link.
6. User completes ZAHLN onboarding/authentication on their own device.
7. ZAHLN returns an authorisation code plus the original state value.
8. Kaffeelisten server validates state, expiry, issuer, audience, and callback,
   then exchanges the code server-to-server.
9. Kaffeelisten receives an opaque subject and minimum approved profile fields.
10. User confirms the Kaffeelisten display name and selected company.
11. Kaffeelisten creates the member and payment link atomically.
12. A verification email can continue to be sent under the existing process.

ZAHLN inputs required: authorisation protocol, claims, PKCE, app links, store
fallback, KYC states, error states, and revocation.

#### 11.3 Existing-member linking

A shared kiosk must not let a user permanently claim another person's tile.
Acceptable pilot methods are:

- admin-generated one-time invite sent to the stored work email; or
- member selects their tile, scans a short-lived QR, authenticates with ZAHLN,
  and completes an additional Kaffeelisten verification step.

The final method depends on ZAHLN's identity assurance and ITC1's tolerance
for admin work.

#### 11.4 Company linking

Company linking occurs only in the protected admin dashboard:

1. ITC1 admin selects the company and requests a business-link session.
2. An authorised company contact completes ZAHLN business authentication.
3. ZAHLN returns a stable business subject and authorisation scope.
4. ITC1 admin selects coverage policy, effective month, limits, and fallback.
5. The link becomes active only after both ZAHLN and ITC1 approvals are recorded.

Member tiles may display `Von Firma abgedeckt`; they must not expose business
account details.

### 12. Order and payment flows

#### 12.1 Required order creation

`log_order` should evolve so one confirmation atomically creates:

- an `orders` row with immutable amount, currency, member, company, coverage,
  payment mode, and status; and
- transaction lines with `order_id` and `unit_price_cents` snapshots.

The client submits item IDs and quantities only. The server reads active prices,
calculates the total, enforces the item cap, and writes the snapshot. The browser
must never be trusted to supply the amount charged.

#### 12.2 Monthly settlement sequence

1. User confirms an order.
2. Kaffeelisten writes the order and price-snapshotted lines.
3. Order is marked `unsettled` under the applicable individual/company coverage.
4. User sees the normal success screen.
5. At month close, Kaffeelisten freezes a settlement batch from eligible orders.
6. Kaffeelisten creates exactly one ZAHLN payment request per payer using the
   settlement batch ID as idempotency key/reference.
7. ZAHLN performs the agreed consent/mandate and collection process.
8. Signed webhook updates the payment attempt.
9. A reconciliation job queries canonical status and settlement references.
10. Only the agreed final state marks the Kaffeelisten obligation paid.
11. Reports show paid, pending, failed, refunded, or disputed without changing
    the underlying consumption.

Month close and transaction archiving must not erase the records required to
reproduce the settlement.

#### 12.3 Immediate-payment sequence

1. User presses `Bestätigen`.
2. Kaffeelisten creates a `pending_payment` order with price snapshots.
3. Kaffeelisten server creates a ZAHLN payment request using the order ID as the
   idempotency key and external reference.
4. The user authorises in the ZAHLN app/web experience if required.
5. Kaffeelisten receives a signed event or queries canonical status.
6. `paid` displays success. `requires_action` displays the QR/deep link. `failed`
   or timeout displays a truthful fallback and leaves the order auditable.

Whether goods may be treated as consumed before final payment is an ITC1 policy
decision. Kaffeelisten must not delete a failed order to hide the discrepancy.

#### 12.4 Undo, cancellation, and refund

The current ten-second undo can delete newly created transaction rows. After a
payment integration:

- before payment creation: cancel the order locally;
- after request creation but before final payment: cancel both where supported;
- after payment: create a refund/reversal workflow, never delete the order;
- after monthly batch freeze: issue an adjustment or credit in the next
  settlement unless the provider supports safe batch amendment.

ZAHLN cancellation/refund semantics are required before immediate payment can
ship.

### 13. Proposed data model

Names are provider-neutral so ZAHLN remains an adapter, not a database-wide
dependency.

```text
orders
  id uuid primary key
  member_id uuid not null
  company_id uuid not null
  total_cents integer not null
  currency text not null default 'EUR'
  coverage_type text not null        -- individual | company
  payment_mode text not null         -- manual | provider_immediate | provider_monthly
  payment_status text not null
  created_at timestamptz not null
  cancelled_at timestamptz null

transactions / transactions_archive
  order_id uuid not null
  unit_price_cents integer not null   -- immutable price at confirmation

payment_account_links
  id uuid primary key
  provider text not null
  owner_type text not null            -- member | company
  member_id uuid null
  company_id uuid null
  provider_subject text not null       -- opaque, encrypted or strongly access-controlled
  status text not null                 -- pending | active | revoked | blocked
  scopes text[] not null
  linked_at timestamptz null
  revoked_at timestamptz null
  metadata_version text null

settlement_batches
  id uuid primary key
  provider text not null
  report_month text not null
  payer_type text not null
  payer_member_id uuid null
  payer_company_id uuid null
  amount_cents integer not null
  currency text not null
  status text not null
  frozen_at timestamptz not null
  completed_at timestamptz null

settlement_batch_orders
  settlement_batch_id uuid not null
  order_id uuid not null
  amount_cents integer not null

provider_payment_attempts
  id uuid primary key
  provider text not null
  order_id uuid null
  settlement_batch_id uuid null
  provider_payment_id text null
  idempotency_key text not null unique
  amount_cents integer not null
  currency text not null
  status text not null
  failure_code text null
  created_at timestamptz not null
  updated_at timestamptz not null

provider_webhook_events
  provider text not null
  provider_event_id text not null
  event_type text not null
  signature_verified boolean not null
  received_at timestamptz not null
  processed_at timestamptz null
  processing_error text null
  primary key (provider, provider_event_id)

payment_audit_events
  id uuid primary key
  entity_type text not null
  entity_id uuid not null
  previous_status text null
  new_status text not null
  source text not null                 -- webhook | reconciliation | admin_override
  actor text null
  reason text null
  created_at timestamptz not null
```

Raw webhook bodies should be retained only if necessary, minimised, access-
controlled, and covered by the retention policy. Secrets and access tokens must
remain server-side and should use managed secret storage rather than database
columns where possible.

### 14. Payment state model

Canonical Kaffeelisten states:

```text
not_applicable
unlinked
unsettled
pending
requires_action
paid
failed
cancelled
refunded
partially_refunded
disputed
```

Rules:

- The browser can request an action but cannot set a final state.
- Only a verified webhook or authenticated reconciliation query can set `paid`,
  `refunded`, or `disputed`.
- Duplicate events are ignored by provider event ID.
- Out-of-order events cannot move a final state backwards unless the provider
  contract defines a valid reversal/dispute transition.
- Amount, currency, payer, and Kaffeelisten reference must match before a state
  is accepted.
- An admin override requires a reason and audit event. It must be visibly
  different from provider confirmation.

The adapter must map ZAHLN's actual states to this model in one reviewed module.

### 15. API boundary

Proposed Kaffeelisten endpoints:

```text
POST /api/integrations/zahln/link-sessions
GET  /api/integrations/zahln/callback
POST /api/integrations/zahln/unlink
POST /api/integrations/zahln/payments
POST /api/integrations/zahln/settlements
POST /api/integrations/zahln/webhooks
POST /api/integrations/zahln/reconcile
GET  /api/admin/integrations/zahln/status
```

Implementation rules:

- member-facing creation endpoints accept Kaffeelisten IDs, not charge amounts;
- all ZAHLN calls are server-to-server;
- webhook route verifies signature over the exact raw body before parsing;
- callback and webhook routes have strict allow-lists, rate limits, replay
  protection, and structured audit logs;
- provider errors are normalised so internal code is not coupled to ZAHLN text;
- requests use deterministic idempotency keys;
- timeouts are short and retries use bounded exponential backoff;
- a scheduled reconciliation job repairs missed/delayed webhook delivery;
- no ZAHLN secret is prefixed `VITE_` or shipped to the browser;
- no current admin PIN is reused as integration authentication.

### 16. Reporting, invoicing, and reconciliation

Kaffeelisten currently supports statements, ITC1-issued invoices, billing
documents, management archives, and manual paid status. The integration should
extend these rather than create a second contradictory ledger.

"Supports" describes software capability only. In the reported absence of a
signed ITC1 authorisation and GDPR agreement, invoice mode and production use of
ITC1 personal data are not approved and must remain disabled.

#### 16.1 Default responsibility

- Consumption and prices: Kaffeelisten/ITC1.
- Invoice or statement: ITC1 through Kaffeelisten.
- Payment execution and regulated records: ZAHLN/regulated institution.
- Settlement reconciliation: ZAHLN provides; Kaffeelisten imports and matches.
- Accounting/tax export: ITC1-approved source, with document and payment
  references linked.

If a linked payer has already paid through ZAHLN, their Kaffeelisten document
must be labelled as paid/settled and must not request a second bank transfer.
If ZAHLN merely processes payment, Kaffeelisten must not suppress ITC1's invoice
unless ITC1's adviser and the contract approve that behaviour.

#### 16.2 Archive and retention issue

The current rolling transaction archive is approximately 90 days. A payment
integration needs immutable price, order, invoice, payment, refund, and
settlement references for the legally and contractually required period. The
final retention schedule must be approved before production. Payment evidence
must not be deleted as a side effect of the existing storage-pruning job.

### 17. Responsibility matrix

`A` = accountable, `R` = performs, `C` = consulted, `-` = no role under the
default model. The final contract must replace this draft.

| Activity | ITC1 | Kaffeelisten maintainers | ZAHLN / regulated institution |
|---|---:|---:|---:|
| Set catalogue prices and coverage policy | A/R | C | - |
| Record consumption | A | R | - |
| Identify Kaffeelisten member/company | A | R | C for linked subject only |
| Payment-user onboarding, KYC/KYB | C | - | A/R |
| Hold/safeguard/move funds | C | - | A/R |
| Obtain payment authorisation/SCA/mandate | C | - | A/R |
| Provide signed payment status | C | R to consume | A/R to produce |
| Issue ITC1 invoice/statement | A/R | R as tooling | C |
| Settlement and payout record | C | R to reconcile | A/R |
| Refund commercial decision | A/R | C | R execution |
| Unauthorised-payment/dispute investigation | C | C/evidence | A/R |
| Member/company first-line support | A | C | R for payment-specific issues |
| API uptime and payment incidents | C | C | A/R |
| Kaffeelisten availability and adapter defects | A | R | C |
| GDPR role determination and notices | A | C | A/R for own processing |
| Tax/accounting approval and retention | A/R | C | C |
| Integration exit and data export | A | R | R |

This matrix becomes operative only through signed agreements. Before that, the
maintainers' `R` entries describe proposed software functions, not accepted
legal duties or authority to act for ITC1.

The developers are not a substitute for a licensed payment institution, ITC1's
tax adviser, or ITC1's management approval.

### 18. Security and privacy requirements

#### Payment and regulatory boundary

The public wallet and SEPA claims indicate activity that may fall within the ZAG
depending on the exact contracts and money flow. If customer funds are held, a
monetary value is issued, or payments are initiated, ZAHLN must identify the
authorised institution and scope. Kaffeelisten should remain a technical service
that never possesses transferred funds.

Electronic payment initiation may require strong customer authentication and
dynamic linking to amount and payee. ZAHLN must specify how its proposed
per-order or recurring flow satisfies the applicable requirements and what the
user sees.

#### Data minimisation

Kaffeelisten should store only:

- opaque provider subject and payment references;
- link/consent status and minimum scope;
- amounts, currency, status, timestamps, and reconciliation references; and
- audit information needed to explain a decision.

Kaffeelisten should not store:

- wallet credentials or balance unless contractually essential;
- bank-login credentials or personalised security features;
- KYC identity documents;
- full bank-account history;
- raw provider payloads indefinitely; or
- payment secrets in logs, client storage, URLs, or analytics.

#### GDPR

Before pilot, the parties must map which processing each performs as independent
controller, joint controller, or processor. An AVV/DPA is required where Article
28 applies; an API alone does not define the role. Notices, lawful bases,
subprocessors, hosting, retention, deletion, data-subject requests, breach
notification, and international transfers must be documented.

Because no ITC1-Kaffeelisten agreement is currently reported, no production
processing should be justified by treating the maintainers as ITC1's processor.
Use synthetic data for discovery. Before any live data, document the actual
controller(s), execute the required Article 28 contract or Article 26
arrangement, and move production accounts under the agreed accountable party.

#### Operational security

- Separate sandbox and production credentials.
- Managed secret storage and rotation.
- Least-privilege scopes per environment.
- Signed webhooks with replay protection.
- Encryption in transit and at rest.
- No PII or secrets in routine logs.
- Alerting for signature failures, reconciliation mismatch, and sustained outage.
- Dependency and vulnerability scanning.
- Tested backup, restore, export, and provider-offboarding procedures.

### 19. Failure and mitigation plan

| Failure | Required behaviour | Owner |
|---|---|---|
| ZAHLN API unavailable during normal logging | Preserve Kaffeelisten order; mark pending/manual fallback; do not claim payment | Shared |
| Link callback expires or is replayed | Reject; allow a new session; do not create duplicate member/link | Maintainers |
| Duplicate webhook | Return success after idempotent no-op | Maintainers |
| Forged/invalid webhook signature | Reject, log security event, alert on threshold | Maintainers |
| Webhook delayed or lost | Scheduled status reconciliation | Shared |
| Out-of-order event | Apply documented transition rules; never blindly overwrite | Maintainers |
| Amount/currency/reference mismatch | Quarantine, do not mark paid, alert admin | Shared |
| Insufficient funds/monthly failure | Remain unpaid; apply agreed retry/manual process; no silent deletion | ZAHLN + ITC1 |
| Refund or dispute | Preserve original order and payment; add auditable reversal state | Shared |
| Company revokes coverage | Effective-dated change; outstanding batches keep original payer unless contract says otherwise | ITC1 |
| Provider link revoked | Stop new provider charges; preserve historical references; use fallback | Shared |
| Provider discontinued | Disable feature flag; export/reconcile open obligations; continue existing process | Shared |
| Report run while payments pending | Report pending separately; do not represent as paid or prune required evidence | Maintainers |
| Integration secret exposed | Revoke/rotate, pause integration, reconcile affected requests, incident process | Shared |

### 20. Rollout plan

#### Phase 0 - ZAHLN evidence and integration design

- Receive the material in `zahln-information-request.md`.
- Resolve product/legal name and regulated institution.
- Select payment mode and responsibility model.
- Complete money-flow and data-flow diagrams.
- Agree sandbox, SLA, support, retention, and exit terms.
- Obtain ITC1 management, tax/accounting, privacy, and contract review.

Exit criterion: every gate in section 6 has an owner and written evidence.

#### Phase 1 - internal adapter and sandbox

- Add immutable orders and price snapshots.
- Implement adapter interface with a fake provider first.
- Implement linking, webhook verification, payment state machine, and
  reconciliation against ZAHLN sandbox.
- Add feature flags and admin integration status.
- Run automated security, idempotency, failure, and migration tests.

Exit criterion: sandbox acceptance criteria pass without client secrets or false
payment states.

#### Phase 2 - limited ITC1 pilot

- Small named cohort and one payment mode only.
- Explicit participant information and support contacts.
- Daily reconciliation during the pilot.
- No automatic expansion.
- Weekly review of failures, support, timing, and mismatches.

Exit criterion: agreed transaction volume completes with no unresolved mismatch,
privacy incident, duplicate charge, or data loss.

#### Phase 3 - evaluate, expand, or remove

- Compare outcomes with ITC1's existing plan.
- Obtain stakeholder acceptance.
- Expand only after operational ownership is funded and contracted.
- Otherwise export, reconcile, disable the integration, and retain required
  evidence under the agreed policy.

### 21. Acceptance criteria

#### Identity

- A link session is single-use, short-lived, bound to intended context, and
  cannot be replayed.
- One user cannot claim another member's record through the kiosk.
- Revocation stops future provider use without deleting history.
- Company coverage can only be enabled through authorised admin/business flow.

#### Payments

- Amount is calculated server-side from price-snapshotted lines.
- One order/batch creates at most one provider payment for an idempotency key.
- Client responses alone never mark paid.
- Duplicate and out-of-order events cannot create duplicate charges or invalid
  state regressions.
- Reconciliation detects missing events and amount/reference mismatches.
- Cancellation/refund/dispute preserves the original audit trail.

#### User experience

- Unlinked flow remains unchanged and works during provider outage.
- Monthly-linked repeat logging still meets the current under-15-second target.
- Immediate-payment timing target is set only after sandbox measurement.
- Shared screens expose no email, bank, wallet, balance, or credential data.
- Every status message distinguishes saved consumption from confirmed payment.

#### Administration and reporting

- Dashboard identifies payer, mode, provider status, Kaffeelisten status,
  mismatch, and last reconciliation.
- A provider-linked payment cannot also generate an unintended payment request.
- Management exports tie each order/batch, document, provider payment, and payout
  through stable references.
- Pending/failed/refunded/disputed records survive month close and pruning.
- Manual overrides are reasoned and audited, not presented as provider evidence.

#### Security and operations

- No production secret is in source control or a `VITE_` variable.
- Webhook signatures and replay windows are tested.
- Key rotation and provider outage are rehearsed.
- Data protection agreements, notices, retention, and subprocessors are approved.
- ITC1-Kaffeelisten authority, IP/licence, liability, production ownership, and
  exit terms are signed.
- Each maintainer's residence-permit and tax position is cleared in writing for
  the role and any compensation actually proposed.
- The maintainers' legal form, possible GbR status, IP ownership, and signing
  authority are confirmed by a qualified adviser.
- Invoice mode remains off unless ITC1 has expressly authorised third-party
  generation in its name and its tax adviser has approved the process.
- Support and incident escalation contacts are live before the first payment.
- The existing admin PIN exposed in prior chat is rotated before any pilot.

### 22. Open decisions

| Decision | Options | Proposed owner | Blocking? |
|---|---|---|---|
| Pilot payment timing | Monthly individual, monthly company, per-order | ITC1 + ZAHLN | Yes |
| Product/legal name and canonical domain | ZAHLN, ZHALN, ZYSYGY; exact entity and correctly spelled URL | ZAHLN | Yes |
| Regulated model | Own authorisation, agent, regulated-institution relationship, technical provider | ZAHLN | Yes |
| Seller/payee/invoice issuer | Default ITC1; alternative needs separate proposal | ITC1 + ZAHLN | Yes |
| Linking assurance | Email invite, ZAHLN identity plus verification, admin approval | ITC1 | Yes |
| Company coverage policy | All employees, approved list, limits, effective date | ITC1 + company | Yes |
| Payment consent/SCA | Per transaction, recurring mandate, wallet rule | ZAHLN / institution | Yes |
| Failure fallback | Pending, manual monthly, retry schedule | ITC1 | Yes |
| Retention | Orders, invoices, payment evidence, webhooks, exports | ITC1 advisers | Yes |
| Infrastructure ownership | ITC1-owned accounts or contracted processor model | ITC1 | Yes |
| Ongoing maintenance/support | Named funded owner and SLA | All parties | Yes |
| ITC1-Kaffeelisten legal relationship | Licence/handover/pilot/support scope, authority, liability, exit | ITC1 + maintainers | Yes |
| Maintainer immigration/tax clearance | Exact role and compensation permitted for each residence title | Each maintainer + advisers/authority | Yes |
| Kaffeelisten team status | Possible GbR, IP ownership, signing authority | Maintainers + advisers | Yes |

### 23. Information required from ZAHLN

The complete internal reference is maintained in
[`zahln-information-request.md`](zahln-information-request.md). The minimum set needed to
replace this draft with a combined proposal is:

The concise ZAHLN-facing attachment is
[`zahln-integration-information-request.txt`](zahln-integration-information-request.txt).

- pitch deck and dated product-readiness matrix;
- exact legal entity, brand, correctly spelled canonical domain, regulated
  institution/service provider, and role;
- money-flow and settlement diagram;
- API/OpenAPI, sandbox, auth/linking, webhook, status, refund, idempotency, and
  reconciliation specifications;
- selected per-order/monthly and individual/company flows;
- responsibility matrix for KYC, authorisation, invoice, settlement, failure,
  refunds, disputes, support, privacy, retention, and incidents;
- pricing, SLA, support, exit/export, and pilot terms.

Until these are supplied, ZAHLN-dependent statements remain proposals, not facts.

### 24. References

#### Project evidence

- `docs/emails/kaffeelisten-email-chain-4-schwarz.pdf`
- `docs/emails/kaffeelisten-email-chain-4-nils.pdf`
- `docs/prd.md`
- `docs/prd-billing-commercial-addendum.md`
- `docs/domain.md`
- `apps/web/src/pages/MemberFlow.tsx`
- `apps/web/api/_lib/report.ts`
- `apps/web/api/_lib/billing.ts`
- `apps/web/api/admin/payments.ts`
- `supabase/migrations/023_company_billing_fields.sql` through
  `029_paid_grid_default_on.sql`

#### ZAHLN public material

- [ZYSYGY public product page](https://zysygy.de/)
- [ZYSYGY public plans page](https://zysygy.de/plans)
- [THA Funkenwerk profile under the name ZHALN](https://www.tha.de/tha-funkenwerk/ZHALN.html)
- [LinkedIn company page under the name Zahln](https://de.linkedin.com/company/zahln)

#### Official constraints

- [BaFin guidance on payment/e-money authorisation](https://www.bafin.de/ref/19629832)
- [Payment Services Supervision Act (ZAG)](https://www.gesetze-im-internet.de/zag_2018/)
- [ZAG section 55 - strong customer authentication](https://www.gesetze-im-internet.de/zag_2018/__55.html)
- [Regulation (EU) 2024/886 - instant credit transfers](https://eur-lex.europa.eu/eli/reg/2024/886/oj/eng)
- [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
- [AufenthG section 16b - residence permit for study](https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html)
- [AufenthG section 21 - self-employed activity](https://www.gesetze-im-internet.de/aufenthg_2004/__21.html)
- [Federal Government guidance: study and work](https://www.make-it-in-germany.com/en/study-vocational-training/studies-in-germany/work/print)
- [BGB section 705 - nature of a civil-law partnership](https://www.gesetze-im-internet.de/bgb/__705.html)
- [BGB section 721 - personal liability of partners](https://www.gesetze-im-internet.de/bgb/__721.html)
- [UStG section 14 - issuing invoices](https://www.gesetze-im-internet.de/ustg_1980/__14.html)
- [UStG section 14b - invoice retention](https://www.gesetze-im-internet.de/ustg_1980/__14b.html)

---

**Document boundary:** This version is suitable for discovery discussion. It is
not yet suitable as a commitment by ZAHLN or all parties, implementation specification,
binding proposal, or production approval.
