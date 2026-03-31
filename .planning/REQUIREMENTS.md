# Requirements: DashPersona End-to-End Pipeline

**Defined:** 2026-03-31
**Core Value:** User can collect real creator data, see it analyzed with historical trends and cross-creator comparison, and export a professional PDF report — all locally.

## v1 Requirements

### Storage (STOR)

- [ ] **STOR-01**: Collector writes snapshot JSON files to `~/.dashpersona/data/{platform}-{uniqueId}-{ISO8601}.json` using atomic write (tmp + rename)
- [ ] **STOR-02**: Web app reads profiles from `~/.dashpersona/data/` via `/api/profiles` route handler, falls back to Demo data if no profiles exist
- [ ] **STOR-03**: Each snapshot includes `collectedAt` ISO timestamp and `schemaVersion` field
- [ ] **STOR-04**: Collector stores settings (schedules, preferences) via `electron-store` at `~/.dashpersona/config.json`

### Collection (COLL)

- [ ] **COLL-01**: Collector can collect TikTok creator data via Playwright network interception (`/api/user/detail/`, `/api/post/item_list/`)
- [ ] **COLL-02**: TikTok collection uses anti-fingerprint measures (disable AutomationControlled, delete `cdc_*`, navigation jitter 1.5–3.5s)
- [ ] **COLL-03**: User can schedule automated collection at configurable intervals via `node-cron` (every N hours / daily / custom cron)
- [ ] **COLL-04**: Scheduler persists job definitions to `~/.dashpersona/jobs.json`, survives app restart
- [ ] **COLL-05**: Scheduler handles macOS App Nap — checks missed runs on `powerMonitor` resume/unlock events
- [ ] **COLL-06**: Batch collection queues multiple creators with per-creator status (queued / running / done / failed)
- [ ] **COLL-07**: Collection status displays progress bar, current creator name, elapsed time, and error details
- [ ] **COLL-08**: Collection history log persists to `~/.dashpersona/run-log.json` with timestamp, creator, platform, status, duration

### Dashboard (DASH)

- [ ] **DASH-01**: Dashboard consumes real Collector data from `/api/profiles` instead of Demo adapter when profiles exist
- [ ] **DASH-02**: Every data display shows `collectedAt` timestamp — the primary signal of data trust
- [ ] **DASH-03**: Loading states visible for any operation over 300ms
- [ ] **DASH-04**: Actionable error messages with specific guidance (e.g. "check browser session is active")

### History (HIST)

- [ ] **HIST-01**: Historical trend chart shows follower/engagement growth over time using collected snapshots
- [ ] **HIST-02**: Granularity selector: day / week / month aggregation
- [ ] **HIST-03**: Daily delta table (last 14–30 days) showing change per metric
- [ ] **HIST-04**: T1 vs T2 snapshot comparison — user picks two dates, sees side-by-side metrics
- [ ] **HIST-05**: Velocity/acceleration metrics surfaced from existing stats library primitives

### Comparison (COMP)

- [ ] **COMP-01**: Side-by-side comparison of 2–5 creators with normalized metrics
- [ ] **COMP-02**: Cross-platform comparison uses `benchmark.ts` to normalize into percentile scores (0–100)
- [ ] **COMP-03**: Ranking within comparison set — who ranks #1 on each metric
- [ ] **COMP-04**: Radar chart for 2-creator comparison, ranked bar chart for 3–5 creators
- [ ] **COMP-05**: Add-to-comparison action directly from creator profile card

### Export (EXPT)

- [ ] **EXPT-01**: PDF single-creator report — multi-page, professionally typeset with `@react-pdf/renderer`
- [ ] **EXPT-02**: PDF includes: cover page (creator identity), key metrics summary, growth charts, engagement analysis, content analysis
- [ ] **EXPT-03**: Charts embedded as rasterized images via `html2canvas-pro` with `isAnimationActive={false}`
- [ ] **EXPT-04**: Geist fonts embedded in PDF for brand consistency
- [ ] **EXPT-05**: CSV export of raw metrics data

## v2 Requirements

### Advanced Export

- **EXPT-V2-01**: Multi-creator comparison PDF report
- **EXPT-V2-02**: Exportable comparison table (CSV/Excel)
- **EXPT-V2-03**: Scheduled auto-export after collection runs

### Advanced History

- **HIST-V2-01**: Per-post historical performance tracking
- **HIST-V2-02**: Windowed/virtualized chart rendering for 6+ months of daily data
- **HIST-V2-03**: Data retention policy configuration

### Advanced Collection

- **COLL-V2-01**: Watchlist monitoring with configurable alerts
- **COLL-V2-02**: Export/import of collected data for backup
- **COLL-V2-03**: Collection conflict resolution (scheduler vs manual simultaneous)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated insight summaries | Brand principle: deterministic, transparent algorithms only |
| Score/grade theater (A++ ranking) | Analytically shallow; undermines the engine's richer signals |
| Cloud database / user accounts | Local-first is a constraint and brand principle |
| Follower count projections | Frequently wrong; creates liability |
| Gamification / badges | Antithetical to precise, professional tone |
| Browser extension collection | Superseded by Electron + Playwright; more capable |
| Payment / subscription system | Commercial prototype only |
| Real-time live-stream data | Requires always-on collection; out of stated scope |
| Comparison of 10+ creators | Performance risk; cap at 5 for v1, revisit later |
| Email/cloud report delivery | Local-first model; no cloud infrastructure |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | 1 | Pending |
| STOR-02 | 1 | Pending |
| STOR-03 | 1 | Pending |
| STOR-04 | 1 | Pending |
| COLL-01 | 2 | Pending |
| COLL-02 | 2 | Pending |
| COLL-03 | 2 | Pending |
| COLL-04 | 2 | Pending |
| COLL-05 | 2 | Pending |
| COLL-06 | 2 | Pending |
| COLL-07 | 2 | Pending |
| COLL-08 | 2 | Pending |
| DASH-01 | 3 | Pending |
| DASH-02 | 3 | Pending |
| DASH-03 | 3 | Pending |
| DASH-04 | 3 | Pending |
| HIST-01 | 4 | Pending |
| HIST-02 | 4 | Pending |
| HIST-03 | 4 | Pending |
| HIST-04 | 4 | Pending |
| HIST-05 | 4 | Pending |
| COMP-01 | 4 | Pending |
| COMP-02 | 4 | Pending |
| COMP-03 | 4 | Pending |
| COMP-04 | 4 | Pending |
| COMP-05 | 4 | Pending |
| EXPT-01 | 5 | Pending |
| EXPT-02 | 5 | Pending |
| EXPT-03 | 5 | Pending |
| EXPT-04 | 5 | Pending |
| EXPT-05 | 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
