# ITC1 productization scope

**Status:** discovery draft

**Source:** ITC1 meeting on 25 June 2026

**Applies to:** single-campus Kaffeelisten deployment at ITC1 Deggendorf

## Purpose

This document translates the productization meeting into a reviewable scope.
It describes the problem, candidate capabilities, user stories, sequencing,
acceptance direction, risks, and open decisions. It is not an implementation
plan or a commitment that every requested feature will be built.

The existing [`prd.md`](prd.md) remains the baseline for shipped behavior. The
meeting record is in
[`meetings/2026-06-25-itc1-productization.md`](meetings/2026-06-25-itc1-productization.md).

## Product outcome

Kaffeelisten should become a production service that ITC1 can operate with
confidence while preserving the member flow that made the prototype useful:

> A campus member records consumption in under 15 seconds. ITC1 staff maintain
> accurate master data, inspect and export records, and produce the right
> monthly statement for each responsible recipient without developer
> intervention or accidental disclosure.

## Scope at a glance

| Capability | Why it matters | Current status | Scope status |
| --- | --- | --- | --- |
| Fast member logging | Core product value | Shipped | Preserve |
| Production repository and deployment | Safe handoff and maintenance | Prototype-derived | Required before launch |
| Clean master data | Real pilot and accurate statements | Demo/seed data exists | Required before pilot |
| Structured member and company contacts | Correct identification and delivery | Partial | Candidate requirement |
| Personal monthly statements | Members can review their own consumption | Not shipped | Candidate requirement |
| Company and oversight recipients | Disputes include responsible parties | Not shipped | Needs policy approval |
| Settings page | Routine control without code changes | Limited | Candidate requirement |
| Person/company drill-down and export | Faster checks and dispute handling | Partial | Candidate requirement |
| Catering/provisions output | Operational visibility | Unclear | Discovery required |
| Tenant interviews | Validate needs before expanding scope | Not started | Required discovery |

## Users and stakeholders

### Campus member

Records coffee, food, drinks, or snacks on the shared tablet. May work for an
ITC1 tenant or may be unaffiliated. Needs speed, clear confirmation, and a
private, understandable monthly statement.

### ITC1 administrator

Maintains companies, people, items, prices, and settings; checks records;
handles exceptions; and triggers or monitors monthly reporting.

### Company responsible contact

Reviews consumption attributed to the company and participates in resolving
questions. The exact role may be a company head, department lead, office
manager, or billing contact.

### Oversight recipient

Receives copies of statement communications to support governance and dispute
resolution. Veronica was proposed for this role. The access and privacy policy
must be approved before activation.

### Catering or provisions operator

Maintains or monitors the shared item supply. Their reporting and decision
needs require a focused interview.

### Product maintainer

Deploys updates, protects secrets, handles incidents, and maintains the system
under an eventual support agreement.

## Candidate requirements and user stories

### 1. Production baseline

**Need:** The hackathon implementation must be made safe and supportable before
it stores real operational data.

- As an ITC1 administrator, I want the production instance to contain only
  approved live data so that users do not select demo companies, people, or
  items.
- As an ITC1 administrator, I want failed reports and configuration problems to
  be visible so that operational errors are not silent.
- As a product maintainer, I want secrets, permissions, deployment settings,
  migrations, backups, and recovery steps documented so that the service can
  be operated predictably.
- As a product maintainer, I want obsolete hackathon assets separated from the
  maintained product so that the repository has a clear production surface.

Acceptance direction:

- Demo seed data is not automatically applied to production.
- A reviewed import or admin-entry process exists for companies, people,
  contacts, items, and prices.
- A backup and rollback point is created before any live data reset.
- Existing transactions follow the archive policy; reset scripts do not
  silently destroy transaction history.
- Client and server boundaries, Supabase row-level security, admin writes,
  secret handling, and report endpoints pass a focused security review.
- A production runbook covers deploy, rollback, data recovery, report failure,
  and administrator access recovery.

### 2. Structured people and affiliations

**Need:** Monthly statements require reliable identity and routing data.

- As an administrator, I want to store first name, last name, work email, and
  affiliation separately so that records can be validated and addressed
  correctly.
- As an administrator, I want required fields and clear validation so that
  incomplete profiles cannot enter the reporting workflow unnoticed.
- As an unaffiliated campus user, I want to be represented without pretending
  to belong to a tenant company so that I can use the same logging flow.
- As an administrator, I want to activate, deactivate, and correct people
  without losing their transaction history.

Acceptance direction:

- The model distinguishes given name, family name, normalized email, and
  affiliation status.
- The UI supports an explicitly defined unaffiliated case.
- Email uniqueness and shared-address rules are documented.
- Historical transactions continue to show the company attribution that was
  valid when the transaction was recorded.
- The member-facing screen does not expose email addresses.
- The product team decides whether self-registration remains enabled and, if
  so, whether new records require administrator approval.

### 3. Company contacts

**Need:** Each statement must reach the person responsible for the relevant
company without hardcoded recipient lists.

- As an administrator, I want to maintain one or more responsible contacts for
  a company so that reports follow staff changes without a deployment.
- As a company contact, I want communications to identify the company, member,
  reporting period, and source records so that I can investigate a question.
- As an administrator, I want invalid or missing contact data highlighted
  before month-end so that reporting does not fail after generation.

Acceptance direction:

- Contacts have name, email, role or label, active status, and a defined report
  recipient role.
- The system validates required recipients before sending.
- Contact changes are auditable at least by timestamp and administrator action
  in the first production release; named admin identities require a stronger
  authentication design.

### 4. Personal monthly statements

**Need:** Each active consumer should receive only their own monthly details,
with the approved responsible parties included in the conversation.

- As a campus member who recorded consumption in the period, I want an
  individual statement so that I can check dates, items, quantities, prices,
  and total before questions become billing disputes.
- As a company contact, I want the approved level of visibility into my
  company's statements so that I can resolve discrepancies.
- As an oversight recipient, I want to be included according to an approved
  policy so that I can assist when a recipient replies.
- As an administrator, I want a report run to show queued, sent, delivered when
  available, and failed statements so that I can safely resolve partial
  failures.

Acceptance direction:

- One message contains one member's data; members never see another member's
  details through recipient lists or attachments.
- Only members with transactions in the selected period receive a statement.
- `To`, `Cc`, `Reply-To`, sender identity, and monitored reply mailbox are
  configuration backed by an approved recipient matrix.
- A unique report-run and statement identifier prevents accidental duplicate
  sends and supports safe retry of failed messages.
- Transactions are archived or finalized only under an explicit rule for
  partial delivery; a single failed message cannot cause silent data loss.
- A preview shows recipient routing, counts, totals, and missing data before a
  manual send.
- The existing global summary is retained, changed, or retired only after the
  administrator confirms the operational need.
- Email volume, provider limits, attachment size, and delivery behavior are
  validated against the expected number of active consumers.
- Privacy review approves the data fields visible to the member, company
  contact, and oversight recipient.

### 5. Settings and administrative control

**Need:** ITC1 staff should manage routine product behavior without source-code
or environment-variable changes, while secrets remain protected.

- As an administrator, I want to change the admin PIN from a protected settings
  page so that access can be rotated after staff changes.
- As an administrator, I want a recovery procedure for a forgotten PIN so that
  the deployment cannot become permanently inaccessible.
- As an administrator, I want to manage approved report recipients and sender
  behavior so that operational changes do not require code edits.
- As an administrator, I want to select from approved brand themes or colors so
  that the interface can fit ITC1 branding without breaking accessibility.

Acceptance direction:

- PIN verification and updates are server-side; the PIN never enters the
  frontend bundle or a publicly readable table.
- PIN values are stored as a suitable one-way verifier, not readable plaintext,
  if moved out of deployment secrets.
- Settings changes are validated and auditable.
- Theme choices use constrained design tokens and preserve contrast,
  readability, and report rendering; arbitrary CSS is out of scope.
- Provider credentials, service-role keys, and deployment secrets remain
  maintainer-only.

### 6. Drill-down, filters, and export

**Need:** Administrators need direct answers for a person or company without
manually reshaping the global report.

- As an administrator, I want to select a person and reporting period so that I
  can review and export exactly that person's transactions.
- As an administrator, I want to select a company and reporting period so that
  I can review its people, transactions, subtotals, and total.
- As an administrator, I want exports to preserve active filters and clearly
  state the period so that the output matches what I reviewed.
- As a company contact, I want a consistent, readable output so that I can use
  it without learning the admin interface.

Acceptance direction:

- Person and company views support current and retained historical periods.
- Export content is identical to the filtered on-screen data and includes the
  generated timestamp and period.
- CSV or Excel is the machine-readable baseline. PDF is added only where a
  fixed-layout statement is required.
- Empty results, inactive records, renamed companies, and archived
  transactions are handled explicitly.
- The retention policy is long enough to satisfy the agreed historical export
  workflow.

### 7. Catering/provisions workflow

**Need:** Not yet sufficiently defined.

- As the person responsible for shared provisions, I want an agreed view or
  export of consumption so that I can perform a specific operational task.

Discovery must identify:

- The decision this person makes from the data.
- Required grouping: item, category, person, company, or time period.
- Whether the need is restocking, reconciliation, pricing, discrepancy review,
  or something else.
- Required cadence and output format.
- Whether person-level data is necessary or an aggregate is sufficient.

No new catering dashboard should be committed until these questions have
concrete answers.

## Recipient policy to approve

The discussion implies the following candidate matrix. It must be reviewed by
ITC1 and the appropriate privacy owner before implementation.

| Output | Primary recipient | Possible copy | Data included |
| --- | --- | --- | --- |
| Personal monthly statement | Member | Company contact; oversight recipient | That member's transactions and total only |
| Company monthly summary | Company contact | ITC1 administrator; oversight recipient if approved | Company aggregate and approved member breakdown |
| Global operational summary | ITC1 administrator | Oversight recipient if approved | Cross-company totals and delivery status |
| Failed-delivery alert | ITC1 administrator | Product maintainer if support policy allows | Routing metadata; minimum necessary personal data |

Copying a recipient on every email is not merely a UI setting. It establishes
ongoing access to personal consumption data and must be documented as policy.

## Delivery stages

### Stage 0 — production-readiness gate

Complete before treating the deployment as a production system:

- Inventory the repository and archive or remove obsolete hackathon artifacts.
- Audit Supabase RLS, browser permissions, server-only operations, API
  authorization, secrets, and logs.
- Establish backup, migration, reset, recovery, and incident procedures.
- Separate demo seeds from production setup.
- Reconcile data retention with monthly reporting and historical exports.

### Stage 1 — on-site pilot baseline

Target discussed: Tuesday, 30 June 2026.

- Configure the shared tablet and production URL.
- Load verified companies, people, items, prices, and necessary contacts.
- Run a smoke test from member selection through saved transaction and admin
  visibility.
- Observe actual use and record structured feedback, failures, and missing
  records.
- Define pilot duration, support contact, rollback procedure, and success
  measures.

The pilot may use the existing report workflow. Personal statements, complete
settings, and expanded exports are separate increments unless explicitly
approved and verified in time.

### Stage 2 — discovery and policy decisions

- Interview a representative set of ITC1 tenant companies.
- Interview the catering/provisions operator around a concrete task.
- Approve the report recipient matrix and privacy basis.
- Approve member/company fields, unaffiliated-member behavior, retention, and
  export formats.
- Decide which controls belong in the settings page.
- Define commercial ownership, maintenance, support, and response boundaries.

### Stage 3 — approved product increments

Implement only the approved slices, each with migration, rollback, tests, user
documentation, and acceptance criteria. A practical order is:

1. Structured member and company contact data.
2. Person/company drill-down and export.
3. Personal statement generation, preview, routing, retry, and delivery log.
4. Safe runtime settings and constrained theme controls.
5. Catering/provisions output validated through discovery.

### Stage 4 — production acceptance and handoff

- Run a dry monthly close with test recipients.
- Verify generated outputs, routing, reply behavior, partial failures, retry,
  archive behavior, and exports.
- Train the designated ITC1 administrator.
- Hand over the operating guide and confirm support/escalation contacts.
- Record written production acceptance and the maintenance arrangement.

## Pilot measures

At minimum, capture:

- Median time to record consumption, target under 15 seconds.
- Completed logs versus abandoned attempts.
- Number of wrong-person, wrong-item, and duplicate entries.
- Missing or incorrect companies, people, items, prices, and contacts.
- Administrator time needed to correct master data and answer a question.
- Tablet/network/service interruptions and recovery behavior.
- Qualitative feedback tied to the user's role and attempted task.

Feedback such as “more control” should be followed by: “What were you trying to
do, what stopped you, and what decision would the result support?”

## Non-goals for this scope

- Member accounts, passwords, or mandatory login in the consumption flow.
- Payment processing, invoice creation, or debt collection.
- Multiple campuses or a generic multi-tenant SaaS platform.
- Unrestricted visual customization or arbitrary CSS editing.
- A catering dashboard without a validated operational use case.
- Replacing the working member flow merely to make the product appear larger.

## Main risks and controls

| Risk | Required control |
| --- | --- |
| Personal data disclosed to incorrect recipients | Approved recipient matrix, per-member message isolation, preview, tests, and privacy review |
| Duplicate statements after retry | Idempotent report runs and per-statement delivery state |
| Partial email failure followed by archive/reset | Explicit finalization policy; retain source records until safe |
| Demo data mixed with production data | Environment separation and reviewed production import |
| Real data lost during cleanup | Backup, archive-safe migration, rollback, and reset review |
| Admin controls exposed through the browser | Server-side authorization and least-privilege Supabase policies |
| PIN change weakens security or causes lockout | One-way verifier, rate limiting, recovery process, and audit event |
| Historic exports conflict with short retention | Approve retention based on the business and legal workflow before pruning |
| Feature growth damages the 15-second flow | Keep administrative complexity outside the member flow and measure pilot time |
| Informal suggestions become expensive commitments | Mark decisions, owners, acceptance criteria, and exclusions before implementation |

## Decisions required before implementation

| Decision | Proposed owner | Blocks |
| --- | --- | --- |
| Authoritative production master data and reset approval | ITC1 administrator | Pilot data load |
| Required person fields and self-registration policy | ITC1 administrator + product team | Data-model migration |
| Unaffiliated-person representation and reporting owner | ITC1 administrator | Data-model migration |
| Company contact roles and cardinality | ITC1 administrator | Company-contact model |
| `To`/`Cc`/`Reply-To` recipient matrix | ITC1 + privacy owner | Personal statements |
| Legal basis and notice for copied personal statements | ITC1 + privacy owner | Personal statements |
| Meaning of statement versus invoice-supporting report | ITC1 administrator | Copy and document format |
| Report finalization behavior on partial delivery | ITC1 administrator + product team | Archive workflow |
| Historical retention period | ITC1 + privacy owner | Exports and cleanup |
| Required export formats | Admin/company representatives | Export implementation |
| Catering/provisions job to be done | Provisions representative | Catering output |
| Editable settings and theme boundaries | ITC1 + product/design team | Settings page |
| Pilot duration and success threshold | ITC1 + product team | Production acceptance |
| Ownership, maintenance, and support terms | Commercial decision-makers | Formal handoff |

## Scope completion criteria

This discovery scope is ready to become an implementation plan when:

1. Named owners have answered the blocking decisions above.
2. Tenant and catering interviews have produced task-based evidence.
3. The recipient/privacy policy is approved in writing.
4. Production-readiness findings are prioritized and critical risks are fixed.
5. Each accepted capability has testable acceptance criteria and a release
   stage.
6. Pilot feedback has been separated into observed problems, proposed
   solutions, and deferred ideas.
