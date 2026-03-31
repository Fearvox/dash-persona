# DashPersona Pipeline — Research Summary

Synthesized from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md — 2026-03-31

---

## Stack Decisions

| Decision | Rationale |
|----------|-----------|
| `@react-pdf/renderer ^4.3.2` for PDF layout | Declarative JSX model, vector text, proper font embedding — jsPDF produces blurry rasterized output |
| `html2canvas-pro` (existing) for chart capture | Recharts SVGs cannot be embedded directly in react-pdf; rasterize off-screen first with `isAnimationActive={false}` |
| `fs/promises` + atomic rename for JSON storage | No third-party library needed; write-to-tmp then `fs.rename()` is atomic on POSIX; simpler than any alternative |
| `electron-store ^10.0.0` for Collector settings only | Key-value config only; not for historical snapshots (degrades past 200KB) |
| `node-cron ^4.2.1` for scheduled collection | Pure JS, no native binaries, built-in TypeScript types, familiar cron expressions |
| Playwright network interception for TikTok | No new library; intercept `/api/user/detail/` and `/api/post/item_list/` via `page.waitForResponse` / `page.on('response')` |
| `~/.dashpersona/` as shared file-system bus | Collector writes, web app reads via Node.js `fs` in route handlers — no Electron IPC needed |

---

## Table Stakes Features

Features users assume work and will abandon the product without:

- **Last-collected timestamp** on every data display — the primary signal of data trust
- **Visible loading state** for any operation over 300ms — silent loads feel broken
- **Actionable error messages** — "Could not reach Douyin — check that your browser session is active", not "Something went wrong"
- **Follower/engagement growth chart over time** — a tool without this is not credible
- **2–3 creator side-by-side comparison** — minimum for professional use
- **CSV data export** — users expect to get their data out
- **PDF single-creator report** — the expected professional deliverable; stated milestone goal

---

## Differentiators

What no SaaS competitor currently offers:

- **User-configurable scheduled collection** — no competitor offers personal-watchlist scheduling; this is genuine whitespace
- **Offline-capable, local-first data** — no SaaS competitor stores data on the user's machine; privacy-advantaged by design
- **Collection provenance / audit trail** — exact timestamp per snapshot; cloud platforms backfill data silently
- **Per-creator collection status in batch view** — queued / running / done / failed per creator; Chanmama is the closest analog, rare elsewhere
- **Velocity and acceleration metrics** — rate-of-change on growth is available via the existing stats primitives; no competitor surfaces this
- **Cross-snapshot T1 vs T2 comparison** — snapshot model enables comparing the same creator at two points in time; trivial in DashPersona, hard everywhere else
- **Non-blocking background collection with progress** — Electron + Playwright makes collection time visible and controllable; SaaS hides this entirely

---

## Architecture Summary

### Build Order (strict dependency DAG)

```
Phase 1 — Foundation
  [5] Local JSON storage schema (~/.dashpersona/ layout, jobs.json, run-log.json)
      → unblocks everything else

Phase 2 — Collector capabilities (parallel tracks)
  [1] TikTok collection in CDPAdapter (no Phase 1 dependency)
  [2] Scheduled collection scheduler.ts + jobs.ts (needs Phase 1)
  [3] Collection status feedback — /stream/events for manual collections (no Phase 1 dependency)

Phase 3 — Real data in web app (needs Phase 1)
  [4] GET /api/profiles route handler reads ~/.dashpersona/data/
      → dashboard falls back to demo if no profiles exist

Phase 4 — History + Comparison (needs Phase 3)
  [6] Historical trend views — GET /api/profiles/history + TrendTimeline component
  [7] Multi-creator comparison — extend compare page + CreatorSelector

Phase 5 — Export (independent; most valuable after Phase 4)
  [8] PDF generation pipeline — jsPDF + html2canvas-pro
```

### Key Integration Points

- **File-system bus**: Collector writes `{platform}-{uniqueId}-{ISO8601}.json` to `~/.dashpersona/data/`; web app reads via Next.js route handlers (`/api/profiles`, `/api/profiles/history`) — clean one-way flow, no IPC
- **TikTok extraction stays in CDPAdapter** (web app), not Collector — keeps Collector platform-agnostic and extraction testable without Electron
- **IndexedDB history layer is preserved** as within-session cache; filesystem is the cross-session source of truth
- **PDF uses DOM refs** — chart components expose `ref` props; `PDFExportButton` captures each section via `html2canvas-pro` then assembles pages in jsPDF

---

## Critical Pitfalls

**P1 — TikTok anti-bot fingerprinting (High risk)**
Playwright's default Chromium is detectable; triggers CAPTCHA or soft-ban.
Prevention: add `--disable-blink-features=AutomationControlled` arg + `page.addInitScript` to delete `window.cdc_*` and mask `navigator.webdriver`; keep `headless: false`; use random 1.5–3.5s navigation jitter; never fake UA strings.

**P2 — Concurrent writes corrupt JSON files (High risk)**
Two simultaneous writes (scheduler + manual collection) can produce truncated or zero-byte files.
Prevention: write to `.tmp` first, then `fs.rename()` (atomic on POSIX); serialize all writes through a Promise chain; clean up orphaned `.tmp` files on startup.

**P3 — macOS App Nap skips scheduled timers (High risk)**
macOS throttles background timers; overnight runs go missing silently.
Prevention: subscribe to `powerMonitor` `resume`/`unlock-screen` events and check for missed runs; use `powerSaveBlocker` only during active collection; record skipped runs as `status: 'missed'` so gaps are visible.

**P4 — Recharts SVG capture produces blank or broken charts in PDF (Medium risk)**
`html2canvas-pro` drops gradients, clip-paths, and SVG transforms; charts appear correct on screen but blank in PDF.
Prevention: render each Recharts component off-screen with `isAnimationActive={false}`, capture via `canvas.toDataURL()` before passing to the PDF builder — never capture live DOM SVGs directly.

**P5 — Raw metric comparison is misleading across platforms (Medium risk)**
Douyin and TikTok have different algorithm reach and typical engagement rates; comparing raw follower counts misleads clients.
Prevention: use existing `benchmark.ts` platform-specific baselines to normalize into percentile scores (0–100); present "Platform-Adjusted Score" as the primary comparison axis with raw metrics secondary; label every normalized metric with its basis.

---

## Anti-Features

Deliberately not building:

| Anti-feature | Why |
|-------------|-----|
| AI-generated insight summaries | Brand principle: deterministic, transparent algorithms; AI narrative is the exact opposite |
| "Grade" or score theater (A++ ranking) | Analytically shallow; undermines the 11-module engine's richer signal |
| Follower count projections / estimates | Frequently wrong; creates liability; distract from real data |
| Social comparison benchmarks from undocumented populations | Meaningless without auditable methodology; "above 73% of creators" is theater |
| Gamification / badges / milestones | Antithetical to the precise, professional tone |
| Email / cloud sync of collected data | Local-first is a constraint and a brand principle; opens privacy/compliance complexity |
| Scheduled auto-reports with cloud delivery | Local-first model complicates delivery; cloud feature grafted onto a desktop tool |
| Browser extension collection path | Explicitly superseded by Electron + Playwright; more capable, already built |
| Payment / subscription gating | Commercial prototype only; no paywall infrastructure |
| Real-time live-stream data | Requires always-on collection; out of stated scope |
