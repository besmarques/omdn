# O Melhor do Natal

A full-stack application built with React and Vite on the frontend and Express with MySQL on the backend.

## Stack

### Runtime dependencies

| Package | Purpose |
|---|---|
| `react`, `react-dom`, `react-router` | Browser UI, rendering, and client-side routing |
| `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` | Styling, Vite integration, and animations |
| `shadcn`, `@base-ui/react`, `lucide-react` | Accessible UI components and icons |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variants and class composition |
| `express` | HTTP server, API routing, and production frontend delivery |
| `mysql2` | Promise-based MySQL connection pool |
| `express-session`, `express-mysql-session` | Server-side sessions stored in MySQL |
| `argon2` | Password hashing and verification |
| `otplib` | TOTP and one-time-password support |
| `qrcode` | QR-code generation support for authenticator setup |
| `zod` | Authentication request validation |
| `dotenv` | Environment-variable loading support |

### Development dependencies

| Package | Purpose |
|---|---|
| `vite`, `@vitejs/plugin-react` | Development server and production build |
| `vitest`, `supertest` | Unit and HTTP route testing |
| `eslint`, `@eslint/js`, React ESLint plugins, `globals` | JavaScript and React linting |
| `@types/react`, `@types/react-dom` | React editor/tooling types |
| `dependency-cruiser` | Source dependency analysis and DOT generation |

The repository contains Prettier configuration, but Prettier is not currently declared in `package.json`. Graphviz is an external prerequisite for converting DOT files to SVG.

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
|   |   |-- migrations/001_create_auth_tables.sql
|   |   `-- seeds/001_seed_roles_permissions.sql
|   |-- dbConnect/createPool.js
|   |-- middleware/sessionMiddleware.js
|   |-- modules/
|   |   |-- account/
|   |   |   |-- __tests__/accountRoutes.test.js
|   |   |   |-- controllers/getCurrentAccountController.js
|   |   |   |-- services/getCurrentAccountService.js
|   |   |   |-- accountModule.js
|   |   |   `-- accountRoutes.js
|   |   |-- admin/
|   |   |   |-- __tests__/adminRoutes.test.js
|   |   |   |-- controllers/testAdminAccessController.js
|   |   |   |-- services/testAdminAccessService.js
|   |   |   |-- adminModule.js
|   |   |   `-- adminRoutes.js
|   |   `-- auth/
|   |       |-- __tests__/
|   |       |-- credentials/
|   |       |   |-- controllers/
|   |       |   |-- services/
|   |       |   |-- credentialsModule.js
|   |       |   `-- credentialsRoutes.js
|   |       |-- emailVerification/
|   |       |   |-- controllers/
|   |       |   |-- services/
|   |       |   |-- emailVerificationModule.js
|   |       |   `-- emailVerificationRoutes.js
|   |       |-- middleware/
|   |       |   |-- __tests__/
|   |       |   |-- requireAuth.js
|   |       |   |-- requireGuest.js
|   |       |   `-- requirePermission.js
|   |       |-- passwordRecovery/
|   |       |   |-- controllers/
|   |       |   |-- services/
|   |       |   |-- passwordRecoveryModule.js
|   |       |   `-- passwordRecoveryRoutes.js
|   |       |-- registration/
|   |       |   |-- controllers/
|   |       |   |-- services/
|   |       |   |-- registrationModule.js
|   |       |   `-- registrationRoutes.js
|   |       |-- authModule.js
|   |       |-- authRepository.js
|   |       |-- authRoutes.js
|   |       `-- authSchemas.js
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
- Auth is divided into credentials, registration, email-verification, and password-recovery submodules.
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

| Command | Description |
|---|---|
| `npm test` | Runs Vitest once |
| `npm run test:watch` | Runs Vitest in watch mode |
| `npm run dev` | Starts Vite |
| `npm run dev:server` | Loads `.env.development` and starts Express in watch mode |
| `npm run build` | Builds the frontend into `dist/` |
| `npm start` | Builds the frontend through `prestart`, then starts Express |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Previews the production frontend build |
| `npm run diagram` | Generates the DOT dependency graph and SVG |
| `npm run logic-map` | Regenerates Mermaid logic maps under `docs/logic/` |
| `npm run maps` | Regenerates dependency and logic maps |
| `npm run diagram:all` | Alias for regenerating both map sets |

## Architecture maps

`npm run diagram` analyzes imports under `src/` and `server/`, writes `docs/dependency-graph.dot`, and uses Graphviz `dot` to create the SVG.

`npm run logic-map` recreates `docs/logic/` with Mermaid diagrams for application, routing, API, auth, account, and admin flows.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Express port | `3000` |
| `APP_ENV` | Production proxy/SPA behavior and development token logging | None |
| `NODE_ENV` | Secure session-cookie behavior | None |
| `DB_HOST` | MySQL host | None |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | MySQL database | None |
| `DB_USER` | MySQL user | None |
| `DB_PASSWORD` | MySQL password | None |
| `DB_CONNECTION_LIMIT` | Maximum pool connections | `10` |
| `DB_SSL`, `DB_SSL_CA` | Reserved SSL settings; not currently consumed | None |
| `SESSION_SECRET` | Required session signing secret | None |

Never put secrets in `VITE_*` variables because Vite exposes them to the browser.

> The server consumes `APP_ENV`, but `.env.example` currently lists only `NODE_ENV`. Set both to `production` in production.

## Database

Apply these SQL files in order:

1. `server/database/migrations/001_create_auth_tables.sql`
2. `server/database/seeds/001_seed_roles_permissions.sql`

They create the authentication, authorization, session, token, TOTP, recovery-code, and audit schema, then seed the initial roles and permissions. There is no npm migration command.

## Authentication and routing

Sessions are stored in MySQL for seven days. Cookies are HTTP-only, use `SameSite=Lax`, and become secure in production.

### Frontend routes

| Route | Availability | Purpose |
|---|---|---|
| `/` | All environments | Home page |
| `/dev/design-system` | Development only | Design-system preview |
| `*` | All environments | Frontend not-found response |

### Backend routes

| Method and route | Access | Purpose |
|---|---|---|
| `GET /api` | Public | API health response |
| `GET /api/test-items` | Public | Reads test items from MySQL |
| `GET /api/auth/status` | Public | Reports session authentication status |
| `GET /api/auth/guest-test` | Guests only | Exercises guest middleware |
| `POST /api/auth/register` | Guests only | Registers a pending subscriber |
| `POST /api/auth/login` | Guests only | Authenticates and creates a session |
| `POST /api/auth/logout` | Session-aware | Destroys the session and clears its cookie |
| `POST /api/auth/email/verify` | Public | Activates an account with a valid token |
| `POST /api/auth/email/resend` | Guests only | Replaces an eligible verification token |
| `POST /api/auth/password/forgot` | Guests only | Creates a reset token without exposing account existence |
| `POST /api/auth/password/reset` | Guests only | Resets a password with a valid token |
| `GET /api/account/me` | Authenticated | Returns the current user, roles, and permissions |
| `GET /api/admin/test` | `users.manage` permission | Tests protected admin access |

The generic `/api` router and JSON 404 handler are mounted last. With `APP_ENV=production`, Express serves `dist/` and provides the SPA fallback.

## Design system

The frontend uses Tailwind CSS, shadcn/ui with Base UI primitives, Lucide icons, and shared class/variant utilities. The development-only design-system page previews components, variations, sizes, and states.

## Deployment

The production entry point is `server/server.js`. `npm start` builds the frontend through `prestart` and then starts Express.

Configure `APP_ENV=production`, `NODE_ENV=production`, a strong `SESSION_SECRET`, and all MySQL connection values in the hosting platform.
