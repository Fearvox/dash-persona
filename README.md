# DashPersona

**Understand your creator persona across Douyin, TikTok, and Red Note — with zero AI.**

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com/)
[![Built with EverMemOS](https://img.shields.io/badge/Built%20with-EverMemOS-F5A623?style=flat&logo=github&logoColor=000)](https://github.com/EverMind-AI/EverMemOS)

<p align="center">
  <a href="https://www.youtube.com/watch?v=XwvHWx6m6dw">
    <img src="https://img.youtube.com/vi/XwvHWx6m6dw/maxresdefault.jpg" alt="DashPersona Demo Video" width="720" />
  </a>
  <br />
  <sub><b>Watch the demo →</b></sub>
</p>

<p align="center">
  <a href="https://dash-persona.vercel.app"><strong>Try the live demo →</strong></a>
</p>

---

## The Problem

Content creators manage multiple platforms but have no unified view of their performance. Each platform's analytics lives in a silo, metrics aren't comparable, and most "analytics tools" are either expensive SaaS products or black-box AI that can't explain its recommendations.

## How DashPersona Solves It

DashPersona ingests your creator data from **Douyin**, **TikTok**, and **Red Note**, normalizes it into a unified schema, and runs it through **9 deterministic analysis engines**. Every score, tag, and recommendation is computed with transparent algorithms — no LLM calls, no API keys, no subscription fees. You can trace any number back to the formula that produced it.

---

## Why This Matters

### For Creators

China's creator economy exceeds **¥1.5 trillion** annually, but individual creators still fly blind. Platform analytics are siloed, metrics aren't comparable, and third-party tools charge monthly subscriptions for black-box outputs. DashPersona gives every creator a transparent, self-hosted intelligence engine — at zero cost.

### How It Was Built — EverMem-Powered Development

DashPersona was built across **20+ sessions** spanning multiple weeks using [EverMemOS](https://github.com/EverMind-AI/EverMemOS) as the persistent memory layer for AI-assisted development. EverMemOS is an open-source structured memory system for AI coding agents — it runs as a Claude Code plugin that automatically captures architectural decisions, sprint plans, and debugging context into a queryable knowledge base. Each session starts with relevant memories recalled, not a blank slate. This project is a living case study of what structured agent memory enables:

**Full-lifecycle plan tracking** — From initial scaffold to 9 analysis engines, every sprint (Phase 1–5 + visual overhaul + Data Passport extension) was planned, executed, and tracked through EverMem. Architecture decisions made in Session 1 were correctly recalled and enforced in Session 20 — no context hallucination, no re-discovery.

**Precise memory recall across agents** — Four isolated memory spaces (Claude Code, OpenClaw, Codex CLI, Gemini CLI) operated on the same codebase without cross-contamination. When Codex reviewed a PR, it accessed only its scoped memory. When Claude Code resumed a sprint, it recalled the exact plan state, DOM selectors, and unfinished tasks from prior sessions.

**Architecture coherence at scale** — The 9 deterministic engines, 4 data adapters, and Chrome extension were designed across separate sessions but maintain consistent interfaces. EverMem preserved the `CreatorDataSchema` contract, adapter registration pattern, and engagement scoring formula (comments ×5, shares ×3, saves ×2) across every session that touched these boundaries.

**Decision archaeology** — Every non-obvious choice is traceable: why BSL 1.1 over MIT, why inverted-index over embedding search for content classification, why IndexedDB over server-side storage, why CSS semantic prefix matching for Douyin DOM selectors. These decisions survive context windows and model switches because they live in structured memory, not chat history.

```
Development Timeline (tracked by EverMem)
──────────────────────────────────────────
Session 1–3    Initial scaffold → analysis engines → dashboard wiring
Session 4–7    TikTok adapter → live data → sparklines → cross-platform compare
Session 8–10   Persona detail → explainable metrics → interactive charts
Session 11–14  Content calendar → persona tree → idea generator → settings
Session 15–17  Algorithm optimization → Data Passport extension → pipeline viz
Session 18–20  Visual overhaul sprint → design system → hackathon polish
Session 20+    History persistence → benchmarking → production hardening
```

> **9 analysis engines. 5 data adapters. 15 E2E tests. 189 unit tests. 1 Chrome extension. Zero context lost between sessions.**

---

## See It in Action

### Dashboard — Your command center

Growth sparklines, cross-platform follower deltas, niche benchmarking, and strategy suggestions — all on one screen.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard with growth overview, benchmark comparison, and strategy suggestions" width="720" />
</p>

### Persona Score — Know your strengths

A composite 0–100 score breaking down your content mix, engagement rate, posting rhythm, persona consistency, growth health, and viral potential. Click any dimension to see the exact formula.

<p align="center">
  <img src="docs/screenshots/persona.png" alt="Persona detail page with dimension breakdown and persona tags" width="720" />
</p>

### Cross-Platform Comparison — Find your best platform

Side-by-side metrics across all your platforms. Automatically surfaces insights like "your audience on Douyin is 4.2× larger than on Red Note" and "your content gets 1.8× more engagement on Red Note than TikTok."

<p align="center">
  <img src="docs/screenshots/compare.png" alt="Cross-platform comparison with key metrics and insight highlights" width="720" />
</p>

---

## Key Features

| Feature | What it does |
|---------|-------------|
| **Persona Score** | Composite 0–100 score across 6 dimensions with explainable formulas |
| **Niche Detection** | Auto-detects your content niche from 10 benchmark categories with confidence score and related keywords |
| **Radar Comparison** | Multi-dimensional radar chart comparing followers, engagement, posts, views, and total interactions across platforms |
| **Growth Tracking** | Historical snapshots stored locally — track followers, likes, and videos over time with trend charts |
| **Strategy Engine** | Actionable recommendations based on your actual engagement patterns |
| **Content Calendar** | AI-free publishing schedule optimized from your best-performing time slots |
| **Persona Timeline** | Decision tree for tracking strategy experiments and pivots |
| **File Import** | Drag-and-drop CSV, XLSX, and JSON files — auto-detects 4 Douyin export schemas and merges multi-file uploads |
| **Report Export** | Export your dashboard as PNG screenshot or PDF print |
| **Data Passport** | Chrome extension that captures Douyin creator data in one click |
| **Cross-Platform** | Unified view across Douyin, TikTok, and Red Note |

---

## Quick Start

```bash
git clone https://github.com/Fearvox/dash-persona.git
cd dash-persona
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and click **Try Demo** to explore with built-in sample data — no login, no API keys, no setup.

---

## How It Works

```
  Your Data                    Analysis Engines                  What You See
 ───────────                  ──────────────────                ──────────────
 Douyin profile ──┐
 TikTok export ───┤           ┌─ Persona Score                  Dashboard
 Red Note data ───┼── Schema ─┼─ Growth Tracker                 Persona Detail
 JSON / CSV ──────┤   Check   ├─ Niche Detection                Compare View + Radar
 XLSX (4 schemas) ┤           ├─ Niche Benchmark                Content Calendar
 Chrome extension ┘           ├─ Strategy Engine                Persona Timeline
                              ├─ Content Planner                Pipeline View
                              ├─ Cross-Platform Comparator      Export (PNG/PDF)
                              └─ Idea Generator
```

**All engines are deterministic.** Same input always produces the same output. No randomness, no model weights, no external API calls.

### Under the Hood

- **Content classification** — inverted-index keyword matching across 31 categories
- **Engagement scoring** — weighted formula (comments ×5, shares ×3, saves ×2) modelled on production ranking systems
- **Persona consistency** — sliding-window cosine similarity between content periods
- **Niche detection** — maps content distribution to 10 benchmark niches with synthetic cohort comparison
- **Growth analysis** — delta computation over IndexedDB-persisted historical snapshots
- **Engine memoization** — FNV-1a content hashing with LRU eviction (maxSize=64) avoids redundant computation
- **XLSX schema detection** — auto-classifies 4 Douyin export formats (作品列表, 投稿分析, 投稿汇总, 时间序列) and merges multi-file uploads into a single profile

---

## Data Adapters

| Adapter | Platform | How it works | Status |
|---------|----------|-------------|--------|
| `DemoAdapter` | Any | Built-in sample profiles for instant exploration | Stable |
| `HTMLParseAdapter` | TikTok, Douyin, Red Note | Parses exported HTML from platform pages | Stable |
| `FileImportAdapter` | Any | Drag-and-drop CSV, XLSX, JSON files with auto-schema detection | Stable |
| `ManualImportAdapter` | Any | Upload your own JSON data with schema validation | Stable |
| `ExtensionAdapter` | Douyin | Receives live data from Data Passport extension | Beta |

Want to add a new platform? Implement the `DataAdapter` interface and register it:

```ts
import { registerAdapter } from '@/lib/adapters';
registerAdapter(new YourAdapter());
```

---

## Tech Stack

| | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19 + Tailwind CSS 4 |
| Charts | Recharts 3 |
| Testing | Vitest + Playwright |
| Client Storage | IndexedDB |
| Extension | Chrome MV3 + Vite |
| Deploy | Vercel |

---

## Roadmap

- [x] Niche-aware benchmarking (10 niches, synthetic cohort comparison)
- [x] Browser extension for one-click Douyin data capture
- [x] Client-side history persistence (IndexedDB)
- [x] Platform-specific quality signals (completion rate, bounce rate, watch duration)
- [x] Multi-file import with 4 Douyin XLSX schema auto-detection
- [x] Radar chart multi-dimensional cross-platform comparison
- [x] Report export as PNG and PDF
- [x] Engine memoization with FNV-1a content hashing and LRU eviction
- [x] E2E test coverage with Playwright (15 test cases across 5 core flows)
- [x] Accessibility: focus-visible, skip-to-content, semantic landmarks, keyboard navigation
- [ ] Red Note and TikTok live adapters
- [ ] Continuous background data collection via extension
- [ ] i18n support (Chinese)

---

## Contributing

1. Fork the repo and create a feature branch from `main`
2. `npm install` → `npm run dev`
3. Make your changes, ensure `npm run build` passes
4. Open a PR with a clear description

---

## License

**Business Source License 1.1 (BSL 1.1)**

- Source available — read, fork, and modify freely
- Non-production use permitted without a license
- Production use requires a commercial license from [Fearvox](mailto:nolan@openclaw.dev)
- Converts to **Apache 2.0** on 2030-03-24

See [LICENSE](./LICENSE) for the full text.
