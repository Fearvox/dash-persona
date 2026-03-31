---
phase: 01
plan: 01
title: "Core Types & Utilities"
status: complete
started: 2026-03-31
completed: 2026-03-31
---

# Summary: Plan 01-01 — Core Types & Utilities

## What was built

Foundational types and utilities that Plans 01-02 and 01-03 depend on:

1. **DataSource union extended** — Added `'collector'` to `DataSource` type in `src/lib/schema/creator-data.ts`
2. **CreatorSnapshot type** — New `src/lib/schema/snapshot.ts` with schema-versioned snapshot wrapper, validation, type guard, and filesystem-safe filename helpers
3. **Atomic write utility** — New `collector/src/storage.ts` with tmp-then-rename pattern for APFS crash safety, directory init, orphan cleanup, and typed error classification

## Key files

### key-files.created
- `src/lib/schema/snapshot.ts` — CreatorSnapshot type, validation, filename helpers
- `collector/src/storage.ts` — Atomic write, directory init, error classification

### key-files.modified
- `src/lib/schema/creator-data.ts` — DataSource union extended with 'collector'

## Decisions

- Used hand-rolled validation (no Zod) consistent with existing `validate.ts` pattern
- Filename format: `{platform}-{sanitizedId}-{compactISO}.json` — no colons, filesystem-safe
- Error codes follow existing `classifyError` pattern from `collector/src/server.ts`

## Self-Check: PASSED

- [x] `npm run type-check` passes
- [x] `cd collector && npx tsc --noEmit` passes
- [x] All acceptance criteria verified
