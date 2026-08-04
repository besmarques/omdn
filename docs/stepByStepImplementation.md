# OMDN — Step-by-Step Implementation Guide

## 1. How to use this guide

This document translates `implementationPlan.md` into ordered implementation work.

Rules for every step:

1. Begin from a passing baseline.
2. Keep unrelated changes out of the step.
3. Add or update tests with the behavior change.
4. Run focused tests before the full validation suite.
5. Do not start the next release gate until the current gate passes.
6. Keep schema and API changes backward-compatible until their consumers have migrated.
7. Record material architecture decisions before installing optional packages.

Recommended validation after each completed slice:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Run the real authentication smoke test when a slice affects authentication, sessions, middleware, routing, workers, or database schema:

```bash
npm run smoke:auth
```

## 2. Phase 0 — Preserve and characterize the baseline

Status: completed on 2026-08-04 after Steps 0.1 through 0.4 passed their exit
criteria.

### Step 0.1 — Separate the current work into a reviewable baseline

Status: completed on 2026-08-04.

Baseline exception: generated shadcn files under `src/components/ui/` and
`src/hooks/use-mobile.js` are excluded from lint and formatting checks. They are
temporary vendor-generated UI code and will be replaced or normalized when the
real interface is implemented. Tests and production builds continue to cover
their integration with the application.

- Review `git status` and identify user work, generated shadcn files, proof-of-concept pages, backend changes, and planning documents.
- Ensure generated or temporary artifacts are correctly ignored.
- Run the complete validation suite.
- Commit the baseline before beginning Framework Mode work.

Exit criteria:

- Clean or intentionally documented worktree.
- Full tests, lint, formatting, and build pass.
- Authentication smoke test passes against an empty development database followed by seeds.

### Step 0.2 — Record the exact runtime inventory

Status: completed on 2026-08-04. Local and repository-backed values are recorded
in `runtimeInventory.md`; production-only values are explicitly tracked there as
deployment verification items.

Record in a short architecture/runtime document:

```bash
node --version
npm --version
npm ls react react-dom react-router vite express mysql2 --depth=0
```

Also record:

- MariaDB production/development versions
- Operating system/container image
- Reverse-proxy topology
- Deployment Node command
- Session-cookie domain and TLS termination
- Database connection limits

Do not change versions during this step.

Exit criteria:

- Runtime matrix reflects the lockfile and deployed environments.
- Differences between development and production are explicit.

### Step 0.3 — Add browser characterization tests

Status: completed on 2026-08-04. The Chromium suite uses an automatically
rebuilt `*_playwright` database and combines browser interaction with the same
browser context's API client for the not-yet-implemented TOTP screen.

Decision required: approve Playwright.

After approval:

- Install Playwright as a development dependency.
- Add a test configuration that starts the application and uses an isolated test database.
- Add browser coverage for:
  - Registration
  - Email verification
  - Login
  - TOTP-required login
  - TOTP verification
  - Recovery-code login
  - Logout
  - Subscriber denied admin access
  - Administrator allowed admin access
- Keep backend integration tests as the detailed source for failure conditions.

Exit criteria:

- The existing proof-of-concept flow is captured before router changes.
- Tests can run locally and in CI without manual tokens.

### Step 0.4 — Add architecture decisions

Status: completed on 2026-08-04. ADRs 0001 through 0005 are accepted and indexed
under `docs/adr/`.

Create concise ADRs for:

1. React Router Framework Mode adoption.
2. Express remaining the outer HTTP server.
3. Public/private rendering and cache separation.
4. MariaDB sessions remaining authoritative.
5. Modular-monolith service/repository boundaries.

Exit criteria:

- Each decision documents context, chosen approach, consequences, and rejected alternatives.

## 3. Phase 1 — Adopt React Router Framework Mode without SSR

### Step 1.1 — Verify the exact Framework package matrix

Status: completed on 2026-08-04. The verified compatibility table, selected
packages, deferred packages, configuration contract, and official sources are
recorded in `frameworkPackageMatrix.md`. No dependency was changed in this step.

Before installation:

- Check React Router 8.3.0 Framework Mode and custom Express server documentation.
- Identify the exact required packages and adapter names.
- Confirm compatibility with React 19.2.8, Vite 8.1.5, and Node 24.
- Verify whether the current Vite React plugin remains or is replaced.

Document the selected package set and exact tested versions.

Exit criteria:

- No package is installed based on an assumed adapter API.
- Required Node and build constraints are known.

### Step 1.2 — Install Framework development dependencies

Status: completed on 2026-08-04. `@react-router/dev@8.3.0` is installed as an
exact development dependency, `react-router` is pinned to the matching exact
version, and a clean install plus the existing tests, lint, formatting, and
production build all pass. Optional RSC, Cloudflare, TypeScript, and default
server peers were not installed.

- Add the verified React Router Framework packages.
- Keep existing runtime dependencies until the migration is complete.
- Do not add TanStack Query, an editor, TypeScript migration, or media packages in this step.
- Run a clean install and validate the dependency tree.

Exit criteria:

- Lockfile is reproducible.
- Existing tests still pass before route conversion.

### Step 1.3 — Create the Framework configuration

Status: completed on 2026-08-04. Framework SPA Mode now uses
`react-router.config.js`, `src/root.jsx`, `src/routes.js`, the React Router Vite
plugin and CLI, and `build/client` production assets. A Framework catch-all
index route renders the homepage directly and a catch-all temporarily delegates the remaining URLs to the existing route tree so page conversion can
remain incremental. The API proxy and `@` alias are preserved, and Playwright's
backend is isolated from the normal development server.

Add the required Framework files using JavaScript unless a separate TypeScript decision has been approved:

```text
react-router.config.*
routes configuration
root document route
Framework Vite configuration
```

Initial configuration:

```text
ssr: false
no pre-rendered routes
```

The first goal is behavior parity, not SEO.

Exit criteria:

- Framework build runs in SPA mode.
- No server rendering has been introduced.

### Step 1.4 — Move the document shell

Status: completed on 2026-08-04. `src/root.jsx` is now the sole document shell
and renders Framework metadata, links, scroll restoration, scripts, global CSS,
language, viewport, and favicon declarations. The obsolete `index.html`,
`src/main.jsx`, and nested `BrowserRouter` bootstrap were removed after direct
route hydration passed without browser console or page errors.

- Move the HTML document responsibilities into the Framework root route.
- Preserve global CSS imports.
- Preserve the existing favicon and viewport metadata.
- Add the Framework scripts and scroll restoration components required by the exact version.
- Remove nothing from the old bootstrap until the new shell renders successfully.

Exit criteria:

- Home page renders identically.
- Client hydration has no warnings.

### Step 1.5 — Convert routes incrementally

Completed on 2026-08-04. Every current URL now has an explicit Framework route
module: not-found, home, the development-only design-system preview, login,
registration, email verification, and admin. The existing page components were
preserved, and browser coverage verifies direct loads and client navigation.
The old compatibility router files were removed in Step 1.6 and are not part of
the live Framework route configuration.

Convert in this order:

1. Not-found route
2. Home route
3. Development-only routes
4. Login
5. Registration
6. Email verification
7. Admin proof-of-concept

For each route:

- Move the page into a route module.
- Preserve path and behavior.
- Update navigation imports.
- Run the focused browser test.

Exit criteria:

- [x] All current frontend routes are Framework route modules.
- [x] Existing proof-of-concept behavior remains unchanged.

### Step 1.6 — Remove the old SPA router bootstrap

Completed on 2026-08-04. The unused `App.jsx`, manual `AppRoutes` and
development route tree, and legacy Framework adapter were deleted. The
Framework route manifest is now the only frontend route authority.

Only after every route has migrated:

- [x] The `BrowserRouter` bootstrap was removed in Step 1.4 after the Framework shell was proven.
- [x] Remove the old manual `AppRoutes` tree after all routes migrate.
- [x] Remove obsolete SPA-only files.
- [x] Keep the API client unchanged.

Release gate:

- Framework Mode runs with `ssr: false`.
- Full validation and browser characterization suite pass.
- This state is deployable independently of SSR.

## 4. Phase 2 — Integrate Express and enable the first SSR route

### Step 2.1 — Refactor application construction for a Framework handler

Completed on 2026-08-04. `server/application/` now constructs the database,
process-level services, Express application, and a single worker-lifecycle
boundary. `expressApp.js` only composes HTTP behavior, while `server.js` alone
starts the listener and registers process signals. Focused tests prove that both
the application graph and the real Express application can be constructed
without opening a network listener.

Split construction concerns without changing behavior:

```text
server bootstrap
Express application factory
application services/bootstrap
worker lifecycle
React Router request context
```

Requirements:

- [x] Tests can construct Express without starting a network listener.
- [x] Services remain stateless process-level dependencies where appropriate.
- [x] Request-specific state is never stored globally.
- [x] Existing API routes remain mounted under `/api`.

Exit criteria:

- [x] Existing API integration tests pass unchanged.

### Step 2.2 — Establish middleware order

Completed on 2026-08-04. Express now configures proxy trust first, attaches API
correlation IDs, applies baseline security headers, serves production assets,
and only then enters the `/api` parser/session/CSRF pipeline. API feature routes
remain ahead of the generic API 404, the frontend boundary follows the API, and
the API error handler is registered last. Tests prove immutable caching, session
bypass for assets and non-API pages, scoped JSON parsing, security headers, and
correlation-ID preservation on failures.

Implement and test the final ordering contract:

1. Trust-proxy configuration
2. Request/correlation ID
3. Security headers
4. Static hashed assets
5. Scoped body parsers
6. Session middleware
7. Principal resolution where required
8. CSRF/origin checks for unsafe requests when Phase 3 lands
9. API routes
10. React Router handler
11. Express error handler

Avoid opening sessions for immutable static assets.

Exit criteria:

- [x] Static asset requests do not touch the session store.
- [x] API errors preserve the correlation-ID contract.

The baseline headers intentionally omit Content Security Policy for now. The
Framework SPA document contains generated inline scripts; Step 2.4 must add a
nonce-aware CSP alongside the server request handler instead of weakening the
policy with a permanent `unsafe-inline` allowance.

### Step 2.3 — Create request-scoped Framework context

Completed on 2026-08-04. The frontend boundary now creates a fresh React Router
8.3 `RouterContextProvider` for every page request. Typed context keys expose an
explicit route-service allow-list, an immutable authenticated-principal or guest
snapshot, the request correlation ID, and an injectable clock. The database
pool, session machinery, rate-limit factory, and workers are not exposed.
Isolation tests prove that providers and principal data cannot leak between
requests.

Expose only request-safe dependencies:

- [x] Approved application services
- [x] Principal or guest state
- [x] Request ID
- [x] Clock abstraction where needed
- [ ] Later, private-route CSRF facilities

Do not expose raw database pools directly to route components. Loaders call services, not SQL and not the application’s own HTTP API.

Exit criteria:

- [x] The frontend handler boundary receives a fresh context per request.
- [x] No user-specific state survives into another request.

### Step 2.4 — Enable SSR for one public route

Status: completed on 2026-08-04. SSR is enabled through the official
`@react-router/express@8.3.0` adapter. The homepage is the first public route
verified at both the raw HTTP and browser hydration levels. Production uses
the generated `build/server` bundle, a streaming server entry, a per-response
CSP nonce, a safe root error document, and a true HTTP `404` fallback.

Use a read-only route with no authentication or database complexity, such as an information page.

Verify:

- [x] Complete HTML is present without browser JavaScript.
- [x] Client hydration succeeds.
- [x] Head metadata is rendered on the server.
- [x] Unexpected failures render a safe error document.
- [x] Missing routes return HTTP `404`, not an HTTP `200` not-found component.

Exit criteria:

- [x] First SSR route passes HTTP-level and browser hydration tests.

### Step 2.5 — Establish public/private route layouts

Status: completed on 2026-08-04. Public, authentication, and private Framework
layouts now own their cache policies. Public pages remain outside MariaDB
session middleware; authentication and private pages use `private, no-store`;
and the private loader redirects guests after Express resolves the session and
principal. Development now runs Vite in Express middleware mode so the same
loader contract works in both environments. The earlier recipe and gift-ideas
examples remain the separate presentation-layout layer.

Create separate route layouts:

```text
public layout
  → no account data
  → no session-bound CSRF data
  → potentially cacheable

private layout
  → principal required where applicable
  → account presentation data
  → CSRF data after Phase 3
  → private, no-store
```

Exit criteria:

- [x] Public response bodies are identical across anonymous sessions, except for the required per-response CSP nonce.
- [x] Private responses cannot be cached publicly.

Release gate:

- [x] Express serves API and Framework SSR together.
- [x] One public SSR route is production-safe.
- [x] Existing authentication remains functional.

## 5. Phase 3 — Harden authentication for SSR and production

### Step 3.1 — Define the CSRF contract

Write and approve a short security decision covering:

- Synchronizer token bound to the server session
- Header name for browser API mutations
- Hidden form field for Framework actions
- Token rotation after session regeneration
- Allowed origins
- Fetch Metadata policy
- Failure response
- Login, logout, password reset, TOTP, and authenticated mutation coverage

Do not rely on `SameSite=Lax` alone.

Exit criteria:

- Contract is defined before middleware implementation.

### Step 3.2 — Implement CSRF and origin middleware

- Generate a high-entropy per-session CSRF secret/token.
- Expose tokens only through private/no-store responses.
- Require the token for unsafe cookie-authenticated requests.
- Validate `Origin` against configured origins.
- Add strict `Referer` fallback only if required.
- Reject clearly cross-site unsafe requests through Fetch Metadata.
- Require expected content types.
- Ensure `GET`, `HEAD`, and `OPTIONS` never mutate state.

Tests:

- Missing token
- Invalid token
- Token from another session
- Token reused after session regeneration
- Disallowed origin
- Cross-site Fetch Metadata
- Valid API header
- Valid Framework form field

Exit criteria:

- Every unsafe session-authenticated endpoint is covered.

### Step 3.3 — Define session expiry and revocation

Product decisions required:

- Anonymous session lifetime
- Pending-TOTP absolute expiry
- Authenticated idle expiry
- Authenticated absolute expiry
- Recent-authentication window
- Whether “remember me” exists

Then:

- Add `auth_version` to users if approved.
- Store the observed authentication version in the session.
- Reject sessions whose version no longer matches.
- Increment the version after global logout, password reset, account lock, recovery, or critical permission change.

Exit criteria:

- Global revocation is testable without enumerating browser cookies.

### Step 3.4 — Enforce authentication stages

Represent session state explicitly:

```text
anonymous
totp_pending
authenticated
```

- Password success with enabled TOTP creates only a pending challenge.
- Pending sessions cannot access private loaders or APIs.
- Successful TOTP regenerates the session and promotes the stage.
- Expired or exhausted challenges return to anonymous state.

Exit criteria:

- SSR protected markup is never returned to pending-TOTP sessions.

### Step 3.5 — Migrate the TOTP-required response

If approved:

- Change password login from `202` to `200` with `authenticationState: "totp_required"`.
- Update the audit-event mapping.
- Update the frontend login route.
- Add the TOTP challenge route.
- Update unit/integration tests.
- Update the smoke test.

Keep the old contract until all consumers change together.

Exit criteria:

- Password-only and TOTP login flows pass end to end.

### Step 3.6 — Add recent-authentication policies

Define and enforce step-up requirements for:

- Password change
- Primary email change
- TOTP enable/disable
- Recovery-code regeneration
- Account deletion
- Privileged role changes
- Sensitive settings

Exit criteria:

- Sensitive operations reject stale authentication consistently.

Release gate:

- CSRF, authentication stages, session revocation, and private SSR tests pass.
- Authentication smoke test passes.

## 6. Phase 4 — Decide content format and build the database foundation

### Step 4.1 — Build an editor/source-format spike

Create a disposable branch or isolated proof of concept comparing:

- TipTap JSON
- Lexical state
- Markdown

Use the same test article containing:

- Headings
- Paragraphs
- Lists
- Quote
- Link
- Code block
- Image reference with alt text/caption
- Gallery
- Table
- Safe video embed

Evaluate:

- Serialization stability
- Server rendering
- Sanitization
- Schema validation
- Revision restoration
- Bundle size and extension maintenance
- Accessibility
- Developer ergonomics

Decision output:

- Chosen source format
- Chosen editor package
- Initial allowed schema
- Rejected alternatives and reasons

### Step 4.2 — Approve the publication lifecycle

Confirm:

- Allowed statuses
- Role transitions
- Ownership behavior
- Review requirements
- Unpublish/archive behavior
- Trash retention
- Restore behavior
- Scheduling authority

Convert these rules into pure domain-policy tests before persistence work.

### Step 4.3 — Select migration tooling

Compare dbmate, a Node migration runner, and other SQL-first MariaDB-capable options.

Verify:

- Plain SQL migrations
- Version table
- Checksum/drift behavior
- CI usage
- Production one-shot execution
- Schema dump support
- MariaDB compatibility

Adopt one tool before adding the blog schema.

### Step 4.4 — Design the corrected schema

Create reviewed migrations for:

- Authors
- Posts
- Immutable post revisions
- Categories and tags
- `posts.primary_category_id`
- Join tables
- Unified `route_slugs`
- Site settings
- Domain outbox events

Do not add media or schedules yet unless required by foreign-key order.

Required invariants:

- Published revision is immutable.
- Current and published revisions belong to the same post.
- Primary category is assigned to the post.
- Public route slug is globally unique in its namespace.
- Redirects target resources, not other redirects.
- Hard deletion has a tested pointer/cascade procedure.

### Step 4.5 — Add real MariaDB schema tests

Test against MariaDB, not only mocks:

- Canonical slug collision
- Redirect/canonical collision under concurrency
- Revision belongs to post
- One primary category
- Post hard deletion and revision pointers
- Category deletion behavior
- Author deletion behavior
- Transaction rollback
- Lock-version updates

Exit criteria:

- Final DDL is proven against the deployed MariaDB family/version.

### Step 4.6 — Implement domain services and repositories

Implement without UI:

- Create draft post
- Create immutable revision
- Read working revision
- Change slug atomically
- Assign categories/tags
- Submit for review
- Publish exact revision
- Archive
- Trash/restore

Each service owns authorization, invariants, transactions, audit data, and outbox entries.

Release gate:

- Content domain works through service tests and MariaDB integration tests.
- No editor or public route is required yet.

## 7. Phase 5 — Implement public publishing and SEO

### Step 5.1 — Define public DTOs

Keep public representations separate from administration/editor records.

List DTO excludes full article content and private editorial fields.

Detail DTO includes only published revision data, public author information, taxonomy, media presentation data, and SEO fields.

### Step 5.2 — Implement public post resolution

Service result must distinguish:

```text
published post
canonical redirect
not found
```

Route behavior:

- Published post: `200`
- Historical slug: permanent redirect to current canonical path
- Draft/scheduled/trashed/missing: `404` for public callers

### Step 5.3 — Add public SSR routes

Implement incrementally:

1. Article detail
2. Homepage feed
3. Category archive
4. Author archive
5. General archive

Each route loader calls the application service directly on the server.

### Step 5.4 — Add route metadata

Generate from normalized domain data:

- Title
- Description
- Canonical link
- Open Graph fields
- Social image
- Robots directive
- Language

No client-only metadata dependency should be required.

### Step 5.5 — Generate structured data

Generate and test:

- `BlogPosting`
- `BreadcrumbList`
- `Person`
- `WebSite`
- `Organization`

Structured data must describe visible page content and use canonical absolute URLs.

### Step 5.6 — Implement archive pagination

- Add stable numbered URLs.
- Provide crawlable previous/next links.
- Keep each page self-canonical.
- Exclude arbitrary search/filter combinations unless explicitly approved as landing pages.
- Add cursor endpoints only for interactive widgets that require them.

### Step 5.7 — Add discovery resources

Implement resource routes for:

- `/sitemap.xml`
- `/robots.txt`
- Optional RSS/Atom feed

Sitemap contains only canonical indexable URLs with meaningful modification dates.

### Step 5.8 — Add HTTP and SEO tests

Test complete responses for:

- Initial HTML article body
- Status
- Canonical
- Metadata
- JSON-LD
- Language
- Cache headers
- Redirects
- Missing records
- Draft exclusion
- Sitemap inclusion/exclusion
- Hydration

Release gate:

- Public publishing is indexable without browser JavaScript.
- Search and cache tests pass.

## 8. Phase 6 — Build editorial administration

### Step 6.1 — Implement protected administration routes

Add server-protected routes for:

- Post list
- Create post
- Edit current revision
- Revision history
- Preview
- Review
- Publish/archive/trash

Every loader/action enforces authentication before returning private markup or data.

### Step 6.2 — Add forms and validation

Decision required: approve React Hook Form for complex client forms.

- Continue using Zod on the backend.
- Define browser-safe validation schemas separately.
- Do not import server-only modules into browser bundles.
- Keep backend validation authoritative.

### Step 6.3 — Add optimistic concurrency

- Return a strong ETag or lock version with editable records.
- Require `If-Match` or the equivalent action field on updates.
- Return `412` for stale versions.
- Present a useful conflict state to editors.
- Test two editors updating the same version.

### Step 6.4 — Integrate the selected editor

- Install only the approved editor and frozen extension set.
- Validate source documents on the server.
- Render and sanitize HTML on the server.
- Store immutable revisions.
- Keep unsaved editor content in editor/local form state.
- Do not put unsaved documents into a global server-state cache.

### Step 6.5 — Introduce TanStack Query selectively

First suitable use cases:

- Filterable admin post table
- Background publication status
- Independent processing status

Requirements:

- Define query-key factories.
- Include every normalized filter in keys.
- Configure stale times explicitly.
- Scope invalidation to affected resource families.
- Create a fresh query client for each SSR request if dehydrating data.
- Prove hydration does not trigger immediate duplicate requests.

Release gate:

- Author/editor/publisher flows work with permission and concurrency tests.

## 9. Phase 7 — Implement media storage and processing

### Step 7.1 — Define the media adapter

Create an interface for:

- Upload intent/target
- Quarantine reads
- Variant writes
- Promotion to permanent storage
- Deletion
- Public URL generation

Implement development and test adapters first.

### Step 7.2 — Add media schema

Add:

- Media assets
- Media variants
- Revision/media references
- Processing states
- Checksums
- Dimensions and detected MIME
- Error code/detail
- Lifecycle timestamps

### Step 7.3 — Add upload intent

- Authorize uploader.
- Validate declared size/type as preliminary input only.
- Create a pending media row.
- Generate a random quarantine key.
- Return a short-lived upload capability or local upload endpoint.

### Step 7.4 — Add worker validation

Decision required: approve `sharp`.

Worker must:

- Read quarantined bytes.
- Validate actual file signature/type.
- Enforce encoded byte, dimensions, and pixel limits.
- Decode and re-encode.
- Apply orientation.
- Remove unnecessary metadata.
- Generate approved variants.
- Persist checksums and dimensions.
- Mark ready or failed atomically.

### Step 7.5 — Add content references

- Editor nodes store media IDs, not arbitrary storage URLs.
- Validate that referenced media is ready and allowed.
- Store usage-specific alt text and captions in the revision source.
- Prevent deletion of media referenced by immutable revisions.

### Step 7.6 — Add production object storage

- Implement private S3-compatible adapter.
- Restrict origin access.
- Deliver immutable variants through CDN/versioned keys.
- Enable versioning and recovery controls.
- Add orphan/abandoned-upload cleanup.

Release gate:

- Hostile upload corpus and cleanup tests pass.
- Public pages never expose quarantine objects.

## 10. Phase 8 — Add scheduling and separate worker processes

### Step 8.1 — Generalize the outbox

Preserve the authentication audit outbox behavior while adding domain events for:

- Post published
- Post archived
- Slug changed
- Media ready/failed
- Sitemap/feed invalidation
- CDN purge

Do not overload security audit records as domain-event jobs.

### Step 8.2 — Add publication schedules

Schema includes:

- Exact post and revision
- Scheduled time
- State
- Claim identity
- Lease expiry
- Attempt count
- Failure information
- Completion/cancellation timestamps

### Step 8.3 — Implement claim logic

- Claim bounded due rows with `FOR UPDATE SKIP LOCKED`.
- Commit claims quickly.
- Process each schedule independently.
- Stop claiming during shutdown.
- Allow expired leases to be reclaimed.

### Step 8.4 — Implement idempotent publication

- Lock schedule and post.
- Load the exact scheduled revision.
- Do not require it to remain the current working revision.
- Detect an already-completed schedule.
- Publish once.
- Complete schedule, audit, and outbox in one transaction.
- Bound retries and alert on poison jobs.

### Step 8.5 — Split process entry points

Create:

```text
web entry point
worker entry point
migration entry point/tool
```

- Web no longer starts polling workers.
- Worker starts outbox, publication, media, and retention handlers.
- Both use shared service/repository bootstrap.
- Deployment may initially run one worker instance.

### Step 8.6 — Add worker concurrency tests

Test:

- Two workers claim different jobs.
- Crash after claim.
- Crash before commit.
- Lease expiry.
- Duplicate delivery.
- Repeated publication.
- Poison job.
- Graceful shutdown.

Release gate:

- Web and worker can deploy/restart independently.
- No scheduled post publishes twice.

## 11. Phase 9 — Production readiness

### Step 9.1 — Add structured observability

Measure:

- HTTP route latency and status
- SSR, loader, and render duration
- Database pool usage and query latency
- Session read/write latency
- Authentication and CSRF outcomes
- Worker backlog, attempts, failures, and oldest due job
- Publication delay
- Media processing duration/failure
- Outbox backlog
- CDN hit/purge behavior

Never log secrets, passwords, OTPs, recovery codes, cookies, session IDs, CSRF tokens, or raw unpublished content.

### Step 9.2 — Add health and shutdown behavior

Implement:

```text
/live  → process is alive
/ready → instance can safely receive traffic
```

On shutdown:

1. Mark not ready.
2. Stop accepting requests/jobs.
3. Drain active work within a deadline.
4. Close database/storage clients.
5. Flush logs/telemetry.
6. Exit before platform force termination.

### Step 9.3 — Establish backup and restore

- Enable automated database backups and point-in-time recovery.
- Enable object-storage versioning.
- Document restoration.
- Restore into an isolated environment.
- Measure restore time.
- Reconcile media records and object keys.
- Repeat restoration exercises on a schedule.

Final RPO/RTO requires owner approval.

### Step 9.4 — Add deployment migration gates

Deployment order:

```text
build immutable artifact
  → verify backup/restore point
  → run one migration job
  → verify compatibility
  → roll web instances
  → roll worker instances
  → run post-deployment checks
```

Use expand-and-contract for destructive schema changes.

### Step 9.5 — Establish CDN policy

- Immutable hashed assets and media variants receive long public caching.
- Anonymous published HTML receives short shared caching only after isolation tests pass.
- Any request carrying authentication/session state bypasses shared HTML caching initially.
- Private/admin/preview responses remain `private, no-store`.
- Domain outbox events trigger scoped invalidation after database commit.

### Step 9.6 — Load and capacity test

Measure representative:

- Public SSR requests
- Cached versus origin traffic
- Login/TOTP concurrency
- Admin list/edit traffic
- Database queries per route
- Worker throughput
- Media processing
- Backup duration

Select production instance and pool sizes from measurements, not guesses.

### Step 9.7 — Complete SEO launch checks

- Validate Rich Results output.
- Verify canonical URLs.
- Verify sitemap and robots.
- Inspect initial HTML without JavaScript.
- Register Search Console.
- Submit sitemap.
- Monitor indexing and structured-data errors.

Final release gate:

- Security, backup, recovery, migration, load, SSR, cache, worker, and SEO evidence is documented.

## 12. Dependency timing summary

Do not install packages earlier than their implementation phase.

| Phase   | Potential package                                             |
| ------- | ------------------------------------------------------------- |
| Phase 0 | Playwright after approval                                     |
| Phase 1 | Verified React Router Framework packages                      |
| Phase 3 | CSRF package only if selected over internal implementation    |
| Phase 4 | Migration tool after comparison                               |
| Phase 6 | Selected editor, React Hook Form, TanStack Query as justified |
| Phase 7 | `sharp`, object-storage SDK                                   |
| Phase 9 | Logging, telemetry, error tracking, load-test tooling         |

Zustand, Redis, an external search engine, collaborative editing, and a global TypeScript rewrite remain deferred.

## 13. Immediate next actions

Execute only these actions next:

1. Preserve the current passing baseline.
2. Add browser characterization tests.
3. Verify React Router 8.3.0 Framework/custom-server package requirements.
4. Write the public/private rendering ADR.
5. Convert to Framework Mode with `ssr: false` before adding SSR or blog schema work.

Do not begin the editor, media pipeline, TanStack Query integration, or production worker split until the relevant decision gate is reached.
