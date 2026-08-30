# Kaffeelisten x ZAHLN integration workspace

This directory contains the working documents for a possible digital-payment
integration between Kaffeelisten and the product currently presented under the
names ZAHLN, ZHALN, and ZYSYGY.

## Current status

**Discovery only - no implementation is approved or ready to estimate.**

Kaffeelisten's side of the integration can be designed from the repository. The
partner side cannot yet be specified because no API contract, sandbox,
regulatory model, or responsibility agreement has been supplied. The documents
therefore separate:

- verified Kaffeelisten behaviour;
- requests recorded in the stakeholder email chain;
- public claims made by the prospective payment partner;
- the user's meeting recollection; and
- assumptions and decisions that still require written confirmation.

Kaffeelisten is currently an open-source student project, not a registered
company. The maintainers report that they are international students on German
study residence permits and that no official operating, licence, support,
payment, or data-processing agreement exists between the team and ITC1. Until
qualified advisers and the competent authorities resolve those points, the
maintainers must not be assigned paid or potentially self-employed work, KYC/KYB,
funds, invoice authority, production processing, or ongoing support obligations.

## Documents

- [`integration-proposal.md`](integration-proposal.md) - executive-first concept
  for ITC1 management followed by the technical design, responsibility model,
  risks, rollout plan, and acceptance criteria.
- [`partner-input-request.md`](partner-input-request.md) - the exact WhatsApp
  message to send, followed by Kaffeelisten's internal detailed reference.
- [`partner-input-checklist.txt`](partner-input-checklist.txt) - the concise,
  header-free checkbox document to attach to the WhatsApp message.
- [`source-register.md`](source-register.md) - evidence hierarchy, confirmed
  facts, public claims, meeting recollections, and unresolved contradictions.

## Working rule

The prospective partner is called **ZAHLN** in these drafts only as a shorthand.
The final product name, legal entity, licensed institution or regulated partner,
correctly spelled canonical domain, and contracting party must be confirmed
before the draft is sent as a joint proposal. The user reported that a previously
shared domain was misspelled but has not supplied the corrected URL, so the
documents preserve the observed public URLs as evidence and do not guess the
correction.

Do not add credentials, private API keys, wallet identifiers, customer data, or
WhatsApp exports to this directory. The admin credential previously shared in a
chat must be rotated and must not be copied into any project document.

## Next step

Send the message in `partner-input-request.md` with
`partner-input-checklist.txt` attached. When the requested material is received,
update the source register, replace every `Partner confirmation required` item
in the proposal, select the payment mode with ITC1, and only then produce a final
stakeholder PDF and implementation estimate.
