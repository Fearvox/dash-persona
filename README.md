# DashPersona

**Data-Agnostic Creator Intelligence Engine**

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com/)

**Live demo:** [dash-persona.vercel.app](https://dash-persona.vercel.app)

---

## What is DashPersona?

DashPersona is a deterministic creator analytics engine that transforms raw social media data into actionable persona intelligence. It ingests content from platforms like Douyin, TikTok, and Red Note (XHS) through pluggable data adapters, then runs a suite of rule-based analysis engines to produce persona scores, growth metrics, and content strategy recommendations.

Unlike AI-powered analytics tools, DashPersona uses zero LLM inference. Every score, tag, and suggestion is computed through deterministic algorithms -- cosine similarity for content classification, weighted formulas for engagement profiling, and rule-based heuristics for strategy generation. The result is a reproducible, transparent, and fast analysis pipeline that gives content creators a unified cross-platform view of their online persona.

---

## Features

### PersonaScore Engine
Classifies creator content across 31 categories using an **inverted-index classifier** — each keyword maps to its categories in O(1), reducing per-post work from O(C×K) to O(T) where T is text length. Engagement scoring uses a **weighted signal formula** (comments ×5, shares ×3, saves ×2, completion rate ×8, bounce-rate penalty ×4) modelled on production ranking systems. Persona consistency is tracked via **sparse sliding-window cosine similarity** that operates in O(P) total time. Produces a composite score (0–100) blending engagement, rhythm, consistency, and growth momentum, plus rule-based persona tags (e.g. "Consistent Publisher", "Engagement Magnet").

### Cross-Platform Comparison
Normalizes metrics across Douyin, TikTok, and Red Note into a unified `CreatorProfile` schema. Side-by-side comparison surfaces platform-specific strengths and cross-platform insights.

### Niche-Aware Benchmarking
Auto-detects a creator's content niche from their post distribution, then compares against **synthetic benchmark cohorts** generated from niche-specific statistical profiles. Ships with 10 pre-tuned niches (tutorial, entertainment, lifestyle, tech, food, fitness, fashion, travel, vlog, business) and a seeded PRNG generator that produces deterministic benchmark populations. Percentile ranking uses **binary search** for O(log n) lookups.

### Growth Tracking
Persists historical snapshots in **IndexedDB** via a client-side history store (up to 50 snapshots per profile). Computes deltas for followers, likes, and video count with sparkline charts and directional color coding. Supports configurable baseline windows for trend analysis.

### Strategy Suggestions
Generates prioritized, actionable content recommendations based on engagement patterns, posting frequency, content distribution gaps, and growth trajectory. Entirely rule-based with no external API calls.

### Data Adapters
Pluggable adapter architecture for ingesting creator data from multiple sources. Ships with four adapters: demo (built-in sample profiles), TikTok HTML parser (experimental), manual JSON import, and a **browser extension bridge** that receives live data from the Data Passport Chrome extension. New platform adapters can be registered at runtime via the adapter registry.

### Browser Extension — Data Passport
Chrome MV3 extension for one-click creator data capture from Douyin's creator dashboard (`creator.douyin.com`). Extracts profile info, post metrics, and platform-specific signals (completion rate, bounce rate, watch duration) directly from the DOM, then bridges the data to DashPersona via the `ExtensionAdapter`.

### Interactive Pipeline Visualization
A live, auto-layouted flow diagram (powered by ReactFlow + ELK) that maps every module in the analysis pipeline — from data inputs through adapters, schema validation, and engines to the output layer. Adapts element density to device performance tier (high/mid/low) detected at runtime.

### Cinematic Landing Page
Boot-sequence animation, code-art generative background, and an output-wall showcase. Performance-adaptive: disables animations on low-end devices and respects `prefers-reduced-motion`.

### Dark-Theme-First UI
Designed for extended use with a dark-first color system. Fully responsive layout built on Tailwind CSS 4.

---

## Quick Start

```bash
git clone https://github.com/Fearvox/dash-persona.git
cd dash-persona
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Try Demo** to explore with built-in sample data.

To enable experimental features, copy the environment template:

```bash
cp .env.example .env.local
```

---

## Architecture

```
                +-------------------+
                |    Data Sources   |
                | Douyin · TikTok   |
                | Red Note · Manual |
                +--------+----------+
                         |
            +------------+------------+
            |     Data Adapters       |
            | Demo | HTML | JSON | Ext|
            +------------+------------+
                         |
            +------------+------------+
            |   CreatorDataSchema     |
            | CreatorProfile + Post   |
            | (completionRate, etc.)  |
            +------------+------------+
                         |
     +--------+----------+----------+---------+
     |        |          |          |         |
     v        v          v          v         v
  Persona  Growth   Benchmark   Niche    Strategy
  Engine   Engine    Engine    Detect    Engine
     |        |          |          |         |
     +--------+----------+----------+---------+
                         |
            +------------+------------+
            |     History Store       |
            |  IndexedDB snapshots    |
            +------------+------------+
                         |
            +------------+------------+
            |     Visualization       |
            | Charts · Pipeline · UI  |
            +-------------------------+
```

**Data Sources** -- Onboarding entry points: profile URLs, HTML exports, JSON files, or live capture via the Data Passport browser extension.

**Data Adapters** -- Platform-specific modules that normalize raw data into the universal `CreatorProfile` schema. Each adapter implements the `DataAdapter` interface and is registered in a central registry. The `ExtensionAdapter` bridges data from the Chrome extension.

**CreatorDataSchema** -- The canonical TypeScript type system (`CreatorProfile`, `Post`, `ProfileInfo`, `HistorySnapshot`) that serves as the contract between adapters and engines. Includes platform-specific quality signals (`completionRate`, `bounceRate`, `avgWatchDuration`).

**Analysis Engines** -- Six independent engines (persona, comparator, benchmark, niche-detect, growth, strategy) that accept `CreatorProfile` inputs and produce typed analysis results. All engines are pure functions with no side effects.

**History Store** -- Client-side IndexedDB persistence that stores up to 50 snapshots per profile, enabling longitudinal growth tracking across sessions.

**Visualization** -- React components powered by Recharts and ReactFlow that render engine outputs as interactive charts, score cards, sparklines, pipeline diagrams, and recommendation panels.

---

## Tech Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Framework      | Next.js 16 (App Router, Turbopack)            |
| UI Library     | React 19                                      |
| Language       | TypeScript 5                                  |
| Charts         | Recharts 3                                    |
| Pipeline Viz   | @xyflow/react + elkjs (auto-layout)           |
| Styling        | Tailwind CSS 4                                |
| Client Storage | IndexedDB (history snapshots)                 |
| Extension      | Chrome MV3 + Vite (Data Passport)             |
| Deployment     | Vercel                                        |

---

## Data Adapters

| Adapter                | Platform | Source                  | Status        |
|------------------------|----------|-------------------------|---------------|
| `DemoAdapter`          | Any      | Built-in data           | Stable        |
| `HTMLParseAdapter`     | TikTok   | HTML export             | Experimental  |
| `ManualImportAdapter`  | Any      | JSON file               | Stable        |
| `ExtensionAdapter`     | Douyin   | Browser extension data  | Beta          |

All adapters implement the `DataAdapter` interface and can be registered dynamically:

```ts
import { registerAdapter, getAdapter } from '@/lib/adapters';
```

---

## Roadmap

- [x] Benchmark comparison against niche-specific averages (10 niches, seeded cohort generation)
- [x] Browser extension for one-click Douyin data capture (Data Passport, Chrome MV3)
- [x] IndexedDB client-side persistence for growth history (up to 50 snapshots)
- [x] Platform-specific quality signals (completion rate, bounce rate, watch duration)
- [x] Interactive pipeline visualization (ReactFlow + ELK auto-layout)
- [ ] Red Note and TikTok live adapters
- [ ] Continuous background data collection via extension
- [ ] i18n support (Chinese)
- [ ] Export reports as PDF / shareable link

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies with `npm install`.
3. Run the dev server with `npm run dev` and verify your changes.
4. Ensure `npm run build` and `npm run lint` pass without errors.
5. Open a pull request with a clear description of the change and its motivation.

For bug reports and feature requests, please open an issue on GitHub.

---

## License

DashPersona is licensed under the **Business Source License 1.1 (BSL 1.1)**.

- **Source available** -- you may read, fork, and modify the code.
- **Non-production use** is permitted without a license.
- **Production use** requires a separate commercial license from [Fearvox](mailto:nolan@openclaw.dev).
- On **2030-03-24**, the license automatically converts to **Apache License 2.0**.

See [LICENSE](./LICENSE) for the full license text.
