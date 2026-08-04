# TanStack Query Integration Plan

Implementation status (2026-08-04): phases 1–6 are complete for the
authentication slice. Phase 7, the first recipe content queries, remains
planned. Full query dehydration is deliberately deferred because private React
Router loader data seeds the critical account query directly.

## 1. Objective

Introduce TanStack Query as OMDN's browser-side store for backend-owned state:

- current account, roles, and permissions;
- recipes, posts, categories, and other content collections;
- paginated administration lists;
- mutations and their cache invalidation;
- loading, error, retry, and refetch behavior.

TanStack Query will not become the authentication authority. The authoritative
chain remains:

```text
HTTP-only session cookie
    → MariaDB session
    → Express authentication and permission middleware
    → React Router loader guards
    → TanStack Query browser cache
```

Do not add Zustand as part of this work. Local UI state remains in React unless
a concrete, complex, client-only state requirement appears later.

## 2. Current problems to solve

The current frontend has several valid pieces but no single browser-side
server-state cache:

- `LoginPage` needs the current account after authentication to select a destination.
- Private React Router loaders receive an authoritative principal for SSR and
  route protection.
- The shared header receives that principal through the private layout.
- Future post and recipe pages will need request deduplication, pagination,
  mutation state, and targeted refetching.

The migration must avoid creating three competing authentication states in
component state, route data, and TanStack Query. Route data remains authoritative
for the current navigation; the query cache becomes the shared browser snapshot.

## 3. Decisions

### 3.1 Package

Install only the React Query package initially:

```bash
npm install @tanstack/react-query
```

Do not install TanStack Router packages. OMDN uses React Router Framework Mode.
Do not install React Query Devtools in the first production slice; evaluate it
later as a development-only dependency.

### 3.2 Query client lifetime

- The browser must keep one `QueryClient` for the lifetime of the hydrated React
  application.
- SSR must never reuse one `QueryClient` across requests or users.
- The first slice will not prefetch arbitrary queries during SSR. React Router
  loaders will continue loading critical SSR and authorization data.
- If full query dehydration is introduced later, create a fresh query client per
  request, serialize only approved successful queries, and clear it after the
  response.

This follows TanStack's SSR requirement that server query caches must not be
shared between requests.

### 3.3 State ownership

| Information                         | Owner                                      |
| ----------------------------------- | ------------------------------------------ |
| Session validity                    | Express and MariaDB                        |
| Authorization                       | Express permission middleware              |
| Navigation protection and redirects | React Router loaders                       |
| Browser server-state cache          | TanStack Query                             |
| URL pagination and filters          | React Router search parameters             |
| Form input                          | Local React state or a future form library |
| Modal/sidebar/editor display state  | Local React state                          |

### 3.4 Public-page caching

Public content routes must remain account-independent and cacheable. The initial
TanStack integration must not add a current-account request to every public page.
The public header remains neutral/guest-oriented until a separate product
decision chooses one of these options:

1. a neutral `Account` link that works for guests and authenticated users;
2. client-side account discovery after hydration, accepting a visual update;
3. personalized public SSR, accepting loss of shared public caching.

That decision is outside this integration.

## 4. Target frontend structure

Create a small server-state layer rather than scattering query keys and request
functions across components:

```text
src/
├── api/
│   └── authApi.js
├── query/
│   ├── createQueryClient.js
│   ├── ServerStateProvider.jsx
│   └── currentAccountQuery.js
├── components/
│   └── SiteHeader.jsx
└── routes/
    ├── auth-layout.jsx
    └── private-layout.jsx
```

As content features appear, place feature-specific query definitions with the
feature instead of creating one large global query file:

```text
src/content/recipes/queries/
├── recipeQuery.js
└── recipeListQuery.js
```

## 5. Query-key policy

Create key factories so invalidation remains predictable:

```js
export const queryKeys = {
  account: {
    current: ['account', 'current'],
  },
  recipes: {
    all: ['recipes'],
    list: (search) => ['recipes', 'list', search],
    detail: (slug) => ['recipes', 'detail', slug],
  },
};
```

Rules:

- Keys must use JSON-compatible values.
- Pagination, search, sort, and filter values that change the response belong in
  the key.
- Never place secrets, session IDs, passwords, TOTP codes, or recovery codes in
  query keys.
- Prefer targeted invalidation over clearing the entire cache.

## 6. Step-by-step implementation

### Phase 1: add the provider without changing behavior

1. Install `@tanstack/react-query` and commit the lockfile.
2. Add `createQueryClient.js` with explicit defaults.
3. Add a provider at the Framework application boundary.
4. Ensure the browser client is stable across renders.
5. Ensure every SSR render gets an isolated client.
6. Add tests proving two server renders cannot share cached account data.
7. Run hydration tests before migrating any request.

Initial defaults should be conservative:

```js
new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

These are starting values, not universal rules. TanStack Query considers cached
queries stale by default and may refetch stale queries when they mount, the
window refocuses, or the network reconnects. OMDN must choose those behaviors
per data type instead of inheriting them accidentally.

### Phase 2: define the current-account query

1. Keep `getCurrentAccount()` as the HTTP adapter.
2. Add `currentAccountQueryOptions()` using the key
   `['account', 'current']`.
3. Normalize the successful API response into one frontend account shape.
4. Normalize HTTP `401` into an unauthenticated result rather than an unhandled
   component error.
5. Do not retry `401`, `403`, or other deterministic authentication failures.
6. Add unit tests for success, unauthenticated state, malformed responses, and
   network failure.

Suggested cached shape:

```js
{
  authenticated: true,
  user: {
    id: 42,
    email: 'user@example.com',
    displayName: 'User'
  },
  roles: ['administrator'],
  permissions: ['users.manage']
}
```

Do not cache raw session data, token material, TOTP secrets, or recovery codes as
part of the current-account query.

### Phase 3: seed the cache from private loader data

1. Keep the private loader's server-side principal check and guest redirect.
2. On the initial private render, seed `['account', 'current']` from the loader
   principal.
3. Record an appropriate `initialDataUpdatedAt` value or use a documented
   `staleTime` so hydration does not immediately issue another `/me` request.
4. Make `SiteHeader` read the current-account query inside the authenticated
   layout.
5. Keep backend authorization independent of the cached permissions.
6. Add a browser assertion that one private navigation does not produce a
   duplicate `/me` request.

The loader and query cache are not competing authorities:

- the loader controls whether the current navigation is allowed;
- the query cache distributes the returned snapshot to browser components;
- later invalidation refreshes that snapshot.

### Phase 4: migrate login

1. Replace the direct post-login `/me` call with
   `queryClient.fetchQuery(currentAccountQueryOptions())`.
2. Use the returned cached account to choose `/admin` or `/account/security`.
3. Ensure simultaneous header/page consumers reuse the same promise and result.
4. Preserve the pending-TOTP state outside the authenticated account cache.
5. After successful TOTP verification, fetch the same current-account query and
   navigate from its permissions.
6. Test password-only, TOTP, recovery-code, subscriber, and administrator login.

Do not store the password, TOTP code, recovery code, or pending challenge in the
query cache.

### Phase 5: migrate logout and session-changing mutations

After successful logout:

```js
queryClient.setQueryData(['account', 'current'], {
  authenticated: false,
});
queryClient.removeQueries({ predicate: isPrivateQuery });
```

Then navigate to `/login` and revalidate the relevant React Router loaders.

For security changes:

- password change/reset: clear the account query because all sessions are
  revoked;
- TOTP enable/disable/recovery-code regeneration: invalidate the account/security
  queries after success;
- account deletion: clear all private query data before navigating away;
- session expiry or an API `401`: centralize the transition to unauthenticated
  state and redirect through React Router.

Do not blindly clear public content queries during logout.

### Phase 6: remove duplicate authentication plumbing

Only after browser coverage passes:

1. Remove component-specific `/me` calls.
2. Remove duplicated account state from pages.
3. Keep route-loader principal data required for SSR and redirects.
4. Keep the backend permission checks.
5. Document the query cache as a snapshot, never as authorization proof.

### Phase 7: introduce content queries

Use the first real recipe list as the content proof:

1. Put page, search, sort, and filters in React Router search parameters.
2. Parse and normalize them before building the query key.
3. Use a list response with items and pagination metadata.
4. Keep the previous page visible when appropriate while the next page loads.
5. Prefetch detail data only when measurement shows a benefit.
6. After create/update/delete/publish mutations, update the exact detail cache
   when safe and invalidate affected list prefixes.
7. Do not copy query results into component state.

Example list key:

```js
['recipes', 'list', {
  page: 2,
  pageSize: 20,
  search: 'cake',
  status: 'published',
  sort: 'publishedAt:desc'
}]
```

## 7. Error and retry policy

- Authentication queries: no automatic retry for `401` or `403`.
- Validation failures: no retry.
- Mutations: no automatic retry unless the operation is explicitly idempotent.
- Public read queries: consider a small retry count for transient network/server
  failures.
- Never show raw backend errors to users.
- Preserve correlation IDs from failed API responses for support and logs.
- Treat background refetch failure differently from initial-page failure when
  stale data is still usable.

## 8. SSR and security requirements

- Never create one module-global server `QueryClient`.
- Never dehydrate secrets or private data into public/cacheable HTML.
- Public pages must not receive account query data.
- Private SSR responses remain `private, no-store`.
- Authentication responses remain `private, no-store`.
- Dehydrated content must be safely serialized by framework-supported APIs; do
  not manually concatenate JSON into script tags.
- Hydration must render the same initial account state on server and client.
- A cached permission controls presentation only. Every protected API endpoint
  must continue enforcing permissions on the backend.

## 9. Testing plan

### Unit tests

- Query-key factories produce stable keys.
- Current-account response normalization handles authenticated and guest states.
- Authentication failures are not retried.
- Logout removes private queries without deleting public content.
- Mutation success invalidates the intended keys only.

### Integration tests

- Query provider creates isolated clients for separate SSR requests.
- Private loader data seeds the cache without an immediate `/me` request.
- Multiple components share one current-account request.
- A `401` transitions the cache to unauthenticated state.
- Login, logout, password changes, and TOTP changes update/invalidate the cache.

### Browser tests

- Subscriber and administrator destinations remain correct.
- Authenticated users cannot remain on authentication pages.
- The header updates after login and logout without a full reload.
- TOTP and recovery-code login populate the same account query.
- Session expiry redirects safely.
- Back/forward navigation does not reveal stale private content.
- Public pages retain account-independent HTML and no session cookie creation.

### Performance checks

- Count `/api/account/me` calls during login and private navigation.
- Confirm concurrent consumers produce one request.
- Confirm pagination does not refetch unrelated lists.
- Measure query-cache size before raising `gcTime` broadly.

## 10. Acceptance criteria

The authentication slice is complete when:

1. TanStack Query is the only browser cache for the current account.
2. MariaDB sessions and Express remain the authentication authority.
3. React Router loaders remain the route-protection authority.
4. Login and TOTP login populate one shared account query.
5. Logout and session revocation remove private cached data.
6. No private SSR data enters public HTML or caches.
7. Initial private rendering does not trigger a duplicate `/me` request.
8. Existing unit, browser, SSR, and real-authentication smoke tests pass.
9. Documentation and diagrams describe the implemented flow.

The content slice is complete when one paginated recipe list and detail page use
stable query keys, URL-owned filters, mutation invalidation, and measured request
deduplication.

## 11. Rollback strategy

Implement each phase as a separate commit. Until duplicate plumbing is removed,
the existing loader principal and direct API functions remain available. If a
phase causes hydration, cache-isolation, or authentication problems:

1. revert that phase;
2. keep server loaders and backend authorization unchanged;
3. clear browser query state on deployment if its shape changed;
4. restore the previous direct `/me` navigation temporarily;
5. fix the integration before migrating content queries.

No database migration is required for TanStack Query itself.

## 12. Official references

- [TanStack Query installation](https://tanstack.com/query/latest/docs/framework/react/installation)
- [Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [Prefetching and router integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [Server rendering and hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [QueryClient reference](https://tanstack.com/query/v5/docs/reference/QueryClient)
