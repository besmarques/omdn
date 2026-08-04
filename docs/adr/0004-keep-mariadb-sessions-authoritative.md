# ADR 0004: Keep MariaDB Sessions Authoritative

- Status: Accepted
- Date: 2026-08-04
- Owners: OMDN application team

## Context

OMDN currently stores opaque-cookie sessions in MariaDB through
`express-session` and `express-mysql-session`. The backend already enforces
single-session replacement, logout, password-reset revocation, TOTP-pending
state, account status, and server-side permissions. The browser needs account
information for presentation, but a frontend cache cannot safely decide whether
a request is authorized.

Introducing stateless identity tokens or Redis now would add token rotation,
revocation, infrastructure, and consistency concerns without measured session
database contention.

## Decision

MariaDB-backed server sessions will remain the authoritative source of
authenticated state.

- The browser stores only the opaque `HttpOnly` session cookie.
- Every protected HTTP request resolves and validates its server-side session.
- Private React Router loaders use the same server principal resolution as APIs.
- Application services remain responsible for permission, ownership, account
  status, and resource-state authorization.
- Pending TOTP state is not an authenticated principal and cannot enter private
  routes.
- Client state may cache the current account for display and navigation, but it
  is never an authorization authority.
- `/api/account/me` may remain for API consumers and explicit revalidation; it is
  not required for the initial private server render.

Session invalidation semantics must remain covered when the router changes.
An `auth_version` or equivalent invalidation field may be added later if a new
revocation requirement needs it, but that does not change this decision.

## Consequences

### Positive

- Revocation and single-session behavior remain immediate and centralized.
- Authentication state is not exposed to JavaScript-accessible storage.
- Existing APIs and future private loaders share one authority.
- Frontend architecture can change without changing the opaque-cookie contract.

### Costs and risks

- Protected requests require access to the session store.
- MariaDB session load contributes to the database connection budget.
- Horizontal scale depends on every web instance reaching the same database.
- Database disruption affects authenticated requests and should fail closed.

## Rejected alternatives

### Store JWT access tokens in local storage

Rejected because it increases exposure to script access and complicates
revocation, logout, single-session enforcement, and permission changes.

### Use stateless signed-cookie sessions

Rejected because authoritative revocation and server-side TOTP challenge state
would become harder or require an additional denylist store.

### Move sessions to Redis immediately

Rejected because no measured MariaDB session bottleneck currently justifies new
infrastructure and operational responsibility.

### Let a React store authorize routes

Rejected because client state is user-controlled, may be stale, and cannot
authorize server resources.

## Reconsider when

- Session queries create measured MariaDB contention or exhaust the connection
  budget.
- Deployment topology requires a dedicated low-latency shared session service.
- Availability targets require session storage isolated from the primary content
  database.

A Redis migration should preserve opaque cookies, server-side revocation, TOTP
challenge semantics, and the frontend contract. It requires a superseding ADR
with failure-mode and migration tests.
