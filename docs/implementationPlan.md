# OMDN — Recommended Implementation Plan

## 1. Purpose

This is the single authoritative OMDN architecture and implementation plan. It
consolidates the accepted architecture decisions, verified runtime constraints,
completed migration record, and remaining production roadmap. The junior-facing
explanation of the current code lives in `juniorDeveloperGuide.md`.

It deliberately separates immediate work from later production improvements. Optional technologies are not treated as decisions until their costs and migration paths have been reviewed.

Implementation checkpoint (2026-08-04): Phases 0 through 2 are complete and
Phase 3 authentication hardening is complete,
including React Router Framework SSR, the combined Express/Vite development
server, public/authentication/private layouts, and principal resolution for the
entire `/admin` document and `.data` route family. Detailed completion evidence
is recorded in the phase status and exit criteria below.

### Accepted architecture decisions

| Decision              | Current rule                                                                                     | Reconsider when                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Rendering             | Use React Router Framework Mode with incremental SSR                                             | The selected framework can no longer meet routing, SSR, or deployment needs |
| HTTP ownership        | Express remains the only outer HTTP server in development and production                         | Hosting requires an incompatible runtime topology                           |
| Cache boundaries      | Public routes contain no account data; authentication and private routes use `private, no-store` | A proven alternative preserves the same isolation guarantees                |
| Sessions              | MariaDB-backed server sessions are authoritative; the browser stores only the opaque cookie      | Measured scale or availability requirements justify another shared store    |
| Application structure | Keep a modular monolith with route/controller/service/repository boundaries                      | Independently scaling a measured domain becomes necessary                   |
| Authorization         | Backend permissions are final; frontend checks only improve navigation and presentation          | Never—client state cannot become an authorization boundary                  |

Rejected defaults include JWTs in browser storage, independent frontend and API
servers, microservices before measured need, business logic in controllers or
loaders, and globally private rendering.

## 2. Current baseline

OMDN is already a modular Express application with controllers, services, repositories, and transactional operations.

Current installed baseline:

| Component       | Current value                                  |
| --------------- | ---------------------------------------------- |
| Node.js         | 24.18.1 in the current development environment |
| React           | 19.2.8 installed                               |
| React DOM       | 19.2.8 installed                               |
| React Router    | 8.3.0 installed                                |
| Vite            | 8.1.5 installed                                |
| Express         | 5.2.1 installed                                |
| MariaDB         | 11.8.8 in the current smoke-test environment   |
| Database driver | mysql2 3.23.2 installed                        |

The completed React Router Framework Mode migration required no major runtime upgrade. Dependency versions remain pinned through the lockfile and must be verified against the deployment image.

## 3. Confirmed target architecture

OMDN remains a modular monolith:

```text
Browser
  |
  v
Express
├── /api/*       JSON API
├── /assets/*    immutable frontend assets
└── /*           React Router Framework handler
  |
  ├── application services
  ├── domain policies
  ├── repositories
  └── infrastructure adapters
       ├── MariaDB
       ├── session storage
       ├── object/media storage
       └── background jobs/outbox
```

Ownership rules:

- Express owns the HTTP server, connection-level middleware, sessions, API mounting, and the React Router handler.
- React Router owns document routing, SSR, redirects, status codes, route loaders/actions, and route metadata.
- Controllers and loaders are transport adapters; they do not own reusable business transactions.
- Application services own use cases, authorization orchestration, and transaction boundaries.
- Domain policies own lifecycle and ownership rules.
- Repositories own SQL and row mapping.
- MariaDB remains the relational source of truth and initial durable-job coordinator.
- Object storage owns media binaries.
- The transactional outbox owns reliable post-commit side effects.

Microservices, Redis, a separate search engine, and a general frontend store are deferred until measured requirements justify them.

## 4. React Router Framework migration

The project is already on React Router 8.3.0. The migration is from Declarative Mode to Framework Mode, not from React to another framework and not across another router major.

### Stage 1: characterize current behavior

Before changing the router:

- Preserve tests for registration, verification, login, TOTP, logout, and admin access.
- Add browser coverage for the existing frontend proof of concept.
- Record current response status, cookie behavior, redirects, and error handling.
- Keep each migration stage buildable and testable.

### Stage 2: adopt Framework Mode without SSR

Current progress on 2026-08-04: the initial Framework SPA conversion is
complete and SSR is now enabled. The old HTML/`BrowserRouter` bootstrap is
removed, every current URL has a dedicated Framework route module, and the
homepage is the first production-verified public SSR route.

- Keep the completed Framework route-module conversion as the only frontend route authority.
- Keep the Framework-owned document shell.
- Keep `ssr: false` initially.
- Preserve current routes and API behavior.
- Do not add content features during this stage.

### Stage 3: integrate Framework Mode with Express

The implemented production request order is:

```text
1. Exact trust-proxy policy
2. Request/correlation ID
3. Security headers
4. Immutable static assets
5. Scoped body parsing
6. Session middleware where needed
7. Principal resolution for private routes/API
8. CSRF/origin validation for unsafe requests
9. /api routes
10. React Router handler
11. Final Express error handler
```

The Step 2.2 ordering work is complete. Static files are ahead of
body parsing and sessions; JSON parsing, sessions, and CSRF protection are
scoped to `/api`; and API errors retain correlation IDs. Baseline response
headers are active. Step 2.4 added a per-response nonce-based Content Security
Policy for the React Router server entry and its inline Framework scripts.

The official Express adapter API is verified against and pinned to React Router 8.3.0.

Step 2.3 verified the installed 8.3 API and uses its public `createContext` and
`RouterContextProvider` exports. The frontend boundary creates a new provider
per request with approved route services, principal/guest state, request ID, and
an injectable clock. Raw database, session, rate-limit, and worker dependencies
remain outside route context. Step 2.4 now passes this provider through the
official Express adapter's `getLoadContext` hook.

### Stage 4: enable SSR incrementally

Step 2.4 completed this first SSR slice on 2026-08-04. Express now uses the
official adapter and the `build/server` bundle, the homepage renders complete
server HTML and metadata, hydration is covered in Playwright, missing pages
return `404`, and unexpected root failures use a safe error document.

Migrate one read-only public route first and verify:

- Server-rendered HTML
- Correct hydration
- Real `404` behavior
- Route metadata
- Cache headers
- Error boundaries

Then migrate public posts, categories, authors, archives, canonical redirects, sitemap, and robots routes.

Authentication and administration move only after the public SSR path is stable.

## 5. Public and private rendering boundaries

Public CDN caching and session-specific root data must not be mixed.

### Public route tree

Public cacheable documents must not contain:

- Current-account data
- Session-bound CSRF tokens
- Personalized navigation
- Private preview information

Public routes may include:

- Homepage
- Published articles
- Categories
- Authors
- Archives
- Static information pages

Anonymous public HTML may be cached at the CDN. Requests carrying a session cookie should initially bypass shared HTML caching unless a tested cache-key and privacy design explicitly supports them.

### Private route tree

Authentication, account, administration, and preview routes resolve the principal on the server and use:

```http
Cache-Control: private, no-store
```

Private loaders may return presentation-safe account data and CSRF material. Protected content must not render before server authorization succeeds.

### Current-account ownership

After Framework Mode SSR is active:

- Private root/layout loaders own initial account presentation data.
- Frontend permission data controls navigation and visibility only.
- Application services continue enforcing permissions, ownership, resource state, and account status.
- `/api/account/me` may remain for API clients and client-only revalidation, but initial private SSR must not depend on a post-render hydration call.

## 6. Authentication and security work

The current authentication implementation is a strong foundation and should be evolved rather than rewritten.

### Keep

- Opaque MariaDB-backed sessions
- Argon2id password hashing
- Generic registration responses
- TOTP secret encryption
- TOTP replay protection
- Five-minute pending TOTP challenge
- Attempt limits and database-backed rate limiting
- Single-use recovery codes
- Session regeneration after successful password and TOTP authentication
- Authentication audit outbox
- SMTP delivery for registration and verification-email resend

### Implement before production

1. Explicit CSRF protection for every cookie-authenticated unsafe request.
2. Strict origin validation and Fetch Metadata checks as defense in depth.
3. A documented trust-proxy topology.
4. Idle and absolute session-expiration policy.
5. Authentication/session versioning for global revocation after critical changes.
6. Recent-authentication rules for sensitive operations.
7. TOTP encryption key versioning and rotation procedure.
8. Security notifications for recovery-code use and critical account changes.
9. Tests proving that authenticated responses cannot enter public caches.
10. A durable transactional email outbox with retry, monitoring, and idempotent delivery.

### TOTP response contract

Password login returns `200` with an explicit authentication state when TOTP is required because password processing is already complete:

```json
{
	"status": true,
	"data": {
		"authenticationState": "totp_required",
		"expiresAt": "...",
		"remainingAttempts": 5
	}
}
```

This contract is implemented across the controller, audit policy, frontend,
unit tests, browser tests, and real-database smoke tests. A pending challenge is
never treated as an authenticated principal by private loaders.

### Session cookie changes

Changing to a `__Host-` cookie and changing session lifetimes are worthwhile production decisions, but they require an explicit migration and should not be hidden inside the router migration.

### Approved session lifetime and revocation policy

The Phase 3 implementation enforces:

- A six-hour idle timeout, measured from the last accepted authenticated activity.
- A 24-hour absolute lifetime by default.
- A user-selectable “remember me” option that chooses a 30-day absolute
  lifetime at login; activity can never extend either absolute deadline.
- Password changes revoke every session, including the session that performed
  the change, requiring a fresh login.
- Password resets and account deletion revoke every session.
- TOTP security changes, including enable, disable, and recovery-code
  regeneration, revoke every other session while preserving the recently
  authenticated session performing the operation.

The cookie expiry, MariaDB expiry, and server-side checks agree. The server
must not trust a client-provided lifetime value other than the allowlisted
default/remember-me selection. Normal successful login permits multiple active
devices.

## 7. Application and worker boundaries

The existing code already uses services and repositories. New blog modules must follow the same dependency direction and improve consistency rather than create a parallel architecture.

The Phase 2 bootstrap refactor is complete. `server/application/` constructs
the database, process-level services, Express application, and worker lifecycle.
`expressApp.js` owns only HTTP composition, and `server.js` is the sole owner of
the network listener and process signals. This boundary is ready to receive the
React Router request handler without moving request-specific state into globals.

Repository methods must not independently commit partial business workflows. A service owns one transaction for operations such as:

- Publish post
- Change canonical slug
- Schedule publication
- Restore a revision
- Delete or restore content

Each transaction should update domain state, audit state, and an outbox event atomically where required.

### Worker evolution

Current background workers run inside the web process. Keep that behavior during the Framework migration.

Move to separate `web`, `worker`, and one-shot `migrate` processes before horizontal production scaling or before enabling publication/media jobs:

```text
web      → Express, SSR, API, sessions
worker   → outbox, publication, media, retention
migrate  → exactly one coordinated migration process
```

Do not introduce Redis initially. Use MariaDB-backed leasing and `FOR UPDATE SKIP LOCKED`, verified against real MariaDB integration tests.

## 8. Blog content model

Implement the content schema only after the editor/source-format decision is confirmed.

Required entities:

- Authors
- Posts
- Immutable post revisions
- Categories
- Tags
- Post/category and post/tag relationships
- Unified route/slug ownership
- Media assets and variants
- Revision/media relationships
- Publication schedules
- Site identity/settings
- Generic domain outbox events

### Posts and immutable revisions

Maintain these separate concepts:

```text
current revision   → latest editorial working revision
published revision → exact immutable revision visible publicly
scheduled revision → exact immutable revision selected by a schedule
```

Editors may continue creating revisions after another revision has been scheduled. The publication worker must therefore publish `schedule.revision_id` without requiring it to equal `posts.current_revision_id`.

### Revision deletion integrity

The post/revision relationship creates a potential foreign-key cycle when posts point to current/published revisions and revisions point back to posts.

Before accepting final DDL:

- Define the exact hard-delete transaction.
- Clear revision pointers before deleting a post if required.
- Test deletion, restore, and cascade behavior against MariaDB.
- Never rely on untested cascade order.

### Primary category

Do not use an unconstrained `is_primary` flag in the many-to-many join.

Preferred model:

```text
posts.primary_category_id → categories.id
post_categories           → all assigned categories
```

The service verifies that the primary category is also assigned to the post within the transaction.

### Unified slug namespace

Canonical slugs and historical redirects must not collide across concurrent transactions.

Use one route-slug ownership table, for example:

```text
route_slugs
  resource_type
  resource_id
  slug                UNIQUE within the public route namespace
  kind                canonical | redirect
  created_at
```

Changing a slug should:

1. Lock the resource.
2. Validate optimistic concurrency.
3. Reserve the new canonical slug.
4. Convert the old canonical slug into a redirect entry.
5. Update the resource.
6. Append a `SlugChanged` outbox event.
7. Commit atomically.

Redirects target a resource identity, not another redirect, preventing redirect chains.

## 9. Article editor and rendering pipeline

The recipe-description editor decision is complete. Use the self-hosted
TinyMCE Community edition under GPLv2+ for optional, narrowly formatted recipe
descriptions. OMDN bundles the editor locally, uses no Tiny Cloud or premium
plugins, and explicitly configures `licenseKey="gpl"`. Preserve TinyMCE's
copyright/license material and reassess licensing before any change to OMDN's
distribution model.

TinyMCE does not control the recipe document. Normal fields continue to own the
title, timings, yield, ingredients, instructions, media references, and
taxonomy. The editor allowlist contains only paragraphs, bold, italic, lists,
links, and line breaks. A server-side `sanitize-html` allowlist is the security
boundary; the browser toolbar and `valid_elements` configuration are only
authoring assistance.

The development route `/dev/recipe-editor` proves local/offline loading,
editing, server sanitization, revision serialization/restoration, and rendering.
No database writes are part of this proof.

The proof of concept must cover:

- Headings and paragraphs
- Lists and quotes
- Links
- Images with per-usage alt text
- Galleries
- Tables
- Code blocks
- Safe video embeds
- Revision serialization and restoration
- Server rendering without a browser

The first narrow source-format slice is complete for recipes. It uses a
versioned, application-owned JSON schema rather than editor-specific state. The
schema validates recipe identity, timings, yield, ingredients, and ordered
instructions; rejects unknown fields and duplicate stable item identifiers;
round-trips immutable revision JSON; renders without a browser; and derives
plain search text plus schema.org `Recipe` data from the same source. The
development example at `/dev/page-examples/recipe` exercises this source inside
the existing configurable presentation system.

This recipe slice does not settle the general article editor decision. Rich
article features such as galleries, tables, code blocks, quotes, links, and safe
video embeds still require the later focused comparison. Do not design the
general revision schema around the recipe source alone.

If structured JSON is selected, freeze an application-owned schema version. Never accept arbitrary editor extensions, raw HTML, scripts, styles, event attributes, or arbitrary iframes.

Recommended processing pipeline:

```text
editor source
  → validate schema and size limits
  → validate media/embed references
  → normalize
  → render HTML on the server
  → sanitize HTML
  → derive plain text/search fields
  → persist immutable revision
```

Store separate `editor_schema_version` and `render_version` values so source migrations and renderer changes can evolve independently.

## 10. Media architecture

Media binaries remain outside MariaDB.

### Initial adapters

- Development: application-controlled local directory
- Tests: isolated temporary storage or fake adapter
- Production: private S3-compatible object storage behind a CDN

### Upload lifecycle

```text
create upload intent
  → upload to random quarantine key
  → worker validates real file type and size
  → decode and re-encode image
  → generate variants
  → promote validated source/variants
  → mark media ready
```

Initial image policy:

- Allow JPEG, PNG, and WebP.
- Reject SVG and animated formats until separately threat-modeled.
- Use generated storage keys, not user filenames.
- Enforce byte, dimension, and pixel limits.
- Apply orientation and remove unnecessary metadata.
- Store dimensions, checksums, MIME type, state, and processing errors.
- Store alt text at content-usage level, with an optional asset default.
- Remove abandoned uploads and unreferenced assets after a grace period.

Evaluate `sharp` when implementing the worker, not during the router migration.

## 11. Publication workflow and scheduling

Provisional lifecycle:

```text
draft → review → scheduled → published → archived → trashed
```

Before implementation, confirm role transitions, review requirements, restoration, and trash retention.

### Scheduling

A schedule references one exact immutable revision.

Workers should:

1. Claim due schedules in bounded batches using leases and `SKIP LOCKED`.
2. Process each claimed schedule in a separate transaction.
3. Lock the schedule, post, and selected revision.
4. Verify the schedule is still eligible.
5. Publish the scheduled revision idempotently.
6. Mark the schedule complete.
7. Append audit and domain outbox events.
8. Commit atomically.

The worker must tolerate duplicate delivery, crashes, expired leases, and poison jobs without creating duplicate publication events or repeatedly changing publication timestamps.

## 12. API contract

Keep the existing `{ status, message, data }` response family during the router and content-foundation work. Do not combine a full RFC 9457 migration with those changes.

RFC 9457 Problem Details may be adopted later through a dedicated API-contract decision and compatibility plan.

### Proposed public routes

```text
GET /api/posts
GET /api/posts/:slug
GET /api/categories/:slug/posts
GET /api/authors/:slug/posts
```

### Proposed administration routes

```text
GET    /api/admin/posts
POST   /api/admin/posts
GET    /api/admin/posts/:id
PATCH  /api/admin/posts/:id
DELETE /api/admin/posts/:id
POST   /api/admin/posts/:id/publish
```

### Concurrency

Use a `lock_version` on editable resources and strong ETags:

```http
GET /api/admin/posts/1842
ETag: "post-1842-v17"

PATCH /api/admin/posts/1842
If-Match: "post-1842-v17"
```

Return `412 Precondition Failed` when the representation changed. Use `409 Conflict` for domain-state conflicts such as an invalid lifecycle transition.

## 13. Pagination and request state

### Public discovery pages

SEO-visible archives require stable numbered URLs:

```text
/blog?page=2
/category/guides?page=3
```

Each indexable archive page is self-canonical and contains crawlable previous/next navigation.

### Interactive feeds

Cursor pagination may support “load more” or infinite widgets using stable `(published_at, id)` keyset ordering. It does not replace crawlable archive URLs.

### Administration

Offset pagination with exact totals is acceptable for administrative tables that need page numbers and direct jumps.

Filters, sorting, search, and pagination remain URL state.

## 14. React Router and TanStack Query boundary

Avoid two caches owning the same route-critical data.

| Data/workflow                          | Owner                                  |
| -------------------------------------- | -------------------------------------- |
| Public article/category/author/archive | React Router loader                    |
| Initial private account presentation   | Private layout/root loader             |
| Route mutation tied to navigation      | React Router action                    |
| Interactive admin table                | TanStack Query when justified          |
| Infinite/load-more widget              | TanStack Query                         |
| Polling/independent status widget      | TanStack Query                         |
| Unsaved editor content                 | Editor/local form state                |
| Search, sorting, filters, page         | URL search parameters                  |
| General client-only global state       | Zustand only after a demonstrated need |

If TanStack Query data is rendered during SSR, create a fresh query client per request and configure hydration/staleness deliberately to prevent immediate duplicate browser requests.

## 15. SEO implementation

SEO is implemented through SSR, domain data, and correct HTTP behavior—not through a client-only head-tag package.

Public routes must provide:

- Meaningful initial HTML
- Unique title and description
- Self-referencing canonical URL
- Open Graph/social metadata
- Correct language
- Real `301`, `404`, and other status codes
- Generated JSON-LD
- Safe cache headers

Generate:

- `BlogPosting` and `BreadcrumbList` for articles
- `Person` for authors
- `WebSite` and `Organization` for site identity
- `/sitemap.xml` containing only canonical indexable URLs
- `/robots.txt` referencing the sitemap

Drafts, previews, authentication, account, administration, and arbitrary filter pages remain `noindex` and absent from the sitemap.

## 16. Migration tooling

The project currently uses manually managed numbered SQL files. Production requires a coordinated migration runner, but the tool has not been selected.

Create a separate decision comparing:

- dbmate
- A small Node-based migration runner
- Another SQL-first tool with MariaDB support

Requirements:

- Plain reviewable SQL
- Version tracking
- One migration process per deployment
- Production-like rehearsal
- Expand-and-contract support
- Checked-in schema representation

Do not run migrations automatically from every web replica.

## 17. Language strategy

The current application is JavaScript. A whole-project TypeScript migration is not required for the blog or Framework Mode adoption.

If TypeScript is desired, approve it as a separate incremental decision with clear boundaries. Do not combine a language rewrite with the router, content schema, and security migrations.

## 18. Testing requirements

Retain Vitest and the current backend integration approach.

Add packages only when their layer begins:

- React Testing Library for route/component behavior
- Playwright for browser authentication and editorial flows
- Real MariaDB integration tests for constraints, transactions, locks, and worker concurrency
- A load-test tool after representative public/admin routes exist

Required browser flows:

```text
register → verify → login → TOTP
author creates revision
editor reviews
publisher publishes
public SSR post contains SEO metadata
slug change redirects old URL
```

Required SSR tests:

- Article body appears in initial HTML.
- Metadata, canonical, JSON-LD, and language are correct.
- Missing records return a real `404`.
- Old slugs return `301` to the current canonical URL.
- Anonymous users cannot receive protected markup.
- Private pages are `private, no-store`.
- Public caches never contain account or CSRF data.
- Hydration completes without mismatch.

Required security tests:

- Session fixation and rotation
- CSRF failures and token rotation
- Authorization for owned/non-owned posts
- TOTP replay and attempt limits
- Recovery-code single use
- Optimistic-concurrency races
- Slug reservation races
- Dangerous rich content
- Hostile and oversized uploads
- Worker duplicate claims and lease recovery
- Public/private cache isolation

## 19. Operations required before production

- Structured request and worker logs
- Request IDs across HTTP, audit, and jobs
- HTTP, SSR, loader, database, session, worker, and media latency metrics
- Separate `/live` and `/ready` behavior
- Graceful web and worker shutdown
- Managed secrets and encryption-key rotation
- Database backup and point-in-time recovery
- Object-storage versioning/recovery
- Regular restore exercises
- Error tracking and alerts
- SMTP delivery monitoring and a durable transactional-email retry queue
- Worker backlog and publication-delay alerts
- Search Console, sitemap, and structured-data monitoring
- Capacity/load testing before selecting final production database size

## 20. Package adoption plan

| Package/capability                   | Decision                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| React Router Framework Mode packages | Installed and pinned together at 8.3.0                                        |
| TanStack Query                       | Add when the first independently refreshed admin/feed use case exists         |
| Zustand                              | Do not add without a concrete client-only global-state requirement            |
| TipTap/Lexical/Markdown editor       | Decide through an editor proof of concept                                     |
| React Hook Form                      | Evaluate when administration forms begin                                      |
| Zod                                  | Already present; define browser-safe schema boundaries before frontend reuse  |
| sharp                                | Add with the media worker                                                     |
| React Testing Library                | Evaluate when interaction tests need capabilities beyond current Vitest tests |
| Playwright                           | Installed; keep browser and production SSR characterization coverage          |
| Nodemailer                           | Installed for provider-neutral SMTP account-verification delivery             |
| dbmate or alternative                | Separate migration-tool decision                                              |
| Redis                                | Deferred until measured contention or queue requirements justify it           |
| External search engine               | Deferred until MariaDB search is demonstrably insufficient                    |

## 21. Implementation order

| Phase                                      | Status                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| 0 — Protect baseline                       | Complete (2026-08-04)                                                    |
| 1 — Framework Mode migration               | Complete (2026-08-04)                                                    |
| 2 — Express integration and SSR boundaries | Complete (2026-08-04)                                                    |
| 3 — Authentication hardening               | In progress; CSRF and session lifetime/revocation policy are implemented |
| 4–9                                        | Planned                                                                  |

### Phase 0: protect the baseline

Status: complete. Runtime inventory, browser characterization, and architecture
decisions were captured before the migration.

1. Commit or otherwise preserve the current working baseline.
2. Inventory exact lockfile/runtime/deployment versions.
3. Add Playwright characterization tests for current authentication routes.
4. Record architecture decisions for Framework Mode and public/private rendering.

### Phase 1: Framework Mode without SSR

Status: complete. React Router 8.3 owns the document shell and route manifest;
the obsolete SPA router was removed.

1. Add required Framework packages.
2. Convert the route tree and document shell.
3. Keep `ssr: false`.
4. Preserve all current frontend and API behavior.

### Phase 2: Express integration and first SSR route

Status: complete. Express and the official Framework adapter serve SSR from one
origin. Public, authentication, and private layouts are active. `/admin`, nested
`/admin/*` documents, and their `.data` requests resolve the session principal;
public routes avoid MariaDB sessions.

1. Add the Framework request handler and request context.
2. Implement the public/private route-tree separation.
3. Migrate one read-only route to SSR.
4. Prove status, metadata, cache, and hydration behavior.

### Phase 3: authentication hardening

Status: complete. Session-bound CSRF tokens, origin/fetch-metadata checks,
frontend token refresh, session lifetime/revocation rules, loader-owned account
presentation, and the complete TOTP login challenge are implemented and tested.

1. [x] Implement CSRF and strict origin policy.
2. [x] Implement session idle/absolute expiry and targeted session revocation.
3. [x] Move private account presentation into server loaders.
4. [x] Enforce pending-TOTP state in private route loaders.
5. [x] Migrate the TOTP-required login response contract.

### Phase 4: content decisions and schema

1. [ ] Complete the editor/source-format proof of concept (recipe slice complete; general rich content remains).
2. Approve the publication lifecycle and permissions.
3. Finalize corrected post/revision/category/slug schema.
4. Select migration tooling.
5. Apply content migrations with real MariaDB integration tests.

### Phase 5: public publishing and SEO

1. Implement public post services and repositories.
2. Implement article, author, category, and archive SSR routes.
3. Add canonical redirects, metadata, JSON-LD, sitemap, and robots.
4. Add cache isolation and SEO response tests.

### Phase 6: editorial administration

1. Implement immutable revision CRUD.
2. Add ownership and permission enforcement.
3. Add optimistic concurrency.
4. Add the selected editor.
5. Add TanStack Query only to interactive views that need it.

### Phase 7: media

1. Implement storage adapters.
2. Add quarantine and media records.
3. Add worker validation and image processing.
4. Generate immutable variants and CDN delivery.

### Phase 8: scheduling and process separation

1. Implement publication schedules and leases.
2. Generalize domain outbox events.
3. Split web and worker entry points.
4. Verify idempotency and multiple-worker concurrency.

### Phase 9: production readiness

1. Add monitoring, readiness, and graceful shutdown gates.
2. Rehearse migrations and restores.
3. Load-test representative traffic.
4. Validate cache isolation and security controls.
5. Complete SEO/Search Console setup.

## 22. Explicitly deferred

- Microservices
- Redis-backed sessions or queues
- External search engine
- Global TypeScript rewrite
- Global API response rewrite
- General-purpose frontend global store
- Collaborative editing
- Public SVG uploads
- Arbitrary embeds or raw HTML
- Production database sizing without traffic and availability requirements

## 23. Next decision

Authentication hardening and the narrow recipe-source proof are complete. The
next decision is whether to continue the source proof with general rich content
or first approve the publication lifecycle and permissions. The general source
decision still determines the revision schema, renderer, sanitizer, media
references, and editorial interface.

## 24. Verified runtime and deployment contract

Recorded locally on 2026-08-04:

| Component                           | Verified value                              |
| ----------------------------------- | ------------------------------------------- |
| Node.js                             | 24.18.1; repository requirement `>=22.22.0` |
| npm                                 | 11.16.0; repository requirement `>=10`      |
| React / React DOM                   | 19.2.8                                      |
| React Router / first-party adapters | 8.3.0                                       |
| Vite                                | 8.1.5                                       |
| Express                             | 5.2.1                                       |
| mysql2                              | 3.23.2                                      |
| Development MariaDB                 | 11.8.8                                      |

Development uses one `server/developmentServer.js` process: Express owns
`PORT`, Vite runs as middleware, and `/api`, SSR, assets, and HMR share an
origin. Production uses `npm start`; `prestart` builds `build/client` and
`build/server`, then `server/server.js` serves both the API and Framework build.

Production values still requiring hosting evidence are the Node/npm/MariaDB
versions, process count and restart behavior, reverse-proxy hop count, canonical
hostname, HTTPS redirect behavior, database connection limit, backup/restore
facilities, and actual same-host database topology. `trust proxy = 1`, secure
cookies, client-IP rate limits, and the default pool limit of 10 must be checked
against that evidence before launch.

The session cookie is `omdn_session`, HTTP-only, same-site `Lax`, host-only,
secure in production, and stored in the MariaDB `sessions` table. Authenticated
session JSON carries the implemented six-hour idle timeout and user-selected
24-hour or 30-day absolute lifetime.

## 25. Dependency policy

Keep all first-party React Router packages on the same exact version. Do not add
`@react-router/serve`, RSC packages, Cloudflare tooling, Redis, an external
search engine, Zustand, or TypeScript without a concrete approved requirement.
TanStack Query belongs only in independently refreshed interactive server-state
views. Select the editor, migration tool, form library, media processor, and
object-storage adapter during the phases that first require them.

Nodemailer is the current provider-neutral SMTP adapter. Registration and
verification resend deliver email only after their database transaction commits;
development without SMTP retains the console-token fallback. Before horizontal
production scaling, move transactional email into a durable database outbox so
temporary SMTP failures are retried outside the request lifecycle. Password-reset
email is deferred until its browser route and complete link flow exist.
