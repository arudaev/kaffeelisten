# ZAHLN information request

## Ready-to-send WhatsApp message

> Hey, I'm back again. I asked our AI to review the current Kaffeelisten
> architecture, the public material available for your product, and the UI/UX we
> discussed in our meeting, and it prepared the attached information request for
> the integration concept Mr. Schwarz requested from your team. Please return the
> completed checklist and available documents by Friday, 4 September so we can
> map your process to Kaffeelisten and assemble the document for him. If an item
> is unavailable or confidential, mark it as planned/unavailable or NDA-required
> and add an owner and target date.

Attach
[`zahln-integration-information-request.txt`](zahln-integration-information-request.txt)
to the message.

## Internal detailed reference

The recipient-facing `.txt` checklist is deliberately concise. The sections
below are Kaffeelisten's internal reference for evaluating the response before
an implementation is designed, costed, or promised.

### A. Identity and authority

- Legal entity name, legal form, registered address, registration number, and
  authorised signatory.
- Product brand and primary domain.
- BaFin authorisation/registration number and authorised services, or the exact
  regulated bank/payment/e-money institution and ZAHLN's contractual role.
- If operating as an agent or technical service provider, the relevant written
  confirmation and register entry.
- Contracting party for ITC1 and the party that receives or safeguards funds.
- Named owner for compliance and named owner for the technical integration.

### A1. Contracting structure and Kaffeelisten legal boundary

- Confirm that ITC1 can contract directly with the legal entity/regulated
  institution responsible for the merchant and payment service.
- Provide the proposed ITC1 merchant-onboarding/KYB process and state which party
  is accountable and performs each check.
- Confirm that Kaffeelisten and its maintainers will not receive or safeguard
  funds, access payment credentials, collect KYC/KYB documents, approve users,
  perform sanctions/fraud screening, or determine regulatory outcomes.
- Identify any proposed contract or direct operational duty for the Kaffeelisten
  maintainers. Do not assume that they are an ITC1 contractor or registered
  business.
- Confirm whether ITC1, ZAHLN, or the regulated institution will own the
  production merchant account, API credentials, domain configuration, audit
  exports, and support relationship.
- State whether ZAHLN requires Kaffeelisten to issue invoices, act as merchant,
  provide first-line payment support, accept liability, or maintain a service
  level. The default Kaffeelisten answer is no unless ITC1 and qualified advisers
  approve a separate written arrangement.
- Provide draft merchant/payment terms, DPA/AVV, pilot agreement, SLA, and exit
  terms for ITC1 review.

### B. Product readiness and THA pilot

- Current pitch deck.
- Dated capability matrix with one status per capability: production, pilot,
  sandbox, clickable prototype, or planned.
- THA pilot scope, dates, user count, transaction type, success criteria, and
  what evidence may be shared with ITC1.
- Supported platforms, app-store status, supported banks, browser fallback, and
  supported devices.
- Known restrictions for students, employees, companies, or campus merchants.
- Pricing, minimum term, implementation fee, transaction limits, and expected
  enterprise/API-plan terms.

### C. Identity linking and onboarding

- OAuth 2.0/OIDC or equivalent authorisation specification.
- Stable opaque user identifier and business-account identifier.
- Authorisation-code flow, PKCE support, `state` handling, callback allow-list,
  token lifetime, refresh, revocation, and unlink behaviour.
- Universal/app links, Android App Links, iOS Universal Links, QR payload format,
  and app-store fallback behaviour.
- Whether a user can complete linking without installing the app.
- KYC/KYB owner, required user fields, onboarding states, rejection states, and
  support process.
- Written confirmation that KYC/KYB identity documents and bank credentials stay
  exclusively with the responsible regulated provider and are never transmitted
  to or retained by Kaffeelisten.
- Rules for connecting an existing Kaffeelisten member without allowing one
  person to claim another person's list entry.
- Business-account employee invitations, approval, spending limits, revocation,
  and company-payment authorisation.

### D. Payment API

- OpenAPI specification and changelog/versioning policy.
- Sandbox URL, test credentials, test identities, and test bank/wallet balances.
- Production and sandbox base URLs and IP/domain allow-list requirements.
- Server-to-server authentication, scopes, key rotation, and secret-management
  requirements.
- Endpoint and schema for merchant/business provisioning.
- Endpoint and schema for creating a payment request.
- Dynamic QR payload, expiry, amount/currency binding, payee binding, and replay
  prevention.
- Whether linked-wallet deduction can occur server-to-server and what explicit
  consent or strong customer authentication is required for each payment.
- Monthly/batch settlement API, recurring mandate model, pre-notification,
  revocation, failed collection, and retry rules.
- Payment status model and which states are final.
- Full and partial refunds, cancellations, reversals, disputes, and return flows.
- Idempotency-key semantics and retention window.
- Rate limits, timeout guidance, retry policy, maintenance windows, and SLA.

### E. Webhooks and reconciliation

- Event catalogue and sample payloads.
- Signature algorithm, timestamp/tolerance, key rotation, and replay protection.
- Delivery retry schedule, duplicate delivery behaviour, ordering guarantees,
  and event-retention period.
- Canonical status-query endpoint for reconciliation after a missing webhook.
- Settlement report/export/API, fees, net/gross amounts, payout identifiers, and
  bank-statement references.
- Amount-mismatch handling and the authoritative source when Kaffeelisten and
  ZAHLN disagree.
- Test cases for delayed, duplicate, out-of-order, and forged events.

### F. Commercial, accounting, and operational responsibility

- Who is the seller/merchant, payment recipient, merchant of record (if any),
  invoice issuer, and refund decision-maker.
- Whether ITC1 remains the invoice issuer when ZAHLN processes a payment.
- If ZAHLN proposes to issue invoices, the legal basis, exact issuer, numbering,
  VAT handling, corrections, delivery, retention, and export process.
- Ownership of payment records, settlement records, invoices, and audit exports.
- Responsibility for failed payments, insufficient funds, refunds, disputes,
  unauthorised payments, fraud, user support, and incident communication.
- Support hours, escalation contacts, severity levels, and response targets.
- Exit plan: export format, deletion/return of data, outstanding payments, and
  operation if the integration or company is discontinued.

### G. Security and data protection

- Controller/processor/joint-controller analysis for each data flow.
- Draft AVV/DPA and subprocessor list with hosting regions.
- Data-flow diagram and list of personal, financial, device, and telemetry data.
- Retention/deletion rules and data-subject request process.
- Encryption, secrets management, access control, audit logs, backup/recovery,
  vulnerability management, and penetration-test summary.
- Incident-notification timeline and security contact.
- Relevant certifications, audits, insurance, and regulatory reporting process.
- Confirmation that Kaffeelisten never receives wallet credentials, bank-login
  credentials, or personalised security features.

### H. Decisions requested from ZAHLN

Please answer each item with `yes`, `no`, or `planned`, plus owner and date:

| Decision | Answer | Owner | Target date |
|---|---|---|---|
| Support an ITC1 sandbox pilot | | | |
| Link a Kaffeelisten member by short-lived QR/deep link | | | |
| Link a company business account | | | |
| Pay each confirmed order immediately | | | |
| Settle one monthly amount per member | | | |
| Settle one monthly amount per company | | | |
| Send signed, retryable payment webhooks | | | |
| Query canonical payment status for reconciliation | | | |
| Support refund/cancellation/dispute states | | | |
| Provide a settlement export tied to Kaffeelisten references | | | |
| Accept the responsibility split in the final proposal | | | |

## What Kaffeelisten will provide after receipt

- final management summary for ITC1;
- selected user flow and wire-level sequence;
- final data model and API adapter contract;
- security and data-protection review package;
- responsibility matrix signed off by all parties;
- sandbox implementation plan and estimate;
- pilot acceptance criteria, rollback plan, and support runbook.
