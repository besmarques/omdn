# React Router Framework Package Matrix

Status: verified for Step 1.1 on 2026-08-04. No dependencies were changed during this step.

## 1. Decision

OMDN can adopt React Router 8.3.0 Framework Mode on its current runtime without upgrading Node, React, Vite, or Express.

The migration will use two package slices:

1. Phase 1, Framework SPA Mode: add `@react-router/dev@8.3.0` as a development dependency.
2. Phase 2, custom Express SSR integration: add `@react-router/express@8.3.0` as a runtime dependency.

All first-party React Router packages must use the same exact `8.3.0` version. This avoids adapter/runtime drift and matches the exact `react-router` peer required by `@react-router/express@8.3.0`.

## 2. Verified local runtime

These values come from the current workspace and lockfile:

| Component              | Installed version |
| ---------------------- | ----------------- |
| Node.js                | `24.18.1`         |
| npm                    | `11.16.0`         |
| React                  | `19.2.8`          |
| React DOM              | `19.2.8`          |
| React Router           | `8.3.0`           |
| Vite                   | `8.1.5`           |
| `@vitejs/plugin-react` | `6.0.4`           |
| Express                | `5.2.1`           |

## 3. Compatibility result

Registry metadata for the exact package versions gives this matrix:

| Package                       | Requirement                    | OMDN value | Result     |
| ----------------------------- | ------------------------------ | ---------- | ---------- |
| `react-router@8.3.0`          | Node `>=22.22.0`               | `24.18.1`  | Compatible |
| `react-router@8.3.0`          | React and React DOM `>=19.2.7` | `19.2.8`   | Compatible |
| `@react-router/dev@8.3.0`     | Node `>=22.22.0`               | `24.18.1`  | Compatible |
| `@react-router/dev@8.3.0`     | `react-router ^8.3.0`          | `8.3.0`    | Compatible |
| `@react-router/dev@8.3.0`     | Vite `^7.0.0                   |            | ^8.0.0`    | `8.1.5`   | Compatible |
| `@react-router/express@8.3.0` | Node `>=22.22.0`               | `24.18.1`  | Compatible |
| `@react-router/express@8.3.0` | Express `^4.22.2               |            | ^5`        | `5.2.1`   | Compatible |
| `@react-router/express@8.3.0` | Exactly `react-router 8.3.0`   | `8.3.0`    | Compatible |
| `vite@8.1.5`                  | Node `^20.19.0                 |            | >=22.12.0` | `24.18.1` | Compatible |

React Router officially supports Node 24 while it is Active LTS. The package metadata has the stricter machine-checkable minimum, and the installed runtime satisfies both statements.

## 4. Phase 1 package set

Step 1.2 should make only this installation change:

```bash
npm install --save-dev --save-exact @react-router/dev@8.3.0
```

Existing packages retained:

- `react@19.2.8`
- `react-dom@19.2.8`
- `react-router@8.3.0`
- `vite@8.1.5`
- `@tailwindcss/vite`

`@vitejs/plugin-react` is replaced by the `reactRouter()` Vite plugin during Step 1.3, after the required Framework files exist. It should not be removed in Step 1.2 because the current application must continue building between steps.

The React Router plugin supplies the Framework compilation, route-module transforms, React Refresh, code splitting, and CLI integration. Keeping both React transformation plugins is unnecessary for the standard non-RSC Framework setup.

## 5. Packages not needed in Phase 1

| Package                    | Decision                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@react-router/express`    | Defer until Phase 2 when the Framework request handler is mounted in Express                                        |
| `@react-router/serve`      | Do not install; OMDN intentionally owns its Express server                                                          |
| `@react-router/node`       | Do not install directly unless OMDN imports its APIs; it is already an internal dependency of the selected packages |
| `@react-router/fs-routes`  | Do not install; use explicit route configuration for a controlled incremental migration                             |
| `typescript`               | Do not install; JavaScript is supported and a TypeScript migration is a separate decision                           |
| `@vitejs/plugin-rsc`       | Do not install; React Server Components are optional and experimental, and are outside this architecture            |
| `react-server-dom-webpack` | Do not install; only relevant to the deferred RSC path                                                              |
| `wrangler`                 | Do not install; OMDN is not targeting Cloudflare Workers                                                            |
| `@react-router/serve` peer | Optional and not used with the custom Express server                                                                |

The optional peers reported for `@react-router/dev` are not required for this conventional JavaScript, Vite, Node, non-RSC setup.

## 6. Phase 1 configuration contract

Step 1.3 should introduce:

```text
react-router.config.js
src/root.jsx
src/routes.js
```

The project can keep `src/` as its application directory:

```js
export default {
	appDirectory: 'src',
	ssr: false,
};
```

`ssr: false` without `prerender` is React Router SPA Mode. It preserves the initial client-rendered migration boundary. In this mode:

- A root loader is allowed.
- Child route loaders are not available at runtime.
- Route actions and route `headers` exports are prohibited because no Framework runtime server exists.
- Existing mutations must continue through the Express JSON API.

The Vite configuration becomes conceptually:

```js
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [reactRouter(), tailwindcss()],
	server: {
		proxy: {
			'/api': 'http://127.0.0.1:3000',
		},
	},
});
```

The final Step 1.3 implementation must preserve the existing `@` alias or migrate all affected imports in the same tested change.

Framework CLI commands replace the direct Vite commands for the document application:

```text
react-router dev
react-router build
react-router routes
```

The generated `.react-router/` directory must be ignored by Git.

## 7. Build-output consequence

`react-router build` normally writes browser artifacts under `build/client` and, when SSR is enabled, the request-handler bundle under `build/server`.

With `ssr: false`, OMDN still needs Express production fallback behavior for the client application. Step 1.3 must explicitly choose and test one output contract:

- adopt React Router's default `build/client` path and update Express static/fallback paths, or
- configure a deliberate build directory and still account for the `client` subdirectory.

The recommended choice is the documented default `build/client`. It reduces custom Framework configuration and makes the later Phase 2 server output predictable. The production fallback must serve `build/client/index.html`, and immutable generated assets should be served before the fallback.

This path change belongs to the Framework configuration slice and must be covered by the production build and browser tests.

## 8. Phase 2 Express package set

When SSR integration begins, install:

```bash
npm install --save-exact @react-router/express@8.3.0
```

Do not install `@react-router/serve`. The official Express adapter exports `createRequestHandler`, which accepts the Framework build and an optional `getLoadContext` callback.

The handler must be mounted after `/api` routes and the API 404/error boundary, and it must handle all document HTTP methods required by loaders and actions. `getLoadContext` is the supported bridge for request-scoped services, principal information, request IDs, and later Framework CSRF facilities.

Development with the custom Express server requires Vite middleware mode or the official virtual server-build pattern. That wiring belongs to Phase 2, not the initial SPA conversion. Until then, keep the existing two-process development model: Express on port `3000` and the React Router development server on port `5173` proxying `/api`.

## 9. Testing implications

Step 1.3 must ensure the React Router Vite plugin is not activated in a way that breaks Vitest's existing unit configuration. If Vitest evaluates the shared Vite configuration, use an explicit test-mode condition or a separate Vitest configuration only if the failure is reproduced.

Required checks for the package/configuration slice:

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run test:e2e
npm run smoke:auth
```

The authentication API and CSRF contract must not change during Phase 1.

## 10. Verified official references

- [React Router: Picking a Mode](https://reactrouter.com/start/modes)
- [React Router: Quick Start and bring-your-own server](https://reactrouter.com/tutorials/quickstart)
- [React Router: Framework adoption](https://reactrouter.com/upgrading/router-provider)
- [React Router: Framework routing](https://reactrouter.com/start/framework/routing)
- [React Router: Root route convention](https://reactrouter.com/api/framework-conventions/root.tsx)
- [React Router: SPA Mode and pre-rendering](https://reactrouter.com/how-to/pre-rendering)
- [React Router: Server adapters](https://reactrouter.com/api/other-api/adapter)
- [React Router: CLI](https://reactrouter.com/api/other-api/dev)
- [Vite 8 official plugins](https://v8.vite.dev/plugins/)
- npm registry metadata for exact versions `react-router@8.3.0`, `@react-router/dev@8.3.0`, `@react-router/express@8.3.0`, and `vite@8.1.5`

## 11. Step 1.1 exit result

- Exact package names and versions are known.
- Current Node, React, Vite, and Express versions are compatible.
- Framework SPA Mode does not need the Express adapter yet.
- The custom Express adapter is selected for the later SSR phase.
- The standard React Vite plugin will be replaced during configuration, not during dependency installation.
- Optional RSC, TypeScript, Cloudflare, file-routing, and default-server packages are excluded.
- No dependency or runtime version changed during this verification step.
