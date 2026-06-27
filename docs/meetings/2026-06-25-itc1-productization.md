# ITC1 productization meeting — 25 June 2026

## Document status

This is an organized record reconstructed from the project team's spoken
summary on 27 June 2026. It is not a verbatim transcript or an approved set of
requirements. Uncertain names, roles, interpretations, and decisions are
called out explicitly.

The candidate product scope derived from this meeting is documented in
[`../productization-scope.md`](../productization-scope.md).

## Meeting details

| Field | Recorded detail |
| --- | --- |
| Date | 25 June 2026 |
| Time | 12:45 |
| Place | ITC1 Building E, hall “Erde” (“Earth”), Deggendorf |
| Purpose | Demonstrate Kaffeelisten again and discuss its path from hackathon prototype to a production product for ITC1 |
| Follow-up | Proposed on-site tablet pilot on Tuesday, 30 June 2026 |

The source summary calls the meeting “Friday,” but 25 June 2026 was a
Thursday. The date is treated as authoritative until the team confirms
otherwise.

## Participants

- The Kaffeelisten project team.
- Veronica, described as a Vice President of Technische Hochschule Deggendorf
  (THD). Surname and exact title/responsibility need confirmation.
- Thomas Keller, described as CEO of ITC1.
- An executive or representative of EZ2Parts, a startup based at ITC1. Name and
  title need confirmation.
- A person responsible for catering, food, beverages, or shared provisions at
  ITC1. Name and exact role need confirmation.

## Context presented

Kaffeelisten was created for the B4Y3RW4LD Hackathon on 8–9 May 2026. Its core
member flow is intentionally narrow: choose a company, choose a person, record
one or more consumed items, and confirm. The team considers this core flow
successful and wants to retain its speed and simplicity.

The current repository and deployment still carry assumptions, demo data, and
configuration from the hackathon. The meeting focused on what would be needed
for ITC1 to operate the application as a maintained product rather than a
prototype.

The team has purchased the custom domain
[`kaffeelisten.de`](https://kaffeelisten.de).

## What was discussed

### Commercial direction

- Thomas Keller expressed interest in buying the product in its current form
  and paying an ongoing maintenance fee. This was an expression of interest,
  not a recorded commercial agreement.
- Veronica suggested that the team consider forming a company.
- Veronica also suggested interviewing companies located at ITC1 to understand
  their workflows, desired features, and operational needs.
- The immediate objective is to make Kaffeelisten reliable and controllable
  enough to be evaluated as a product ITC1 could purchase and operate.

### Production readiness and handoff

Stakeholders want a production-ready baseline with fewer opportunities for
operator error and more control for ITC1 staff. Discussed work included:

- Audit and clean the repository, separating or removing hackathon-only
  material while preserving useful project history.
- Review security, secrets, deployment configuration, database permissions,
  and operational failure modes before real campus data is entered.
- Remove existing demo or seeded companies, members, and catalog items from
  the production data set.
- Re-enter the real ITC1 companies, people, foods, beverages, and prices from
  authoritative sources.
- Prepare the application and tablet for an on-site pilot and eventual product
  handoff.

The data reset must be designed before it is run. Real transactions must never
be deleted without the required archive and retention process.

### Monthly statements and recipients

The current global monthly report is not sufficient for the proposed
production workflow. The requested direction was:

- Every person who recorded consumption during a reporting month receives an
  individual email statement for that month.
- A responsible contact for the person's company or department is included in
  the communication.
- Veronica is copied on every individual statement, even if this results in
  dozens or hundreds of messages.
- Recipients should be able to reply to the message and keep the relevant
  parties in the resulting conversation when a statement is disputed.
- Companies therefore need one or more responsible contact email addresses.

The exact `To`, `Cc`, and `Reply-To` rules were not finalized. It also remains
unclear whether the existing global administrator report should continue in
addition to individual statements and company-level reports.

Because these messages expose personal consumption and spending information to
third parties, recipient authorization, data minimization, privacy notice, and
retention need explicit approval before implementation.

### People and company records

Stakeholders asked for more structured records:

- A person's first name, last name, email address, and company association
  should be captured as separate, required information.
- The system must also accommodate people who are not associated with an ITC1
  tenant company.
- Company records should include the email address or addresses of the people
  responsible for reviewing consumption statements.
- Administrators should be able to inspect and edit these records in a clear,
  conventional interface.

The meeting did not decide whether an unaffiliated person should use a special
“no company” group or have a nullable company relationship. It also did not
settle whether member self-registration remains available once these fields
become mandatory.

### Administration and settings

Stakeholders asked for a dedicated settings area that gives authorized ITC1
staff more operational control. Examples discussed were:

- Change the administrator PIN safely.
- Configure approved visual colors or themes.
- Manage report recipients and other operational settings.
- Reduce reliance on a developer changing deployment environment variables for
  routine administration.

These are desired capabilities, not a request for unrestricted control over
CSS, secrets, or deployment infrastructure. The safe boundary between editable
settings and maintainer-only configuration remains to be designed.

### Inspection and exports

The admin dashboard should make records easier to inspect and export:

- Select a person, view that person's transactions for a chosen period, and
  export them in a practical format.
- Select a company, view its people and transactions for a chosen period, and
  export them.
- Preserve the useful parts of the existing dashboard and improve them where
  the real administrative workflow requires it.

CSV, Excel, and PDF were mentioned or already exist in the product, but the
required format for each export was not finalized.

### Catering or provisions workflow

The catering/provisions representative asked for better control or output for
checking consumption. The precise job to be done was not captured. Before
designing a new dashboard, the team needs to determine whether this person
needs item totals for restocking, person-level checks, price management,
company totals, discrepancy investigation, or a different workflow.

## Product principles retained

- Keep the member-facing flow fast, simple, German-first, and usable without an
  account or login.
- Do not add payment processing or invoicing; Kaffeelisten records consumption
  and produces statements or reports.
- Do not generalize the initial production release to multiple campuses.
- Add operator control only where it supports a real ITC1 workflow and can be
  implemented safely.
- Treat meeting suggestions as discovery input. Validate the underlying need
  before selecting a technical solution.
- Prefer a small, maintainable product over a large set of speculative
  features.

## Proposed immediate pilot

The team proposed returning to ITC1 on Tuesday, 30 June 2026 to:

1. Prepare or install the PWA on a shared tablet.
2. Open the admin dashboard and enter the real companies, people, and item
   catalog using the information available on site.
3. Fill gaps with the responsible ITC1 staff rather than guessing.
4. Let campus users try the member flow in its real environment.
5. Observe errors, missing data, confusion, and operational needs.
6. Capture structured feedback for the next scoped iteration.

This pilot should validate the core workflow. It should not imply that every
reporting, settings, export, or product-handoff request is complete by that
date.

## Outcomes and non-decisions

### Direction supported by the meeting

- Continue developing Kaffeelisten toward an ITC1 production deployment.
- Preserve the existing low-friction consumption flow.
- Improve production readiness, administrative control, record quality,
  reporting, and exports.
- Run an on-site pilot and interview tenant companies before finalizing the
  complete product scope.

### Not yet approved or specified

- A sale price, maintenance fee, support level, ownership arrangement, or
  company formation.
- Final email recipient and reply rules.
- Legal authorization for copying individual statements to oversight and
  company contacts.
- Exact data-retention period and historical export requirements.
- Exact settings and theme controls.
- Exact catering workflow.
- Final production acceptance criteria and launch date.

## Follow-up questions

1. Confirm the meeting weekday/date and the participants' full names and roles.
2. Who owns the authoritative company, person, item, price, and contact lists?
3. Is an emailed document a consumption statement, a payment request, or an
   invoice-supporting report?
4. For each personal statement, who belongs in `To`, `Cc`, and `Reply-To`?
5. Should a company contact receive every personal statement, one aggregate
   company report, or both?
6. Is Veronica's copy required operationally, and what legal basis and privacy
   notice permit that access?
7. What should happen when an email is missing, invalid, or cannot be delivered?
8. How much history must remain available for person and company exports?
9. What does the catering/provisions representative need to decide or do with
   the exported data?
10. Which settings may ITC1 staff change without maintainer involvement?
11. Who can reset a forgotten admin PIN, and how is that action audited?
12. How long will the tablet pilot run, and what measurable result makes it
    successful?
