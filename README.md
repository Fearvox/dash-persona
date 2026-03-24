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
Classifies creator content across 31 categories using cosine similarity against a keyword taxonomy. Produces a composite persona score combining content distribution, engagement profile, posting rhythm, consistency, and growth health. Generates rule-based persona tags (e.g. "Consistent Publisher", "Engagement Magnet") derived from the computed metrics.

### Cross-Platform Comparison
Normalizes metrics across Douyin, TikTok, and Red Note into a unified `CreatorProfile` schema. Side-by-side comparison surfaces platform-specific strengths and cross-platform insights.

### Growth Tracking
Computes deltas between historical snapshots for followers, likes, and video count. Renders sparkline charts with directional color coding (green for growth, red for decline). Supports configurable baseline windows for trend analysis.

### Strategy Suggestions
Generates prioritized, actionable content recommendations based on engagement patterns, posting frequency, content distribution gaps, and growth trajectory. Entirely rule-based with no external API calls.

### Data Adapters
Pluggable adapter architecture for ingesting creator data from multiple sources. Ships with a demo adapter (built-in sample profiles), a TikTok HTML parse adapter (experimental), and a manual JSON import adapter. New platform adapters can be registered at runtime via the adapter registry.

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
                         +------------------+
                         |    Onboarding    |
                         |   (URL / File)   |
                         +--------+---------+
                                  |
                                  v
                    +-------------+-------------+
                    |       Data Adapters        |
                    |  Demo | HTML Parse | JSON  |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |    CreatorDataSchema       |
                    |  (CreatorProfile type)     |
                    +-------------+-------------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
     +--------+------+  +--------+------+  +---------+--------+
     | Persona Engine |  | Growth Engine |  | Strategy Engine  |
     | Score + Tags   |  | Delta + Spark |  | Recommendations  |
     +--------+------+  +--------+------+  +---------+--------+
              |                   |                   |
              +-------------------+-------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |      Visualization         |
                    |  Charts + Cards + Tables   |
                    +---------------------------+
```

**Onboarding** -- The entry point where users provide a profile URL, upload an HTML export, paste JSON, or select a demo profile.

**Data Adapters** -- Platform-specific modules that normalize raw data into the universal `CreatorProfile` schema. Each adapter implements the `DataAdapter` interface and is registered in a central registry.

**CreatorDataSchema** -- The canonical TypeScript type system (`CreatorProfile`, `Post`, `ProfileInfo`, `HistorySnapshot`) that serves as the contract between adapters and engines.

**Analysis Engines** -- Five independent engines (persona, comparator, benchmark, growth, strategy) that accept `CreatorProfile` inputs and produce typed analysis results. All engines are pure functions with no side effects.

**Visualization** -- React components powered by Recharts that render the engine outputs as interactive charts, score cards, sparklines, and recommendation panels.

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Next.js 16 (App Router, Turbopack)  |
| UI Library     | React 19                            |
| Language       | TypeScript 5                        |
| Charts         | Recharts 3                          |
| Styling        | Tailwind CSS 4                      |
| Deployment     | Vercel                              |

---

## Data Adapters

| Adapter                | Platform | Source         | Status        |
|------------------------|----------|----------------|---------------|
| `DemoAdapter`          | Any      | Built-in data  | Stable        |
| `HTMLParseAdapter`     | TikTok   | HTML export    | Experimental  |
| `ManualImportAdapter`  | Any      | JSON file      | Stable        |

All adapters implement the `DataAdapter` interface and can be registered dynamically:

```ts
import { registerAdapter, getAdapter } from '@/lib/adapters';
```

---

## Roadmap

- [ ] Continuous data collection and growth history persistence
- [ ] Benchmark comparison against category averages
- [ ] Douyin and Red Note live adapters
- [ ] Browser extension adapter for one-click data capture
- [ ] IndexedDB client-side persistence for offline use
- [ ] i18n support (Chinese)

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
