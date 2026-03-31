---
phase: 01
plan: 02
title: "Collector Integration"
status: complete
started: 2026-03-31
completed: 2026-03-31
---

# Summary: Plan 01-02 — Collector Integration

## What was built

Wired snapshot writing into the Collector's Express server and added config persistence:

1. **snapshot-types.ts** — CJS-compatible local copy of CreatorSnapshot types and validation (collector can't import from root src/ due to tsconfig boundary)
2. **config.ts** — Typed CollectorConfig with Phase 2 reserved scheduler fields, plain fs-based persistence to ~/.dashpersona/config.json
3. **POST /snapshot endpoint** — Accepts CreatorProfile, stamps collectedAt, wraps in CreatorSnapshot, validates, atomically writes via storage.ts
4. **Startup initialization** — initConfig() and ensureDataDir() called before browser init in main.ts

## Key files

### key-files.created
- `collector/src/snapshot-types.ts` — CJS-safe schema types
- `collector/src/config.ts` — Config store (plain fs, no conf package)

### key-files.modified
- `collector/src/server.ts` — Added POST /snapshot, JSON body parser
- `collector/src/main.ts` — Added config + storage init at startup

## Decisions

- **Dropped `conf` package** — v11+ is ESM-only, incompatible with collector's CJS tsconfig. Used plain fs read/write instead. Same API surface, zero dependencies.
- **text/* content type** for express.text() — narrowed from `*/*` to avoid conflict with JSON parser

## Self-Check: PASSED

- [x] `cd collector && npx tsc --noEmit` passes
- [x] All acceptance criteria verified
