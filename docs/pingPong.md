# Architecture and Packages — Ping-Pong Log

## Purpose

This file records our ongoing discussion about application architecture and package choices. It distinguishes confirmed decisions from proposals and open questions so exploratory conversation does not accidentally become architecture policy.

## Current context

- Frontend: React 19, React Router, Vite, Tailwind CSS, and shadcn/ui.
- Backend: Express 5 with MySQL/MariaDB.
- Authentication: server-side sessions stored in MySQL.
- Authorization: backend roles and permissions; `users.manage` currently protects the admin test route.
- Existing frontend proof of concept: register, email verification, login, and admin access pages.
- Current UI implementation is intentionally minimal and will be replaced by a structured frontend architecture.

## Confirmed decisions

### Server authority

- The server session remains the authoritative authentication state.
- Backend permission middleware remains the authorization boundary.
- Frontend roles and permissions may support rendering and navigation but must never grant API access.

### Account lifecycle

- Account deletion remains a soft delete initially.
- Soft-deleted users and their remaining data are permanently removed after one year by a background retention worker.

### UI availability

- shadcn/ui components will be downloaded into the repository so they are available offline.

### Public frontend rendering

- Keep React as the frontend component model.
- Migrate routing from React Router Declarative Mode to React Router Framework Mode.
- Use server-side rendering for dynamic public blog pages and selective pre-rendering for stable pages.
- Keep the existing Express API, MariaDB authentication, Tailwind CSS, and shadcn/ui foundation.

## Proposals under discussion

### Authentication session strategy

- Keep server-side sessions in MariaDB for the current application stage.
- Store only identity and short-lived workflow state in the session, such as `userId` and a pending TOTP challenge.
- Continue sending the opaque session cookie with every authenticated API request.
- Load account data into frontend memory after login and on application hydration, but do not treat that frontend copy as authoritative authorization state.
- Optimize repeated backend authorization queries separately from session storage.

### Frontend route authorization

- Define frontend routes in one route manifest containing the path, page component, authentication requirement, and required permissions.
- Fetch `/api/account/me` once when the application hydrates and once after authentication changes.
- Keep the resulting user, roles, and permissions in shared in-memory state.
- Use the same route metadata to guard navigation and filter menus; do not query the backend on every client-side route transition.
- On a full page refresh, hold protected rendering until the single account-hydration request finishes.
- Treat frontend route checks as user-experience controls only. Matching backend endpoints must continue enforcing their own permissions.

### Blog server state and pagination

- Use TanStack Query for post lists, individual posts, comments, categories, and other API-owned data.
- Do not copy API collections into a general client-state store.
- Use opaque cursor pagination for public chronological feeds, backed by a stable `(published_at, id)` database order.
- Keep search, filters, sort, and pagination position in the URL so views are linkable and survive refreshes.
- Use bounded page sizes with a server-enforced maximum.
- Return collection data as `items` plus `pageInfo`; return exact totals only for screens that genuinely need them.
- Use query keys derived from the resource and normalized request parameters.
- Invalidate or update relevant query caches after mutations.
- Reserve Zustand for substantial client-only workflow state if such a need appears later; do not introduce Redux or Zustand merely to hold fetched posts.

### SEO and public rendering

- Keep authenticated administration as an interactive client experience within the same application.
- Generate canonical metadata and JSON-LD from normalized post, author, image, category, and site data rather than storing arbitrary schema blobs.
- Use `BlogPosting` plus `BreadcrumbList` for article pages and `WebSite`/`Organization` identity on the site root.
- Provide crawlable numbered archive URLs even if the interactive feed also supports cursor-based loading.
- Generate `sitemap.xml` and `robots.txt` from published canonical URLs; exclude drafts, previews, authentication, and admin routes from indexing.

### TOTP integration order

- Keep TOTP enrollment separate from registration and ordinary password login.
- After an authenticated user chooses to enable TOTP, show the QR code returned by `POST /api/auth/totp/setup`, verify a code through `POST /api/auth/totp/enable`, and display the recovery codes once.
- When login returns `202` with `requiresTwoFactor: true`, route to a dedicated challenge page and complete the pending session through `POST /api/auth/totp/login/verify`.

## Open questions

- How should frontend modules be organized as the application grows?
- Where should authenticated account state live?
- Should server-state fetching use native `fetch`, a small internal client, or a dedicated query package?
- Which form and validation packages, if any, should complement the backend schemas?
- How should protected routes hydrate authentication state on refresh?
- Which packages provide enough value to justify their maintenance and bundle cost?
- How will React Router Framework Mode integrate with the existing Express server in development and production?
- Should article bodies use HTML, Markdown, or structured editor JSON?
- Which editor best matches the required content blocks and publication workflow?
- Where will media files be stored, transformed, and delivered?
- Which post states, ownership rules, and editorial approvals are required?

## Provisional implementation roadmap

### 1. React Router Framework migration plan

Define the target server shape before changing the current router:

```text
Express
├── /api/*       existing API
├── /assets/*    built frontend assets
└── /*           React Router SSR handler
```

The plan must cover development behavior, production builds, Express integration, SSR session cookies, route loaders, errors and real `404` responses, and the routes assigned to SSR, pre-rendering, or client rendering.

### 2. Blog content model

Design posts, authors, categories, tags, media, post revisions, slug redirects, publication scheduling, SEO fields, and site settings. Decide whether article source content is HTML, Markdown, or structured editor JSON before finalizing the schema.

Current recommendation to evaluate: store structured editor JSON as the source and generate sanitized HTML for publication.

### 3. Editor selection

Compare TipTap, Lexical, and Markdown-based editing against actual requirements: embedded images, tables, galleries, video, reusable/custom blocks, revision history, and possible collaborative editing.

### 4. Media architecture

Keep media binaries outside MariaDB. Choose between local development storage, S3-compatible object storage, or a managed image service. Define MIME validation, file-size limits, safe filenames, dimensions, alt text, generated variants, social images, and orphan cleanup. Evaluate `sharp` after storage requirements are confirmed.

### 5. Post API contract

Proposed public endpoints:

```text
GET /api/posts
GET /api/posts/:slug
GET /api/categories/:slug/posts
GET /api/authors/:slug/posts
```

Proposed administration endpoints:

```text
GET    /api/admin/posts
POST   /api/admin/posts
GET    /api/admin/posts/:id
PATCH  /api/admin/posts/:id
DELETE /api/admin/posts/:id
POST   /api/admin/posts/:id/publish
```

Define pagination, filters, sorting, validation, draft visibility, previews, optimistic concurrency, and error contracts before implementation.

### 6. Frontend server state

Evaluate TanStack Query after defining the React Router loader boundary. Proposed responsibility split:

```text
Initial public document data → React Router loader
Interactive/refetched data    → TanStack Query
Authentication hydration      → shared account query
```

### 7. Forms and validation

Evaluate React Hook Form with Zod. Backend validation remains authoritative. Share browser-safe schema concepts deliberately rather than importing server modules directly into frontend bundles.

### 8. Authorization model

Review the existing post permissions and add missing media/moderation permissions as needed:

```text
posts.create
posts.edit_own
posts.edit_all
posts.publish
posts.delete_own
posts.delete_all
media.upload
comments.moderate
```

Define ownership, editorial review, and publishing rules before implementing administration CRUD.

### 9. Publication workflow

Evaluate an explicit lifecycle:

```text
draft
review
scheduled
published
archived
trashed
```

Decide who can publish, whether contributors require review, how unpublishing works, whether scheduled publication uses a background worker, how long trashed posts remain, and whether revisions are restorable.

### 10. Testing strategy

Evaluate React Testing Library for components and Playwright for browser flows while retaining Vitest for backend and domain tests. Cover SSR metadata/status codes, structured data, sitemaps, canonical URLs, redirects, and these critical flows:

```text
register → verify → login → TOTP
author creates draft
editor reviews
publisher publishes
public post renders with SEO metadata
slug changes and old URL redirects
```

### 11. Operational foundations

Before production, establish structured logging, request timing, health/readiness checks, database backup and restore procedures, background-job monitoring, error tracking, content-security policy, upload security, and Search Console/sitemap monitoring.

### Recommended execution order

1. Write the React Router Framework migration plan.
2. Decide the editor and article storage format.
3. Design the complete blog schema.
4. Define post lifecycle and permissions.
5. Design media storage.
6. Implement the framework migration.
7. Implement public post loading and SEO.
8. Implement admin CRUD and the editor.
9. Add TanStack Query where interactive caching is required.
10. Add end-to-end tests.

## Discussion log

### 2026-08-04 — Discussion opened

We opened an architecture and package-selection discussion. No new package or structural decision has been made yet.

### 2026-08-04 — Sessions and TOTP

Question: after adding the TOTP QR-code flow, should MariaDB sessions remain part of every authenticated interaction?

Current proposal: yes. The browser keeps only an opaque cookie, Express resolves that cookie through the MariaDB session store, and protected backend routes remain authoritative. Frontend account state can avoid unnecessary UI-loading calls, but it does not replace the server session. TOTP enrollment should be an authenticated account-security flow; a `202` password login should transition into a separate TOTP challenge that upgrades the pending session to a fully authenticated session.

### 2026-08-04 — Frontend URL access

Question: how will the frontend know which URLs a user can access without consulting the database for every navigation?

Current proposal: the frontend owns a static route manifest and hydrates the current account once from `/api/account/me`. Route guards and menus compare the manifest's required permissions with the in-memory permission set. Client-side transitions require no database call. A browser refresh performs one hydration request because the server session—not browser storage—remains authoritative.

### 2026-08-04 — Blog collections and request state

Question: how should a blog handle multiple post/database collections, requests, pagination, responses, and React state?

Current proposal: TanStack Query owns remote collection state. Public post feeds use cursor pagination and stable keyset queries; filter and navigation state remains in the URL. API responses use a consistent `items` and `pageInfo` envelope. General React stores are reserved for client-only state, not duplicated server data.

Open architectural concern: if search-engine indexing is a core requirement for public post pages, the rendering strategy needs a separate decision between the current client-rendered Vite application and server rendering or static generation.

### 2026-08-04 — SEO strategy and schema

Provisional conclusion: SEO is a rendering and content-model concern, not merely a head-tag package. Public pages should return meaningful server-rendered HTML with canonical metadata and generated JSON-LD. React Router Framework Mode is the preferred evolutionary path because it supports SSR and selective pre-rendering without introducing a second frontend framework. Public archives need stable crawlable pagination URLs; cursor pagination remains suitable for interactive loading and API state.

### 2026-08-04 — Rendering architecture selected

Decision: keep React and migrate from React Router Declarative Mode to React Router Framework Mode. Dynamic public content will use SSR, while stable routes may be pre-rendered. The migration will be planned separately before implementation.

### 2026-08-04 — Broader implementation roadmap recorded

We identified the remaining architecture areas: framework integration, content storage, editor choice, media, API contracts, server-state boundaries, forms, authorization, publication workflow, testing, and production operations. These items remain provisional until discussed individually. The next recommended decision is the editor and article-body storage format because it shapes the database and rendering model.
