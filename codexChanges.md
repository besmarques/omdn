# Codex changes

Completed work is recorded here after its corresponding item is removed from `toPatch.md`.

## 2026-08-01 — Fix password-reset session revocation

### Problem

Password reset attempted to revoke sessions only through `sessions.user_id`. The configured MySQL session store keeps the authenticated user ID in serialized `data.userId` and does not populate that custom column, so valid sessions could survive a password reset.

### Changes

- Updated `server/modules/auth/shared/authRepository.js`:
  - `deleteUserSessions()` now deletes sessions matching either `sessions.user_id` or a valid serialized `$.userId`.
  - The JSON fallback uses `JSON_VALID`, `JSON_EXTRACT`, `JSON_UNQUOTE`, and an unsigned cast, matching the established session lookup strategy used by `deleteOtherUserSessions()`.
- Updated `server/modules/auth/passwordRecovery/passwordRecovery.test.js`:
  - Added a regression assertion that the session-deletion query includes `JSON_EXTRACT`.
  - Updated the expected parameters to `[userId, userId]`, covering the column and serialized-data paths.
- Removed the completed P0 item from `toPatch.md`.

### Validation

- `npm test -- server/modules/auth/passwordRecovery/passwordRecovery.test.js`: passed — 1 file, 6 tests.
- `npm test`: passed — 23 files, 85 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.

### Notes

- npm was used exclusively; pnpm was not used.
- The standard patch helper failed before filesystem access because of the managed Windows sandbox, so guarded exact replacements were used instead.

## 2026-08-01 — Rate-limit registration and password change

### Problem

Registration and authenticated password changes perform expensive Argon2 and database work but did not have dedicated attempt limits.

### Changes

- Added a registration limiter in `server/modules/auth/shared/middleware/authRateLimiters.js`:
  - Allows 3 requests per hour per IP address and normalized email address.
  - Counts successful and failed requests.
- Added a password-change limiter in the same middleware module:
  - Allows 5 failed attempts per 15 minutes per authenticated user and IP address.
  - Excludes successful password changes from the count.
- Wired the registration limiter into `server/modules/auth/registration/registrationRoutes.js`.
- Wired the password-change limiter into `server/modules/account/accountRoutes.js`, after audit middleware so rate-limit outcomes are recorded.
- Added threshold and successful-request behavior tests in `server/modules/auth/shared/middleware/authRateLimiters.test.js`.
- Removed the completed item from `toPatch.md` and documented MySQL as the intended future shared store; Redis is intentionally excluded.
- Updated `README.md` with the route-specific rate-limit behavior.

### Validation

- Focused tests: passed — 3 files, 15 tests.
- `npm test`: passed — 23 files, 88 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.

### Notes

- npm was used exclusively; pnpm was not used.
- No dependency or shared rate-limit store was added. The current implementation continues to use the existing in-memory store until the separate MySQL-backed store issue is addressed.

## 2026-08-01 — Add a shared MySQL rate-limit store

### Problem

The default in-memory rate-limit counters reset on every server restart and were isolated between server instances.

### Changes

- Added `server/database/migrations/002_create_rate_limit_counters.sql` with namespaced, hashed counters and an expiration index.
- Added `server/modules/auth/shared/middleware/mySqlRateLimitStore.js` implementing the `express-rate-limit` store contract:
  - Counter increments and window resets are atomic within a MySQL transaction.
  - Raw IP, email, account, and session-based keys are SHA-256 hashed before persistence.
  - Expired counters are removed incrementally during increments.
  - Successful requests can decrement counters for limiters configured with `skipSuccessfulRequests`.
  - Store failures propagate, making rate-limited endpoints fail closed.
- Wired a store factory at `server/expressApp.js` and injected independent namespaced stores through the auth and account module composition.
- Kept direct module and limiter construction compatible with the in-memory default for isolated unit tests; the application composition root always supplies MySQL stores.
- Added `server/modules/auth/shared/middleware/mySqlRateLimitStore.test.js` covering increments, hashing, transaction cleanup, error rollback, decrementing, and key reset.
- Updated `README.md` with the new migration and production behavior.
- Removed the completed shared-store item from `toPatch.md`.

### Validation

- Focused tests: passed — 2 files, 11 tests.
- `npm test`: passed — 24 files, 91 tests.
- `npm run lint`: passed.

### Failed attempts and assumptions

- The standard patch helper failed for part of the edit because the managed Windows sandbox could not enforce its writable roots. Guarded exact replacements were used for those files.
- The first focused npm test attempt failed before Vitest started because the sandbox could not load Tailwind's native Windows binary (`spawn EPERM` and an invalid native module stream). The same npm test command passed outside that restricted sandbox.
- Prettier reported that it has no parser for the SQL migration. The migration was formatted manually; this did not modify or invalidate the SQL.
- The project has no migration runner, so migration `002` must be applied manually after migration `001` and before the seed, as documented in `README.md`.
- Redis was not used or added. MySQL is the only shared-store dependency.
- npm was used exclusively; pnpm was not used.

## 2026-08-01 — Add centralized JSON API error handling

### Problem

Controllers forwarded unexpected errors with `next(error)`, but the application had no final API error middleware. Responses could therefore vary by environment, return HTML, or expose implementation details.

### Changes

- Added `server/middleware/apiErrorMiddleware.js`:
  - `apiRequestContext` generates a UUID correlation ID or preserves a caller-supplied ID matching a restricted 128-character pattern.
  - Every API response receives an `x-correlation-id` header.
  - `apiErrorHandler` logs the internal error with correlation ID, HTTP method, and request path.
  - Unexpected errors return HTTP 500 with a stable `{ status, message, correlationId }` JSON contract.
  - Errors received after headers have been sent are delegated to Express instead of attempting a second response.
- Updated `server/expressApp.js`:
  - Request context runs before JSON parsing so parser errors receive correlation IDs.
  - The centralized error handler runs after all API modules and the generic API router, but before the production static-site fallback.
- Updated `server/routes/apiRoutes.js` so `/api/test-items` forwards database failures to the centralized handler instead of maintaining a separate error response and logger.
- Added `server/middleware/apiErrorMiddleware.test.js` covering detail hiding, logging context, valid supplied IDs, and unsafe supplied IDs.
- Added `server/routes/apiRoutes.test.js` covering repository failures, unchanged JSON 404 behavior, and malformed JSON raised before route handlers.
- Updated `README.md` with the middleware structure and public error contract.
- Removed the completed item from `toPatch.md`.

### Validation

- Focused tests: passed — 2 files, 6 tests.
- `npm test`: passed — 26 files, 97 tests.
- `npm run lint`: passed.

### Failed attempts and assumptions

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. Guarded exact replacements were used for affected existing files.
- A second patch-helper attempt to add the malformed-JSON test failed for the same sandbox reason; the guarded replacement fallback was used.
- All unexpected errors are intentionally normalized to HTTP 500. Existing controllers continue to own expected validation, authentication, authorization, and conflict responses.
- Caller-supplied correlation IDs are preserved only when they match `A-Z`, `a-z`, digits, `.`, `_`, `:`, or `-` and are at most 128 characters.
- npm was used exclusively; pnpm was not used.

## 2026-08-01 — Make authentication-event delivery durable

### Problem

Authentication audit events were started only after `res.finish` through an unawaited promise. A crash, shutdown, or database-pool closure could lose events after the client had already received its response.

### Changes

- Added `server/database/migrations/003_create_auth_event_outbox.sql`:
  - Creates `auth_event_outbox` with JSON payloads, attempt count, availability, claim ownership, stale-claim timestamps, processing status, and last error.
  - Adds nullable `auth_events.outbox_id` with a unique key for idempotent delivery.
- Added `server/modules/auth/shared/events/authEventOutboxRepository.js`:
  - Validates and normalizes events before enqueueing.
  - Claims one available row with `FOR UPDATE SKIP LOCKED`.
  - Reclaims work locked for more than five minutes.
  - Inserts the final event and marks the outbox row processed in one transaction.
  - Releases failed claims with retry timing and a truncated error message.
  - Clears processed JSON payloads so duplicate session, IP, user-agent, and metadata values are not retained in the outbox.
- Added `server/modules/auth/shared/events/authEventOutboxWorker.js`:
  - Uses one UUID per worker process.
  - Polls every second.
  - Retries indefinitely with exponential backoff capped at five minutes.
  - Supports clean start, active-work completion, and abortable shutdown waits.
- Updated `server/modules/auth/shared/events/authEventRepository.js`:
  - Exposes shared event normalization.
  - Supports an injected transactional executor and optional outbox ID while preserving the existing direct-write interface used by isolated module tests.
- Updated `server/modules/auth/shared/events/authEventService.js` to track pending writes and expose `drain()` for graceful shutdown.
- Updated `server/modules/auth/shared/events/authEventMiddleware.js` so an outbox write attempt completes before the HTTP response is finalized. Event outcome, user, session, IP, user-agent, and response metadata are still resolved from the final response state.
- Updated `server/expressApp.js` to compose one shared outbox repository, event repository, service, and worker for the auth and account modules.
- Updated `server/modules/auth/authModule.js` and `server/modules/account/accountModule.js` to accept the shared production event service while retaining direct construction for isolated unit tests.
- Updated `server/server.js`:
  - Starts the worker with the HTTP server.
  - Stops accepting traffic on `SIGINT` or `SIGTERM`.
  - Drains pending outbox writes, stops the worker after active work, and then closes the MySQL pool.
- Added `server/modules/auth/shared/events/authEventOutboxRepository.test.js` covering enqueueing, stale-work claiming, transactional completion, and retry state.
- Added `server/modules/auth/shared/events/authEventOutboxWorker.test.js` covering successful delivery, retry backoff, and empty polling.
- Updated `server/modules/auth/shared/events/authEventService.test.js` with shutdown-drain and response-finalization regression tests.
- Updated `README.md` and removed the completed item from `toPatch.md`.

### Validation

- Outbox-focused tests: passed — 3 files, 12 tests.
- Middleware/policy tests after response-finalization hardening: passed — 2 files, 11 tests.
- `npm test`: passed — 28 files, 106 tests.
- `npm run lint`: passed.

### Failed attempts and assumptions

- The standard patch helper repeatedly failed on existing files because the managed Windows sandbox could not enforce its writable roots. Guarded exact or full-file replacements were used after confirming each target.
- The first response-finalization regression-test run failed at parse time because the new mock was missing a closing parenthesis. The test fixture was corrected.
- The next run failed because the test assumed Supertest dispatched within one event-loop turn. It was corrected to wait explicitly until the audit mock was invoked; the behavior then passed.
- No live MySQL integration test was available. SQL behavior is covered with repository mocks and assumes MySQL 8 or later because claiming uses `FOR UPDATE SKIP LOCKED` and JSON columns.
- Migration `003` must be applied manually after migrations `001` and `002`; the project still has no migration runner.
- If the initial outbox insert itself fails, the failure is logged and the original HTTP response is still sent. Persisted rows are retried indefinitely, but a write that never reaches MySQL cannot be recovered by the worker.
- Processed outbox rows retain delivery metadata but their event payload is replaced with an empty JSON object. A future maintenance policy may purge old processed rows if table growth becomes material.
- Redis was not used or added.
- npm was used exclusively; pnpm was not used.

## 2026-08-01 — Remove unused MySQL TLS configuration

### Decision

The deployment target is Hostinger Cloud Startup, where the Node.js application connects to the colocated MySQL database through `localhost`. Hostinger's website SSL certificate protects public HTTPS traffic and is not a MySQL CA certificate. Hostinger's documented Node.js connection example does not provide MySQL CA configuration for this setup.

### Changes

- Removed `DB_SSL` and `DB_SSL_CA` from `.env.example` because the application never consumed them.
- Removed the unused variables from the `README.md` environment table.
- Documented the Hostinger Cloud Startup `DB_HOST=localhost` deployment decision and clarified the separation between HTTPS and MySQL transport security.
- Updated the startup-configuration recommendation in `toPatch.md` so it no longer references nonexistent optional TLS values.
- Removed the completed database SSL configuration issue from `toPatch.md`.

### Failed attempts, assumptions, and unfinished work

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. Guarded exact replacements were used.
- The first guarded replacement expected LF line endings in `.env.example`, which used CRLF, so it stopped without making changes. The retry used anchored line matching that accepts either line-ending style.
- An explicit Prettier write attempt on `.env.example` reported that no parser could be inferred. The file required no formatting; the project-wide `npm run format:check` passed because unsupported files are ignored.
- This decision applies while the Node.js application and MySQL database remain colocated in Hostinger Cloud Startup.
- If MySQL is moved to another host, provider-supported TLS must be added and tested before enabling remote production connections.
- No application code changed because there was no active TLS behavior to remove.
- npm is the project package manager; pnpm was not used.

## 2026-08-01 — Validate server configuration at startup

### Problem

Server environment variables were read and converted independently by the server, pool, session middleware, controllers, services, and TOTP encryption helper. Invalid values could remain undiscovered until a feature was used. Session cookie security also depended on `NODE_ENV`, which was not present in the project's environment files.

### Changes

- Added `server/config/serverConfig.js` using the existing Zod dependency:
  - Requires `APP_ENV` to be `development`, `test`, or `production`.
  - Normalizes and bounds the HTTP and MySQL ports.
  - Requires nonempty MySQL host, database, username, and password values.
  - Normalizes and bounds the MySQL connection limit.
  - Requires a session secret of at least 32 characters.
  - Requires `TOTP_ENCRYPTION_KEY` to be canonical Base64 decoding to exactly 32 bytes.
  - Returns an immutable normalized configuration object.
  - Reports field-specific validation errors without including supplied secret values.
- Added `server/config/serverConfig.test.js` covering valid input, defaults, unsupported environments, numeric ranges, weak session secrets, invalid TOTP keys, and secret-safe errors.
- Updated `server/server.js` so `process.env` is read exactly once and validated before creating the MySQL pool, Express application, worker, or listener.
- Updated `server/dbConnect/createPool.js` to consume normalized database configuration.
- Updated `server/middleware/sessionMiddleware.js` to consume validated session configuration and derive secure cookies from `APP_ENV`; the previous `NODE_ENV` dependency was removed.
- Updated `server/expressApp.js` to consume injected configuration for production proxy/static behavior and pass feature configuration through the composition root.
- Updated auth registration, verification-resend, and password-recovery module/service construction to receive `APP_ENV` instead of reading the environment.
- Updated logout and account-deletion controllers to receive the cookie security mode.
- Added `server/modules/auth/totp/shared/createTotpEncryption.js` and refactored TOTP encryption consumers so the validated 32-byte key is bound once and injected into setup, enable, disable, login, recovery-code, and account-deletion services.
- Updated `server/modules/auth/totp/shared/totpEncryption.js` so it no longer reads environment variables.
- Added `server/modules/auth/totp/shared/totpEncryption.test.js` covering bound-key round trips, key length, and user-bound authenticated encryption.
- Updated `.env.example` with valid defaults for `DB_PORT` and `APP_ENV`.
- Updated `README.md` with exact requirements and removed all `NODE_ENV` instructions.
- Removed the completed issue from `toPatch.md`.

### Validation

- Configuration and affected-feature tests: passed — 4 files, 23 tests after the dependency refactor.
- `npm test`: passed — 30 files, 116 tests.
- `npm run lint`: passed.

### Failed attempts, assumptions, and unfinished work

- The standard patch helper failed on existing files because the managed Windows sandbox could not enforce its writable roots. Guarded exact and full-file replacements were used.
- A guarded server replacement partially completed before its final pattern failed because PowerShell interpolated a template-literal placeholder. The already-applied edits were inspected and the remaining `config.port` replacements were applied explicitly.
- The first affected-feature test run had two account-deletion TOTP failures returning HTTP 500. The injected decrypt function had been referenced from a helper outside its factory scope. The helper signature and call were corrected, and all six account-deletion tests then passed.
- `APP_ENV=test` is accepted for explicit test deployments, while the checked-in example uses `development` and Hostinger production uses `production`.
- Numeric defaults apply when variables are absent. `.env.example` provides concrete values rather than blank numeric variables because an explicitly blank value is invalid.
- The server intentionally does not read or require `NODE_ENV`.
- No live production server was started because startup would connect to the configured MySQL database and begin background processing; validation is covered by isolated tests and the full suite.
- npm was used exclusively; pnpm was not used.

## 2026-08-01 — Align the session schema with actual writes

### Problem

Migration `001` created custom `sessions.user_id`, `ip_address`, `user_agent`, `last_seen_at`, `created_at`, and `updated_at` columns, but `express-mysql-session` writes only `session_id`, `expires`, and serialized `data`. Identity was therefore duplicated conceptually, while the custom user column remained unpopulated and session-revocation queries needed column-or-JSON fallbacks.

### Changes

- Added `server/database/migrations/004_simplify_sessions.sql`:
  - Drops the `fk_sessions_user` foreign key and `idx_sessions_user` index.
  - Drops the unused `user_id`, `ip_address`, `user_agent`, `last_seen_at`, `created_at`, and `updated_at` columns.
  - Preserves the store-managed `session_id`, `expires`, and `data` columns and the expiration index.
- Updated `server/modules/auth/shared/authRepository.js`:
  - `deleteUserSessions()` now matches only valid serialized `data.userId` values.
  - `deleteOtherUserSessions()` now excludes the current session and matches only valid serialized `data.userId` values.
  - Removed duplicate parameters and all dependency on `sessions.user_id`.
- Updated `server/modules/account/deleteAccount/deleteAccountRepository.js` so account deletion uses the same canonical serialized identity.
- Updated regression expectations in login, TOTP login, TOTP disable, password change, password reset, and account deletion tests.
- Added explicit assertions that representative session-deletion SQL no longer references `user_id`.
- Updated `README.md` with migration `004` and the canonical three-column session schema.
- Removed the completed item from `toPatch.md` while retaining the separate auth-repository scope issue.

### Validation

- Affected session-revocation tests: passed — 6 files, 29 tests.
- `npm test`: passed — 30 files, 116 tests.
- `npm run lint`: passed.

### Failed attempts, assumptions, and unfinished work

- The combined patch-helper attempt failed on existing repositories because the managed Windows sandbox could not enforce its writable roots. The migration was created separately and the three repository functions were replaced through guarded function boundaries.
- Migration `004` assumes the foreign-key and index names created by migration `001` are still `fk_sessions_user` and `idx_sessions_user`. Schema drift should be checked before applying it to an independently modified database.
- Applying migration `004` permanently removes any data that may have been written manually into the six custom columns. They are unused by the reviewed application, but a production backup should still be taken before migration.
- No live MySQL migration was executed. SQL behavior and parameter changes are covered by repository/service tests.
- Serialized session data is treated as canonical only when `JSON_VALID(data) = 1`; malformed session rows are not matched by user-based revocation and should be removed through normal expiration or administrative cleanup.
- npm was used exclusively; pnpm was not used.
