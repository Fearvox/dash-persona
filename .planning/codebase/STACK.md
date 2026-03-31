# Technology Stack — DashPersona

## Language & Runtime

- **Language**: TypeScript 5.x (strict mode)
- **Runtime**: Node.js v25.x (from `node --version`)
- **Package Manager**: npm 11.x
- **Target**: ES2017

## Core Framework & Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.1 | Full-stack React framework (App Router) |
| `react` | 19.2.4 | UI rendering engine |
| `react-dom` | 19.2.4 | React DOM adapter |
| `tailwindcss` | 4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | 4 | PostCSS plugin for Tailwind CSS 4 |

## Data Visualization & Flow

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | 3.8.0 | React charting library |
| `@xyflow/react` | 12.10.1 | Declarative flow/node graph visualization |
| `elkjs` | 0.11.1 | ELK layout algorithm (hierarchical graph layout) |
| `html2canvas-pro` | 2.0.2 | Screenshot/canvas rendering |
| `xlsx` | 0.18.5 | Excel file parsing & generation |

## Internal Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `@chenglou/pretext` | 0.0.2 | ASCII art rendering engine (ships raw .ts, requires transpilePackages) |

## Build & Development

| Tool | Version | Purpose |
|---------|---------|---------|
| TypeScript | 5.x | Type checking |
| ESLint | 9.x | Linting (with Next.js & TypeScript configs) |
| Vitest | 4.1.1 | Unit & component testing framework |
| Playwright | 1.58.2 | E2E testing |

### Build Configuration

- **`next.config.ts`** (`/Users/0xvox/.openclaw/workspace/dash-persona/next.config.ts`):
  - `transpilePackages: ["@chenglou/pretext"]` — transpile raw .ts in pretext
  - `typescript.ignoreBuildErrors: true` — pretext uses .ts import extensions; own code checked via `npm run type-check`

- **`tsconfig.json`** (`/Users/0xvox/.openclaw/workspace/dash-persona/tsconfig.json`):
  - `target: ES2017`
  - `module: esnext`
  - `strict: true`
  - Path alias: `@/* -> ./src/*`
  - Excludes: `node_modules`, `extension`, `@chenglou/pretext`

- **`vitest.config.ts`** (`/Users/0xvox/.openclaw/workspace/dash-persona/vitest.config.ts`):
  - Global test setup
  - Includes: `src/**/*.test.ts` and `src/**/*.test.tsx`
  - Alias: `@/* -> ./src`

- **`eslint.config.mjs`** (`/Users/0xvox/.openclaw/workspace/dash-persona/eslint.config.mjs`):
  - ESLint v9 flat config
  - Includes: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`

- **`postcss.config.mjs`** (`/Users/0xvox/.openclaw/workspace/dash-persona/postcss.config.mjs`):
  - Single plugin: `@tailwindcss/postcss`

## CLI Scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "type-check": "tsc --noEmit -p tsconfig.check.json",
  "test:e2e": "playwright test"
}
```

## Monorepo Structure

### Main App: `src/`
- Next.js 16 + React 19 application
- App Router (file-based routing)
- Server & Client Components
- API routes: `src/app/api/`
  - `/collect` — TikTok profile scraping via HTML parsing
  - `/cdp-collect` — Douyin/TikTok/XHS via local CDP proxy (localhost:3458)
  - `/collect-browser` — Browser-based collection
  - `/trending` — Trending data collection

### Collector App: `collector/`
- **Type**: Electron desktop application
- **Package**: `@dash/collector` v0.1.0 (private)
- **Main Entry**: `dist/main.js`
- **Build Tool**: TypeScript + Electron Builder (.dmg for macOS)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `electron` | 33.4.11 | Desktop framework |
| `electron-builder` | 25.1.0 | Application packaging (macOS .dmg) |
| `electron-updater` | 6.3.0 | Auto-update mechanism |
| `playwright` | 1.52.0 | Browser automation (Chromium) |
| `express` | 4.21.0 | HTTP server (localhost:3458) |

**Source Files** (`collector/src/`):
- `main.ts` — Electron main process
- `browser.ts` — Playwright browser management
- `server.ts` — Express HTTP API server
- `tray.ts` — System tray integration
- `preload.ts` — IPC preload script

### Extension: `extension/`
- **Type**: Chrome Web Extension
- **Package**: `dash-persona-extension` v0.1.0 (private)
- **Build Tool**: Vite + CRX plugin
- **Dev**: `vite dev` / `vite build`

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@crxjs/vite-plugin` | 2.0.0-beta.28 | Vite Chrome extension build |
| `@types/chrome` | 0.0.287 | Chrome API types |
| `vite` | 6.0.0 | Build tool |
| `typescript` | 5.7.0 | Type checking |
| `papaparse` | 5.4.1 | CSV parsing |
| `xlsx` | 0.18.5 | Excel file support |

## Design & Styling

### Typography
- **Interface Font**: Geist Sans (variable) — loaded via next/font
- **Data/Metrics Font**: Geist Mono (variable, tabular-nums) — for tabular data
- **CSS-in-JS**: Tailwind CSS v4 (no inline styles per CLAUDE.md)

### Motion
- **Max Duration**: 750ms
- **Easing**: `cubic-bezier(0.22, 1, 0.36, 1)`
- **Properties**: transform + opacity only
- **Respect**: `prefers-reduced-motion` (disable all animations)

### Color Palette (CSS Variables)
```
--bg-primary:     #0a0f0d (dark background)
--bg-card:        #151d19 (card/elevated surfaces)
--text-primary:   #e8fff6 (main text)
--text-secondary: #b8c4be (secondary text)
--text-subtle:    #8a9590 (subtle/tertiary text)

Accents:
--accent-green:   #7ed29a
--accent-red:     #c87e7e
--accent-yellow:  #d2c87e
--accent-blue:    #7eb8d2
--highlight:      #f0f545
```

## Key Configuration Files

| File | Path | Purpose |
|------|------|---------|
| Package manifest | `package.json` | Dependencies, scripts, workspace metadata |
| TypeScript config | `tsconfig.json` | Compiler options, path aliases |
| TypeScript check config | `tsconfig.check.json` | Isolated type-checking (excludes troublesome packages) |
| Next.js config | `next.config.ts` | Framework config, transpilePackages, ignoreBuildErrors |
| Tailwind config | Generated by Tailwind v4 | CSS variable generation (no explicit file needed) |
| ESLint config | `eslint.config.mjs` | Linting rules (ESLint v9 flat config) |
| PostCSS config | `postcss.config.mjs` | Tailwind CSS plugin integration |
| Vitest config | `vitest.config.ts` | Test runner setup |
| Playwright config | `playwright.config.ts` (if exists) | E2E testing configuration |
| Environment | `.env.example` | Optional environment variables |

## Deployment

- **Platform**: Vercel (primary deployment target)
- **Build Output**: Standalone Next.js app
- **Node.js Runtime**: 20+ (compatible with Node 25.x)
- **Analytics**: Optional Vercel Web Vitals (`NEXT_PUBLIC_VERCEL_ANALYTICS_ID`)

## Key Constraints & Patterns

1. **No inline styles** — All styling via Tailwind + CSS variables
2. **Strict TypeScript** — `strict: true` in tsconfig.json
3. **RSC-first** — Server Components by default, `'use client'` for interactivity
4. **No external AI** — Deterministic algorithms only (no LLM/API calls)
5. **Dark mode only** — No light theme
6. **Banned fonts**: Inter, Roboto, Arial, serif fonts
7. **Banned UI patterns**: 3-column card grids, colored left-borders, pure black, inline emoji
