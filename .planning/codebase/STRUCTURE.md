# DashPersona Directory Structure

**Overview**: Monorepo with Next.js web app (src/) and Electron collector app (collector/)

---

## Root Directory

```
dash-persona/
├── src/                           # Next.js web application
├── collector/                     # Electron desktop collector app
├── .planning/                     # Planning documents (this directory)
├── package.json                   # Web app dependencies (Next.js 16, React 19)
├── tsconfig.json                  # TypeScript config (strict mode)
├── tsconfig.check.json            # Type-checking config (excludes pretext)
├── next.config.ts                 # Next.js build config (transpilePackages)
├── tailwind.config.js             # Tailwind CSS 4 config
├── eslint.config.js               # ESLint 9 rules
├── vitest.config.ts               # Vitest unit test config
├── playwright.config.ts           # Playwright E2E test config
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

---

## src/ — Next.js Web Application

### src/app/ — Next.js App Router

```
src/app/
├── page.tsx                           # Landing page (cinematic home)
├── layout.tsx                         # Root layout (providers, fonts, metadata)
├── globals.css                        # Global Tailwind reset + CSS variables
├── error.tsx                          # Global error boundary
├── not-found.tsx                      # 404 error page
├── favicon.ico                        # App icon
│
├── api/                               # Route handlers (Next.js)
│   ├── collect/
│   │   └── route.ts                   # POST /api/collect — HTML parsing for TikTok/XHS
│   ├── cdp-collect/
│   │   └── route.ts                   # POST /api/cdp-collect — Chrome DevTools Protocol
│   ├── collect-browser/
│   │   └── route.ts                   # POST /api/collect-browser — bb-browser CLI
│   └── trending/
│       └── route.ts                   # GET /api/trending — Trending data endpoint
│
├── dashboard/                         # Dashboard page
│   ├── page.tsx                       # Dashboard route + layout
│   └── loading.tsx                    # Skeleton loader
│
├── persona/                           # Creator persona detail
│   ├── page.tsx                       # Persona route
│   ├── loading.tsx                    # Skeleton loader
│   ├── persona-detail-content.tsx     # Main content component
│   ├── persona-bar-chart.tsx          # Engagement breakdown chart
│   └── import-persona-loader.tsx      # Data import + loading state
│
├── compare/                           # Cross-platform comparison
│   ├── page.tsx                       # Compare route
│   ├── loading.tsx                    # Skeleton loader
│   ├── compare-table.tsx              # Comparison table
│   ├── compare-radar-chart.tsx        # Radar chart component
│   └── import-compare-loader.tsx      # Data import + loading
│
├── calendar/                          # Content calendar/planning
│   ├── page.tsx                       # Calendar route
│   ├── loading.tsx                    # Skeleton loader
│   ├── calendar-client.tsx            # Client-side calendar widget
│   └── import-calendar-loader.tsx     # Data import + loading
│
├── timeline/                          # Persona event tree visualization
│   ├── page.tsx                       # Timeline route
│   ├── loading.tsx                    # Skeleton loader
│   ├── timeline-client.tsx            # React Flow tree viewer
│   └── import-timeline-loader.tsx     # Data import + loading
│
├── portrait/                          # ASCII art creator portrait
│   └── page.tsx                       # Portrait rendering page
│
├── settings/                          # User settings page
│   ├── page.tsx                       # Settings route
│   └── loading.tsx                    # Skeleton loader
│
├── install/                           # Installation guide
│   └── page.tsx                       # Collector app installation
│
└── onboarding/                        # First-run onboarding flow
    ├── layout.tsx                     # Onboarding layout
    ├── page.tsx                       # Onboarding route
    └── loading.tsx                    # Skeleton loader
```

---

### src/components/ — React Components

```
src/components/
│
├── landing/                           # Landing page components
│   ├── boot-sequence.tsx              # ASCII art boot animation
│   ├── output-wall.tsx                # Scrolling demo output display
│   ├── pipeline-viewer.tsx            # React Flow + ELK layout (lazy-loaded)
│   ├── pipeline-nodes.tsx             # Pipeline node rendering logic
│   ├── pipeline-skeleton.tsx          # Loading skeleton for pipeline
│   ├── code-art-background.tsx        # Textcraft ASCII background
│   └── canvas-text-field.tsx          # Canvas-based text input
│
├── ui/                                # Reusable UI primitives
│   ├── confirm-dialog.tsx             # Modal confirmation dialog
│   ├── toast.tsx                      # Toast notification system
│   ├── scroll-reveal.tsx              # Intersection observer + animation
│   ├── skeleton.tsx                   # Loading placeholder shimmer
│   ├── textcraft/                     # ASCII art decorators
│   │   ├── index.ts                   # Textcraft exports
│   │   ├── textcraft-divider.tsx      # Horizontal divider
│   │   ├── textcraft-loader.tsx       # ASCII loading spinner
│   │   └── textcraft-empty.tsx        # ASCII empty state
│
├── feature components/                # Page-level feature widgets
│   ├── dashboard-interactive.tsx      # Main dashboard widget
│   ├── persona-overview.tsx           # Persona summary card
│   ├── benchmark-card.tsx             # Niche benchmark display
│   ├── growth-trend-chart.tsx         # Trend line chart (Recharts)
│   ├── growth-sparklines.tsx          # Mini sparklines
│   ├── platform-comparison.tsx        # Platform vs platform card
│   ├── file-drop-zone.tsx             # Drag-drop file upload
│   ├── experiment-form.tsx            # Experiment idea form
│   ├── explainable-score.tsx          # Score breakdown visualization
│   ├── niche-detect-card.tsx          # Niche detection result
│   ├── strategy-suggestions.tsx       # Strategy recommendation cards
│   ├── idea-cards.tsx                 # Content idea cards
│   ├── post-drawer.tsx                # Post detail drawer
│   ├── for-you-card.tsx               # Personalized recommendation
│   ├── analysis-delta-badge.tsx       # Change indicator badge
│   ├── mini-delta.tsx                 # Compact delta display
│   ├── export-button.tsx              # CSV/ICS export
│   ├── time-range-selector.tsx        # Date range picker
│   ├── dimension-switcher.tsx         # Metric toggle
│   │
│   └── loaders/                       # Data loaders (SSR → client boundary)
│       ├── import-dashboard-loader.tsx
│       ├── import-persona-loader.tsx
│       ├── import-compare-loader.tsx
│       ├── import-calendar-loader.tsx
│       ├── import-timeline-loader.tsx
│       ├── extension-data-loader.tsx
│       ├── live-collector.tsx         # Collector app status
│       ├── live-dashboard-wrapper.tsx # Live data wrapper
│       └── upgrade-banner.tsx         # Feature upgrade notice
│
├── browser-collect-status.tsx         # Collector connection status
├── cdp-setup-guide.tsx                # CDP setup instructions
├── locale-initializer.tsx             # i18n initialization
├── locale-toggle.tsx                  # Language switcher
├── site-header.tsx                    # Global navigation header
├── site-footer.tsx                    # Global footer
└── README.md                          # Component documentation
```

---

### src/lib/ — Business Logic & Utilities

```
src/lib/
│
├── engine/                            # Analysis engines (11 modules + stats)
│   ├── persona.ts                     # Persona scoring (engagement, rhythm, etc.)
│   ├── growth.ts                      # Growth delta & trend analysis
│   ├── comparator.ts                  # Cross-platform comparison
│   ├── benchmark.ts                   # Niche benchmark ranking
│   ├── benchmark-data.ts              # Benchmark dataset & niche definitions
│   ├── niche-detect.ts                # Niche classification
│   ├── strategy.ts                    # Strategy suggestion generation
│   ├── content-planner.ts             # Content calendar planning
│   ├── persona-tree.ts                # Event tree structure & scoring
│   ├── explain.ts                     # Score factorization (explainability)
│   ├── idea-generator.ts              # Experiment idea generation
│   ├── signal-collector.ts            # 18-signal feature vector
│   ├── content-analyzer.ts            # Content categorization
│   ├── next-content.ts                # Next content recommendation
│   ├── index.ts                       # Barrel export + runAllEngines()
│   │
│   ├── stats/                         # Statistical primitives (foundation)
│   │   ├── percentile.ts              # Empirical percentile calculation
│   │   ├── regression.ts              # Linear trend detection
│   │   ├── normalize.ts               # Min-max & z-score normalization
│   │   ├── threshold.ts               # Adaptive thresholding
│   │   └── index.ts                   # Stats API (rankNormalize, etc.)
│   │
│   └── __tests__/                     # Vitest unit tests
│       ├── persona.test.ts
│       ├── growth.test.ts
│       ├── comparator.test.ts
│       ├── benchmark.test.ts
│       ├── niche-detect.test.ts
│       ├── idea-generator.test.ts
│       ├── content-planner.test.ts
│       ├── explain.test.ts
│       ├── signal-collector.test.ts
│       ├── stats/ (percentile, regression, normalize, threshold)
│       └── run-all-engines.test.ts    # Integration test
│
├── adapters/                          # Data source adapters (7 sources)
│   ├── types.ts                       # DataAdapter interface
│   ├── registry.ts                    # Adapter lookup & fallback
│   ├── demo-adapter.ts                # Hardcoded test data
│   ├── html-parse-adapter.ts          # TikTok/XHS DOM scraping
│   ├── manual-import-adapter.ts       # JSON/CSV user input
│   ├── file-import-adapter.ts         # HTML file upload parsing
│   ├── browser-adapter.ts             # bb-browser CLI integration
│   ├── browser-adapter-xhs.ts         # XHS-specific browser logic
│   ├── extension-adapter.ts           # Chrome Extension IPC
│   ├── cdp-adapter.ts                 # Chrome DevTools Protocol
│   ├── index.ts                       # Public API
│   │
│   └── __tests__/                     # Adapter tests
│       ├── demo-adapter.test.ts
│       ├── file-import-adapter.test.ts
│       ├── html-parse-adapter.test.ts
│       └── extension-adapter.test.ts
│
├── schema/                            # Data model & validation
│   ├── creator-data.ts                # Core types (Post, ProfileInfo, CreatorProfile)
│   ├── persona-tree.ts                # TreeNode, TreeView types
│   ├── validate.ts                    # validateCreatorProfile(), isCreatorProfile()
│   ├── index.ts                       # Public schema API
│   │
│   └── __tests__/                     # Schema tests
│       └── validate.test.ts
│
├── textcraft/                         # ASCII art rendering engine
│   ├── TEXTCRAFT.md                   # ASCII art documentation
│   ├── index.ts                       # Public API
│   │
│   ├── core/                          # Foundation
│   │   ├── types.ts                   # Canvas, Rect, TextStyle types
│   │   ├── measure.ts                 # Text measurement (pretext.js)
│   │   ├── pretext-stub.d.ts          # Type stub for @chenglou/pretext
│   │
│   ├── fonts/                         # Font definitions
│   │   ├── registry.ts                # Font registry & lookup
│   │   ├── block-digits.ts            # Block digit ASCII font
│   │   └── dash-brand.ts              # DASH logo font
│   │
│   ├── composers/                     # Text composers
│   │   ├── ascii-logo.ts              # Logo rendering
│   │   ├── braille-line.ts            # Braille decorative line
│   │   ├── char-chart.ts              # Character-based chart
│   │   ├── data-portrait.ts           # Creator data portrait
│   │   └── text-field.ts              # Text input canvas
│   │
│   ├── effects/                       # Animation effects
│   │   ├── assemble.ts                # Canvas assembly from elements
│   │   ├── compose.ts                 # Composition utilities
│   │   └── drift.ts                   # Drift animation
│   │
│   ├── renderers/                     # Output renderers
│   │   ├── dom.ts                     # DOM renderer (pretext.js)
│   │   └── canvas.ts                  # Canvas renderer (html2canvas-pro)
│   │
│   └── __tests__/                     # Textcraft tests
│       ├── fonts.test.ts
│       ├── effects.test.ts
│       ├── composers.test.ts
│       └── measure.test.ts
│
├── pipeline/                          # Pipeline visualization config
│   ├── pipeline-config.ts             # Module definitions + routes
│   └── device-tier.ts                 # Responsive breakpoints
│
├── history/                           # Snapshot & delta tracking
│   ├── store.ts                       # Snapshot storage (localStorage)
│   ├── snapshot.ts                    # Snapshot serialization
│   ├── analysis-types.ts              # Analysis state types
│   ├── use-profile-history.ts         # React hook for history
│   ├── use-analysis-delta.ts          # React hook for delta
│   │
│   └── __tests__/
│       ├── store.test.ts
│       └── snapshot.test.ts
│
├── learning/                          # User preferences & learning
│   ├── store.ts                       # Preference storage (localStorage)
│   ├── preferences.ts                 # Preference types
│   ├── tracker.ts                     # User action tracking
│   │
│   └── __tests__/
│       └── preferences.test.ts
│
├── store/                             # Client-side state
│   └── profile-store.ts               # CreatorProfile cache
│
├── collectors/                        # Data collection helpers
│   ├── cdp-client.ts                  # CDP protocol client
│   ├── trending-collector.ts          # Trending data fetcher
│   ├── video-analyzer.ts              # Video engagement analyzer
│   └── tmp-manager.ts                 # Temp file management
│
├── export/                            # Export utilities
│   ├── csv-builder.ts                 # CSV generation
│   └── index.ts                       # Export API
│
├── i18n/                              # Internationalization
│   ├── index.ts                       # t() function + i18n setup
│   └── messages/
│       ├── en.ts                      # English messages
│       └── zh.ts                      # Chinese messages
│
├── mcp/                               # Model Context Protocol
│   └── browser-mcp-server.ts          # Browser automation MCP server
│
├── utils/                             # General utilities
│   ├── constants.ts                   # Global constants
│   ├── memo-cache.ts                  # Memoization cache (hash-based)
│   └── (additional utilities)
│
└── README.md                          # Library documentation
```

---

## collector/ — Electron Desktop App

```
collector/
├── src/
│   ├── main.ts                        # Electron main process (app entry)
│   ├── preload.ts                     # IPC bridge (sandboxed)
│   ├── browser.ts                     # Playwright browser instance
│   ├── server.ts                      # Express HTTP API (:3458)
│   └── tray.ts                        # System tray menu
│
├── dist/                              # Compiled output
│   └── (TypeScript compiled files)
│
├── build/                             # electron-builder assets
│   └── (DMG, icon, etc.)
│
├── package.json                       # Collector dependencies (Electron, Playwright, Express)
├── tsconfig.json                      # TypeScript config
├── electron-builder.json              # DMG packaging config
└── README.md                          # Collector documentation
```

---

## Key File Locations

### Entry Points

| Purpose | File | Type |
|---------|------|------|
| Web app root | `src/app/page.tsx` | React |
| App layout | `src/app/layout.tsx` | React |
| Landing | `src/app/page.tsx` | React |
| Collector | `collector/src/main.ts` | Electron |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Web app dependencies |
| `next.config.ts` | Next.js config (transpilePackages) |
| `tsconfig.json` | TypeScript strict mode |
| `tailwind.config.js` | Tailwind CSS custom tokens |
| `vitest.config.ts` | Unit test runner |
| `playwright.config.ts` | E2E test runner |

### Data Schema

| File | Purpose |
|------|---------|
| `src/lib/schema/creator-data.ts` | CreatorProfile, Post, ProfileInfo |
| `src/lib/schema/validate.ts` | Type guards & validation |
| `src/lib/schema/persona-tree.ts` | TreeNode, PersonaTree types |

### Analysis Engines

| File | Purpose |
|------|---------|
| `src/lib/engine/index.ts` | Engine barrel + runAllEngines() |
| `src/lib/engine/persona.ts` | Engagement, rhythm, consistency scoring |
| `src/lib/engine/growth.ts` | Growth delta & trend analysis |
| `src/lib/engine/comparator.ts` | Cross-platform comparison |
| `src/lib/engine/benchmark.ts` | Niche benchmark ranking |
| `src/lib/engine/signal-collector.ts` | 18-signal feature vector |

### UI State

| File | Purpose |
|------|---------|
| `src/lib/store/profile-store.ts` | Client-side profile cache |
| `src/lib/history/store.ts` | Snapshot history (localStorage) |
| `src/lib/learning/store.ts` | User preferences (localStorage) |

### i18n

| File | Purpose |
|------|---------|
| `src/lib/i18n/index.ts` | Translation function |
| `src/lib/i18n/messages/en.ts` | English translations |
| `src/lib/i18n/messages/zh.ts` | Chinese translations |

---

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `PersonaOverview.tsx`)
- **Utilities**: camelCase (e.g., `memo-cache.ts`)
- **Adapters**: -adapter suffix (e.g., `html-parse-adapter.ts`)
- **Engines**: -engine or module name (e.g., `benchmark.ts`)
- **Tests**: .test.ts or .spec.ts suffix

### Exports
- **Type-only exports**: `export type { ... }`
- **Named exports**: `export const fn = ...` or `export function fn() {}`
- **Default exports**: Rare; used for page components

### Modules
- **Barrel files**: index.ts (aggregates from sibling modules)
- **Internal files**: snake_case.ts or camelCase.ts
- **Public API**: Exported from index.ts

---

## Module Boundaries

### Strict Boundaries
- **UI components** (src/components/) should not import engine internals
- **Adapters** (src/lib/adapters/) have no dependencies on engines
- **Stats library** (src/lib/engine/stats/) is standalone
- **Collector** (collector/) is independent process

### Expected Dependencies
- UI components → lib/schema, lib/i18n, lib/utils, lib/textcraft
- Pages → components, lib/engine (via runAllEngines)
- Engines → lib/schema, lib/engine/stats, lib/utils
- Adapters → lib/schema

---

## Test Organization

```
src/lib/engine/__tests__/
├── persona.test.ts
├── growth.test.ts
├── stats/
│   ├── percentile.test.ts
│   ├── regression.test.ts
│   └── normalize.test.ts
└── run-all-engines.test.ts

src/lib/adapters/__tests__/
├── demo-adapter.test.ts
└── html-parse-adapter.test.ts

src/lib/schema/__tests__/
└── validate.test.ts
```

**Test Runner**: Vitest  
**E2E Tests**: Playwright (playwright.config.ts)

---

## Build & Distribution

### Web App
- **Build command**: `npm run build` (Next.js)
- **Output**: `.next/` directory
- **Deploy**: Vercel (production)

### Collector App
- **Build command**: `npm run build` (in collector/)
- **Output**: DMG (macOS distribution)
- **Shipping**: electron-builder via GitHub Releases

---

## Performance Characteristics

### Bundle Size
- Next.js app: ~100KB gzipped (optimized)
- Pipeline viewer: 235KB (lazy-loaded)
- Recharts: ~50KB
- Total runtime: ~200-250KB gzipped

### Load Time
- Landing: <1s (cinematic animations)
- Dashboard: <2s (engine execution)
- Collector: <5s (browser launch + profile fetch)

---

## Extension Points

### Adding a New Page
1. Create `src/app/newpage/page.tsx`
2. Import components from `src/components/`
3. Call engines via `runAllEngines()` or specific functions
4. Add route to navigation in `src/components/site-header.tsx`

### Adding a New Adapter
1. Create `src/lib/adapters/new-adapter.ts`
2. Implement `DataAdapter` interface
3. Register in `src/lib/adapters/registry.ts`
4. Add test in `src/lib/adapters/__tests__/`

### Adding a New Engine
1. Create `src/lib/engine/new-analysis.ts`
2. Export types and functions
3. Add to `src/lib/engine/index.ts` barrel export
4. Add to `runAllEngines()` if global execution
5. Add test in `src/lib/engine/__tests__/`

### Adding i18n Strings
1. Add key-value to `src/lib/i18n/messages/en.ts` and `zh.ts`
2. Use `t('key')` in components or config

---

## Documentation References

- **Textcraft ASCII Engine**: `src/lib/textcraft/TEXTCRAFT.md`
- **Component Docs**: `src/components/README.md` (if present)
- **Library Docs**: `src/lib/README.md` (if present)
- **Collector Docs**: `collector/README.md` (if present)
