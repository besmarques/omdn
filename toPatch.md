# Recommended patches

This is a read-only code-audit report. No application code was changed while producing it.

## Validation baseline

- `npm test`: passed — 22 test files, 79 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- Existing untracked file: `password-change-context.txt`. It was inspected but not modified.
- A password-change feature was added concurrently during the audit. It was included in the final review and README update.

## P0 — Fix password-reset session revocation

### Finding

`resetPasswordService.js` calls `authRepository.deleteUserSessions(userId)`. That repository method deletes only rows matching `sessions.user_id`.

The configured `express-mysql-session` schema writes `session_id`, `expires`, and serialized `data`; no reviewed code populates the custom `sessions.user_id` column. Authenticated identity is stored inside JSON as `data.userId`.

The login and password-change flows already use `deleteOtherUserSessions()`, which checks both the nullable column and serialized JSON. Password-reset revocation does not.

### Risk

Previously authenticated sessions can remain valid after a successful password reset.

### Recommended patch

Update `deleteUserSessions()` to match valid serialized `$.userId` as well as `user_id`, using the guarded JSON logic already present in `deleteOtherUserSessions()`. Add a regression test with a session whose user ID exists only in `data`.

Longer term, choose one canonical session-identity strategy and maintain it consistently.

## P1 — Add a shared production rate-limit store

### Finding

`authRateLimiters.js` uses the default in-memory `express-rate-limit` store.

### Risk

Limits reset on restart and are isolated per process or server instance.

### Recommended patch

Use a shared store supported by production, such as Redis or a carefully designed MySQL store. Define fail-open/fail-closed behavior and add store-failure tests.

Also consider separate per-IP and per-account/email limits. The current combined IP+email key can be bypassed more easily by rotating either dimension.

## P1 — Rate-limit registration and password change

### Finding

Login, forgotten-password, email-resend, and TOTP-login routes are limited. Registration is not. The new authenticated password-change route also performs expensive Argon2 verify/hash operations without a dedicated attempt limit.

### Risk

- Registration can be abused for unauthenticated CPU/database exhaustion.
- A stolen authenticated session can repeatedly exercise password verification/hashing.

### Recommended patch

Add:

- A registration limiter with per-IP and normalized-email policies.
- A password-change limiter keyed by authenticated user ID plus IP.

Define whether successful attempts count and add threshold/header tests.

## P1 — Make authentication-event delivery durable

### Finding

`authEventMiddleware.js` records after `res.finish` using `void authEventService.record(...)`. Failures are logged, but delivery is not awaited or queued durably.

### Risk

Audit events can be lost during crashes, shutdown, pool closure, or short-lived execution.

### Recommended patch

Use a transactional outbox or durable queue. If an in-process queue is retained, track pending writes and drain them during graceful shutdown. Define retention/privacy requirements for session IDs, IP addresses, user agents, and metadata.

## P1 — Add centralized JSON API error handling

### Finding

Controllers call `next(error)`, but `expressApp.js` has no final application error middleware.

### Risk

Unexpected failures can return inconsistent non-JSON responses and environment-dependent details.

### Recommended patch

Add a final error handler that logs a correlation ID, hides internal details, and returns a stable JSON contract. Add integration tests for forced repository/controller errors. Ensure it is ordered correctly relative to API routes and the production SPA fallback.

## P1 — Implement or remove database SSL configuration

### Finding

`.env.example` and the README expose `DB_SSL` and `DB_SSL_CA`, but `createPool.js` ignores both.

### Risk

Operators can believe database TLS is active when it is not.

### Recommended patch

Either parse/validate these values and pass a verified `ssl` configuration to MySQL2, or remove the variables until supported. Production should fail at startup on invalid TLS configuration rather than silently continue.

## P2 — Validate configuration once at startup

### Finding

Configuration checks are distributed across pool creation, session middleware, TOTP encryption, and feature services.

### Recommended patch

Create a Zod-validated server configuration module covering:

- `APP_ENV`, `NODE_ENV`, and `PORT`
- Database connection and optional TLS values
- `SESSION_SECRET` strength
- `TOTP_ENCRYPTION_KEY` decoding to exactly 32 bytes

Inject validated configuration instead of reading `process.env` throughout the application.

## P2 — Align the session schema with actual writes

### Finding

The migration defines `sessions.user_id`, `ip_address`, `user_agent`, and `last_seen_at`, but the store configuration writes only ID, expiry, and serialized data.

### Recommended patch

Either maintain those metadata columns on login/request activity or remove them in a new forward migration. Do not rewrite an already-applied migration. This decision should be coordinated with the P0 session-revocation fix.

## P2 — Split ESLint environments by runtime

### Finding

`eslint.config.js` applies `globals.browser` to frontend, server, scripts, and tests.

### Recommended patch

Use separate flat-config blocks:

- `src/**/*.{js,jsx}`: browser and React rules
- `server/**/*.js`, `scripts/**/*.js`: Node globals
- `**/*.test.js`: Vitest globals if tests use globals

Keep the Fast Refresh rule scoped to frontend component modules.

## P2 — Reduce auth repository scope

### Finding

`authRepository.js` owns registration, verification, credentials, password recovery, TOTP, recovery codes, and session queries.

### Recommended patch

Split persistence by capability while keeping transaction injection:

- Credentials/session
- Registration/email verification
- Password recovery
- TOTP/recovery codes

Refactor incrementally with the passing test suite as the safety net.

## P3 — Resolve the root context artifact

`password-change-context.txt` is an untracked source snapshot. The password-change feature now exists, so the snapshot is likely obsolete.

Choose one:

- Delete it if temporary.
- Replace it with a concise decision record under `docs/`.
- Add an ignore rule if it is intentionally local.

Avoid committing duplicate source snapshots because they become stale and pollute search.

## Recommended implementation order

1. Fix password-reset session revocation and add its regression test.
2. Add centralized JSON error handling.
3. Add registration/password-change limits and a shared production store.
4. Make authentication-event delivery durable.
5. Validate startup configuration and resolve database TLS behavior.
6. Align session metadata storage and split the auth repository.
7. Split ESLint environments.
8. Resolve `password-change-context.txt`.
