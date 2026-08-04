# ADR 0002: Keep Express as the Outer HTTP Server

- Status: Accepted
- Date: 2026-08-04
- Owners: OMDN application team

## Context

The existing Express 5 application owns mature authentication APIs, MariaDB
sessions, rate limiting, audit-event delivery, account-retention work, error
handling, and process lifecycle. React Router Framework Mode needs to handle
document requests and SSR, but replacing Express would require rewriting these
working controls and their tested middleware ordering.

The application needs one unambiguous owner for incoming HTTP connections and
for shutdown of the database pool and background workers.

## Decision

Express will remain the outer HTTP server and production process entry point.
React Router's request handler will be mounted inside Express for document
routes.

The intended request order is:

1. Trusted-proxy and request-context setup.
2. Body parsing where required.
3. Session resolution.
4. Existing `/api` authentication, account, and administration routes.
5. API 404 and API error handling.
6. React Router document handling for non-API routes.
7. Final document error handling.

The exact order will be proven during Framework integration. API requests must
never fall through to an HTML document response.

Express owns:

- The listening socket and trusted-proxy configuration.
- Session and security middleware.
- Existing JSON API routing and API errors.
- Construction of request-scoped context passed to React Router.
- Startup and graceful shutdown of shared resources.

React Router owns document routing and rendering after Express has established
the request context.

## Consequences

### Positive

- Existing security and authentication behavior remains reusable.
- Framework adoption does not require an API rewrite.
- There is one process owner for database pools, workers, signals, and sockets.
- Express can provide the authenticated principal and service dependencies to
  route loaders without a duplicate session implementation.

### Costs and risks

- A custom-server integration must be maintained and tested with React Router
  upgrades.
- Development and production build wiring is more involved than a framework's
  default standalone server.
- Incorrect middleware order could leak HTML into API responses, bypass session
  handling, or produce incorrect errors.
- Long-running workers should eventually leave the web process before horizontal
  scaling.

## Rejected alternatives

### Replace Express with the React Router default server

Rejected because it would force immediate migration of tested APIs, middleware,
sessions, rate limits, worker lifecycle, and graceful shutdown.

### Run independent API and frontend servers in production

Rejected initially because it introduces cross-origin cookies, deployment
coordination, and duplicate edge configuration without a scaling requirement.

### Mount Express behind a framework-owned Node server

Rejected because ownership of sessions, errors, signals, and request context
would become less clear while providing no current benefit.

## Reconsider when

- Maintaining the custom server prevents supported React Router upgrades.
- API and document workloads require independently scaled deployments.
- The platform moves to a runtime that cannot host the Express server contract.
- Workers are separated and measurements demonstrate that an independent API
  service is operationally preferable.

A deployment split requires a superseding ADR covering origins, cookies, CSRF,
proxy trust, and observability.
