# O Melhor do Natal

A full-stack application built with React and Vite on the frontend and Express with MySQL on the backend.

## Stack

### Runtime dependencies

| Package                                              | Purpose                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `react`, `react-dom`, `react-router`                 | Browser UI, rendering, and client-side routing                |
| `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` | Styling, Vite integration, and animations                     |
| `shadcn`, `@base-ui/react`, `lucide-react`           | Accessible UI components and icons                            |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variants and class composition                      |
| `express`                                            | HTTP server, API routing, and production frontend delivery    |
| `express-rate-limit`                                 | Per-IP/account throttling for sensitive authentication routes |
| `mysql2`                                             | Promise-based MySQL connection pool                           |
| `express-session`, `express-mysql-session`           | Server-side sessions stored in MySQL                          |
| `argon2`                                             | Password hashing and verification                             |
| `otplib`                                             | TOTP and one-time-password support                            |
| `qrcode`                                             | QR-code generation support for authenticator setup            |
| `zod`                                                | Authentication request validation                             |
| `dotenv`                                             | Environment-variable loading support                          |

### Development dependencies

| Package                                                 | Purpose                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| `vite`, `@vitejs/plugin-react`                          | Development server and production build       |
| `vitest`, `supertest`                                   | Unit and HTTP route testing                   |
| `eslint`, `@eslint/js`, React ESLint plugins, `globals` | JavaScript and React linting                  |
| `@types/react`, `@types/react-dom`                      | React editor/tooling types                    |
| `dependency-cruiser`                                    | Source dependency analysis and DOT generation |
| `prettier`                                              | Repository formatting and formatting checks   |

Prettier is configured for repository formatting. Graphviz remains an external prerequisite for converting DOT files to SVG.

## Project structure

```text
omdn/
|-- docs/
|   |-- logic/
|   |   |-- account.mmd
|   |   |-- admin.mmd
|   |   |-- api.mmd
|   |   |-- application.mmd
|   |   |-- auth.mmd
|   |   `-- routes.mmd
|   |-- dependency-graph.dot
|   `-- dependency-graph.svg
|-- scripts/
|   `-- dev/generate-logic-map.js
|-- server/
|   |-- database/
|   |   |-- migrations/
|   |   |   |-- 001_create_auth_tables.sql
|   |   |   |-- 002_create_rate_limit_counters.sql
|   |   |   |-- 003_create_auth_event_outbox.sql
|   |   |   `-- 004_simplify_sessions.sql
|   |   `-- seeds/001_seed_roles_permissions.sql
|   |-- dbConnect/createPool.js
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
|   |       |   `-- credentialsRoutes.js
|   |       |-- emailVerification/
|   |       |   |-- resend/
|   |       |   |-- verify/
|   |       |   |-- emailVerificationModule.js
|   |       |   `-- emailVerificationRoutes.js
|   |       |-- passwordRecovery/
|   |       |   |-- forgot/
|   |       |   |-- reset/
|   |       |   |-- passwordRecoveryModule.js
|   |       |   |-- passwordRecoveryRoutes.js
|   |       |   `-- passwordRecovery.test.js
|   |       |-- registration/
|   |       |   |-- register/
|   |       |   |-- registrationModule.js
|   |       |   `-- registrationRoutes.js
|   |       |-- shared/
|   |       |   |-- events/
|   |       |   |-- middleware/
|   |       |   |   `-- authRateLimiters.js and middleware tests
|   |       |   |-- authRepository.js
|   |       |   `-- authSchemas.js
|   |       |-- totp/
|   |       |   |-- disable/
|   |       |   |-- enable/
|   |       |   |-- login/
|   |       |   |-- recoveryCodes/
|   |       |   |-- setup/
|   |       |   |-- shared/
|   |       |   |-- status/
|   |       |   |-- totpModule.js
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
|   |-- router/
|   |   |-- AppRoutes.jsx
|   |   `-- DevRoutes.jsx
|   |-- App.css
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- .dependency-cruiser.cjs
|-- .env.example
|-- .gitignore
|-- .prettierignore
|-- .prettierrc
|-- components.json
|-- eslint.config.js
|-- index.html
|-- jsconfig.json
|-- package-lock.json
|-- package.json
|-- README.md
`-- vite.config.js
```

Generated `node_modules/`, `dist/`, and local environment files are omitted.

### Structure conventions

- `src/` contains the browser application.
- `server/modules/` contains feature-owned composition, routes, controllers, services, schemas, repositories, middleware, and colocated tests.
- Each `*Module.js` file wires its feature dependencies and returns a router.
- Auth is divided into credentials, registration, email-verification, password-recovery, and TOTP submodules; shared schemas, persistence, and middleware live under `auth/shared/`.
- `server/routes/` contains shared/cross-feature routers; `server/middleware/` contains shared middleware.
- `server/expressApp.js` composes the application; `server/server.js` starts the listener.
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

| Command                | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `npm test`             | Runs Vitest once                                            |
| `npm run test:watch`   | Runs Vitest in watch mode                                   |
| `npm run dev`          | Starts Vite                                                 |
| `npm run dev:server`   | Loads `.env.development` and starts Express in watch mode   |
| `npm run build`        | Builds the frontend into `dist/`                            |
| `npm start`            | Builds the frontend through `prestart`, then starts Express |
| `npm run lint`         | Runs ESLint                                                 |
| `npm run preview`      | Previews the production frontend build                      |
| `npm run diagram`      | Generates the DOT dependency graph and SVG                  |
| `npm run logic-map`    | Regenerates Mermaid logic maps under `docs/logic/`          |
| `npm run maps`         | Regenerates dependency and logic maps                       |
| `npm run diagram:all`  | Alias for regenerating both map sets                        |
| `npm run format`       | Formats the repository with Prettier                        |
| `npm run format:check` | Checks formatting without writing files                     |

## Architecture maps

`npm run diagram` analyzes imports under `src/` and `server/`, writes `docs/dependency-graph.dot`, and uses Graphviz `dot` to create the SVG.

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

Authenticated users can change their password through the account module. The flow verifies the current password, updates it transactionally, revokes other sessions, regenerates the current session, and records the outcome in the authentication audit log.

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

The generic `/api` router and JSON 404 handler are mounted last. With `APP_ENV=production`, Express serves `dist/` and provides the SPA fallback.

## Design system

The frontend uses Tailwind CSS, shadcn/ui with Base UI primitives, Lucide icons, and shared class/variant utilities. The development-only design-system page previews components, variations, sizes, and states.

## Deployment

The production entry point is `server/server.js`. `npm start` builds the frontend through `prestart` and then starts Express.

Configure `APP_ENV=production`, a session secret of at least 32 characters, a canonical Base64 32-byte TOTP encryption key, and all MySQL connection values in the hosting platform.
