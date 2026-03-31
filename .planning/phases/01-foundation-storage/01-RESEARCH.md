# Phase 1: Foundation & Storage — Research

**Researched:** 2026-03-31
**Status:** Complete

## Current State Analysis

### What exists today

The Collector app (`collector/`) is an Electron + Playwright + Express application that provides a CDP-style HTTP API on `:3458`. It manages browser pages, evaluates JavaScript, clicks elements, scrolls, and navigates -- but it does **not** collect or persist creator data itself. The web app's adapters (`src/lib/adapters/`) handle data collection by calling the Collector's HTTP API (via `CDPAdapter`) or by parsing HTML directly.

**Key finding:** There is no data persistence layer anywhere. Collected data lives only in memory within the web app's adapter call chain. Once a page refresh occurs, data is gone. This phase creates the first durable storage.

### Integration points

1. **Collector server** (`collector/src/server.ts`): Currently a pure CDP proxy. The `/new`, `/eval`, `/click`, `/scroll`, `/navigate`, `/close` endpoints let the web app's `CDPAdapter` drive Playwright pages remotely. There is no `/collect` endpoint that performs end-to-end collection + write.

2. **Collector main** (`collector/src/main.ts`): Initializes `BrowserManager`, starts Express server, creates tray. The startup sequence (lines 33-49) is where `electron-store` initialization belongs -- after `app.whenReady()`, before or alongside server start.

3. **Web app API routes** (`src/app/api/`): Four existing routes (`collect`, `cdp-collect`, `trending`, `collect-browser`). All use Next.js `NextRequest`/`NextResponse` pattern. The `/api/collect/route.ts` is a good template -- it has SSRF protection, error classification, and typed responses.

4. **Demo adapter** (`src/lib/adapters/demo-adapter.ts`): Returns deterministic `CreatorProfile` objects for three persona archetypes (tutorial, entertainment, lifestyle) across three platforms. It uses a seeded PRNG and generates 30 posts + 10-20 history snapshots per profile. This is the fallback source for STOR-02.

5. **Validation** (`src/lib/schema/validate.ts`): Complete hand-rolled validator for `CreatorProfile` -- checks all required fields, nested objects, arrays, type correctness. Returns `{ valid, errors[] }`. This will be used to validate snapshots on both write and read.

## Technical Findings

### 1. CreatorProfile Schema Shape

**File:** `src/lib/schema/creator-data.ts`

The canonical type that snapshots wrap:

```typescript
interface CreatorProfile {
  platform: Platform;          // 'douyin' | 'tiktok' | 'xhs' | (string & {})
  profileUrl: string;          // canonical URL
  fetchedAt: string;           // ISO-8601
  source: DataSource;          // 'demo' | 'html_parse' | 'manual_import' | 'extension' | 'browser' | 'cdp'
  profile: ProfileInfo;        // nickname, uniqueId, followers, likesTotal, videosCount, bio?, avatarUrl?
  posts: Post[];               // postId, desc, views, likes, comments, shares, saves, optional: publishedAt, completionRate, bounceRate, avgWatchDuration, tags, contentType
  history?: HistorySnapshot[]; // fetchedAt + {followers, likesTotal, videosCount}
  fanPortrait?: FanPortrait;   // optional audience demographics
}
```

**Snapshot wrapper design** (per D-04):
```typescript
interface CreatorSnapshot {
  schemaVersion: string;       // e.g. "1.0.0"
  collectedAt: string;         // ISO-8601 timestamp of this collection run
  platform: Platform;          // duplicated from profile for filename derivation
  uniqueId: string;            // duplicated from profile.profile.uniqueId for filename derivation
  profile: CreatorProfile;     // the full profile data, unmodified
}
```

The `platform` and `uniqueId` fields at the wrapper level are redundant with `profile.platform` and `profile.profile.uniqueId` but they serve a purpose: the snapshot writer needs them for filename generation without reaching into nested objects, and the reader can validate consistency.

**DataSource note:** The existing `DataSource` type does not include `'collector'` as a value. When the Collector writes snapshots, it will need to set `source` to either `'cdp'` (existing) or a new value. Decision: use `'cdp'` since the Collector uses CDP under the hood, or add `'collector'` to the union. Recommend adding `'collector'` to `DataSource` for clarity.

### 2. Collector's Current Collection Flow

**Files:** `collector/src/server.ts`, `collector/src/browser.ts`

The Collector does NOT have a self-contained collection flow today. The current architecture is:

1. Web app's `CDPAdapter` calls `POST /new?url=...` to open a page
2. Web app calls `POST /eval` to run extraction JavaScript
3. Web app calls `GET /close` to clean up
4. Web app's adapter parses the eval results into `CreatorProfile`

**Where to inject snapshot writing:** There are two approaches:

**Option A -- Collector-side `/collect` endpoint:** Add a new Express route that orchestrates the full collection (open page, extract data, parse, validate, write to disk). This is self-contained but requires the Collector to know about parsing logic currently in the web app's adapters.

**Option B -- Collector-side write-only endpoint:** Add a `POST /snapshot` endpoint that accepts a `CreatorProfile` from the web app and writes it to `~/.dashpersona/data/`. The web app continues to orchestrate collection via CDPAdapter, then sends the result to the Collector for persistence.

**Recommendation:** Option B is simpler for Phase 1 and respects the existing separation of concerns. The Collector handles file I/O (it has Node.js `fs` access); the web app handles parsing and validation. However, per D-01, the web app reads data independently via `fs` in its `/api/profiles` route -- it does NOT need the Collector to read. So the write path goes through the Collector, and the read path is independent.

**Important consideration:** For Phase 2 (scheduler), the Collector WILL need to perform end-to-end collection autonomously (no web app driving it). This means the Collector will eventually need parsing logic. For Phase 1, the simpler write-only approach works, but the architecture should not preclude Phase 2's needs.

### 3. Atomic Write Pattern

**Target:** `~/.dashpersona/data/{platform}-{uniqueId}-{ISO8601}.json`

The atomic write pattern (write to temp file, then `fs.rename`) is well-established in Node.js:

```typescript
import { writeFile, rename, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';

async function atomicWriteJSON(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  
  const tmpPath = join(dir, `.tmp-${randomUUID()}.json`);
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await rename(tmpPath, filePath);
}
```

**macOS considerations:**
- `fs.rename` is atomic on APFS/HFS+ when source and destination are on the same filesystem. Since both tmp file and target are in `~/.dashpersona/data/`, this is guaranteed.
- No cross-device rename issues since we write the tmp file in the same directory.
- `mkdir({ recursive: true })` is idempotent and safe for concurrent calls.

**Edge cases:**
- Orphaned tmp files from crashed writes: should periodically clean `.tmp-*.json` files in the data directory, or clean on startup.
- Filename collision: ISO-8601 timestamps with second precision could collide if two collections for the same creator happen within the same second. Using millisecond precision (`2026-03-31T12:34:56.789Z`) or appending a short random suffix eliminates this.
- File permissions: default umask (0o022) gives 644, which is fine for user-local data.

**Filename format:** `{platform}-{uniqueId}-{ISO8601}.json`
- The ISO-8601 timestamp in filenames must be filesystem-safe: replace `:` with `-` or use compact format `20260331T123456Z`.
- Example: `tiktok-codeclass_official-20260331T123456Z.json`

### 4. electron-store

**File:** `collector/package.json`

`electron-store` is **NOT** currently a dependency. It must be added:
```
npm install electron-store --save
```

`electron-store` stores data at `app.getPath('userData')` by default (e.g., `~/Library/Application Support/@dash/collector/`). Per STOR-04, the config should live at `~/.dashpersona/config.json`. electron-store supports a custom `cwd` option to control the storage path.

**Config schema design** (per D-05, includes Phase 2 reserved fields):

```typescript
interface CollectorConfig {
  // Phase 1 active
  schemaVersion: string;         // "1.0.0"
  dataDir: string;               // defaults to "~/.dashpersona/data"
  
  // Phase 1 preferences
  preferences: {
    openAtLogin: boolean;        // mirrors app.setLoginItemSettings
  };
  
  // Phase 2 reserved (empty defaults)
  scheduler: {
    enabled: boolean;            // false until Phase 2
    defaultInterval: string;     // "daily" -- placeholder
    jobs: [];                    // empty array, Phase 2 populates
  };
}
```

**electron-store initialization** goes in `collector/src/main.ts`, in the `app.whenReady()` callback, before server and tray setup. The store instance should be passed to modules that need it (server for write paths, tray for preference reads).

**Important:** electron-store v7+ is ESM-only. The collector uses `"module": "commonjs"` in tsconfig. Need to either:
1. Use electron-store v6.x (CJS compatible), or
2. Use dynamic `import()` for electron-store, or
3. Switch collector to ESM

**Recommendation:** Use `conf` package (same author, works in both CJS and ESM, same API) or pin electron-store to v6.x. Verify compatibility before implementation.

### 5. Next.js API Route Patterns

**File:** `src/app/api/collect/route.ts` (lines 1-80)

Established patterns in this project:

1. Import `NextRequest`, `NextResponse` from `next/server`
2. Export named async functions (`GET`, `POST`)
3. Return `NextResponse.json(data)` or `NextResponse.json({ error }, { status })`
4. Error handling via try-catch with message classification
5. Input validation at the top of the handler

For `/api/profiles`, the route handler will:
- Be a `GET` handler (reading data)
- Use Node.js `fs` to read `~/.dashpersona/data/` (per D-01, independent of Collector)
- Return JSON array of profiles
- Fall back to demo data when directory is empty/absent (per STOR-02)

**Important:** Per D-02, the fallback must NOT be silent. The response should include metadata indicating whether data is real or demo, and if demo, why (directory missing, empty, read errors).

**Filesystem access in Next.js route handlers:** Route handlers run in Node.js runtime by default (not Edge). `fs` module is available. The `os.homedir()` function works correctly to resolve `~`.

### 6. Demo Adapter Fallback Integration

**File:** `src/lib/adapters/demo-adapter.ts`

The demo adapter exports:
- `getDemoProfile(type)` -- returns `Record<string, CreatorProfile>` (keyed by platform)
- `DEMO_PROFILES` -- raw preset data
- `DemoAdapter` class with `collect(input)` method

For the `/api/profiles` fallback, the simplest approach is to call `getDemoProfile('tutorial')` (or all three types) and return those profiles when no real data exists. The response should include a `source: 'demo'` marker and a `reason` field explaining why demo data is being shown.

### 7. Error Classification Extension

**File:** `collector/src/server.ts` (lines 9-29)

Current `classifyError()` handles: `TARGET_CLOSED`, `TIMEOUT`, `BROWSER_NOT_READY`, `INTERNAL_ERROR`.

For snapshot write operations, additional error codes needed:

| Code | Condition |
|------|-----------|
| `WRITE_PERMISSION_DENIED` | EACCES on `~/.dashpersona/data/` |
| `WRITE_DISK_FULL` | ENOSPC during write |
| `WRITE_ATOMIC_RENAME_FAILED` | Rename step failed after successful tmp write |
| `WRITE_VALIDATION_FAILED` | Profile failed `validateCreatorProfile()` before write |
| `WRITE_DIR_CREATE_FAILED` | Could not create `~/.dashpersona/data/` directory |
| `WRITE_SERIALIZE_FAILED` | JSON.stringify threw (circular reference, BigInt, etc.) |

The `classifyError` function should be extended (or a parallel `classifyWriteError` created) to map these filesystem errors to actionable codes.

### 8. Directory Layout & Platform Concerns

Target layout:
```
~/.dashpersona/
  config.json                    # electron-store managed (STOR-04)
  jobs.json                      # Phase 2 reserved (COLL-04)
  run-log.json                   # Phase 2 reserved (COLL-08)
  data/
    tiktok-codeclass-20260331T123456Z.json
    douyin-code_classroom-20260331T130000Z.json
    ...
```

**macOS-specific concerns:**
- `~` resolves to `/Users/<username>/` via `os.homedir()`
- Hidden directories (starting with `.`) are hidden in Finder by default -- fine for app data
- APFS supports atomic rename natively
- No permission issues for user home directory unless sandboxed (Electron apps are NOT sandboxed by default unless configured in entitlements)
- Time Machine will back up `~/.dashpersona/` by default -- acceptable, data is small

**Cross-platform (future):**
- Windows: `os.homedir()` returns `C:\Users\<username>` -- dotfiles work but are unconventional. Consider `app.getPath('appData')` as alternative.
- Linux: `os.homedir()` returns `/home/<username>` -- dotfiles are idiomatic.
- For Phase 1, macOS-only is fine (Electron collector targets macOS per electron-builder config).

## Dependencies & Risks

### Dependencies to install
1. `electron-store` (or `conf`) in `collector/package.json` -- for config persistence (STOR-04)
   - **Risk:** ESM/CJS compatibility. electron-store v7+ is ESM-only; collector uses CJS. Must verify or use v6.x / `conf` package.

### No new dependencies needed for web app
- `/api/profiles` uses only Node.js built-ins (`fs`, `path`, `os`)
- Demo fallback uses existing `getDemoProfile()`

### Risks

1. **electron-store CJS compatibility** (Medium): If electron-store v7+ is ESM-only and the collector is CJS, this will cause import errors. Mitigation: test during implementation, fall back to `conf` package or v6.x.

2. **Collector has no collection logic** (Low for Phase 1, High for Phase 2): The Collector is currently a dumb CDP proxy. Phase 1 can work with a write-only endpoint (web app sends profile data to persist), but Phase 2 needs the Collector to collect autonomously. The Phase 1 architecture should not paint into a corner.

3. **Filename uniqueId sanitization** (Low): `uniqueId` values from platforms could contain characters unsafe for filenames (spaces, `/`, `\`, unicode). Must sanitize to `[a-zA-Z0-9_-]` for the filename portion.

4. **Race condition on concurrent writes** (Low): Two collection runs for the same creator at the same time could produce near-identical filenames. Using millisecond timestamps or UUID suffixes mitigates this.

5. **Vercel deployment** (Info): The `/api/profiles` route reads the local filesystem. On Vercel, `~/.dashpersona/data/` won't exist, so it will always fall back to demo data. This is acceptable -- the Collector is a local desktop app, and the dashboard's real-data features require local deployment or `npm run dev`.

## Recommended Approach

### New files to create

**Collector side (3 files):**
1. `collector/src/storage.ts` -- Atomic write utility, directory management, filename generation, write error classification
2. `collector/src/config.ts` -- electron-store setup, config schema, typed accessors
3. Modify `collector/src/server.ts` -- Add `POST /snapshot` endpoint that accepts a `CreatorProfile`, wraps it in `CreatorSnapshot`, writes atomically
4. Modify `collector/src/main.ts` -- Initialize config store on startup, pass to server/tray

**Web app side (2 files):**
1. `src/app/api/profiles/route.ts` -- `GET` handler that reads `~/.dashpersona/data/`, parses + validates JSON files, returns profiles array with metadata, falls back to demo with explicit reason
2. `src/lib/schema/snapshot.ts` -- `CreatorSnapshot` type definition and validation (reuses `validateCreatorProfile` internally)

**Shared concern:**
- Add `'collector'` to `DataSource` type in `src/lib/schema/creator-data.ts`

### Execution order
1. Define `CreatorSnapshot` type and validation (`snapshot.ts`)
2. Implement atomic write + directory management (`storage.ts`)
3. Implement config store (`config.ts`)
4. Wire into Collector main process and server
5. Implement `/api/profiles` route with demo fallback
6. Test end-to-end: Collector writes -> web app reads

### Estimated scope
- ~6 new/modified files
- ~300-400 lines of new code
- 1 new npm dependency (`electron-store` or `conf`)

## RESEARCH COMPLETE
