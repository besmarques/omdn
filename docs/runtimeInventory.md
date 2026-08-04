# OMDN Runtime Inventory

Recorded on 2026-08-04 for Phase 0, Step 0.2. No runtime or dependency
versions were changed while producing this inventory.

## Verification status

- **Verified locally** means observed from the development machine, lockfile, or
  application configuration.
- **Repository contract** means the behavior is defined by tracked code or
  documentation but has not been checked in the hosting control panel.
- **Unverified production value** must be confirmed on the deployed Hostinger
  environment before the first production release.

## Runtime matrix

| Component        | Development / lockfile               | Production                                    | Status                                                             |
| ---------------- | ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------ |
| Operating system | Ubuntu 26.04 LTS, x86_64, glibc 2.43 | Hostinger Cloud Startup image/version unknown | Local verified; production unverified                              |
| Node.js          | 24.18.1                              | Unknown; must satisfy `>=22.22.0`             | Local verified; production unverified                              |
| npm              | 11.16.0                              | Unknown; must satisfy `>=10`                  | Local verified; production unverified                              |
| React            | 19.2.8                               | Built from the same lockfile                  | Lockfile verified                                                  |
| React DOM        | 19.2.8                               | Built from the same lockfile                  | Lockfile verified                                                  |
| React Router     | 8.3.0                                | Built from the same lockfile                  | Lockfile verified                                                  |
| Vite             | 8.1.5                                | Build-time dependency                         | Lockfile verified                                                  |
| Express          | 5.2.1                                | Loaded by the Node process                    | Lockfile verified                                                  |
| mysql2           | 3.23.2                               | Loaded by the Node process                    | Lockfile verified                                                  |
| MariaDB server   | 11.8.8 (`11.8.8-MariaDB-ubu2404`)    | Unknown                                       | Development verified by the auth smoke test; production unverified |
| MariaDB CLI      | 11.8.6, protocol client 15.2         | Not required by the application               | Local verified                                                     |

The version requirements come from `package.json`. Exact JavaScript package
versions come from the installed dependency tree backed by `package-lock.json`.

Reproduce the JavaScript inventory with:

```bash
node --version
npm --version
npm ls react react-dom react-router vite express mysql2 --depth=0
```

## Process and deployment contract

### Development

- Development command: `npm run dev` starts `server/developmentServer.js` with
  `.env.development` and Node watch mode. Express owns the listener and Vite
  runs in middleware mode for SSR, assets, and HMR.
- `server/application/createApplication.js` constructs shared services and the
  Express application without opening a listener; only `server/server.js`
  starts listening and owns process signals.
- `server/framework/createFrameworkRequestContext.js` creates a fresh React
  Router context for each page request using public React Router 8.3 APIs. The
  official Express adapter passes it to loaders and actions through
  `getLoadContext`.
- Page, asset, and `/api` requests share the Express origin. No development API
  proxy or second server is required.
- Express listens on `PORT` (normally `3000`).
- The development database is MariaDB at `127.0.0.1:3306`, database `omdn`.

### Production

- Repository start command: `npm start`.
- `prestart` runs `npm run build`; `start` then runs `node server/server.js`.
- With `APP_ENV=production`, Express serves the Framework `build/client`
  directory and delegates document requests to the React Router server bundle
  in `build/server`, in addition to serving `/api`.
- Fingerprinted `/assets` responses are served before the `/api` session pipeline
  with immutable one-year caching. JSON parsing, MariaDB sessions, and CSRF
  checks do not run for static or page requests. Production pages receive a
  per-response CSP nonce and are server-rendered before browser hydration.
- The intended platform is Hostinger Cloud Startup with the Node application
  and MariaDB in the same hosting environment.
- The actual Hostinger start command, Node version, MariaDB version, environment
  image, and process-manager behavior are not stored in this repository and
  must be verified in the hosting control panel.

No Dockerfile, Compose file, Procfile, Nginx configuration, `.nvmrc`, or
`.node-version` is currently tracked. `package.json#engines` is therefore the
only repository-level runtime version contract.

## Proxy and TLS topology

Development topology:

```text
Browser -> Vite development server -> /api proxy -> Express :3000 -> MariaDB :3306
```

Intended production topology:

```text
Browser -> HTTPS / Hostinger TLS termination -> Hostinger reverse proxy
        -> Express Node process -> local MariaDB
```

Production Express uses `trust proxy = 1`, which assumes exactly one trusted
proxy hop. This must be compared with Hostinger's real forwarding topology
before launch because client-IP parsing, secure cookies, and IP rate limits rely
on it.

The public Hostinger certificate terminates browser TLS before Express. The
current MariaDB connection has no TLS options and is intended to remain local to
the same hosting environment. If MariaDB moves to another host, database TLS
must be introduced and tested explicitly.

## Session contract

| Setting       | Value                               |
| ------------- | ----------------------------------- |
| Store         | MariaDB via `express-mysql-session` |
| Cookie name   | `omdn_session`                      |
| Lifetime      | 7 days                              |
| `HttpOnly`    | Yes                                 |
| `SameSite`    | `Lax`                               |
| `Secure`      | Development: no; production: yes    |
| Cookie domain | Not configured; host-only cookie    |
| Cookie path   | Library default (`/`)               |
| Session table | `sessions`                          |

The public production hostname and therefore the effective host-only cookie
scope are unverified. No cross-subdomain session sharing is currently designed.

## Database connection contract

| Setting       | Development | Production                                       |
| ------------- | ----------- | ------------------------------------------------ |
| Host          | `127.0.0.1` | Intended `localhost`; unverified                 |
| Port          | `3306`      | Default `3306`; unverified                       |
| Pool limit    | `10`        | Environment-controlled, default `10`; unverified |
| Transport TLS | None        | None while database remains local                |

`DB_CONNECTION_LIMIT` accepts values from 1 through 100 and defaults to 10.
The production MariaDB connection limit and the number of Node processes are
unknown. Both must be collected together before sizing the pool because total
potential connections equal the per-process pool limit multiplied by the number
of application and worker processes.

## Development and production differences

| Concern           | Development                    | Production                                 |
| ----------------- | ------------------------------ | ------------------------------------------ |
| Frontend serving  | Vite middleware inside Express | Express serves built `build/client` assets |
| API routing       | Same-origin Express `/api`     | Same-origin Express `/api`                 |
| Source reload     | Node watch and Vite HMR        | Disabled                                   |
| Cookie security   | `Secure=false`                 | `Secure=true`                              |
| Proxy trust       | Disabled                       | Exactly one proxy hop trusted              |
| TLS               | Local HTTP                     | Expected Hostinger HTTPS termination       |
| Database location | Local loopback                 | Expected same-host MariaDB                 |
| Runtime values    | Verified above                 | Hosting values still require verification  |

## Production verification checklist

Before the first production deployment, record evidence for:

- `node --version` and `npm --version` in the Hostinger runtime.
- `SELECT VERSION()` against the production MariaDB server.
- The configured build and start commands.
- The number of Node application processes and whether Hostinger restarts them.
- The exact number of reverse-proxy hops and forwarded headers.
- The public canonical hostname and HTTPS redirect behavior.
- The effective `DB_CONNECTION_LIMIT` and MariaDB `max_connections`.
- Whether the Node process and MariaDB truly communicate only over localhost.

Any mismatch with this repository contract must be resolved or documented before
the Framework Mode migration is deployed.
