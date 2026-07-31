# O Melhor do Natal

A full-stack version of **O Melhor do Natal**, built with React and Vite on the frontend and Express with MySQL on the backend.

## Stack

### Frontend

| Technology / package | Purpose |
|---|---|
| React and React DOM | User interface and browser rendering |
| Vite and `@vitejs/plugin-react` | Development server and production build |
| React Router | Client-side routing |
| Tailwind CSS and `@tailwindcss/vite` | Utility-first styling and Vite integration |
| shadcn/ui and Base UI | Reusable, accessible UI components |
| Lucide React | Icons |
| Class Variance Authority, `clsx`, and `tailwind-merge` | Component variants and class composition |
| `tw-animate-css` | Tailwind animation utilities |

### Backend

| Technology / package | Purpose |
|---|---|
| Node.js and Express | HTTP server, API routes, and production frontend delivery |
| MySQL2 | Promise-based MySQL connection pool |
| Express Session | Server-side session middleware |
| Express MySQL Session | MySQL-backed session storage |
| Argon2 | Password hashing support |
| Zod | Request and data validation support |
| dotenv | Environment variable loading support |

### Development tools

| Technology / package | Purpose |
|---|---|
| ESLint | JavaScript and React linting |
| Prettier configuration | Formatting rules used by compatible editors and tools |
| Dependency Cruiser | Source dependency analysis and DOT graph generation |
| Graphviz | Converts the generated DOT graph to SVG |

## Project structure

```text
omdn/
|-- docs/
|   |-- dependency-graph.dot
|   `-- dependency-graph.svg
|-- .dependency-cruiser.cjs
|-- server/
|   |-- database/
|   |   |-- migrations/
|   |   |   `-- 001_create_auth_tables.sql
|   |   `-- seeds/
|   |       `-- 001_seed_roles_permissions.sql
|   |-- dbConnect/
|   |   `-- createPool.js
|   |-- middleware/
|   |   |-- auth/
|   |   |   |-- requireAuth.js
|   |   |   |-- requireGuest.js
|   |   |   `-- requirePermission.js
|   |   `-- sessionMiddleware.js
|   |-- routes/
|   |   |-- accountRoutes.js
|   |   |-- adminRoutes.js
|   |   |-- apiRoutes.js
|   |   `-- authRoutes.js
|   `-- server.js
|-- src/
|   |-- components/
|   |   `-- ui/
|   |       `-- button.jsx
|   |-- lib/
|   |   `-- utils.js
|   |-- pages/
|   |   |-- dev/
|   |   |   `-- DesignSystemPage.jsx
|   |   `-- HomePage.jsx
|   |-- router/
|   |   |-- AppRoutes.jsx
|   |   `-- DevRoutes.jsx
|   |-- App.css
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
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

Generated directories such as `node_modules/` and `dist/`, along with local `.env.development` and `.env.production` files, are intentionally omitted from the source tree above.

### Structure conventions

- `src/` contains browser-side application code.
- `src/pages/` contains route-level screens.
- `src/components/ui/` contains reusable UI primitives.
- `src/router/` contains frontend route definitions.
- `server/routes/` contains Express routers grouped by API area.
- `server/middleware/` contains session, authentication, and authorization middleware.
- `server/dbConnect/` contains database connection setup.
- `server/database/migrations/` and `server/database/seeds/` contain ordered SQL files.
- Frontend imports use the `@/*` alias for `src/*`.
- Backend imports use the `#server/*` package import alias for `server/*.js`.
- `.dependency-cruiser.cjs` defines dependency validation rules and graph styling; `docs/` contains its generated graph artifacts.

## Installation

```bash
npm install
```

Copy `.env.example` to `.env.development` and fill in the local values before starting the backend.

## Development

Start the Vite frontend:

```bash
npm run dev
```

Start the Express backend in a second terminal:

```bash
npm run dev:server
```

The backend command loads `.env.development` and restarts when server files change.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server |
| `npm run dev:server` | Loads `.env.development` and starts Express in watch mode |
| `npm run build` | Creates the production frontend in `dist/` |
| `npm start` | Runs `prestart`, builds the frontend, and starts Express |
| `npm run lint` | Runs ESLint across the project |
| `npm run preview` | Previews the Vite production build |
| `npm run diagram` | Analyzes `src/` and `server/`, then regenerates the DOT and SVG dependency graphs |

## Dependency graph

Run:

```bash
npm run diagram
```

This uses Dependency Cruiser to analyze imports under `src/` and `server/`, writes `docs/dependency-graph.dot`, and invokes Graphviz `dot` to create `docs/dependency-graph.svg`. Graphviz must be installed and its `dot` executable must be available on `PATH`.

## Environment variables

| Variable | Purpose | Code default |
|---|---|---|
| `PORT` | Express HTTP port | `3000` |
| `APP_ENV` | Enables production proxy trust and SPA fallback when set to `production` | None |
| `NODE_ENV` | Enables secure session cookies when set to `production` | None |
| `DB_HOST` | MySQL host | None |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | MySQL database | None |
| `DB_USER` | MySQL user | None |
| `DB_PASSWORD` | MySQL password | None |
| `DB_CONNECTION_LIMIT` | Maximum MySQL pool connections | `10` |
| `DB_SSL` | Reserved database SSL setting; not currently consumed | None |
| `DB_SSL_CA` | Reserved database CA setting; not currently consumed | None |
| `SESSION_SECRET` | Required secret used to sign session cookies | None |

Local environment files must not be committed. `.env.example` documents variable names without secret values. Variables prefixed with `VITE_` are exposed to the browser bundle and must not contain secrets.

> `server/server.js` checks `APP_ENV`, while `.env.example` currently lists `NODE_ENV`. Set both to `production` in production unless the runtime configuration is consolidated later.

## Database

Run the migration before the seed:

1. `server/database/migrations/001_create_auth_tables.sql`
2. `server/database/seeds/001_seed_roles_permissions.sql`

The migration creates users, external authentication identities, roles, permissions, role assignments, sessions, verification and reset tokens, TOTP settings, recovery codes, and authentication audit events.

Registration validates names, normalized email addresses, and passwords of 15-128 characters. Passwords are hashed with Argon2id, verification tokens are stored as SHA-256 hashes for 24 hours, and development mode logs the raw token until email delivery is connected. Verification activates pending users and invalidates their unused verification tokens. Resending replaces any unused token with a new 24-hour token while returning a neutral response that does not reveal whether an account exists.

The seed creates the built-in `administrator`, `editor`, `author`, `contributor`, and `subscriber` roles, then assigns their initial permissions. SQL execution remains explicit; the project does not currently provide an npm migration command.

## Sessions and authorization

Sessions are stored in MySQL for seven days using the `sessions` table. Cookies are HTTP-only, use `SameSite=Lax`, and become secure when `NODE_ENV=production`.

The middleware is layered as follows:

- `sessionMiddleware.js` configures the MySQL session store and cookie.
- `requireGuest.js` rejects requests from authenticated users.
- `requireAuth.js` loads the active user, roles, and permissions into `req.auth`.
- `requirePermission.js` checks a required permission from `req.auth.permissions`.

## Routing

### Frontend routes

| Route | Availability | Purpose |
|---|---|---|
| `/` | All environments | Home page |
| `/dev/design-system` | Vite development only | Design-system preview |
| `*` | All environments | Frontend not-found response |

### Backend routes

| Method and route | Access | Purpose |
|---|---|---|
| `POST /api/auth/register` | Guests only | Validates registration, creates a pending subscriber, and stores a verification token |
| `GET /api` | Public | API health response |
| `GET /api/test-items` | Public | Reads test items from MySQL |
| `POST /api/auth/email/verify` | Public | Activates a pending account using a valid verification token |
| `POST /api/auth/email/resend` | Guests only | Replaces the verification token for an eligible pending account |
| `GET /api/auth/status` | Public | Reports whether the session is authenticated |
| `GET /api/auth/guest-test` | Guests only | Tests guest-only middleware |
| `GET /api/account/me` | Authenticated users | Returns the current user, roles, and permissions |
| `GET /api/admin/test` | Authenticated users with `users.manage` | Tests permission-protected access |

Unknown routes under the general `/api` router return a JSON 404. In production, Express serves `dist/` and returns `dist/index.html` for client-side routes when `APP_ENV=production`.

## Design system

The UI uses Tailwind CSS, shadcn/ui with Base UI primitives, Lucide icons, and shared variant/class utilities. The development-only design-system page previews component variations, sizes, states, and usage examples.

### Color palette

| Name | Hex | OKLCH |
|---|---|---|
| Intense Cherry | `#c43a47` | `oklch(0.5553 0.1739 19.78)` |
| Wine Plum | `#843145` | `oklch(0.437 0.1151 8.38)` |
| Dark Slate Grey | `#204e4a` | `oklch(0.3906 0.0508 187.67)` |
| Pine Blue | `#3e6c67` | `oklch(0.4967 0.0514 186.79)` |
| Ocean Blue | `#3a8bc1` | `oklch(0.6111 0.1133 241.37)` |
| Baltic Blue | `#216182` | `oklch(0.4677 0.083 235.24)` |
| Dark Goldenrod | `#a28100` | `oklch(0.617 0.1261 90.65)` |
| Golden Bronze | `#cca300` | `oklch(0.732 0.1496 90.57)` |
| Pearl Beige | `#e7d6ba` | `oklch(0.8827 0.0418 80.3)` |
| Dust Grey | `#e2ddd5` | `oklch(0.8993 0.0121 79.78)` |

## Deployment

The intended production entry point is:

```text
server/server.js
```

`npm start` first runs `npm run build` through `prestart`, then starts Express. If the hosting platform invokes `server/server.js` directly, build the frontend separately first.

Configure production environment variables in the hosting platform. Set `APP_ENV=production` for proxy trust and SPA routing, and `NODE_ENV=production` for secure session cookies.