# Integration Architecture Research

**Project**: DashPersona — End-to-End Creator Intelligence  
**Scope**: 8 new features mapped onto existing v0.7.0 architecture  
**Date**: 2026-03-31

---

## Existing Architecture Summary

Before mapping new features, the key facts about the current system:

- **Web App** (Next.js 16): RSC pages call adapters + engines server-side, results rendered. No database. Profile data flows through URL search params (`?source=cdp&url=...`).
- **Collector** (Electron + Express :3458): Exposes a low-level Playwright HTTP API — `/new`, `/eval`, `/click`, `/scroll`, `/navigate`, `/close`. It does NOT have a `/collect` endpoint that returns a `CreatorProfile`. The CDPAdapter in the web app calls these primitives and assembles the profile itself.
- **History layer** (`src/lib/history/`): Already exists. Uses IndexedDB (browser) with an in-memory fallback. Stores `HistorySnapshot` (profile metrics) and `AnalysisSnapshot` (engine outputs) keyed by `platform:uniqueId`. Max 365 profile snapshots, 100 analysis snapshots.
- **Profile store** (`src/lib/store/profile-store.ts`): localStorage-backed. Holds the current `CreatorProfile` for each platform.

The critical gap: the Collector is headless infrastructure (browser proxy) — it has no collection orchestration logic, no scheduling, no status reporting, and no TikTok support. The web app currently hard-codes demo data in most page routes and routes the CDPAdapter through URL params rather than a persistent store.

---

## Feature Integration Map

### Feature 1 — TikTok Collection in Collector

**What needs to happen**: The CDPAdapter (`src/lib/adapters/cdp-adapter.ts`) already handles TikTok HTML parsing. The gap is that the Collector's Playwright session needs to navigate TikTok correctly (login cookies, DOM selectors, scroll depth). This is a Collector-side concern, not a web app concern.

**Component boundaries**:
- `collector/src/browser.ts` — add TikTok cookie profile management (separate from Douyin/XHS)
- `src/lib/adapters/cdp-adapter.ts` — add TikTok extraction logic (parallel to existing Douyin branch)
- `src/lib/schema/creator-data.ts` — `Platform` union already includes `'tiktok'`, no schema change needed

**Data flow**:
```
Web App CDPAdapter
  → POST /new?url=tiktok.com/@handle    (opens tab in Collector)
  → GET /scroll?target=...              (scrolls to load posts)
  → POST /eval?target=... (JS code)     (extracts TikTok DOM)
  → GET /close?target=...               (cleanup)
  → returns CreatorProfile{platform:'tiktok'}
```

**Build dependency**: None. TikTok extraction logic can be developed and tested in isolation by pointing the CDPAdapter at a live TikTok session. Collector's browser.ts needs no interface changes.

---

### Feature 2 — Automated/Scheduled Collection

**What needs to happen**: The Collector needs to run collection jobs on a timer without user interaction in the web app. This means adding orchestration logic to the Electron side: a job queue, a scheduler (node `setInterval` or cron), and a job definition store (JSON file on disk).

**Component boundaries**:
- `collector/src/scheduler.ts` (new) — cron/interval runner, reads job definitions from disk, calls BrowserManager, calls appropriate collection logic, writes results to disk
- `collector/src/jobs.ts` (new) — job CRUD: read/write `~/.dashpersona/jobs.json`
- `collector/src/main.ts` — wire up scheduler on startup, expose pause/resume via IPC
- `collector/src/tray.ts` — add "Pause schedule" / "Run now" tray menu items

**Data flow** (Collector-internal):
```
scheduler.ts
  → reads jobs.json (list of {url, platform, intervalHours})
  → for each due job: calls collection logic → writes CreatorProfile JSON to ~/.dashpersona/data/{platform}-{uniqueId}-{timestamp}.json
  → updates ~/.dashpersona/run-log.json with job result
```

**Build dependency**: Requires Feature 5 (local JSON storage schema) to be defined first so the scheduler knows what to write and where.

---

### Feature 3 — Collection Status Feedback

**What needs to happen**: The web app UI needs to know what the Collector is doing — current jobs, recent errors, collection history. The Collector already has a `/health` endpoint. We need to extend this.

**Component boundaries**:
- `collector/src/server.ts` — add new endpoints:
  - `GET /status` — returns `{ running: boolean, activeJobs: Job[], queueLength: number }`
  - `GET /history` — returns last N run log entries from `~/.dashpersona/run-log.json`
  - `GET /stream/events` — Server-Sent Events for live progress during an active collection
- `src/components/collector-status-panel.tsx` (new) — polls `/status` and `/history`, renders progress bar, error list, run log table. Lives in dashboard sidebar or settings page.
- `src/lib/adapters/cdp-adapter.ts` — extend to emit progress callbacks during long collections (scroll steps), which the SSE endpoint relays

**Data flow**:
```
CollectorStatusPanel (React, client component)
  → polls GET http://127.0.0.1:3458/status every 5s
  → EventSource GET http://127.0.0.1:3458/stream/events (during active collection)
  → renders progress bar from event stream
  → renders history table from /history
```

**Build dependency**: Blocked on Feature 2 (scheduler introduces "jobs" concept). The `/stream/events` part can be built independently for manual collections.

---

### Feature 4 — Real Data Flow: Collector → Web App

**What needs to happen**: The dashboard and other pages currently import from `getDemoProfile()` as their default data source. The goal is to make collected profiles the default, with demo as fallback.

The existing CDPAdapter flow works but is request-driven (user pastes a URL, one-shot collection). What's missing is a **profile registry** — a way for the web app to know which profiles have been collected and load them without re-collecting.

**Component boundaries**:
- `src/lib/store/profile-store.ts` — currently localStorage-backed. Needs a server-readable counterpart for RSC pages. Options:
  - **Option A** (recommended): Add a Next.js route handler `GET /api/profiles` that reads `~/.dashpersona/data/*.json` from disk (Node.js fs, server-only). RSC pages call this to discover available profiles.
  - **Option B**: Keep localStorage as the registry; RSC pages always get demo data, client components hydrate with real data. This creates a flash of demo content.
  - Option A is the right choice — it enables SSR with real data and is architecturally clean.
- `src/app/api/profiles/route.ts` (new) — lists and serves collected profiles from local JSON storage
- `src/app/dashboard/page.tsx` — change default: try `GET /api/profiles` for most recently collected profile, fall back to demo if none exist
- `src/components/profile-switcher.tsx` (new) — UI to select among collected profiles (replaces the current `?persona=` demo switcher)

**Data flow**:
```
Dashboard RSC page
  → GET /api/profiles?platform=douyin&limit=1&sort=recent
  → reads ~/.dashpersona/data/ directory (Node.js fs, server-side only)
  → returns most recent CreatorProfile JSON
  → feeds into runAllEngines() as before
  → if no profiles: falls back to getDemoProfile()
```

**Build dependency**: Requires Feature 5 (local JSON storage schema) so the file naming convention is established before the API route reads it.

---

### Feature 5 — Local JSON Storage Schema

**What needs to happen**: Define the on-disk layout for all persistent data. This is the foundation that Features 2, 3, 4, 6, 7 all depend on.

**Storage root**: `~/.dashpersona/` (Electron `app.getPath('userData')` on macOS resolves to `~/Library/Application Support/DashPersona`, but `~/.dashpersona/` is more predictable and portable for the web app to read without Electron IPC).

**Directory structure**:
```
~/.dashpersona/
├── data/
│   └── {platform}-{uniqueId}-{ISO8601}.json    # individual CreatorProfile snapshots
│       e.g. douyin-creator123-2026-03-31T12:00:00Z.json
├── jobs.json                                    # scheduled collection job definitions
├── run-log.json                                 # collection run history (last 500 entries)
└── settings.json                                # user preferences (Collector-side)
```

**File formats**:

`data/{platform}-{uniqueId}-{timestamp}.json` — a `CreatorProfile` object (matches existing `src/lib/schema/creator-data.ts` exactly, no new fields needed). The filename encodes the three lookup dimensions.

`jobs.json`:
```ts
interface CollectionJob {
  id: string;              // uuid
  url: string;             // creator profile URL
  platform: Platform;
  uniqueId: string;        // extracted from URL or filled after first collection
  intervalHours: number;   // 0 = manual only
  lastRunAt?: string;      // ISO-8601
  nextRunAt?: string;      // ISO-8601, computed
  enabled: boolean;
}
```

`run-log.json` — append-only ring buffer (last 500):
```ts
interface RunLogEntry {
  jobId: string;
  startedAt: string;       // ISO-8601
  completedAt?: string;
  status: 'running' | 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  profileKey?: string;     // platform:uniqueId of collected profile
  dataFile?: string;       // relative path within ~/.dashpersona/data/
}
```

**Build dependency**: This is the unblocking primitive. Must be defined and implemented before Features 2, 3, 4, 6, 7.

**Key constraint**: The web app reads this directory via Node.js `fs` in route handlers (server-side only). No Electron IPC needed. The Collector writes; the web app reads. One-way data flow, no shared lock needed since profiles are immutable once written.

---

### Feature 6 — Historical Trend Views

**What needs to happen**: The existing `src/lib/history/` layer already has the right abstractions (`HistorySnapshot`, `AnalysisSnapshot`, `HistoryStore` with IndexedDB). The gap is that these are populated client-side (browser IndexedDB) from one-off collections, and there's no timeline UI surfacing them.

With Feature 5 in place, we can derive history from the filesystem: each `data/{platform}-{uniqueId}-*.json` file is a historical snapshot. This gives us a richer, persistent history that survives browser storage clears.

**Component boundaries**:
- `src/app/api/profiles/history/route.ts` (new) — `GET ?platform=X&uniqueId=Y` reads all matching files from `~/.dashpersona/data/`, extracts `HistorySnapshot` values, returns sorted time series
- `src/components/trend-timeline.tsx` (new) — Recharts `LineChart` showing followers/likes/engagementRate over time. Reuses existing `growth-trend-chart.tsx` patterns.
- `src/app/timeline/page.tsx` — currently shows Persona Tree. Either add a tab for metric history or create `/history` route.
- `src/lib/history/store.ts` — existing IndexedDB store remains for within-session caching, but the server API is now the source of truth for cross-session history

**Data flow**:
```
TrendTimeline (client component)
  → GET /api/profiles/history?platform=douyin&uniqueId=creator123
  → server reads ~/.dashpersona/data/douyin-creator123-*.json (glob)
  → extracts HistorySnapshot from each file
  → returns sorted array
  → Recharts LineChart renders followers/engagement over time
```

**Build dependency**: Feature 5 (storage schema). Loosely coupled to Feature 4 (real data flow) — can be stubbed with demo data while Feature 4 is being built.

---

### Feature 7 — Multi-Creator Comparison Views

**What needs to happen**: The existing `/compare` route uses the `Comparator` and `Benchmark` engines, but only compares platforms for a single creator. The new requirement is cross-creator comparison (multiple `CreatorProfile` objects fed into engines simultaneously).

The `Comparator` engine already accepts multiple profiles. The gap is UI for selecting and loading multiple creators.

**Component boundaries**:
- `src/app/compare/page.tsx` — extend to accept multiple `?creator[]=platform:uniqueId` params
- `src/app/api/profiles/route.ts` (from Feature 4) — extend to accept multiple `?key[]=` params, return array
- `src/components/creator-selector.tsx` (new) — multi-select UI listing all collected profiles from `/api/profiles`, sends selections to compare page
- `src/components/comparison-table.tsx` (extend existing) — already handles per-platform data, needs to handle per-creator rows
- `src/components/comparison-radar-chart.tsx` (extend existing) — multi-series Recharts RadarChart

**Data flow**:
```
Compare RSC page (multiple creators)
  → GET /api/profiles?keys[]=douyin:creator1&keys[]=tiktok:creator2
  → server loads latest snapshot for each key from ~/.dashpersona/data/
  → RunComparatorEngine(profiles[]) → CrossPlatformComparison
  → RunBenchmarkEngine(profiles[]) → BenchmarkResult[]
  → renders ComparisonTable + ComparisonRadarChart
```

**Build dependency**: Feature 4 (profile registry API), Feature 5 (storage schema). The `CreatorSelector` component also needs a list of available profiles to render.

---

### Feature 8 — PDF Generation Pipeline

**What needs to happen**: Export a multi-page PDF report. The constraint is client-side generation (no server rendering service). The existing stack has `html2canvas-pro` for canvas rendering. The missing piece is a PDF assembler.

**Recommended approach**: `jsPDF` + `html2canvas-pro`. Each dashboard section is rendered to a canvas via `html2canvas-pro`, then added as an image page to a jsPDF document. This avoids any new layout engine dependencies.

**Component boundaries**:
- `src/lib/pdf/` (new directory):
  - `generator.ts` — orchestrates the PDF build: accepts a list of `ReportSection` descriptors, calls `html2canvas-pro` on each DOM node ref, assembles pages in jsPDF
  - `layout.ts` — defines page dimensions, margins, header/footer templates (DASH brand)
  - `sections.ts` — enumerates the sections: Overview, Persona Score, Growth Trend, Benchmark, Strategy, Content Plan
- `src/components/pdf-export-button.tsx` (new) — client component with "Export PDF" button, uses `useRef` to capture DOM nodes, calls `generator.ts`
- `src/app/dashboard/page.tsx` — wrap chart components with forwarded refs for PDF capture
- `src/components/growth-trend-chart.tsx`, `benchmark-card.tsx`, etc. — expose `ref` prop for canvas capture

**Data flow**:
```
User clicks "Export PDF"
  → PDFExportButton (client component)
  → for each section ref: html2canvas-pro(domNode) → canvas
  → jsPDF.addImage(canvas, 'PNG', x, y, w, h)
  → jsPDF.save('dashpersona-report.pdf')
```

**Key constraint**: All chart DOM nodes must be visible in the viewport (or rendered off-screen) at time of capture. Hidden-by-scroll sections need a "capture mode" that renders them temporarily.

**Build dependency**: No hard dependencies on other features. Can be built with demo data. However, shipping it after Feature 4 (real data) makes the exported report more useful to test.

---

## Build Order

Dependencies form a clear DAG. The recommended order minimizes blocked work:

```
Phase 1 — Foundation (unblocks everything)
  [5] Local JSON storage schema
      → defines file format + directory layout
      → Collector writes here; web app reads here

Phase 2 — Collector capabilities (parallel tracks)
  [1] TikTok collection in Collector
      → adds TikTok DOM extraction to CDPAdapter
      → no dependency on Phase 1
  [2] Automated/scheduled collection
      → reads/writes jobs.json, run-log.json (needs Phase 1)
  [3] Collection status feedback — manual collections part
      → /stream/events endpoint (no dependency on Phase 1)

Phase 3 — Web App real data (depends on Phase 1)
  [4] Real data flow: Collector → Web App
      → GET /api/profiles route handler reads ~/.dashpersona/data/
      → dashboard page uses real profiles, falls back to demo

Phase 4 — History + Comparison (depends on Phase 3)
  [6] Historical trend views
      → GET /api/profiles/history endpoint
      → TrendTimeline component
  [7] Multi-creator comparison views
      → Extend compare page + creator selector

Phase 5 — Export (independent, but most valuable after Phase 4)
  [8] PDF generation pipeline
      → jsPDF + html2canvas-pro
      → can start anytime, ships last
```

Numbered strictly by dependency:

| Order | Feature | Depends on |
|-------|---------|------------|
| 1st | [5] Storage schema | — |
| 2nd | [1] TikTok collection | — |
| 2nd | [2] Scheduled collection | [5] |
| 2nd | [3] Status feedback (manual part) | — |
| 3rd | [3] Status feedback (scheduler part) | [2] |
| 3rd | [4] Real data flow | [5] |
| 4th | [6] Historical trends | [4], [5] |
| 4th | [7] Multi-creator comparison | [4], [5] |
| 5th | [8] PDF export | — (best after [4]) |

---

## Component Boundary Summary

| New Component / Module | Lives in | Reads from | Writes to |
|------------------------|----------|------------|-----------|
| `collector/src/scheduler.ts` | Collector | `jobs.json` | `data/*.json`, `run-log.json` |
| `collector/src/jobs.ts` | Collector | `jobs.json` | `jobs.json` |
| `collector/src/server.ts` (extended) | Collector | `run-log.json` | — |
| `src/app/api/profiles/route.ts` | Web App (server) | `~/.dashpersona/data/` | — |
| `src/app/api/profiles/history/route.ts` | Web App (server) | `~/.dashpersona/data/` | — |
| `src/components/collector-status-panel.tsx` | Web App (client) | `GET :3458/status`, `GET :3458/history` | — |
| `src/components/profile-switcher.tsx` | Web App (client) | `GET /api/profiles` | URL state |
| `src/components/creator-selector.tsx` | Web App (client) | `GET /api/profiles` | URL state |
| `src/components/trend-timeline.tsx` | Web App (client) | `GET /api/profiles/history` | — |
| `src/lib/pdf/generator.ts` | Web App (client) | DOM refs | browser download |
| `src/components/pdf-export-button.tsx` | Web App (client) | DOM refs | browser download |

---

## Key Architectural Decisions

**1. Collector writes files; web app reads files — no IPC**  
The Collector and web app share `~/.dashpersona/` as a file-system message bus. The Collector writes profiles to disk after collection; the web app reads them via Node.js `fs` in route handlers. No Electron IPC, no WebSocket between processes. Clean separation.

**2. Existing IndexedDB history layer is preserved for session caching**  
The `src/lib/history/store.ts` IndexedDB layer is not replaced. It continues to handle within-session analysis snapshots. The new `/api/profiles/history` route provides cross-session, cross-browser-clear-safe history from the filesystem. They coexist without conflict.

**3. RSC pages use route handlers for profile discovery, not direct fs access**  
Even though RSC runs in Node.js and could directly call `fs.readdir`, the profile discovery is placed in route handlers (`/api/profiles`) so client components can also fetch the same data. This avoids duplicating the fs logic.

**4. PDF uses html2canvas-pro + jsPDF, no new rendering service**  
`html2canvas-pro` is already a dependency (used by Textcraft). Adding `jsPDF` is the minimal addition. The alternative (headless Playwright PDF) would require the Collector to be running and creates a cross-process dependency for a report export.

**5. TikTok collection is a CDPAdapter concern, not a Collector concern**  
The Collector exposes generic browser primitives (open tab, eval JS, click, scroll). All platform-specific DOM parsing stays in the web app adapters. This keeps the Collector platform-agnostic and the parsing testable without Electron.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `~/.dashpersona/` path differs between Collector (Electron) and web app (Node.js) | Use `os.homedir()` + `.dashpersona/` in both — always resolves correctly on macOS |
| Concurrent writes to `run-log.json` (scheduler + manual collection) | Write with file lock or append atomically; alternatively use separate log files per run and merge on read |
| PDF capture fails on hidden/off-screen chart sections | Implement a `pdf-capture-mode` CSS class that forces visibility and fixed dimensions before capture |
| TikTok DOM structure changes break extraction | Isolate TikTok selectors into a versioned selector map (`tiktok-selectors.ts`), same pattern as Douyin |
| IndexedDB history and file-based history diverge | Treat IndexedDB as ephemeral cache; file system is the source of truth; auto-import from files into IndexedDB on page load |
