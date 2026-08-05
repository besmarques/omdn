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
| `@tanstack/react-query`    | `^5.101.4`    | Browser cache for backend-owned account and content data   |
| `@tailwindcss/vite`        | `^4.3.3`      | Tailwind integration for Vite                              |
| `@tiptap/react`            | `^3.29.2`     | React integration for the shared rich-text editor          |
| `@tiptap/starter-kit`      | `^3.29.2`     | Core rich-text editing extensions                          |
| `@tiptap/extension-link`   | `^3.29.2`     | Configurable rich-text link support                        |
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
| `nodemailer`               | `^9.0.4`      | SMTP delivery for transactional account email              |
| `otplib`                   | `^13.4.1`     | TOTP and one-time-password support                         |
| `qrcode`                   | `^1.5.4`      | Authenticator QR-code generation                           |
| `react`                    | `^19.2.7`     | Browser UI library                                         |
| `react-dom`                | `^19.2.7`     | React DOM renderer                                         |
| `react-router`             | `8.3.0`       | Framework and client-side routing                          |
| `sanitize-html`            | `^2.17.6`     | Server-side allowlist sanitization for editor HTML         |
| `shadcn`                   | `^4.16.0`     | UI component tooling                                       |
| `tailwind-merge`           | `^3.6.0`      | Tailwind class conflict resolution                         |
| `tailwindcss`              | `^4.3.3`      | Utility-first CSS framework                                |
| `tw-animate-css`           | `^1.4.0`      | Tailwind animation utilities                               |
| `zod`                      | `^4.4.3`      | Configuration and request validation                       |

### Development dependencies

| Package                       | Version range | Purpose                                                    |
| ----------------------------- | ------------- | ---------------------------------------------------------- |
| `@eslint/js`                  | `^10.0.1`     | ESLint's recommended JavaScript rules                      |
| `@mermaid-js/mermaid-cli`     | `11.16.0`     | Offline rendering of Mermaid request flows to SVG          |
| `@react-router/dev`           | `8.3.0`       | React Router Framework Vite plugin and CLI                 |
| `@types/react`                | `^19.2.17`    | React editor/tooling types                                 |
| `@types/react-dom`            | `^19.2.3`     | React DOM editor/tooling types                             |
| `dbmate`                      | `^2.34.1`     | Plain-SQL MariaDB migration tracking and execution         |
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

## Documentation

- [`juniorDeveloperGuide.md`](docs/juniorDeveloperGuide.md) explains the current
  codebase, request flows, security model, and safe development workflow.
- [`implementationPlan.md`](docs/implementationPlan.md) is the authoritative
  architecture decision, runtime/deployment contract, phase status, and future
  roadmap.
- [`tanstackQueryIntegrationPlan.md`](docs/tanstackQueryIntegrationPlan.md)
  defines the incremental server-state and authentication-cache migration.

Generated SVGs under `docs/diagrams/` visualize the code but are not additional
sources of architecture policy.

## Project structure

```text
omdn/
|-- docs/
|   |-- implementationPlan.md
|   |-- juniorDeveloperGuide.md
|   |-- diagrams/
|   |   |-- dependency/
|   |   |   |-- application.svg
|   |   |   |-- backend.svg
|   |   |   `-- frontend.svg
|   |   `-- runtime/
|   |       |-- overview.svg
|   |       |-- application.svg
|   |       |-- routes.svg
|   |       `-- feature-flow SVGs
|-- scripts/
|   |-- database/run-seeds.js
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
|   |   |   |-- 004_simplify_sessions.sql
|   |   |   |-- 005_add_deleted_user_retention_index.sql
|   |   |   `-- 006_create_content_foundation.sql
|   |   `-- seeds/
|   |       |-- 001_seed_roles_permissions.sql
|   |       `-- 002_seed_example_recipe.sql
|   |-- dbConnect/
|   |   |-- createPool.js
|   |   `-- withConnection.js
|   |-- frontend/createFrontendHandlers.js
|   |-- framework/
|   |   `-- createFrameworkRequestContext.js
|   |-- middleware/
|   |   |-- apiErrorMiddleware.js
|   |   |-- securityHeaders.js
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
- `src/presentation/` contains the safe registries, layouts, and region blocks used to compose data-driven public pages; content-owned templates live under `src/content/`.
- `src/framework/contexts.js` defines shared request-context keys used by the outer Express adapter and server route loaders.
- `server/modules/` contains feature-owned composition, routes, controllers, services, schemas, repositories, middleware, and colocated tests.
- Each `*Module.js` file wires its feature dependencies and returns a router.
- Auth is divided into credentials, registration, email-verification, password-recovery, and TOTP submodules. Each capability owns its persistence repository; only cross-capability session persistence, schemas, events, and middleware live under `auth/shared/`.
- Auth services receive explicit dependency objects. Transactional services obtain one executor through `dbConnect/withConnection.js` and pass it to capability repositories so related queries remain on the same connection.
- `server/routes/` contains shared/cross-feature routers; `server/middleware/` contains shared middleware.
- `server/application/` constructs process-level services and owns worker lifecycle without opening a listener.
- `server/frontend/` serves production assets and mounts the official React Router Express request handler.
- `server/framework/` creates one isolated `RouterContextProvider` per page request. It exposes only approved route services, an immutable principal snapshot, the request ID, and a clock—not the database pool.
- `server/expressApp.js` composes only the HTTP application; `server/server.js` starts the listener and registers shutdown signals.
- Frontend imports use `@/*`; backend imports use `#server/*`.
- Development generators live under `scripts/dev/`; generated maps live under `docs/`.

## Installation and development

```bash
npm install
```

Copy `.env.example` to `.env.development`, provide local values, then start the combined Express and Vite development server:

```bash
npm run dev
```

The Node watcher is limited to server and root framework configuration files;
Vite handles frontend HMR itself. Generated Vite dependency-cache files under
`node_modules` must not trigger backend restarts.

## Available scripts

| Command                          | Description                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| `npm test`                       | Runs Vitest once                                                |
| `npm run test:watch`             | Runs Vitest in watch mode                                       |
| `npm run test:e2e`               | Runs Playwright auth characterization tests                     |
| `npm run test:e2e:headed`        | Runs Playwright with a visible Chromium browser                 |
| `npm run test:ssr`               | Builds production SSR and tests HTTP output and hydration       |
| `npm run dev`                    | Starts Express, Vite middleware, SSR, and the API in watch mode |
| `npm run build`                  | Builds Framework client and server bundles                      |
| `npm start`                      | Builds the frontend through `prestart`, then starts Express     |
| `npm run lint`                   | Runs ESLint                                                     |
| `npm run diagram`                | Generates dependency SVGs under `docs/diagrams/dependency/`     |
| `npm run diagram:validate`       | Checks dependency rules without generating diagrams             |
| `npm run logic-map`              | Generates runtime SVGs under `docs/diagrams/runtime/`           |
| `npm run maps`                   | Regenerates dependency and logic maps                           |
| `npm run diagram:all`            | Alias for regenerating both map sets                            |
| `npm run format`                 | Formats the repository with Prettier                            |
| `npm run format:check`           | Checks formatting without writing files                         |
| `npm run db:migrate:baseline`    | Records verified migrations on a legacy OMDN database           |
| `npm run db:migrate:status`      | Shows applied and pending database migrations                   |
| `npm run db:migrate`             | Creates the configured database if absent, then migrates it     |
| `npm run db:migrate:new -- name` | Creates a timestamped plain-SQL migration                       |
| `npm run db:seed`                | Applies idempotent development/reference seeds                  |

Playwright rebuilds and uses a separate database named by appending
`_playwright` to `DB_NAME`. The configured database user must be allowed to
create and drop that isolated database. Install its local browser once with
`npx playwright install chromium`; CI installs Chromium automatically.
The rebuild applies schema migrations through the same dbmate wrapper used by
development and deployment, then runs the reference-data seed separately.
The test backend and frontend default to ports `3100` and `5174` so they can run
beside normal development servers. `PLAYWRIGHT_BACKEND_PORT` and
`PLAYWRIGHT_FRONTEND_PORT` may override those test-only ports.

`npm run test:ssr` uses the separate `_playwright_ssr` database and starts the
production Express/React Router build on port `3200`. It verifies raw
server-rendered HTML and metadata, CSP nonces, hydration, HTTP `404` behavior,
and preservation of the JSON API boundary.

## Architecture maps

All diagrams intended for reading are SVG files under `docs/diagrams/`. Open
those files in a browser; the DOT and Mermaid generator sources are kept in
each output directory's ignored `source/` subdirectory.

`npm run diagram` generates dependency views directly from source imports while excluding tests,
generated shadcn components, and development-only pages:

- [`application.svg`](docs/diagrams/dependency/application.svg): collapsed application architecture overview.
- [`backend.svg`](docs/diagrams/dependency/backend.svg): collapsed backend domain overview.
- [`frontend.svg`](docs/diagrams/dependency/frontend.svg): file-level frontend dependencies.
- [`post-editor.svg`](docs/diagrams/dependency/post-editor.svg): focused shared post-editor and post-type field composition.

No component list or diagram feed is maintained by hand. Adding, removing, or
rewiring an imported component changes the next generated graph automatically.
`npm run check:all` regenerates every diagram as its final task. Each SVG has a
matching generated DOT source. Use `npm run diagram:validate` for circular,
orphan, resolution, and dependency-policy checks; those checks intentionally scan
the complete source tree independently from the presentation-focused diagrams.

`npm run logic-map` generates rendered runtime and request-flow SVGs. Its
[`overview.svg`](docs/diagrams/runtime/overview.svg) explicitly shows the
boundary that import graphs cannot infer: React calls `src/api/authApi.js`,
which sends HTTP requests to Express `/api/*`, while document requests use the
separate React Router SSR path.
[`navigation.svg`](docs/diagrams/runtime/navigation.svg) shows registration,
email verification, password/TOTP login, permission-based landing pages,
authenticated auth-page redirects, private-route protection, and logout.
Rendering reuses Playwright Chromium; install it once with
`npx playwright install chromium`.
CI regenerates both map sets and rejects stale committed SVGs, so code changes
cannot silently leave the architecture diagrams behind.

## Environment variables

| Variable              | Purpose                                                  | Default                  |
| --------------------- | -------------------------------------------------------- | ------------------------ |
| `PORT`                | Express port                                             | `3000`                   |
| `APP_ENV`             | Runtime mode: `development`, `test`, or `production`     | None                     |
| `DB_HOST`             | MySQL host                                               | None                     |
| `DB_PORT`             | MySQL port                                               | `3306`                   |
| `DB_NAME`             | MySQL database                                           | None                     |
| `DB_USER`             | MySQL user                                               | None                     |
| `DB_PASSWORD`         | MySQL password                                           | None                     |
| `DB_CONNECTION_LIMIT` | Maximum pool connections                                 | `10`                     |
| `SESSION_SECRET`      | Session signing secret containing at least 32 characters | None                     |
| `TOTP_ENCRYPTION_KEY` | Canonical Base64 encoding of exactly 32 bytes            | None                     |
| `PUBLIC_BASE_URL`     | Public origin used to build links in email               | `http://localhost:$PORT` |
| `SMTP_HOST`           | SMTP server hostname; enables email delivery             | Disabled                 |
| `SMTP_PORT`           | SMTP server port                                         | `587`                    |
| `SMTP_SECURE`         | Use implicit TLS from connection start                   | `false`                  |
| `SMTP_USER`           | Optional SMTP username                                   | None                     |
| `SMTP_PASSWORD`       | Optional SMTP password                                   | None                     |
| `SMTP_FROM_EMAIL`     | Verified sender address                                  | None                     |
| `SMTP_FROM_NAME`      | Sender display name                                      | `O Melhor do Natal`      |

Never put secrets in `VITE_*` variables because Vite exposes them to the browser.

The server validates and normalizes all variables once before creating the database pool or HTTP application. Invalid configuration stops startup with field-specific errors that do not include secret values. Set `APP_ENV=production` in production; no separate Node runtime-mode variable is used by the server.

Production requires `PUBLIC_BASE_URL`, `SMTP_HOST`, and `SMTP_FROM_EMAIL`.
Configure `SMTP_USER` and `SMTP_PASSWORD` together when the provider requires
authentication. Port 587 normally uses `SMTP_SECURE=false` and upgrades with
STARTTLS; port 465 normally uses `SMTP_SECURE=true`. In development, leaving
`SMTP_HOST` empty keeps email disabled and prints account-verification tokens
for local testing.

## Database

Dbmate applies these SQL files in numeric order and records completed versions
in MariaDB's `schema_migrations` table:

1. `server/database/migrations/001_create_auth_tables.sql`
2. `server/database/migrations/002_create_rate_limit_counters.sql`
3. `server/database/migrations/003_create_auth_event_outbox.sql`
4. `server/database/migrations/004_simplify_sessions.sql`
5. `server/database/migrations/005_add_deleted_user_retention_index.sql`
6. `server/database/migrations/006_create_content_foundation.sql`

The idempotent seeds remain a separate explicit step:

- `server/database/seeds/001_seed_roles_permissions.sql`
- `server/database/seeds/002_seed_example_recipe.sql`

Apply them to the configured development database with `npm run db:seed`. The
example recipe is published at `/recipes/bolachas-de-gengibre`.

They create and evolve the authentication, authorization, session, token, TOTP,
recovery-code, audit, shared rate-limit, authentication-event outbox, and content
foundation schema.

For a new or deleted database (the wrapper creates the explicitly configured
`DB_NAME` if necessary):

```bash
npm run db:migrate
```

For an existing OMDN database that received migrations 001–005 manually, run
this once before the first managed migration:

```bash
npm run db:migrate:baseline
npm run db:migrate:status
```

The baseline command verifies the existing tables, columns, and retention index
before recording a completed prefix. It does not execute schema changes. The
normal migration command refuses to run against an untracked legacy database,
preventing dbmate from trying to recreate existing tables. Database settings
continue to come from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD`; the wrapper constructs dbmate's MySQL URL without printing it.

Do not run migrations automatically during web-server startup. Deployment runs
one migration process before starting or replacing application instances. Back
up and rehearse production migrations; some historical DDL migrations are
intentionally irreversible and tell the operator to restore a backup instead.

For Hostinger Cloud Startup, run the Node.js application and MySQL database in the same hosting environment with `DB_HOST=localhost`. The website's Hostinger SSL certificate protects public HTTPS traffic; it is separate from MySQL transport configuration. This project does not expose unused MySQL TLS variables. If the database later moves to another server, add provider-supported MySQL TLS configuration as a separate, tested change.

## Authentication and routing

Sessions are stored in MySQL with a six-hour idle timeout. Login creates a
24-hour absolute lifetime by default or 30 days when the user selects “Remember
me”; activity never extends the absolute deadline. The `sessions` table uses the
three columns maintained by `express-mysql-session`: `session_id`, `expires`,
and serialized `data`. Authenticated identity and lifetime metadata are
canonical in valid serialized session JSON. Cookies are HTTP-only, use
`SameSite=Lax`, and become secure in production. Normal login permits multiple
devices.

TOTP setup uses `otplib` and `qrcode`. Secrets are encrypted with AES-256-GCM and user-bound additional authenticated data; recovery codes are supported for second-factor login.

Registration and verification-email resend create single-use tokens, store only
their SHA-256 hashes, commit the database transaction, and then deliver the raw
token in a link through the configured SMTP server. The public link uses
`PUBLIC_BASE_URL`. If delivery fails, the pending account and token remain valid
so the user can request another message. A durable email outbox is still planned
before horizontal scaling so delivery can be retried independently of an HTTP
request.

Password login returns an explicit `authenticationState`. For TOTP-enabled
accounts, `totp_required` keeps the session unauthenticated and the login page
shows an authenticator-or-recovery-code challenge. Private loaders reject that
pending state until `/api/auth/totp/login/verify` succeeds.

Sensitive authentication routes use account/IP-aware rate limits backed by MySQL so counters survive restarts and are shared across server instances. Counter keys are SHA-256 hashed before storage, expired rows are cleaned incrementally, and requests fail closed if the store is unavailable. Registration counts all attempts; password-change limits count failures and exclude successful changes. Authentication outcomes are written to a MySQL outbox before the response is finalized, then delivered to `auth_events` by a shared background worker. Delivery uses transactional row claims, a unique outbox ID for duplicate prevention, stale-claim recovery after five minutes, and exponential retry capped at five minutes. Processed outbox payloads are cleared to avoid retaining duplicate session, IP, user-agent, and metadata values.

Unexpected API failures return a stable JSON response with an `x-correlation-id` response header and matching `correlationId` body field. Valid caller-supplied correlation IDs are preserved; unsafe values are replaced. Internal error details are logged server-side and are not exposed to clients.

Every state-changing `/api` request requires a session-bound CSRF token in the `X-CSRF-Token` header. Clients obtain it from `GET /api/auth/csrf`; the frontend API client fetches, caches, and refreshes it automatically. Browser requests are also checked with Fetch Metadata and Origin/Referer information, including when a development or reverse proxy rewrites the internal host.

Authenticated users can change their password through the account module. The
flow verifies and updates the password transactionally, revokes every session
including the caller, clears its cookie, and records the outcome in the
authentication audit log. TOTP enable/disable and recovery-code regeneration
preserve the current session but revoke all other devices.

Account deletion is initially a soft delete. A background retention worker runs on application startup and then once per day, permanently deleting accounts whose `deleted_at` timestamp is at least one year old. Each transactional batch also removes serialized sessions, pending authentication-event payloads, and delivered authentication events; foreign-key cascades remove the remaining user-owned records.

### Frontend routes

| Route                | Availability     | Purpose                     |
| -------------------- | ---------------- | --------------------------- |
| `/`                  | All environments | Home page                   |
| `/dev/design-system` | Development only | Design-system preview       |
| `*`                  | All environments | Frontend not-found response |

### Backend routes

| Method and route                                | Access                    | Purpose                                                                |
| ----------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `GET /api`                                      | Public                    | API health response                                                    |
| `GET /api/test-items`                           | Public                    | Reads test items from MySQL                                            |
| `GET /api/auth/status`                          | Public                    | Reports session authentication status                                  |
| `GET /api/auth/csrf`                            | Public                    | Issues the session-bound token required by state-changing API requests |
| `GET /api/auth/guest-test`                      | Guests only               | Exercises guest middleware                                             |
| `POST /api/auth/register`                       | Guests only               | Registers a pending subscriber                                         |
| `POST /api/auth/login`                          | Guests only               | Authenticates and creates a session                                    |
| `POST /api/auth/logout`                         | Session-aware             | Destroys the session and clears its cookie                             |
| `POST /api/auth/email/verify`                   | Public                    | Activates an account with a valid token                                |
| `POST /api/auth/email/resend`                   | Guests only               | Replaces an eligible verification token                                |
| `POST /api/auth/password/forgot`                | Guests only               | Creates a reset token without exposing account existence               |
| `POST /api/auth/password/reset`                 | Guests only               | Resets a password with a valid token                                   |
| `GET /api/auth/totp/status`                     | Authenticated             | Reports whether TOTP is enabled                                        |
| `POST /api/auth/totp/setup`                     | Authenticated             | Creates an encrypted pending secret and authenticator QR code          |
| `POST /api/auth/totp/enable`                    | Authenticated             | Verifies setup and enables TOTP                                        |
| `POST /api/auth/totp/recovery-codes/regenerate` | Authenticated             | Replaces recovery codes                                                |
| `POST /api/auth/totp/disable`                   | Authenticated             | Disables TOTP                                                          |
| `POST /api/auth/totp/login/verify`              | Guests with pending login | Completes login using a TOTP or recovery code                          |
| `GET /api/account/me`                           | Authenticated             | Returns the current user, roles, and permissions                       |
| `POST /api/account/password/change`             | Authenticated             | Changes the password, revokes every session, and requires a new login  |
| `GET /api/admin/test`                           | `users.manage` permission | Tests protected admin access                                           |

The generic `/api` router and JSON 404 handler are mounted last within the API pipeline. Express assigns every request a correlation ID and applies baseline security headers globally, while JSON parsing, MariaDB sessions, and CSRF checks are scoped to `/api`. With `APP_ENV=production`, Express serves immutable assets from `build/client` and delegates document requests to the official React Router handler backed by `build/server`. Static and public page requests do not open a session. Authentication documents resolve the session so signed-in users can be redirected away from `/login`, `/register`, and `/verify-email`; private documents resolve it for authorization and presentation. The frontend boundary creates a fresh React Router context for every page request. Production responses use a per-request Content Security Policy nonce, which the security middleware overwrites on an internal request header before the server entry applies it to Framework scripts.

The frontend now builds with React Router Framework SSR. `src/root.jsx` is the sole document shell and owns global CSS, metadata, document language, the favicon, scroll restoration, Framework scripts, and a safe root error boundary. Public, authentication, and private layouts each render the shared `SiteHeader`, so it appears on every normal page without adding an account lookup to public requests; the navigation links to the public `/recipes` archive, and the private layout passes its loader-owned principal to add account/admin links, the signed-in email, and logout. `src/entry.server.jsx` streams the server document. Public, authentication, and private route layouts define session and cache boundaries. Public pages never open a MariaDB session. Authentication pages resolve the principal and redirect signed-in administrators to `/admin` and other users to `/account/security`; pending-TOTP sessions remain on `/login`. Private routes and all these Framework `.data` requests use `private, no-store`. The basic account-security page exposes TOTP QR setup, confirmation, recovery-code management, and disabling without final styling. Every current URL maps to an explicit module in `src/routes/`, including the public recipe detail and numbered archive routes, the development-only design-system route, and the HTTP `404` fallback.

## Design system

The frontend uses three component layers: shadcn/Base UI primitives under
`src/components/ui`, reusable application form components under
`src/components/forms`, and domain components under `src/content`. The shared
post-editor composition is `PostEditor` → `PostEditorFields`, post-type fields,
`SeoEditor`, and `FormFeedback`. `FormField` standardizes labels, descriptions,
controls, and validation feedback; `useAsyncAction` standardizes asynchronous
form state. A recipe supplies `RecipeFields` without moving recipe validation
or serialization into generic components. The development-only design-system
page previews primitives, variations, sizes, and states.

TanStack Query is the browser cache for backend-owned account and content
state. React Router loaders remain responsible for SSR data, redirects, and
route authorization; their account, recipe archive, and recipe detail results
seed stable query keys without an immediate duplicate request. TOTP status is a
private query, sensitive TOTP operations use zero-retention mutations, and a
published recipe invalidates the recipe cache prefix. Public recipe queries do
not contain account state.

The development-only `/dev/page-examples/:example?` route demonstrates the independent page-presentation layers without committing to final styling. `/dev/page-examples/recipe` combines a recipe template, sidebar layout, hero header, related-posts block, and newsletter block. Its content uses a validated, versioned recipe JSON source that round-trips revision data and derives both search text and schema.org `Recipe` structured data. `/dev/page-examples/gift-ideas` combines a gift-ideas template, full-width layout, and minimal header. Database-backed pages will eventually store only validated source data plus allowlisted registry keys and settings—not JSX, import paths, or executable code.

The development-only `/dev/recipe-editor` route proves the shared post
description editor. Tiptap is bundled with the editor route and
uses an OMDN-owned toolbar limited to paragraphs, emphasis, lists, and links.
Saving the proof submits a serialized recipe to a server action, sanitizes the
description with the same allowlist, restores the revision, and renders the
result.

## Deployment

The production entry point is `server/server.js`. `npm start` builds the frontend through `prestart` and then starts Express.

Configure `APP_ENV=production`, `PUBLIC_BASE_URL`, SMTP sender/server values, a
session secret of at least 32 characters, a canonical Base64 32-byte TOTP
encryption key, and all MySQL connection values in the hosting platform.
