# Roadmap: DashPersona End-to-End Pipeline

**Created:** 2026-03-31
**Granularity:** Coarse (3-5 phases)
**Total requirements:** 31

---

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Storage | Establish the `~/.dashpersona/` file-system bus and Collector settings infrastructure that every other phase depends on | STOR-01, STOR-02, STOR-03, STOR-04 | 4 reqs / 2 criteria |
| 2 | Collector Capabilities | TikTok collection, scheduled automation, batch status feedback, and run-log persistence | COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06, COLL-07, COLL-08 | 8 reqs / 4 criteria |
| 3 | Real Data Integration | Dashboard reads live Collector snapshots; trust signals and error UX wired up | DASH-01, DASH-02, DASH-03, DASH-04 | 4 reqs / 3 criteria |
| 4 | History & Comparison | Timeline trend views, snapshot diffing, and multi-creator side-by-side analysis | HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05 | 10 reqs / 4 criteria |
| 5 | Export | PDF single-creator report and CSV raw-data export | EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05 | 5 reqs / 3 criteria |

---

## Phase Details

### Phase 1: Foundation & Storage
**Goal:** Create the `~/.dashpersona/` directory layout, atomic JSON write utilities, and Collector settings store so that all subsequent phases have a stable, shared file-system bus.

**Requirements:** STOR-01, STOR-02, STOR-03, STOR-04

**UI hint:** No new UI — this is infrastructure only.

**Success criteria:**
1. Running Collector and collecting any creator produces a `{platform}-{uniqueId}-{ISO8601}.json` file in `~/.dashpersona/data/` with correct `collectedAt` and `schemaVersion` fields.
2. Web app `/api/profiles` returns collected profiles when files exist, and falls back to Demo data when the directory is empty or absent.

---

### Phase 2: Collector Capabilities
**Goal:** Extend the Collector with TikTok support, scheduler, batch progress UI, and a persistent run log — making automated multi-creator collection viable and observable.

**Requirements:** COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06, COLL-07, COLL-08

**UI hint:** Yes — Collector UI gains progress bar, batch status table, and scheduler configuration panel.

**Plan progress:**
| Plan | Title | Status |
|------|-------|--------|
| 02-01 | TikTok Collection Engine | Complete |
| 02-02 | Scheduler & Job Persistence | Complete |
| 02-03 | Run Log System | Complete |
| 02-04 | Batch Queue & Collector UI | Complete |

**Success criteria:**
1. User can collect a TikTok creator profile end-to-end without triggering a CAPTCHA or soft-ban (anti-fingerprint measures active).
2. User can create a scheduled job (e.g. daily at 09:00) that persists across Collector restarts and fires correctly after a system wake/unlock.
3. A batch of 3+ creators shows per-creator status (queued / running / done / failed) with elapsed time and error details visible in real time.
4. After any collection run (manual or scheduled), an entry appears in the history log with timestamp, creator, platform, status, and duration.

---

### Phase 3: Real Data Integration
**Goal:** Wire the web app dashboard to real Collector snapshots instead of the Demo adapter, with data-trust timestamps, loading states, and actionable error messages throughout.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**UI hint:** Yes — every data display gains a `collectedAt` timestamp badge; loading skeletons and error states are added.

**Plans:** 2 plans

Plans:
- [ ] 03-01-PLAN.md — Data layer: extend resolveProfiles() with source metadata + utility modules
- [ ] 03-02-PLAN.md — UI components + page loader upgrades for source-aware rendering

**Success criteria:**
1. After collecting a creator in the Collector, the web app dashboard shows that creator's real data (not demo) without any manual configuration.
2. Every metric card and chart displays the `collectedAt` timestamp for the underlying snapshot.
3. Errors (e.g. Collector unreachable, malformed snapshot) produce a human-readable message with specific remediation guidance — never a generic "Something went wrong".

---

### Phase 4: History & Comparison
**Goal:** Surface historical trend views (growth over time, daily deltas, T1 vs T2 snapshots) and multi-creator side-by-side comparison with normalized cross-platform scoring.

**Requirements:** HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05

**UI hint:** Yes — new TrendTimeline component, daily-delta table, T1/T2 date pickers, and comparison view with radar/bar charts.

**Success criteria:**
1. A creator with 5+ snapshots spanning multiple days shows a follower/engagement trend chart with day / week / month granularity selector and correct velocity/acceleration annotations.
2. A daily delta table for the last 14–30 days shows per-metric change values derived from consecutive snapshots.
3. Selecting two snapshot dates produces a side-by-side T1 vs T2 diff view with metric deltas highlighted.
4. Selecting 2–5 creators opens a comparison view with normalized (0–100 percentile) scores, per-metric rankings, and a radar chart (2 creators) or ranked bar chart (3–5 creators).

---

### Phase 5: Export
**Goal:** Generate professional single-creator PDF reports (with embedded charts and Geist fonts) and CSV raw-data exports, completing the end-to-end local pipeline.

**Requirements:** EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05

**UI hint:** Yes — Export button added to creator profile and comparison views.

**Success criteria:**
1. Clicking "Export PDF" produces a downloadable, multi-page PDF containing: cover page, key metrics summary, growth charts (rasterized via html2canvas-pro), engagement analysis, and content analysis — all typeset in Geist fonts.
2. Charts in the exported PDF are visually correct (no blank/broken SVGs) because they were captured off-screen with `isAnimationActive={false}`.
3. Clicking "Export CSV" produces a well-formed CSV file containing all raw metric fields for the selected creator/snapshot.

---

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| STOR-01 | 1 |
| STOR-02 | 1 |
| STOR-03 | 1 |
| STOR-04 | 1 |
| COLL-01 | 2 |
| COLL-02 | 2 |
| COLL-03 | 2 |
| COLL-04 | 2 |
| COLL-05 | 2 |
| COLL-06 | 2 |
| COLL-07 | 2 |
| COLL-08 | 2 |
| DASH-01 | 3 |
| DASH-02 | 3 |
| DASH-03 | 3 |
| DASH-04 | 3 |
| HIST-01 | 4 |
| HIST-02 | 4 |
| HIST-03 | 4 |
| HIST-04 | 4 |
| HIST-05 | 4 |
| COMP-01 | 4 |
| COMP-02 | 4 |
| COMP-03 | 4 |
| COMP-04 | 4 |
| COMP-05 | 4 |
| EXPT-01 | 5 |
| EXPT-02 | 5 |
| EXPT-03 | 5 |
| EXPT-04 | 5 |
| EXPT-05 | 5 |

**Coverage: 31 / 31 (100%)**

---
*Roadmap created: 2026-03-31*
