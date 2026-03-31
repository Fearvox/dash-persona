# DashPersona Architecture

**Project**: Data-agnostic creator intelligence engine  
**Tech Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript  
**Version**: 0.7.0

---

## Architectural Overview

DashPersona is a **data-driven analysis engine** structured as a deterministic, multi-stage pipeline that transforms raw social media data into actionable creator intelligence signals. The system has no external AI dependencies — all analysis is algorithmic and reproducible.

### Design Principles
1. **Platform-agnostic**: Adapters normalize Douyin/TikTok/XHS data into a universal schema
2. **Pure functions**: All engines are side-effect-free and parallelizable
3. **Transparency**: Every score includes explanation factors and confidence signals
4. **Deterministic**: Same input always yields same output (no randomness)

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                       │
│  /dashboard, /persona, /compare, /calendar, /timeline, /    │
│  Components: charts, forms, loaders, animations             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js)                       │
│  /api/collect, /api/cdp-collect, /api/collect-browser      │
│  Route handlers: data input, validation, response           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Analysis Engine (11 modules)               │
│  - Persona (engagement, rhythm, consistency, health)        │
│  - Growth (delta calculation, trend analysis)               │
│  - Comparator (cross-platform comparison)                   │
│  - Benchmark (niche detection, ranking)                     │
│  - Strategy, Planner, Tree, Ideas, Explain, etc.            │
│  Parallelizable via Promise.all (runAllEngines)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Data Adapters (7 sources)                     │
│  - HTMLParseAdapter (TikTok, XHS HTML parsing)             │
│  - DemoAdapter (test data)                                  │
│  - ManualImportAdapter (JSON/CSV upload)                    │
│  - BrowserAdapter (bb-browser CLI)                          │
│  - ExtensionAdapter (Chrome Extension)                      │
│  - CDPAdapter (Chrome DevTools Protocol)                    │
│  - FileImportAdapter (HTML file upload)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Schema & Data Model (CreatorProfile)              │
│  - Post (views, likes, comments, engagement metrics)        │
│  - ProfileInfo (nickname, handle, followers, bio)           │
│  - Platform (douyin, tiktok, xhs)                           │
│  - Validation (isCreatorProfile, validateCreatorProfile)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Raw Data Sources                           │
│  Douyin, TikTok, Red Note (XHS), CSV, JSON files            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **Input** → Data acquisition
   - **Sources**: Douyin API, TikTok HTML, Red Note, file upload, manual JSON
   - **Collector App**: Electron desktop app (`:3458` HTTP API)
     - Uses Playwright for browser automation
     - Exposes `/collect` endpoint for headless data gathering
   - **Web API Routes**: 
     - `POST /api/collect` — HTML parsing for TikTok/XHS URLs
     - `POST /api/cdp-collect` — Chrome DevTools Protocol for live data
     - `POST /api/collect-browser` — bb-browser CLI integration

### 2. **Normalization** → Adapter layer
   - **All adapters implement `DataAdapter` interface**:
     ```ts
     interface DataAdapter {
       name: string;
       description: string;
       collect(input: string): Promise<CreatorProfile | null>;
     }
     ```
   - **Output**: Normalized `CreatorProfile` object
   - **Location**: `src/lib/adapters/`
   - **Registry**: `registry.ts` (adapter lookup, fallback chains)

### 3. **Validation** → Schema enforcement
   - **Schema**: `src/lib/schema/creator-data.ts`
   - **Types**:
     - `Post` (engagement metrics: views, likes, comments, shares, saves)
     - `ProfileInfo` (creator metadata)
     - `CreatorProfile` (platform + posts)
   - **Validators**: `src/lib/schema/validate.ts`
   - **Function**: `isCreatorProfile(obj): boolean`

### 4. **Analysis** → Engine execution
   - **Inputs**: `CreatorProfile` object(s)
   - **Execution**: `runAllEngines()` (src/lib/engine/index.ts:179)
     - **Phase 1**: Per-platform persona scores (parallel)
     - **Phase 2**: Remaining 8 engines (parallel, depend on persona scores)
   - **Outputs**: `AllEngineResults` (aggregated signals)

   **11 Analysis Modules**:
   1. **Persona** (`persona.ts`) — engagement profile, rhythm, consistency, growth health, tags, overall score
   2. **Growth** (`growth.ts`) — delta calculation, sparkline extraction, trend formatting
   3. **Comparator** (`comparator.ts`) — cross-platform engagement comparison
   4. **Benchmark** (`benchmark.ts`) — rank against niche-specific benchmarks
   5. **Niche Detection** (`niche-detect.ts`) — categorize creator type
   6. **Strategy** (`strategy.ts`) — actionable suggestions
   7. **Content Planner** (`content-planner.ts`) — ICS calendar export, scheduling
   8. **Persona Tree** (`persona-tree.ts`) — event sequence visualization
   9. **Explain** (`explain.ts`) — score factorization (transparency)
   10. **Idea Generator** (`idea-generator.ts`) — content experiments
   11. **Signal Collector** (`signal-collector.ts`) — 18-signal vector (feature engineering)

### 5. **Caching & Memoization**
   - **Memoized engines**: 
     - `computePersonaScoreCached()`
     - `comparePlatformsCached()`
     - `generateContentPlanCached()`
   - **Cache key**: Hash of input profile (deterministic)
   - **Location**: `src/lib/utils/memo-cache.ts`

### 6. **Output** → UI display
   - **Components render results**:
     - Dashboard: growth trends, strategy suggestions
     - Persona: detailed scoring breakdown
     - Compare: cross-platform radar/table
     - Calendar: content plan visualization
     - Timeline: persona tree event sequence
   - **Loaders**: Per-route skeleton UI
   - **Store**: `src/lib/store/profile-store.ts` (client-side profile cache)

---

## Engine Architecture (src/lib/engine/)

### Statistics Library (src/lib/engine/stats/)
Foundation for all analysis — pure statistical functions:
- `percentile.ts` — empirical quantile calculation
- `regression.ts` — linear trend detection
- `normalize.ts` — min-max + z-score normalization
- `threshold.ts` — adaptive thresholding
- `index.ts` — public API (rankNormalize, adaptiveThreshold, etc.)

### Signal Collector (src/lib/engine/signal-collector.ts)
Extracts 18 numeric signals per creator profile:
- Engagement rate, consistency, growth velocity, virality index, etc.
- Returns `SignalVector` (typed tuple)
- Used by: comparator, benchmark, explainer

### Engine Patterns
All engines follow **functional composition**:
```ts
// Input: typed profile(s)
// Process: pure computation
// Output: typed result + confidence metrics
// Side effects: none

export function analyzeProfile(profile: CreatorProfile): AnalysisResult {
  // 1. Extract signals
  // 2. Apply statistical primitives
  // 3. Compute scores/insights
  // 4. Return results with explanation factors
}
```

---

## Adapter Architecture (src/lib/adapters/)

**7 Adapters** normalize diverse data sources:

| Adapter | Input | Output | Status | Use Case |
|---------|-------|--------|--------|----------|
| **DemoAdapter** | hardcoded JSON | CreatorProfile | stable | Testing, onboarding |
| **HTMLParseAdapter** | TikTok/XHS URL | Profile (DOM scrape) | stable | Live profile URLs |
| **ManualImportAdapter** | JSON/CSV text | Profile (parse + validate) | stable | User data entry |
| **FileImportAdapter** | HTML file upload | Profile (DOM parse) | stable | Offline HTML snapshots |
| **BrowserAdapter** | bb-browser CLI output | Profile (parse) | stable | CLI integration |
| **ExtensionAdapter** | Chrome Extension | Profile (IPC) | experimental | Browser automation |
| **CDPAdapter** | Chrome DevTools Protocol | Live profile data | experimental | Playwright integration |

**Registry** (`registry.ts`):
- Adapter lookup by name
- Fallback chains (try multiple adapters)
- Error collection

---

## UI Layer Architecture (src/components/, src/app/)

### Next.js App Router Structure
```
src/app/
├── page.tsx                  # Landing page (cinematic)
├── layout.tsx               # Root layout + metadata
├── globals.css              # Tailwind reset
├── error.tsx                # Global error boundary
├── not-found.tsx            # 404 page
├── api/                     # Route handlers
│   ├── collect/route.ts      # HTML parsing
│   ├── cdp-collect/route.ts  # CDP integration
│   ├── collect-browser/route.ts  # bb-browser
│   └── trending/route.ts     # Trending data
├── dashboard/               # Dashboard page
│   ├── page.tsx
│   └── loading.tsx
├── persona/                 # Persona detail page
│   ├── page.tsx
│   ├── loading.tsx
│   └── persona-detail-content.tsx
├── compare/                 # Cross-platform comparison
├── calendar/                # Content calendar
├── timeline/                # Persona tree visualization
├── portrait/                # Creator portrait
├── settings/                # User settings
├── install/                 # Installation guide
└── onboarding/             # First-run UX
```

### Component Organization (src/components/)

**Landing Components** (`src/components/landing/`):
- `boot-sequence.tsx` — ASCII art boot animation
- `output-wall.tsx` — scrolling demo output
- `pipeline-viewer.tsx` — React Flow + ELK layout (lazy-loaded)
- `pipeline-nodes.tsx` — pipeline node rendering
- `code-art-background.tsx` — Textcraft ASCII background

**UI Primitives** (`src/components/ui/`):
- `scroll-reveal.tsx` — intersection observer + animation
- `toast.tsx` — notification system
- `confirm-dialog.tsx` — modal confirmation
- `skeleton.tsx` — loading placeholder
- `textcraft/` — ASCII art decorators

**Feature Components** (`src/components/`):
- `dashboard-interactive.tsx` — main dashboard widget
- `persona-overview.tsx` — persona summary card
- `benchmark-card.tsx` — niche benchmark comparison
- `growth-trend-chart.tsx` — Recharts trend visualization
- `comparison-radar-chart.tsx` — cross-platform radar
- `file-drop-zone.tsx` — drag-drop file upload
- `live-collector.tsx` — Collector app status + live updates
- Loaders: `import-dashboard-loader`, `import-persona-loader`, etc.

### Page-to-Engine Mapping
| Route | Component | Engines Used |
|-------|-----------|--------------|
| `/` | Landing (cinematic) | None (showcase only) |
| `/dashboard` | dashboard-interactive | Persona, Growth, Strategy, Explain |
| `/persona/:platform` | persona-detail-content | Persona, Explain, Signal Collector |
| `/compare` | compare-table, compare-radar-chart | Comparator, Benchmark |
| `/calendar` | import-timeline-loader | Content Planner |
| `/timeline` | timeline-client | Persona Tree, Idea Generator |
| `/portrait` | portrait-page | Textcraft rendering |

---

## Textcraft ASCII Art Engine (src/lib/textcraft/)

**Purpose**: Deterministic ASCII/Braille art rendering for UI ornaments (not CJK text)

**Architecture**:
- **Core** (`core/`): types, measurement, font registry
- **Fonts** (`fonts/`): Block Digits, DASH brand logo
- **Composers** (`composers/`): ASCII Logo, Braille Line, Char Chart, Data Portrait, Text Field
- **Effects** (`effects/`): assembly, composition, drift animation
- **Renderers** (`renderers/`): DOM (via pretext.js) and Canvas (via html2canvas-pro)

**Key constraint**: No CJK support (ASCII/Braille only)

---

## Electron Collector App (collector/)

**Purpose**: Headless data collection for Douyin/XHS via browser automation

**Stack**: Electron + Express + Playwright

**Architecture**:
- `main.ts` — Electron app initialization, window creation
- `preload.ts` — IPC bridge (sandboxed renderer-to-main communication)
- `browser.ts` — Playwright browser instance management
- `server.ts` — Express HTTP API (`:3458`)
- `tray.ts` — System tray menu

**HTTP Endpoints**:
- `POST /collect` — Accept creator URL, launch Playwright, parse DOM, return CreatorProfile
- `GET /status` — Health check

**Shipping**: electron-builder (DMG for macOS)

---

## State Management

### Server-Side
- **Next.js Route Handlers** — stateless request processing
- **Search Params** — URL-driven UI state (platform, time range)

### Client-Side
- **React Context** (implicit via imports)
- **Profile Store** (`src/lib/store/profile-store.ts`)
  - Caches loaded CreatorProfile objects
  - Backed by localStorage
- **Learning/Preferences** (`src/lib/learning/`)
  - User UI preferences
  - Analysis preferences (e.g., niche detection)

### History & Snapshots
- **Snapshot System** (`src/lib/history/`)
  - Point-in-time capture of analysis results
  - Used for delta comparison (current vs. baseline)
  - Serialized to localStorage

---

## Error Handling

**Route Handler Pattern** (src/app/api/*/route.ts):
1. Validate input (type checks, URL allowlisting)
2. Call adapter/engine
3. Return structured response:
   - Success: `{ profile, results }`
   - Error: `{ error: string, code: string, status: number }`

**UI Error Boundaries**:
- `src/app/error.tsx` — Global catch
- Page-level `error.tsx` (if route-specific)
- Component-level `CinematicErrorBoundary` (fallback to SimpleFallbackLanding)

**Adapter Errors**:
```ts
export type AdapterError = {
  adapter: string;
  code: 'TIMEOUT' | 'PARSE_ERROR' | 'NETWORK_ERROR' | 'BLOCKED' | 'INVALID_URL' | 'UNKNOWN';
  message: string;
};
```

---

## Performance Optimizations

### Code Splitting
- Pipeline viewer (React Flow) — 235KB, lazy-loaded with fallback skeleton
- Dynamic imports for heavy components

### Memoization
- Engine results cached via `memo-cache.ts` (hash-based)
- Persona score, comparator, content plan all cacheable

### Parallel Execution
- `runAllEngines()` — Promise.all for 8+ engines
- Per-platform scores computed in parallel

### Data Structures
- All engines use native TypeScript (no external deps except chart libraries)
- Signals are typed tuples (memory-efficient)

---

## Type Safety

- **TypeScript strict mode** enabled
- **Schema validation**: `validateCreatorProfile()` guards against invalid data
- **Type stubs**: `src/lib/textcraft/core/pretext-stub.d.ts` (for CJS import)
- **i18n safety**: `src/lib/i18n/index.ts` provides typed `t()` function

---

## Testing

- **Unit tests**: Vitest (src/lib/engine/__tests__/)
- **Test coverage**:
  - Stats library (percentile, regression, normalize, threshold)
  - All 11 engines (with comparison tests)
  - Adapters (demo, file import, HTML parse)
  - History/snapshots
  - Learning preferences
- **E2E tests**: Playwright (playwright.config.ts)

---

## Deployment

- **Platform**: Vercel (Next.js optimized)
- **Build**: `npm run build` (TypeScript strict via tsconfig.check.json)
- **Environment**: No secrets exposed (all adapters work client-side)
- **Collector App**: Distributed as DMG via electron-builder (separate from web)

---

## Key Abstractions

### `CreatorProfile`
The universal normalized format — input to all engines, output from all adapters.

### `AllEngineResults`
Aggregated output from all 11 engines — consumed by UI layer to render dashboard, persona, etc.

### `DataAdapter`
Interface for pluggable data sources — easy to add new adapters (e.g., YouTube, Instagram).

### `SignalVector`
18-signal tuple — feature vector for each platform profile, used by benchmark/comparator.

### `PersonaScore`
Composite score with breakdown (engagement, rhythm, consistency, health, momentum) — foundation for all UI insights.

---

## Extension Points

1. **New adapters**: Implement `DataAdapter` in `src/lib/adapters/`
2. **New engines**: Add module to `src/lib/engine/`, export from `index.ts`
3. **New pages**: Add route to `src/app/`, call engines via `runAllEngines()` or specific engine functions
4. **New fonts**: Add to `src/lib/textcraft/fonts/registry.ts`
5. **Platform support**: Extend `Platform` union type, add adapter for new source

---

## Dependencies

**Runtime**:
- Next.js 16, React 19, React DOM 19
- Recharts (charting)
- @xyflow/react + elkjs (pipeline visualization)
- xlsx (Excel export)
- html2canvas-pro (canvas rendering for Textcraft)
- @chenglou/pretext (font measuring)

**Dev**:
- TypeScript 5
- Tailwind CSS 4 + PostCSS
- Vitest (unit tests)
- Playwright (E2E tests)
- ESLint 9

**Collector (separate)**:
- Electron 33
- Express 4
- Playwright 1.52
- electron-builder 25
