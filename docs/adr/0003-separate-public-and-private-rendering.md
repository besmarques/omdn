# ADR 0003: Separate Public and Private Rendering and Caching

- Status: Accepted
- Date: 2026-08-04
- Owners: OMDN application team

## Context

OMDN will serve two materially different route classes:

- Public publishing pages need SSR, SEO metadata, canonical URLs, and eventually
  shared CDN caching.
- Private account, editorial, and administration pages depend on a user session
  and must never be stored in a shared cache.

Mixing these concerns in one layout or cache policy risks putting user identity,
CSRF material, permissions, or unpublished content into publicly cacheable HTML.
It can also make otherwise cacheable public pages vary unnecessarily by session.

## Decision

Public and private documents will use separate route trees or top-level layouts,
with separate data and response policies.

### Public routes

- May use SSR and, for stable pages, pre-rendering.
- Anonymous responses may become CDN-cacheable after cache tests exist.
- Must contain no principal, permission, session, CSRF, draft, or other
  user-specific data.
- Requests carrying a session cookie will initially bypass shared HTML caching.
- Public services return explicit public DTOs rather than unrestricted database
  rows.
- Missing resources and canonical redirects return real HTTP status codes.

### Private routes

- Resolve the principal from the server-side session for the current request.
- Return `Cache-Control: private, no-store`.
- Must not be served by public page caches or pre-render output.
- Enforce authentication, TOTP completion, permissions, ownership, and account
  status on the server.
- May hydrate initial account information from a private loader, avoiding a
  post-render `/me` request for initial presentation.

API responses keep route-appropriate cache headers and are not implicitly
covered by public document caching.

## Consequences

### Positive

- The default design prevents authenticated content from entering shared caches.
- Public routes can be optimized independently for SEO and anonymous traffic.
- Private navigation can begin with server-resolved identity rather than
  duplicate initial account calls.
- Cache behavior becomes testable at the route-tree boundary.

### Costs and risks

- Shared visual elements may need separate public and private layout adapters.
- Session-cookie requests to public pages initially sacrifice shared-cache hits.
- Cache headers, `Vary` behavior, redirects, and error responses require
  integration tests.
- A future cache strategy for signed-in users will require careful key design.

## Rejected alternatives

### Use one universal layout containing optional account data

Rejected because accidental user-specific rendering would make public caching
unsafe and difficult to audit.

### Cache every public URL regardless of session cookies

Rejected because a single personalized response could be served to another
visitor if cache keys or bypass rules are incorrect.

### Make the entire site private and `no-store`

Rejected because it discards valuable caching and SEO performance for anonymous
publishing routes.

### Keep all rendering client-side

Rejected by ADR 0001 because public SEO and HTTP behavior require a
server-rendered document path.

## Reconsider when

- Cache-isolation tests prove a safe authenticated-public cache key and the
  performance benefit justifies its complexity.
- Public pages acquire legitimate personalization requirements.
- The CDN or hosting platform changes its cookie and cache capabilities.
- Private pages need a different rendering strategy for measured performance or
  operational reasons.

Any relaxation of the boundary requires security review and tests proving that
principal, CSRF, draft, and permission data cannot enter shared caches.
