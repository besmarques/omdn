# ADR 0005: Use Modular-Monolith Service and Repository Boundaries

- Status: Accepted
- Date: 2026-08-04
- Owners: OMDN application team

## Context

The existing backend is organized into authentication, account, and
administration modules with controllers, application services, repositories,
and shared infrastructure. The publishing platform will add posts, revisions,
taxonomy, media, scheduling, SEO, and workers. Without explicit dependency and
transaction rules, route handlers can accumulate business logic, repositories
can commit partial workflows, and modules can depend directly on one another's
tables.

There is no measured need for distributed services. Splitting the application
now would add network contracts, deployment coordination, distributed
transactions, and operational overhead before the domain boundaries are stable.

## Decision

OMDN will remain a modular monolith with feature-oriented modules and the
following dependency direction:

```text
HTTP adapters (Express controllers, React Router loaders/actions)
  -> application services
    -> domain policies and repository interfaces
      -> MariaDB repositories and external adapters
```

Responsibilities are divided as follows:

- Controllers, loaders, and actions validate HTTP input, invoke one application
  use case, and translate its result into an HTTP response.
- Application services orchestrate authorization, domain rules, transactions,
  repositories, events, and idempotency.
- Repositories perform persistence operations and accept an existing transaction
  connection when participating in a workflow.
- Repositories do not independently commit a multi-step business operation.
- Domain modules expose intentional service contracts rather than allowing
  callers to query their tables directly.
- Shared infrastructure contains technical capabilities, not cross-domain
  business rules.
- Workers call the same application services or dedicated worker use cases; they
  do not duplicate publication or retention rules.

One application service owns the transaction for operations such as creating a
post and its first revision, publishing an exact revision, assigning taxonomy,
or committing an outbox event with a state change.

Runtime processes may later be split into `web`, `worker`, and one-shot
`migrate` commands while remaining one codebase and domain model.

## Consequences

### Positive

- Domain boundaries can evolve without premature network APIs.
- Transactions remain local and explicit.
- HTTP, worker, and future CLI adapters can reuse the same use cases.
- Tests can target domain services independently from transport and persistence.
- A future service extraction has clearer seams if measurements justify it.

### Costs and risks

- Boundaries rely on review and dependency tests rather than process isolation.
- Some use cases require deliberate connection propagation across repositories.
- Shared abstractions can become a dumping ground unless kept technical and
  minimal.
- Cross-module reporting queries may require explicit read models instead of
  convenient table access.

## Rejected alternatives

### Introduce microservices for publishing, authentication, and media now

Rejected because current scale and team boundaries do not justify distributed
systems complexity.

### Organize only by technical layer

Rejected because global controller, service, and repository directories weaken
feature ownership and increase unrelated coupling as the platform grows.

### Put business logic in React Router loaders or Express controllers

Rejected because it couples use cases to one transport and makes transaction and
worker reuse inconsistent.

### Let repositories own workflow commits

Rejected because multi-repository operations could partially commit and violate
publication, taxonomy, audit, or outbox invariants.

## Reconsider when

- A module requires independent scaling, deployment, ownership, or availability
  proven by operational data.
- Regulatory or security isolation requires a process or data boundary.
- A stable module contract and migration plan exist for extraction.

Process separation for web and workers does not by itself supersede this ADR.
Extracting a network service does, and requires an ADR covering data ownership,
failure handling, observability, and consistency.
