# OMDN Architecture — First Draft

## 1. Purpose

This document consolidates the initial architecture and package discussions for OMDN. It is a historical working draft: confirmed decisions are identified explicitly, while unresolved choices remain marked as provisional. For current implementation status, use `stepByStepImplementation.md`, `runtimeInventory.md`, and the repository `README.md`.

The platform is expected to grow from its authentication foundation into a public, SEO-oriented blog with an authenticated editorial and administration application.

## 2. Current foundation

### Frontend

- React 19
- React Router
- Vite
- Tailwind CSS
- shadcn/ui stored locally for offline availability
- Minimal register, email-verification, login, and admin proof of concept

### Backend

- Express 5
- MariaDB/MySQL
- Server-side sessions stored in MariaDB
- Role- and permission-based authorization
- Authentication audit outbox and background delivery worker
- Shared database-backed rate limiting
- TOTP and recovery-code backend support
- Soft account deletion followed by permanent deletion after one year

## 3. Core architecture principles

### Server authority

- The MariaDB-backed server session is the authoritative authentication state.
- The browser receives only an opaque session cookie.
- Backend permission middleware is the final authorization boundary.
- Frontend roles and permissions control navigation and presentation only; they never grant API access.
- API-owned data should not be duplicated into general-purpose client stores.

### Rendering

- React remains the frontend component model.
- React Router was selected to move from Declarative Mode to Framework Mode; that migration and the first SSR/private-route boundary are now implemented.
- Dynamic public content will use server-side rendering.
- Stable public pages may be pre-rendered.
- Authenticated administration remains interactive and hydrates on the client.

### Data ownership

- MariaDB stores relational application data.
- Media binaries remain outside MariaDB.
- URL state owns public filters, sorting, search, and pagination position.
- TanStack Query is the leading choice for cached server state.
- Local React state owns temporary component and form state.
- Zustand should be introduced only if substantial client-only workflow state appears later.
- Redux is not currently justified.

## 4. Target application shape

```text
Browser
  |
  | HTTPS + opaque session cookie
  v
Express
├── /api/*       existing JSON API
├── /assets/*    built frontend assets
└── /*           React Router SSR/pre-render handler
     ├── public blog
     ├── authentication
     ├── account
     └── administration
  |
  v
MariaDB
├── application data
├── users, roles and permissions
├── sessions
├── rate-limit counters
└── audit outbox/events

Object/media storage
└── source images and generated variants
```

The React Router Framework migration plan must define development behavior, production builds, Express integration, session access during SSR, route loaders, errors, real HTTP `404` responses, and the rendering strategy assigned to each route.

## 5. Authentication and sessions

### Session strategy

- Continue using MariaDB-backed Express sessions at the current application stage.
- Store minimal identity and workflow state in the session, such as `userId` and pending TOTP challenge information.
- Send the session cookie with every authenticated API request.
- Load the current account once during application hydration and after authentication changes.
- Do not query `/api/account/me` on every client-side route transition.
- Optimize repeated backend authorization queries separately from session storage.

MariaDB sessions can later move to Redis if session traffic creates measurable database contention. That change should preserve the opaque-cookie contract and should not require a frontend authentication rewrite.

### Frontend account hydration

```text
Application starts or refreshes
  → GET /api/account/me
  → 200: cache user, roles and permissions in memory
  → 401: cache guest state

Successful login
  → refresh the current-account query

Logout
  → clear the current-account query
```

The current-account cache improves rendering and navigation but is not an authorization authority.

### Frontend route access

Frontend routes should be defined in one manifest containing:

- Path
- Page/route module
- Public, guest, or authenticated access
- Required permissions
- Rendering strategy where relevant

The same metadata should drive route guards and navigation visibility. Protected rendering waits for account hydration on a full refresh, while ordinary client-side navigation uses the in-memory permission set.

## 6. TOTP integration

TOTP enrollment remains separate from registration and ordinary password login.

### Enrollment

```text
Authenticated account
  → POST /api/auth/totp/setup
  → display returned QR code
  → user enters authenticator code
  → POST /api/auth/totp/enable
  → display recovery codes once
```

### Login challenge

```text
POST /api/auth/login
  → 200: fully authenticated session
  → 202: pending TOTP session
      → dedicated TOTP challenge route
      → POST /api/auth/totp/login/verify
      → fully authenticated session
```

A pending TOTP session must not access authenticated pages or APIs.

## 7. Blog domain model

The schema should cover:

- Posts
- Authors
- Categories
- Tags
- Media
- Post revisions
- Slug redirects
- Publication scheduling
- SEO overrides
- Site identity/settings

### Article source format

This remains unresolved. Candidates are:

- HTML
- Markdown
- Structured editor JSON

The current recommendation to evaluate is structured editor JSON as the editable source with sanitized HTML generated for publication. The editor must be selected before this becomes final.

### Editor requirements to establish

- Embedded images
- Tables
- Galleries
- Video embeds
- Reusable/custom content blocks
- Revision history
- Possible collaborative editing

TipTap, Lexical, and Markdown-based editors remain candidates.

### Publication workflow

The provisional lifecycle is:

```text
draft → review → scheduled → published → archived → trashed
```

The following rules still need decisions:

- Which roles can publish directly
- Whether contributors require review
- How published content is unpublished
- Whether scheduled publication uses a background worker
- How long trashed posts are retained
- Whether revisions can be restored

## 8. Authorization model

The existing post permissions remain the starting point:

```text
posts.create
posts.edit_own
posts.edit_all
posts.publish
posts.delete_own
posts.delete_all
```

Potential additions:

```text
media.upload
comments.moderate
```

Ownership and editorial rules must be finalized before implementing administration CRUD.

## 9. Media architecture

Media binaries must not be stored directly in MariaDB.

Storage candidates:

- Local filesystem for development
- S3-compatible object storage
- Managed image service

The media model and upload pipeline should support:

- Source file location
- MIME validation
- File-size limits
- Safe generated filenames
- Width and height
- Alternative text
- Generated responsive variants
- Social-sharing images
- Cleanup of unused media

`sharp` is the likely image-processing package, pending the storage decision.

## 10. API design

### Proposed public endpoints

```text
GET /api/posts
GET /api/posts/:slug
GET /api/categories/:slug/posts
GET /api/authors/:slug/posts
```

### Proposed administration endpoints

```text
GET    /api/admin/posts
POST   /api/admin/posts
GET    /api/admin/posts/:id
PATCH  /api/admin/posts/:id
DELETE /api/admin/posts/:id
POST   /api/admin/posts/:id/publish
```

The final contracts must define:

- Visibility of drafts and scheduled content
- Validation and error responses
- Filters and allowed sort fields
- Pagination limits
- Preview behavior
- Optimistic concurrency
- Mutation audit events

### Collection response

Cursor-based collections should use a consistent shape:

```json
{
	"status": true,
	"data": {
		"items": [],
		"pageInfo": {
			"nextCursor": null,
			"hasNextPage": false
		}
	}
}
```

Exact totals should be returned only for interfaces that need them.

## 11. Pagination and URL state

### Interactive feeds

- Use opaque cursor pagination.
- Back cursors with stable keyset ordering such as `(published_at, id)`.
- Enforce bounded page sizes on the server.
- Keep filters and sorting in URL search parameters.

### Crawlable archives

- Provide stable numbered archive URLs for search engines and users.
- Keep each indexable archive page self-canonical.
- Interactive “load more” behavior may use cursors without removing crawlable archive links.

### Administration tables

Offset pagination is acceptable where exact totals, direct page jumps, and conventional numbered tables are genuinely required.

## 12. Frontend server state

TanStack Query is the leading choice for:

- Current account
- Post collections
- Individual posts
- Categories and tags
- Comments
- Administration lists
- Mutations and cache invalidation

Proposed responsibility boundary:

```text
Initial public document data → React Router loader
Interactive/refetched data    → TanStack Query
Authentication hydration      → shared account query
Form input                     → local state/form library
Filters and pagination         → URL state
```

Query keys should include the resource and every normalized request parameter. Mutations should update or invalidate only affected cache regions.

## 13. Forms and validation

React Hook Form with Zod is the leading frontend candidate.

Principles:

- Backend validation remains authoritative.
- Frontend validation provides immediate feedback.
- Browser-safe schema concepts may be shared deliberately.
- Frontend bundles should not import server modules directly.

## 14. SEO strategy

SEO is a rendering and content-model responsibility, not merely a metadata package.

### Rendering requirements

- Public articles, authors, categories, and archives return meaningful server-rendered HTML.
- Stable routes may be pre-rendered.
- Draft, preview, authentication, account, and administration routes are not indexable.
- Missing public content returns a real HTTP `404` response.

### URL policy

- Use lowercase permanent slugs.
- Give each published resource one canonical URL.
- Preserve old post slugs in a redirect table.
- Redirect old slugs permanently to the current canonical URL.
- Use self-referencing canonical tags on indexable pages.

### Structured data

Generate JSON-LD from normalized records rather than storing arbitrary schema documents.

- `BlogPosting` and `BreadcrumbList` on article pages
- `Person` on author pages
- `WebSite` and `Organization` for site identity

Article JSON-LD should derive headline, description, canonical URL, images, publication/modification dates, author, publisher, category, keywords, and language from the domain model.

### Metadata

Every public page should provide:

- Unique title
- Meta description
- Canonical URL
- Open Graph metadata
- Social image
- Appropriate robots directive

### Discovery

- Generate `/sitemap.xml` from published canonical URLs.
- Generate `/robots.txt` with the sitemap location.
- Exclude drafts, previews, authentication, account, administration, and arbitrary filter URLs from the sitemap.
- Use meaningful modification timestamps.
- Validate structured data and monitor indexing through Search Console.

React Router Framework Mode can generate document metadata and JSON-LD; a separate head-management package is not currently required.

## 15. Package direction

Packages should be introduced when their architectural role is confirmed.

| Concern                  | Direction                           | Status            |
| ------------------------ | ----------------------------------- | ----------------- |
| Rendering/routing        | React Router Framework Mode         | Confirmed         |
| UI components            | shadcn/ui                           | Confirmed         |
| Styling                  | Tailwind CSS                        | Existing          |
| Remote/server state      | TanStack Query                      | Leading candidate |
| Client-only global state | Zustand only if required            | Deferred          |
| Forms                    | React Hook Form                     | Candidate         |
| Frontend validation      | Zod                                 | Candidate         |
| Rich-text editor         | TipTap, Lexical, or Markdown editor | Unresolved        |
| Image processing         | `sharp`                             | Candidate         |
| Component tests          | React Testing Library               | Candidate         |
| Browser tests            | Playwright                          | Candidate         |

## 16. Testing strategy

Retain Vitest for backend and domain tests. Evaluate React Testing Library for components and Playwright for end-to-end browser flows.

Required coverage should include:

- SSR metadata and HTTP status codes
- Canonical URLs
- Structured data generation
- Sitemap and robots output
- Slug redirects
- Authorization and ownership rules
- Cursor and archive pagination
- Upload validation
- Publication scheduling
- Cache invalidation after mutations

Critical end-to-end flows:

```text
register → verify → login → TOTP
author creates draft
editor reviews
publisher publishes
public post renders with SEO metadata
slug changes and old URL redirects
```

## 17. Operational foundations

Before production, establish:

- Structured application logging
- Request timing and performance baselines
- Health and readiness checks
- Database backup and restore procedures
- Background-worker monitoring
- Error tracking
- Content Security Policy
- Upload security controls
- Search Console and sitemap monitoring

## 18. Implementation sequence

1. Write the React Router Framework migration plan.
2. Decide the editor and article storage format.
3. Design the complete blog database schema.
4. Define post lifecycle, ownership, and permissions.
5. Design media storage and processing.
6. Implement the React Router Framework migration.
7. Implement public post loading, SSR, and SEO.
8. Implement administration CRUD and the editor.
9. Add TanStack Query where interactive caching is required.
10. Add component and end-to-end tests.
11. Establish the production operational controls.

## 19. Decisions still required

1. Exact Express and React Router Framework integration.
2. Article source format.
3. Editor package.
4. Media storage provider.
5. Final post schema.
6. Publication and review workflow.
7. Ownership rules.
8. TanStack Query integration boundary with route loaders.
9. Forms and validation package adoption.
10. Testing package adoption.
