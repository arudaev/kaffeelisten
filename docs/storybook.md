# Kaffeelisten Storybook

## The next chapter at ITC1

Kaffeelisten began with a very small promise: nobody should need a paper list
to record a cup of coffee.

The first version was built during the B4Y3RW4LD Hackathon on 8–9 May 2026. It
proved the central idea. A person can walk up to the shared tablet, find their
company and name, select what they took, and be done in a few seconds. There is
no account to create, no password to remember, and no unnecessary ceremony.

On 25 June 2026 at 12:45, the team returned to ITC1 and presented the product
in the “Erde” hall in Building E. The conversation included ITC1 CEO Thomas
Keller, THD Vice President Veronica, a representative of EZ2Parts, a
representative concerned with food and beverages, and the Kaffeelisten team.

The project now has its own home at
[`kaffeelisten.de`](https://kaffeelisten.de).

The people in the room did not ask for a different coffee-list app. They asked
what it would take for this one to become a real product: trustworthy enough
to use every day, clear enough to hand over, and flexible enough for ITC1 to
operate without calling a developer for every ordinary change.

This Storybook captures that conversation as product stories. It is not a
roadmap, delivery plan, technical specification, or collection of settled
design decisions. Some stories are already part of Kaffeelisten, some describe
what stakeholders would like next, and a few still need a better conversation
before their real shape is known.

## The cast

### The campus member

Someone who works at ITC1 and uses the shared coffee, drinks, food, or snacks.
They may belong to one of the companies in the building, or they may have no
company affiliation at all. They want to record what they took and return to
their day.

### The ITC1 administrator

The person who keeps the list usable. They maintain companies, people, items,
prices, and monthly records. They need enough control to correct ordinary
problems without making the simple member experience more complicated.

### The company contact

The person responsible for a company or department. They need to understand
the consumption associated with their people and take part when someone has a
question about a monthly statement.

### The campus oversight contact

Veronica asked to be included in monthly statement conversations so that she
can see questions and help resolve them. She understands that this may mean
receiving a copy of every personal statement.

### The food and beverage contact

The person responsible for the shared food, drinks, or catering operation.
They want a clearer way to check the information relevant to their work. The
exact question they need Kaffeelisten to answer is still open.

### The product team

The people turning a successful hackathon prototype into a maintained product.
They are responsible for making it dependable without burying its useful
simplicity under features.

## Scene one: taking something from the kitchen

### Story 1 — The fifteen-second entry

**Who:** A campus member

**When:** They take a coffee, drink, snack, or other shared item during the day

> As a campus member, I want to record what I took in a few taps so that I can
> be honest and accurate without interrupting my work.

The person recognizes their company, finds their name, selects one or more
items, checks the entry, and sees that it was saved. The interaction remains
fast enough to become an ordinary habit.

This is the heart of Kaffeelisten. Everything else in this book exists to make
this small moment reliable.

### Story 2 — I can find the right version of me

**Who:** A campus member

**When:** They look for themselves on the shared tablet

> As a campus member, I want my identity to be clear and correct so that my
> consumption is not accidentally recorded against somebody else.

A real person is more than a shortened display name. Their record needs a
first name, last name, email address, and company relationship. These details
support correct administration and monthly communication, while the public
selection screen can remain quick and appropriate for a shared device.

### Story 3 — I do not belong to a tenant company

**Who:** A guest, independent person, or other unaffiliated campus member

**When:** They need to record something but none of the listed companies is
theirs

> As a person without a company at ITC1, I want a truthful way to identify
> myself so that I can use Kaffeelisten without choosing an unrelated company.

Kaffeelisten should welcome this person as a normal participant. Their records
and monthly communication still need a clear responsible context, but the
product should not invent a company relationship that does not exist.

### Story 4 — The list reflects the real kitchen

**Who:** The ITC1 administrator

**When:** An item, price, or availability changes

> As an administrator, I want the available food and beverages to match what
> people can actually take so that entries remain meaningful and accurate.

The catalog is not permanent. Coffee changes, a new drink appears, a snack is
removed, or a price is corrected. The administrator can keep the visible list
current without losing the meaning of older records.

## Scene two: keeping the campus list true

### Story 5 — A new person joins

**Who:** The ITC1 administrator

**When:** Someone begins working at ITC1 or needs to be added to Kaffeelisten

> As an administrator, I want to add a person with their first name, last name,
> email address, and company relationship so that their record is complete from
> the beginning.

The important outcome is not a larger form. It is a roster that can be trusted
when the month ends. Required information should not be scattered across notes
or reconstructed after somebody has already started using the product.

### Story 6 — A person's situation changes

**Who:** The ITC1 administrator

**When:** Someone changes company, changes email address, leaves ITC1, or was
entered incorrectly

> As an administrator, I want to correct and maintain a person's details so
> that the current list stays accurate without erasing their history.

The administrator needs to see people in a familiar, structured way and make
ordinary corrections with confidence. Old transactions must continue to make
sense even when the current roster changes.

### Story 7 — A company has a responsible person

**Who:** The ITC1 administrator

**When:** A company is added or its responsible contact changes

> As an administrator, I want to record who is responsible for each company
> and how to email them so that the right person is part of monthly questions.

A company is not only a name in the member-selection flow. It also has a person
who receives or reviews the relevant information. That relationship needs to
be visible and maintainable instead of living in source code or somebody's
memory.

## Scene three: the month closes

### Story 8 — I receive my own monthly statement

**Who:** A campus member who recorded consumption during the month

**When:** The month's Kaffeelisten records are ready to be reviewed

> As a campus member, I want to receive a personal summary of what I took so
> that I can understand and check my own monthly record.

The statement belongs to one person and one month. It tells them what was
recorded under their name in a form they can understand. People who did not use
Kaffeelisten during that month do not need an empty statement.

### Story 9 — The responsible company contact is included

**Who:** The person responsible for a company

**When:** One of their people receives a monthly statement

> As a company contact, I want to be included in the relevant monthly
> communication so that I can understand the record and help resolve a question.

The meeting described this as a shared email conversation around the personal
statement. The company contact should not need a separate, hidden process to
discover that somebody has raised a concern.

Exactly how company contacts receive personal and company-level information is
still a story to refine with them. The need is clear: the responsible person
must not be left outside the conversation.

### Story 10 — Campus oversight stays in the conversation

**Who:** Veronica as the requested oversight contact

**When:** Personal monthly statements are sent and recipients reply with
questions

> As the campus oversight contact, I want to be copied on each monthly
> statement so that I can follow and participate in the resulting conversation.

Veronica explicitly accepted that this could mean receiving 30, 100, or more
messages. The purpose is not merely to receive another report. It is to remain
part of the email thread when a member or company contact responds.

### Story 11 — A question can be resolved in context

**Who:** A member, company contact, or campus oversight contact

**When:** Something in a monthly statement appears wrong or needs explanation

> As somebody involved in a statement, I want to reply and keep the relevant
> people in the conversation so that the question can be resolved with the same
> information in front of everyone.

The email should be a useful starting point for a human conversation, not a
dead-end notification. The eventual recipient arrangement still needs to be
confirmed, but replyability is part of the requested experience.

### Story 12 — The administrator still sees the whole month

**Who:** The ITC1 administrator

**When:** They review the month or need the complete campus picture

> As an administrator, I want a complete monthly overview so that individual
> statements do not take away the campus-level understanding I already have.

Personal communication adds to the existing administrative view; it does not
make the overall report less useful. The administrator still needs totals and
breakdowns across companies and people.

## Scene four: somebody asks a specific question

### Story 13 — Show me one person's history

**Who:** The ITC1 administrator

**When:** A person asks about their entries or the administrator needs to check
their record

> As an administrator, I want to select a person and see their transactions for
> the relevant period so that I can answer a question without searching the
> entire campus log.

The selected view should be easy to understand and easy to take out of the
system in a standard format when it needs to be shared or kept with the case.

### Story 14 — Show me one company

**Who:** The ITC1 administrator or responsible company contact

**When:** A company needs its complete picture

> As someone reviewing a company, I want to see its people, their transactions,
> and the company totals together so that I do not have to assemble the answer
> manually.

The company view should tell one coherent story: who is associated with the
company, what was recorded, and how the details form the total.

### Story 15 — Let me take the relevant records with me

**Who:** The ITC1 administrator

**When:** They have narrowed the view to a person, company, or period

> As an administrator, I want to export the records I am currently reviewing so
> that I can use them in the ordinary administrative work outside Kaffeelisten.

The meeting did not settle one universal file format. What matters is that the
export reflects the selected person or company and is conventional enough to
open, review, and pass on without rebuilding it by hand.

### Story 16 — Food and beverage work has the right overview

**Who:** The person responsible for food, beverages, or catering

**When:** They need to check consumption or make an operational decision

> As the food and beverage contact, I want a clear view of the consumption
> relevant to my work so that I can check what happened and act on it.

This is intentionally an unfinished story. We still need to learn what this
person is checking, how often they check it, and whether they need information
by item, person, company, or something else. Their work should define the
story—not our guess at a dashboard.

## Scene five: ITC1 runs the product

### Story 17 — Routine changes belong in one place

**Who:** The ITC1 administrator

**When:** They need to adjust how their Kaffeelisten instance operates

> As an administrator, I want a dedicated settings area so that ordinary
> product changes are understandable and do not require editing code.

The request for “more control” is fundamentally about confidence. The
administrator should know where routine settings live, understand what they
affect, and see the current state without hunting through the application.

### Story 18 — I can change the admin PIN

**Who:** The ITC1 administrator

**When:** The PIN needs to be rotated or somebody who knew it should no longer
have access

> As an administrator, I want to change the admin PIN from the protected admin
> area so that access remains under ITC1's control.

The current PIN cannot remain a value that only a developer can change. The
administrator also needs a clear path when access details are forgotten or
handed from one responsible person to another.

### Story 19 — The product can feel like ITC1's

**Who:** The ITC1 administrator

**When:** They prepare the application for regular campus use

> As an administrator, I want appropriate control over colors and theme so that
> Kaffeelisten can feel at home in the ITC1 environment.

The meeting established the desire for visual control, not the exact controls
or their final shape. That belongs to a later design conversation. The story is
simply that the product should not feel permanently frozen in its hackathon
presentation.

## Scene six: a prototype becomes a product

### Story 20 — We begin with the real ITC1 list

**Who:** The ITC1 administrator and the product team

**When:** The production instance is prepared for campus use

> As the people setting up Kaffeelisten, we want to remove the hackathon's demo
> companies, people, and items and enter the real ITC1 information so that the
> first live entry starts from a trustworthy list.

The real companies and names can be taken from the current board and confirmed
on site. Food, beverages, prices, company contacts, and missing people should
come from the people responsible for them rather than from plausible sample
data.

### Story 21 — ITC1 can trust what it is buying

**Who:** Thomas Keller and the people responsible for operating ITC1

**When:** They consider adopting Kaffeelisten as a maintained product

> As the organization adopting Kaffeelisten, we want a clean, dependable, and
> supportable product so that we are buying more than a hackathon demonstration.

For the product team, this means treating repository cleanup, security,
configuration, data handling, and maintenance as part of the product itself.
The visible application can remain simple because the work behind it is taken
seriously.

Thomas expressed interest in buying the product as it exists and paying for
ongoing maintenance. The commercial arrangement is a separate conversation;
the product story is that ITC1 expects something it can rely on after handoff.
Veronica also encouraged the team to consider founding a company around the
product.

### Story 22 — The tablet meets real life

**Who:** Campus members, the ITC1 administrator, and the product team

**When:** Kaffeelisten is placed on a shared tablet at ITC1

> As everyone involved in the pilot, we want to use Kaffeelisten in its real
> location so that actual behavior shows us what works and what is still missing.

The proposed visit on Tuesday, 30 June 2026 is deliberately practical: install
or open the app, enter the real information through the admin dashboard, let
people use it, and stay close enough to notice confusion and gaps. Feedback
from the kitchen is more valuable than imagined complexity added in advance.

### Story 23 — Companies help shape what comes next

**Who:** People working in the companies housed at ITC1

**When:** The team speaks with them about their experience and responsibilities

> As a company representative, I want to explain how our company would use the
> records so that Kaffeelisten grows around real work rather than assumptions.

Veronica suggested interviewing the companies at ITC1. Those conversations can
turn broad requests such as “more control” into grounded stories: who is trying
to do what, when the need appears, and why the current product does or does not
help.

## The truths that hold the stories together

- The member-facing flow remains quick and does not require a user account.
- Kaffeelisten records consumption; it does not process payments or create
  invoices.
- The current product is for the single ITC1 campus.
- More administrative control must not become more friction for the person
  logging a coffee.
- A suggestion from the meeting is a story to understand, not automatically a
  feature to build exactly as first described.
- The existing product is the foundation. Productization should make it more
  dependable and useful, not erase what already works.

## Stories that still need another conversation

The following questions remain deliberately open:

- Who exactly receives each personal email, who is copied, and which address
  receives replies?
- Does each company want every personal statement, a company summary, or both?
- What should happen for an unaffiliated person's monthly communication?
- Who may create a new person, and how are mandatory details collected when
  somebody is not already on the list?
- What information does the food and beverage contact actually need to do
  their job?
- Which visual choices should ITC1 be able to control?
- Which export formats fit the real person-level and company-level workflows?
- Which people and roles will own Kaffeelisten after the pilot?

These are not holes to fill with guesses. They are the next stories to hear.
