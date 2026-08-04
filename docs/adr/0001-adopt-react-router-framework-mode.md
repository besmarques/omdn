# ADR 0001: Adopt React Router Framework Mode

- Status: Accepted
- Date: 2026-08-04
- Owners: OMDN application team

## Context

OMDN currently uses React Router 8.3.0 in Declarative Mode with a Vite-built
single-page application. The planned public blog requires server-rendered HTML,
real document status codes, route metadata, canonical redirects, and progressive
data loading for search engines and users. The private administration area also
needs route-level data loading and mutation handling without making a client
store the owner of authentication state.

Maintaining a custom router and SSR pipeline would duplicate capabilities that
React Router Framework Mode already provides. Moving to another framework would
replace working React Router concepts and combine a product migration with a
framework migration.

## Decision

OMDN will adopt React Router Framework Mode on the existing React Router major
version.

The migration will be staged:

1. Verify the exact React Router 8.3.0 Framework/custom-server package matrix.
2. Convert the current routes with Framework Mode configured as `ssr: false`.
3. Preserve the characterized authentication flow.
4. Integrate the Framework request handler with Express.
5. Enable SSR first for one read-only public route.
6. Expand SSR to public publishing routes after status, metadata, hydration, and
   cache behavior are proven.
7. Move private routes only after the public SSR boundary is stable.

React Router will own document routing, loaders, actions, redirects, route error
boundaries, HTTP status propagation, and document metadata. It will not own
domain authorization, transactions, persistence, sessions, or background jobs.

Package names and adapter APIs must be verified against the installed 8.3.0
version before dependencies or configuration are changed.

## Consequences

### Positive

- Public pages can return complete HTML, metadata, and accurate HTTP status
  codes.
- Route data and navigation behavior use one framework instead of parallel
  client and server routing systems.
- Loaders and actions provide a natural boundary between HTTP routes and
  application services.
- Migration can occur without an immediate SSR cutover.

### Costs and risks

- The Vite entry points, build outputs, route definitions, and Express
  integration will change.
- Framework and custom-server APIs are version-specific and require explicit
  verification.
- Existing browser behavior must remain covered throughout the staged migration.
- Developers must keep route modules thin rather than moving business logic into
  loaders and actions.

## Rejected alternatives

### Keep Declarative Mode and client-only rendering

Rejected because it cannot reliably provide the required initial HTML, HTTP
status codes, and server-controlled metadata for public SEO routes.

### Build a custom React SSR pipeline

Rejected because it would recreate routing, data loading, error, redirect, and
hydration behavior with a larger maintenance and correctness burden.

### Move to Next.js, Remix, or another application framework

Rejected for now because the application already uses React Router and Express.
Replacing both architecture boundaries would add migration risk without a
demonstrated requirement.

### Enable SSR during the initial Framework conversion

Rejected because it would combine route conversion, server integration, and
rendering behavior in one difficult-to-isolate change.

## Reconsider when

- React Router Framework Mode cannot support the required custom Express server
  contract on the chosen runtime.
- A measured platform requirement cannot be implemented without maintaining a
  substantial unsupported adapter.
- The React Router project materially changes or removes the adopted Framework
  APIs.

Any replacement requires a superseding ADR and migration evidence from the
Playwright characterization suite.
