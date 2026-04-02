# DashPersona — End-to-End Creator Intelligence

## What This Is

DashPersona is a data-agnostic creator intelligence engine that analyzes social media presence across Douyin, TikTok, and Red Note (XHS) with deterministic, AI-free algorithms. This milestone completes the end-to-end pipeline: Collector adopts → data flows into Web App → real analysis → historical tracking → PDF export. The result serves as both a technical showcase (50%) and a commercial prototype for MCN/brand use (40%).

## Core Value

A user can collect real creator data, see it analyzed in the dashboard with historical trends and cross-creator comparison, and export a professional PDF report — all locally, no cloud dependency.

## Requirements

### Validated

- ✓ 11-module analysis engine (persona, growth, comparator, benchmark, etc.) — existing
- ✓ 7 data adapters (CDP, Demo, FileImport, Manual, Extension, HTMLParse, Browser) — existing
- ✓ Signal collector (18 signals) + stats library — existing
- ✓ Landing page with cinematic animations — existing
- ✓ Pipeline visualization (@xyflow/react + elkjs) — existing
- ✓ Dashboard with charts (Recharts) — existing
- ✓ Electron Collector app (Playwright + Express :3458) — existing
- ✓ Douyin + XHS data collection — existing
- ✓ Dark mode design system (Geist fonts, custom color tokens) — existing
- ✓ macOS ad-hoc signing + install script in DMG — v0.7.1

### Active

- [ ] TikTok platform data collection in Collector
- [ ] Automated/scheduled collection (batch mode, timer-based)
- [ ] Collection status feedback (progress bar, error display, history log)
- ✓ Real data integration — Dashboard consumes Collector data instead of Demo — Validated in Phase 3
- [ ] Local JSON file storage for historical data persistence
- [ ] Historical trend tracking — timeline views showing metric changes over time
- [ ] Multi-creator comparison — side-by-side analysis of multiple creators
- [ ] PDF report export — professionally typeset multi-page report

### Out of Scope

- Cloud database / user accounts — keeping local-first, zero cloud dependency
- Mobile app — web + desktop only
- AI-powered analysis — deterministic algorithms only (brand principle)
- Real-time streaming data — batch collection is sufficient
- Monetization/payment system — commercial prototype only, not production SaaS

## Context

- **Existing codebase**: v0.7.0, Next.js 16 + React 19 + Tailwind CSS 4, TypeScript strict
- **Collector**: Electron app with Playwright browser automation + Express HTTP API on :3458
- **Analysis engine**: 11 modules, all pure functions, parallelizable via Promise.all
- **Data schema**: CreatorDataSchema with Post, ProfileInfo, Platform types
- **Design system**: Dark mode only, Geist Sans/Mono, custom color tokens, no emoji in UI
- **Build**: Vitest for testing, html2canvas-pro for screenshots, Recharts for charts
- **Prior work**: Visual overhaul sprint completed 2026-03-24→30, inline styles eliminated

## Constraints

- **Tech stack**: Next.js 16 + React 19 + Tailwind CSS 4 — no new framework dependencies
- **Data storage**: Local JSON files only — no database, no cloud services
- **Design**: Must follow existing design system (dark mode, Geist fonts, color tokens, no emoji)
- **PDF**: Client-side generation — no server-side rendering service
- **Collector**: Electron + Playwright — no browser extension approach
- **Determinism**: All analysis must be reproducible — same input, same output

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local JSON for history | Zero dependency, user data stays on machine, aligns with local-first philosophy | — Pending |
| PDF export client-side | No server cost, works offline, consistent with local-first approach | — Pending |
| TikTok via Playwright | Same approach as Douyin/XHS, proven pattern in Collector | — Pending |
| 50% showcase + 40% commercial | Dual positioning — portfolio piece that can also demo to MCN clients | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
