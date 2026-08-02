# Recommended patches

This file tracks remaining recommended patches. Completed items are removed and recorded in `codexChanges.md`.

## Validation baseline

- `npm test`: passed — 30 test files, 116 tests.
- `npm run lint`: passed.
- `npm run format:check`: passed.

## P3 — Resolve the root context artifact

`password-change-context.txt` is an untracked source snapshot. The password-change feature now exists, so the snapshot is likely obsolete.

Choose one:

- Delete it if temporary.
- Replace it with a concise decision record under `docs/`.
- Add an ignore rule if it is intentionally local.

Avoid committing duplicate source snapshots because they become stale and pollute search.

## Recommended implementation order

1. Resolve `password-change-context.txt`.
