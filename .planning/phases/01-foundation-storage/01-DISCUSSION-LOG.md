# Phase 1: Foundation & Storage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 01-foundation-storage
**Areas discussed:** Data Read Pattern, Demo Fallback Strategy, Snapshot Schema, Config Structure

---

## Data Read Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Direct filesystem read | `/api/profiles` reads `~/.dashpersona/data/` via Node.js fs | |
| Collector HTTP proxy | `/api/profiles` proxies requests through Collector's Express API on :3458 | |

**User's choice:** Direct filesystem read ("Direct read, we should store and retrieve data locally on the user's machine")
**Notes:** User emphasized local-first data access — Web app should work independently of whether Collector is running.

---

## Demo Fallback Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Silent auto-fallback | Seamlessly switch to Demo data without telling the user | |
| UI indication | Explicitly show the user that demo/fallback data is being used | |

**User's choice:** UI indication with comprehensive error coverage
**Notes:** User specified: if data collection fails, tell the user the feature is unstable / show specific error reasons, guide them to manual import. Error reasons must be exhaustive to support GitHub issue filing.

---

## Snapshot vs CreatorProfile

| Option | Description | Selected |
|--------|-------------|----------|
| New Snapshot format | Design a new Snapshot type separate from CreatorProfile | |
| Wrap existing CreatorProfile | Add metadata wrapper around existing CreatorProfile type | |

**User's choice:** Optimize existing structure ("Optimize existing structure, that's fine")
**Notes:** CreatorProfile is already well-defined — wrap it with metadata (schemaVersion, collectedAt) rather than creating a parallel type.

---

## Config Initial Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 1 basics only | Only store dataDir, schemaVersion, basic preferences | |
| Pre-reserve Phase 2 fields | Include Phase 1 basics + empty/default fields for scheduler | |
| Both | All of the above | |

**User's choice:** Both ("All of them")
**Notes:** User wants Phase 1 config to include foundational settings AND pre-reserved Phase 2 scheduler fields to avoid config migration later.

---

## Claude's Discretion

- Atomic write implementation details (tmp + rename)
- ISO-8601 precision in filenames
- Directory creation strategy
- Profile listing/sorting in `/api/profiles`

## Deferred Ideas

None
