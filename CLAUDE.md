# DashPersona — Creator Intelligence Engine

## Project
Data-agnostic creator intelligence engine. Analyzes social media presence across Douyin, TikTok, and Red Note with deterministic, AI-free algorithms.

## Tech Stack
- Next.js 16 + React 19 + Tailwind CSS 4
- Recharts (charts), @xyflow/react + elkjs (pipeline visualization)
- Vitest (testing), TypeScript strict mode
- Dark mode only, Geist Sans + Geist Mono fonts

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — run all tests (vitest)
- `npm run type-check` — TypeScript check
- `vercel --prod` — deploy to production

## Architecture
- `src/lib/engine/` — 9 deterministic analysis modules (growth, persona, comparator, benchmark, strategy, explain, content-planner, persona-tree, idea-generator)
- `src/lib/adapters/` — data ingestion (DemoAdapter, HTMLParseAdapter, ManualImportAdapter)
- `src/lib/schema/` — CreatorDataSchema validation
- `src/lib/pipeline/` — pipeline visualization config + device tier detection
- `src/components/landing/` — cinematic landing page components
- `src/components/ui/` — shared UI (confirm-dialog, toast)

## Design Context

### Brand
DASH (—/) symbol + wordmark. Parent: Zonic Design Studio. Dark mode only.

### Personality
Precise. Curious. Transparent.

### Color Tokens
- Background: `--bg-primary` #0a0f0d, `--bg-card` #151d19
- Text: `--text-primary` #e8fff6, `--text-secondary` #b8c4be, `--text-subtle` #8a9590
- Accents: green #7ed29a, red #c87e7e, yellow #d2c87e, blue #7eb8d2, highlight #f0f545

### Typography
- Interface: Geist Sans. Data/metrics: Geist Mono (tabular-nums).
- BANNED: Inter, Roboto, Arial, serif fonts.

### Motion
- Max 750ms, easing cubic-bezier(0.22, 1, 0.36, 1), transform+opacity only.
- prefers-reduced-motion: disable all animations.

### Anti-Patterns
- No 3-column card grids, no colored left-borders, no pure black, no emoji in UI
- No inline style={{ }} in new code — use Tailwind + CSS variables
- No purple/cyan gradients, no AI aesthetic palettes

### Design Principles
1. Every pixel earns its place
2. Data density over whitespace
3. Transparency as trust
4. Hierarchy through typography, not decoration
5. Subtraction default
