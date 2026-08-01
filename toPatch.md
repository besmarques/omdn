# Recommended patches

This file tracks remaining recommended patches. Completed items are removed and recorded in `codexChanges.md`.

## Validation baseline

- `npm test`: passed — 30 test files, 116 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.

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

1. Split the auth repository.
2. Split ESLint environments.
3. Resolve `password-change-context.txt`.
