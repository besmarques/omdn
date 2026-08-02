# Codex changes

This file records the current repair sequence. Previous entries were cleared at the user's request on 2026-08-02.

## 2026-08-02 — Codebase review baseline

### Task

Review the full codebase, identify issues, and solve them one at a time using npm only.

### Issues to resolve

1. **Resolved:** login finalization is transactional and authenticated sessions are persisted only after it commits.
2. **Resolved:** dependency-cruiser loads `jsconfig.json` and resolves the frontend `@/*` alias.
3. **Resolved:** `package.json` and `package-lock.json` enforce Node.js `>=22.22.0` and npm `>=10`.
4. **Dismissed by design:** `npm run check:all` intentionally formats, validates, and regenerates diagrams in one workflow.

### Validation baseline

- `npm test`: passed — 30 test files, 116 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed after rerunning outside the restricted sandbox so Vite's native bindings could execute.
- `npm audit`: passed with zero known vulnerabilities, including development dependencies.
- `git diff --check`: passed.
- Dependency-cruiser validation: failed with seven unresolved frontend `@/*` imports.

### Changes in this step

- Cleared the previous contents of `codexChanges.md` as requested.
- Created this fresh review baseline and issue list.
- No application, configuration, package, test, or other documentation files were changed in this step.

### Failed attempts and assumptions

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. This file was replaced directly as a scoped fallback.
- The first sandboxed production build and test attempts could not execute Vite's native Windows bindings and reported `spawn EPERM`. Both checks passed when rerun with the required execution permission.
- No live MariaDB or MySQL integration test was run.
- npm is the required package manager; pnpm was not used.

### Recommended next step

Fix issue 1 by making successful login finalization failure-safe for both password-only and TOTP login flows.

## 2026-08-02 — Make login finalization failure-safe

### Problem

Password-only and TOTP login persisted `session.userId` before revoking older sessions and updating `users.last_login_at`. If either database operation failed, the response became HTTP 500 while the new session remained authenticated.

### Changes

- Updated password-only and TOTP login controllers to finalize database work before assigning and saving `session.userId`.
- Updated both login services so older-session revocation and `last_login_at` updates run in one transaction on one acquired connection.
- Updated `credentialsRepository.updateLastLogin()` to accept an injected transaction executor.
- Added password-only and TOTP regression tests proving finalization failures return HTTP 500 without saving an authenticated session.
- Updated successful-login tests to assert transaction commit, rollback, connection release, and executor usage.
- Marked issue 1 resolved in the review baseline.

### Files modified

- `server/modules/auth/credentials/credentialsRepository.js`
- `server/modules/auth/credentials/login/loginController.js`
- `server/modules/auth/credentials/login/loginService.js`
- `server/modules/auth/credentials/login/login.test.js`
- `server/modules/auth/totp/login/verifyTotpLoginController.js`
- `server/modules/auth/totp/login/verifyTotpLoginService.js`
- `server/modules/auth/totp/login/totpLogin.test.js`
- `codexChanges.md`

No files were created, moved, or deleted.

### Architectural decisions

- Session regeneration still occurs before finalization so the new session ID can be excluded from session revocation.
- The regenerated session is not marked authenticated or explicitly saved until revocation and last-login recording commit.
- Revocation and last-login recording are atomic; a failure rolls both operations back.
- TOTP/recovery-code consumption remains committed by second-factor verification before login finalization. A finalization failure may require another login attempt, but it cannot leave an authenticated session behind.

### Validation

- Focused login tests: passed — 2 files, 11 tests.
- `npm test`: passed — 30 files, 118 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- npm was used exclusively; pnpm was not used.

### Failed attempts, assumptions, and unfinished work

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. Guarded replacements were used for the scoped files.
- The first focused run after implementation failed two existing success tests because their mocks still expected non-transactional `db.execute()` calls. The mocks were updated for acquired connections and transaction lifecycle assertions.
- The next focused run had one test-only `ReferenceError` because a broad assertion replacement changed a no-challenge check from `db` to an out-of-scope `connection`. That assertion was corrected; the following focused and full runs passed.
- If authenticated-session persistence itself fails after finalization commits, older sessions remain revoked and `last_login_at` remains updated, but no new authenticated session is persisted. This is the safer failure direction.

### Recommended next step

Fix dependency-cruiser resolution for the frontend `@/*` alias and verify the dependency graph command succeeds.

## 2026-08-02 — Resolve frontend aliases in dependency-cruiser

### Problem

Dependency-cruiser did not load the project's `jsconfig.json`, so all seven frontend imports using `@/*` were reported as unresolvable even though Vite resolved them correctly.

### Changes

- Updated `.dependency-cruiser.cjs` to load `jsconfig.json` through dependency-cruiser's supported `options.tsConfig.fileName` setting.
- Verified that imports such as `@/pages/HomePage`, `@/router/DevRoutes`, and `@/components/ui/button` resolve to their `src/` files.
- Regenerated the dependency DOT and SVG through `npm run diagram`; their contents were unchanged because the existing generated graph already represented the intended edges.
- Marked issue 2 resolved in the review baseline.

### Files modified

- `.dependency-cruiser.cjs`
- `codexChanges.md`

No files were created, moved, or deleted. `docs/dependency-graph.dot` and `docs/dependency-graph.svg` were regenerated but produced no Git changes.

### Validation

- Dependency-cruiser validation: passed — 145 modules and 328 dependencies, with zero violations.
- `npm run diagram`: passed.
- `npm test`: passed — 30 files, 118 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- npm was used exclusively; pnpm was not used.

### Failed attempts, assumptions, and unfinished work

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. A guarded configuration replacement was used.
- The first attempted fix added an absolute alias to `enhancedResolveOptions`. Dependency-cruiser's configuration schema rejected `alias` as an additional property, so that unsupported configuration was removed.
- The supported `jsconfig.json` configuration resolves every current JavaScript/JSX dependency. Dependency-cruiser emits an informational missing-TypeScript warning during text validation because it treats JS and TS config files through the same option. The repository contains no TypeScript source, so no TypeScript dependency was added solely to silence that warning.

### Recommended next step

Add the documented Node.js and npm runtime requirements to `package.json` engines.

## 2026-08-02 — Enforce Node.js and npm runtime versions

### Problem

The README documented Node.js `>=22.22.0`, but `package.json` did not expose an engine requirement. npm and deployment platforms could therefore select an incompatible runtime.

### Changes

- Added `engines.node` with `>=22.22.0` to `package.json`.
- Added `engines.npm` with `>=10` to `package.json`.
- Refreshed `package-lock.json` using npm so its root package metadata contains the same engine requirements.
- Verified the package manifest, lockfile, and README declare consistent runtime requirements.
- Marked issue 3 resolved in the review baseline.

### Files modified

- `package.json`
- `package-lock.json`
- `codexChanges.md`

No files were created, moved, or deleted.

### Commands and validation

- `node --version`: `v24.18.1`, satisfying the declared Node.js range.
- `npm --version`: `11.16.0`, satisfying the declared npm range.
- `npm pkg set "engines.node=>=22.22.0" "engines.npm=>=10"`: added the manifest metadata.
- `npm install --package-lock-only --ignore-scripts`: refreshed lock metadata and reported zero vulnerabilities.
- Manifest/lock consistency check: passed.
- `npm test`: passed — 30 files, 118 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- npm was used exclusively; pnpm was not used.

### Failed attempts, assumptions, and unfinished work

- The first sandboxed lockfile refresh failed with `EPERM` because npm could not create a temporary directory in the user-level npm cache. It was rerun with the required permission and succeeded.
- npm 11 normalized lockfile metadata for bundled optional Tailwind WASM packages during the refresh. This did not add a new direct dependency or change `package.json` dependency ranges.
- The declared range intentionally accepts future Node.js 22 patch releases and newer major releases. Dependency compatibility remains governed by the installed package ranges and lockfile.

### Recommended next step

Make `npm run check:all` non-mutating and include the production build.

## 2026-08-02 — Retain the combined validation and diagram workflow

### Decision

The earlier review treated `npm run check:all` as though it should be a non-mutating CI check. The user clarified that its purpose is to run formatting and validation and then regenerate the diagrams in one command.

### Outcome

- Kept `scripts/dev/run-all.js` unchanged.
- Kept the `check:all`, `format`, and diagram npm scripts unchanged.
- Marked issue 4 dismissed by design rather than resolved through a code change.
- No application, configuration, package, lockfile, test, or generated diagram file was changed for this decision.

### Failed attempts and assumptions

- The original finding assumed `check:all` was intended as a non-mutating CI gate. That assumption was incorrect.
- The standard patch helper failed before filesystem access because of the managed Windows sandbox limitation. A guarded change-log replacement was used.
- The production build remains a separate `npm run build` command. It was not added to `check:all` because the clarified objective was testing followed by diagram generation, not a CI release gate.
- npm remains the required package manager; pnpm was not used.

### Recommended next step

No reviewed issue remains. Perform a final validation/status review before preparing the changes for commit.

## 2026-08-02 — Fix successful-login rate-limit settlement across database timezones

### Problem

The real authentication smoke test reached the sixth login request and received HTTP 429 instead of allowing a valid login after password reset. Successful login requests were configured not to count, but their decrements were skipped.

The MySQL store returned `reset_at` as a JavaScript `Date`. MariaDB `DATETIME` has no timezone, so mysql2 interpreted the database wall-clock value in the application machine's timezone. When the database and application timezones differed, express-rate-limit could see the reset time as already expired and skip its successful-request decrement.

### Changes

- Updated the counter query to calculate the remaining window inside MariaDB with `TIMESTAMPDIFF(MICROSECOND, CURRENT_TIMESTAMP(3), reset_at)`.
- Constructed `resetTime` locally from `Date.now()` plus that relative duration, avoiding cross-timezone interpretation of a database `DATETIME`.
- Updated the MySQL store unit test to use a fixed local clock and assert the relative duration produces the correct future reset time.
- Added an assertion that the counter query contains `TIMESTAMPDIFF` and uses the expected namespace/key hash.

### Files modified

- `server/modules/auth/shared/middleware/mySqlRateLimitStore.js`
- `server/modules/auth/shared/middleware/mySqlRateLimitStore.test.js`
- `codexChanges.md`

No files were created, moved, or deleted.

### Validation

- Focused rate-limit tests: passed — 2 files, 11 tests.
- Real MariaDB isolated probe: incremented a temporary namespaced key, confirmed the returned reset time was in the future, decremented it to zero hits, and removed the probe key.
- `npm test`: passed — 30 files, 118 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- npm was used exclusively; pnpm was not used.

### Failed attempts, assumptions, and unfinished work

- The standard patch helper failed before filesystem access because the managed Windows sandbox could not enforce its writable roots. Guarded replacements were used for the store and test.
- Two initial one-line MariaDB inspection commands failed because PowerShell stripped or interpreted nested SQL/JavaScript quoting. They made no database changes. The real verification was rerun successfully through a PowerShell here-string piped directly to Node.
- One tool invocation for the probe contained a malformed JavaScript property delimiter and failed before executing the command. It made no changes and was corrected immediately.
- The full interactive `npm run smoke:auth` was not rerun because it requires manually supplied verification and reset tokens. The focused tests and isolated real-MariaDB probe validate the failing store behavior; the recommended confirmation is to rerun the full smoke test.
- The failed smoke run intentionally preserved `real-user-1785635355849-1efe6c35@example.com` for investigation. This change did not delete that user or its related audit data.

### Recommended next step

Rerun `npm run smoke:auth`. After it passes, clean up the preserved failed-run test user only through an approved, scoped cleanup procedure if it is no longer needed.

## 2026-08-02 — Clean up rate-limit counters after a successful auth smoke test

### What changed

- Updated `scripts/dev/auth-smoke-test.js` to snapshot the composite rate-limit counter keys before starting the backend.
- After all smoke assertions and account soft-deletion checks pass, the script deletes only counter keys that were absent from the initial snapshot.
- The cleanup runs after the server-restart persistence assertion, so the test still proves that database-backed counters survive a restart.
- Failed smoke tests retain their counters for investigation, matching the existing behavior of retaining a failed test user.

### Architectural decision

The cleanup compares the `namespace` plus the binary `key_hash` represented as hexadecimal. It does not delete by namespace, expiry, or a broad timestamp range, so counters that existed before the smoke run are preserved.

### Assumption

The real authentication smoke test is an exclusive local/development database operation. A different process creating a brand-new counter while this script is running would also be absent from the initial snapshot; do not run unrelated authentication traffic against the same database during this smoke test.

### Failed attempts

- `apply_patch` could not run because the Windows restricted-token sandbox could not enforce split writable roots. The same scoped edits were applied with guarded PowerShell replacements.
- Several guarded fallback attempts failed because of newline conversion, command escaping, and an incorrect `String.Split` uniqueness check. Every attempt stopped before writing.
- Inspection confirmed the script uses LF-only newlines; the successful retry preserved that format and verified every marker with `IndexOf` and `LastIndexOf` before writing.

### Validation

- `node --check scripts/dev/auth-smoke-test.js`: passed.
- `npm run format`: passed; Prettier reported the smoke script unchanged and made no additional project changes.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `git diff --check`: passed; Git emitted only existing line-ending normalization warnings.
- `npm test`: passed - 30 files, 118 tests.
- The interactive `npm run smoke:auth` was not rerun because it requires manual verification and password-reset token entry.
- npm was used exclusively; pnpm was not used.
