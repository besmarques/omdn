# O Melhor do Natal

A full-stack application built with React and Vite on the frontend and Express with MySQL on the backend.

## System requirements

| Dependency     | Required version                 | Why                                                                                                        |
| -------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Node.js        | `>=22.22.0`                      | Required by the current `react-router` dependency; also supports the server's `--env-file` and watch flags |
| npm            | Version bundled with Node 22.22+ | This repository uses npm and the committed lockfile; do not use pnpm                                       |
| MariaDB        | `>=10.6`                         | InnoDB database option; 10.6 introduced the `SKIP LOCKED` syntax used by the authentication outbox worker  |
| MySQL          | `>=8.0`                          | Supported InnoDB alternative with the JSON and locking features used by the application                    |
| Graphviz       | Maintained version with `dot`    | Optional; required only by `npm run diagram` and `npm run maps`                                            |
| Modern browser | Current evergreen release        | Required for the React/Vite frontend                                                                       |

Use InnoDB with `utf8mb4`. MariaDB versions older than 10.6 and MySQL versions older than 8.0 are not supported by the current schema and queries. See the official [MariaDB 10.6 feature notes](https://mariadb.com/docs/release-notes/community-server/mariadb-10-6-series/what-is-mariadb-106) and [MySQL locking-read documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

On platforms where `argon2` has no compatible prebuilt binary, npm may also require the platform's native C/C++ build toolchain and Python to compile it.

## Stack

### Runtime dependencies

| Package                    | Version range | Purpose                                                    |
| -------------------------- | ------------- | ---------------------------------------------------------- |
| `@base-ui/react`           | `^1.6.0`      | Accessible React UI primitives                             |
| `@tailwindcss/vite`        | `^4.3.3`      | Tailwind integration for Vite                              |
| `argon2`                   | `^0.45.1`     | Password hashing and verification                          |
| `class-variance-authority` | `^0.7.1`      | Component variant definitions                              |
| `clsx`                     | `^2.1.1`      | Conditional class-name composition                         |
| `dotenv`                   | `^17.4.2`     | Environment-variable loading support                       |
| `express`                  | `^5.2.1`      | HTTP server, API routing, and production frontend delivery |
| `express-mysql-session`    | `^3.0.3`      | MySQL/MariaDB-backed Express session store                 |
| `express-rate-limit`       | `^8.6.1`      | Throttling for sensitive authentication routes             |
| `express-session`          | `^1.19.0`     | Server-side session management                             |
| `isbot`                    | `^5`          | User-agent detection required by Framework tooling         |
| `lucide-react`             | `^1.27.0`     | React icon components                                      |
| `mysql2`                   | `^3.23.2`     | Promise-based MySQL/MariaDB connection pool and driver     |
| `otplib`                   | `^13.4.1`     | TOTP and one-time-password support                         |
| `qrcode`                   | `^1.5.4`      | Authenticator QR-code generation                           |
| `react`                    | `^19.2.7`     | Browser UI library                                         |
| `react-dom`                | `^19.2.7`     | React DOM renderer                                         |
| `react-router`             | `8.3.0`       | Framework and client-side routing                          |
| `shadcn`                   | `^4.16.0`     | UI component tooling                                       |
| `tailwind-merge`           | `^3.6.0`      | Tailwind class conflict resolution                         |
| `tailwindcss`              | `^4.3.3`      | Utility-first CSS framework                                |
| `tw-animate-css`           | `^1.4.0`      | Tailwind animation utilities                               |
| `zod`                      | `^4.4.3`      | Configuration and request validation                       |

### Development dependencies

| Package                       | Version range | Purpose                                                    |
| ----------------------------- | ------------- | ---------------------------------------------------------- |
| `@eslint/js`                  | `^10.0.1`     | ESLint's recommended JavaScript rules                      |
| `@react-router/dev`           | `8.3.0`       | React Router Framework Vite plugin and CLI                 |
| `@types/react`                | `^19.2.17`    | React editor/tooling types                                 |
| `@types/react-dom`            | `^19.2.3`     | React DOM editor/tooling types                             |
| `dependency-cruiser`          | `^18.1.0`     | Source dependency analysis and DOT generation              |
| `eslint`                      | `^10.6.0`     | JavaScript and JSX linting                                 |
| `eslint-plugin-react-hooks`   | `^7.1.1`      | React Hooks lint rules                                     |
| `eslint-plugin-react-refresh` | `^0.5.3`      | React Fast Refresh lint rules                              |
| `globals`                     | `^17.7.0`     | Browser, Node.js, and Vitest global definitions for ESLint |
| `prettier`                    | `^3.9.6`      | Repository formatting and formatting checks                |
| `supertest`                   | `^7.2.2`      | HTTP route testing                                         |
| `vite`                        | `^8.1.1`      | Development server and production build                    |
| `vitest`                      | `^4.1.10`     | Unit and integration test runner                           |

The ranges above mirror `package.json`. `package-lock.json` is the authoritative record of the exact resolved dependency tree; use `npm ci` for reproducible installs and commit lockfile changes with dependency updates.

## Project structure

```text
omdn/
|-- docs/
|   |-- adr/
|   |-- firstDraft.md
|   |-- frameworkPackageMatrix.md
|   |-- implementationPlan.md
|   |-- juniorDeveloperGuide.md
|   |-- logic/
|   |   |-- account.mmd
|   |   |-- admin.mmd
|   |   |-- api.mmd
|   |   |-- application.mmd
|   |   |-- auth.mmd
|   |   `-- routes.mmd
|   |-- pingPong.md
|   |-- runtimeInventory.md
|   |-- stepByStepImplementation.md
|   |-- dependency-graph.dot
|   `-- dependency-graph.svg
|-- scripts/
|   `-- dev/generate-logic-map.js
|-- public/favicon.svg
|-- server/
|   |-- application/
|   |   |-- createApplication.js
|   |   |-- createApplicationServices.js
|   |   `-- createWorkerLifecycle.js
|   |-- database/
|   |   |-- migrations/
|   |   |   |-- 001_create_auth_tables.sql
|   |   |   |-- 002_create_rate_limit_counters.sql
|   |   |   |-- 003_create_auth_event_outbox.sql
|   |   |   `-- 004_simplify_sessions.sql
|   |   `-- seeds/001_seed_roles_permissions.sql
|   |-- dbConnect/
|   |   |-- createPool.js
|   |   `-- withConnection.js
|   |-- middleware/
|   |   |-- apiErrorMiddleware.js
|   |   `-- sessionMiddleware.js
|   |-- modules/
|   |   |-- account/
|   |   |   |-- getCurrent/
|   |   |   |   |-- getCurrentAccountController.js
|   |   |   |   `-- getCurrentAccountService.js
|   |   |   |-- changePassword/
|   |   |   |   |-- changePasswordController.js
|   |   |   |   |-- changePasswordService.js
|   |   |   |   `-- changePassword.test.js
|   |   |   |-- accountModule.js
|   |   |   |-- accountRoutes.js
|   |   |   `-- accountRoutes.test.js
|   |   |-- admin/
|   |   |   |-- testAccess/
|   |   |   |   |-- testAdminAccessController.js
|   |   |   |   `-- testAdminAccessService.js
|   |   |   |-- adminModule.js
|   |   |   |-- adminRoutes.js
|   |   |   `-- adminRoutes.test.js
|   |   `-- auth/
|   |       |-- credentials/
|   |       |   |-- login/
|   |       |   |-- logout/
|   |       |   |-- credentialsModule.js
|   |       |   |-- credentialsRepository.js
|   |       |   `-- credentialsRoutes.js
|   |       |-- emailVerification/
|   |       |   |-- resend/
|   |       |   |-- verify/
|   |       |   |-- emailVerificationModule.js
|   |       |   |-- emailVerificationRepository.js
|   |       |   `-- emailVerificationRoutes.js
|   |       |-- passwordRecovery/
|   |       |   |-- forgot/
|   |       |   |-- reset/
|   |       |   |-- passwordRecoveryModule.js
|   |       |   |-- passwordRecoveryRepository.js
|   |       |   |-- passwordRecoveryRoutes.js
|   |       |   `-- passwordRecovery.test.js
|   |       |-- registration/
|   |       |   |-- register/
|   |       |   |-- registrationModule.js
|   |       |   |-- registrationRepository.js
|   |       |   `-- registrationRoutes.js
|   |       |-- shared/
|   |       |   |-- events/
|   |       |   |-- middleware/
|   |       |   |   `-- authRateLimiters.js and middleware tests
|   |       |   |-- authSchemas.js
|   |       |   `-- sessionRepository.js
|   |       |-- totp/
|   |       |   |-- disable/
|   |       |   |-- enable/
|   |       |   |-- login/
|   |       |   |-- recoveryCodes/
|   |       |   |-- setup/
|   |       |   |-- shared/
|   |       |   |-- status/
|   |       |   |-- totpModule.js
|   |       |   |-- totpRepository.js
|   |       |   `-- totpRoutes.js
|   |       |-- authModule.js
|   |       |-- authRoutes.js
|   |       `-- authRoutes.test.js
|   |-- routes/apiRoutes.js
|   |-- expressApp.js
|   `-- server.js
|-- src/
|   |-- components/ui/button.jsx
|   |-- lib/utils.js
|   |-- pages/
|   |   |-- dev/DesignSystemPage.jsx
|   |   `-- HomePage.jsx
|   |-- index.css
|   |-- root.jsx
|   |-- routes.js
|   `-- routes/
|       |-- admin.jsx
|       |-- design-system.jsx
|       |-- home.jsx
|       |-- login.jsx
|       |-- not-found.jsx
|       |-- register.jsx
|       `-- verify-email.jsx
|-- .dependency-cruiser.cjs
|-- .env.example
|-- .gitignore
|-- .prettierignore
|-- .prettierrc
|-- components.json
|-- eslint.config.js
|-- jsconfig.json
|-- package-lock.json
|-- package.json
|-- react-router.config.js
|-- README.md
`-- vite.config.js
```

Generated `node_modules/`, `build/`, legacy `dist/`, and local environment files are omitted.

### Structure conventions

- `src/` contains the browser application.
- `server/modules/` contains feature-owned composition, routes, controllers, services, schemas, repositories, middleware, and colocated tests.
- Each `*Module.js` file wires its feature dependencies and returns a router.
- Auth is divided into credentials, registration, email-verification, password-recovery, and TOTP submodules. Each capability owns its persistence repository; only cross-capability session persistence, schemas, events, and middleware live under `auth/shared/`.
- Auth services receive explicit dependency objects. Transactional services obtain one executor through `dbConnect/withConnection.js` and pass it to capability repositories so related queries remain on the same connection.
- `server/routes/` contains shared/cross-feature routers; `server/middleware/` contains shared middleware.
- `server/application/` constructs process-level services and owns worker lifecycle without opening a listener.
- `server/expressApp.js` composes only the HTTP application; `server/server.js` starts the listener and registers shutdown signals.
- Frontend imports use `@/*`; backend imports use `#server/*`.
- Development generators live under `scripts/dev/`; generated maps live under `docs/`.

## Installation and development

```bash
npm install
```

Copy `.env.example` to `.env.development`, provide local values, then run the frontend and backend in separate terminals:

```bash
npm run dev
npm run dev:server
```

## Available scripts

| Command                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `npm test`                 | Runs Vitest once                                            |
| `npm run test:watch`       | Runs Vitest in watch mode                                   |
| `npm run test:e2e`         | Runs Playwright auth characterization tests                 |
| `npm run test:e2e:headed`  | Runs Playwright with a visible Chromium browser             |
| `npm run dev`              | Starts React Router Framework development mode              |
| `npm run dev:server`       | Loads `.env.development` and starts Express in watch mode   |
| `npm run build`            | Builds the Framework SPA into `build/client`                |
| `npm start`                | Builds the frontend through `prestart`, then starts Express |
| `npm run lint`             | Runs ESLint                                                 |
| `npm run preview`          | Previews the production frontend build                      |
| `npm run diagram`          | Generates focused dependency graphs under `docs/`           |
| `npm run diagram:validate` | Checks dependency rules without generating diagrams         |
| `npm run logic-map`        | Regenerates Mermaid logic maps under `docs/logic/`          |
| `npm run maps`             | Regenerates dependency and logic maps                       |
| `npm run diagram:all`      | Alias for regenerating both map sets                        |
| `npm run format`           | Formats the repository with Prettier                        |
| `npm run format:check`     | Checks formatting without writing files                     |

Playwright rebuilds and uses a separate database named by appending
`_playwright` to `DB_NAME`. The configured database user must be allowed to
create and drop that isolated database. Install its local browser once with
`npx playwright install chromium`; CI installs Chromium automatically.
The test backend and frontend default to ports `3100` and `5174` so they can run
beside normal development servers. `PLAYWRIGHT_BACKEND_PORT` and
`PLAYWRIGHT_FRONTEND_PORT` may override those test-only ports.

## Architecture maps

`npm run diagram` generates three views while excluding tests, generated shadcn
components, and development-only pages:

- `docs/dependency-graph.svg`: collapsed application architecture overview.
- `docs/dependency-server.svg`: collapsed backend domain overview.
- `docs/dependency-frontend.svg`: file-level frontend core dependencies.

Each SVG has a matching DOT source. Use `npm run diagram:validate` for circular,
orphan, resolution, and dependency-policy checks; those checks intentionally scan
the complete source tree independently from the presentation-focused diagrams.

`npm run logic-map` recreates `docs/logic/` with Mermaid diagrams for application, routing, API, auth, account, and admin flows.

## Environment variables

| Variable              | Purpose                                                  | Default |
| --------------------- | -------------------------------------------------------- | ------- |
| `PORT`                | Express port                                             | `3000`  |
| `APP_ENV`             | Runtime mode: `development`, `test`, or `production`     | None    |
| `DB_HOST`             | MySQL host                                               | None    |
| `DB_PORT`             | MySQL port                                               | `3306`  |
| `DB_NAME`             | MySQL database                                           | None    |
| `DB_USER`             | MySQL user                                               | None    |
| `DB_PASSWORD`         | MySQL password                                           | None    |
| `DB_CONNECTION_LIMIT` | Maximum pool connections                                 | `10`    |
| `SESSION_SECRET`      | Session signing secret containing at least 32 characters | None    |
| `TOTP_ENCRYPTION_KEY` | Canonical Base64 encoding of exactly 32 bytes            | None    |

Never put secrets in `VITE_*` variables because Vite exposes them to the browser.

The server validates and normalizes all variables once before creating the database pool or HTTP application. Invalid configuration stops startup with field-specific errors that do not include secret values. Set `APP_ENV=production` in production; no separate Node runtime-mode variable is used by the server.

## Database

Apply these SQL files in order:

1. `server/database/migrations/001_create_auth_tables.sql`
2. `server/database/migrations/002_create_rate_limit_counters.sql`
3. `server/database/migrations/003_create_auth_event_outbox.sql`
4. `server/database/migrations/004_simplify_sessions.sql`
5. `server/database/seeds/001_seed_roles_permissions.sql`

They create and evolve the authentication, authorization, session, token, TOTP, recovery-code, audit, shared rate-limit, and authentication-event outbox schema, then seed the initial roles and permissions. There is no npm migration command.

For Hostinger Cloud Startup, run the Node.js application and MySQL database in the same hosting environment with `DB_HOST=localhost`. The website's Hostinger SSL certificate protects public HTTPS traffic; it is separate from MySQL transport configuration. This project does not expose unused MySQL TLS variables. If the database later moves to another server, add provider-supported MySQL TLS configuration as a separate, tested change.

## Authentication and routing

Sessions are stored in MySQL for seven days. The `sessions` table uses the three columns maintained by `express-mysql-session`: `session_id`, `expires`, and serialized `data`. Authenticated identity is canonical in valid serialized `data.userId`; session revocation queries do not depend on duplicate metadata columns. Cookies are HTTP-only, use `SameSite=Lax`, and become secure in production.

TOTP setup uses `otplib` and `qrcode`. Secrets are encrypted with AES-256-GCM and user-bound additional authenticated data; recovery codes are supported for second-factor login.

Sensitive authentication routes use account/IP-aware rate limits backed by MySQL so counters survive restarts and are shared across server instances. Counter keys are SHA-256 hashed before storage, expired rows are cleaned incrementally, and requests fail closed if the store is unavailable. Registration counts all attempts; password-change limits count failures and exclude successful changes. Authentication outcomes are written to a MySQL outbox before the response is finalized, then delivered to `auth_events` by a shared background worker. Delivery uses transactional row claims, a unique outbox ID for duplicate prevention, stale-claim recovery after five minutes, and exponential retry capped at five minutes. Processed outbox payloads are cleared to avoid retaining duplicate session, IP, user-agent, and metadata values.

Unexpected API failures return a stable JSON response with an `x-correlation-id` response header and matching `correlationId` body field. Valid caller-supplied correlation IDs are preserved; unsafe values are replaced. Internal error details are logged server-side and are not exposed to clients.

Every state-changing `/api` request requires a session-bound CSRF token in the `X-CSRF-Token` header. Clients obtain it from `GET /api/auth/csrf`; the frontend API client fetches, caches, and refreshes it automatically. Browser requests are also checked with Fetch Metadata and Origin/Referer information, including when a development or reverse proxy rewrites the internal host.

Authenticated users can change their password through the account module. The flow verifies the current password, updates it transactionally, revokes other sessions, regenerates the current session, and records the outcome in the authentication audit log.

Account deletion is initially a soft delete. A background retention worker runs on application startup and then once per day, permanently deleting accounts whose `deleted_at` timestamp is at least one year old. Each transactional batch also removes serialized sessions, pending authentication-event payloads, and delivered authentication events; foreign-key cascades remove the remaining user-owned records.

### Frontend routes

| Route                | Availability     | Purpose                     |
| -------------------- | ---------------- | --------------------------- |
| `/`                  | All environments | Home page                   |
| `/dev/design-system` | Development only | Design-system preview       |
| `*`                  | All environments | Frontend not-found response |

### Backend routes

| Method and route                                | Access                    | Purpose                                                                           |
| ----------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `GET /api`                                      | Public                    | API health response                                                               |
| `GET /api/test-items`                           | Public                    | Reads test items from MySQL                                                       |
| `GET /api/auth/status`                          | Public                    | Reports session authentication status                                             |
| `GET /api/auth/csrf`                            | Public                    | Issues the session-bound token required by state-changing API requests            |
| `GET /api/auth/guest-test`                      | Guests only               | Exercises guest middleware                                                        |
| `POST /api/auth/register`                       | Guests only               | Registers a pending subscriber                                                    |
| `POST /api/auth/login`                          | Guests only               | Authenticates and creates a session                                               |
| `POST /api/auth/logout`                         | Session-aware             | Destroys the session and clears its cookie                                        |
| `POST /api/auth/email/verify`                   | Public                    | Activates an account with a valid token                                           |
| `POST /api/auth/email/resend`                   | Guests only               | Replaces an eligible verification token                                           |
| `POST /api/auth/password/forgot`                | Guests only               | Creates a reset token without exposing account existence                          |
| `POST /api/auth/password/reset`                 | Guests only               | Resets a password with a valid token                                              |
| `GET /api/auth/totp/status`                     | Authenticated             | Reports whether TOTP is enabled                                                   |
| `POST /api/auth/totp/setup`                     | Authenticated             | Creates an encrypted pending secret and authenticator QR code                     |
| `POST /api/auth/totp/enable`                    | Authenticated             | Verifies setup and enables TOTP                                                   |
| `POST /api/auth/totp/recovery-codes/regenerate` | Authenticated             | Replaces recovery codes                                                           |
| `POST /api/auth/totp/disable`                   | Authenticated             | Disables TOTP                                                                     |
| `POST /api/auth/totp/login/verify`              | Guests with pending login | Completes login using a TOTP or recovery code                                     |
| `GET /api/account/me`                           | Authenticated             | Returns the current user, roles, and permissions                                  |
| `POST /api/account/password/change`             | Authenticated             | Changes the password, revokes other sessions, and regenerates the current session |
| `GET /api/admin/test`                           | `users.manage` permission | Tests protected admin access                                                      |

The generic `/api` router and JSON 404 handler are mounted last. With `APP_ENV=production`, Express serves immutable assets and the SPA fallback from `build/client`.

The frontend now builds in React Router Framework SPA Mode with `ssr: false`. `src/root.jsx` is the sole document shell and owns global CSS, metadata, document language, the favicon, scroll restoration, and Framework scripts. Every current URL maps to an explicit module in `src/routes/`, including the development-only design-system route and the not-found fallback. The old declarative SPA router and its compatibility adapter have been removed.

## Design system

The frontend uses Tailwind CSS, shadcn/ui with Base UI primitives, Lucide icons, and shared class/variant utilities. The development-only design-system page previews components, variations, sizes, and states.

## Deployment

The production entry point is `server/server.js`. `npm start` builds the frontend through `prestart` and then starts Express.

Configure `APP_ENV=production`, a session secret of at least 32 characters, a canonical Base64 32-byte TOTP encryption key, and all MySQL connection values in the hosting platform.
