# DashPersona Code Conventions

## TypeScript & Type Safety

**TypeScript Strict Mode:** Enabled (`"strict": true` in `tsconfig.json`)

- All files must satisfy strict type checking
- `const` preferred over `let` for immutable values
- Type annotations required for function parameters and return types
- No implicit `any` types
- Path aliases configured: `@/*` maps to `./src/*`

**Import Conventions:**
- Absolute imports using `@` alias: `import { x } from '@/lib/...'`
- Side-effect imports explicitly marked: `import '../fonts/dash-brand'`
- Module-level JSDoc for complex modules (see `src/lib/collectors/tmp-manager.ts` pattern)
- Group imports: standard library → third-party → local (`@/`)

## React & Component Patterns

**Client Components:**
- `'use client'` directive required at top of interactive components
- Placed in `src/components/` or within `src/app/` route segments
- File naming: PascalCase for components (e.g., `FileDropZone.tsx`)

**Component Structure (see `src/components/site-header.tsx` example):**
```tsx
'use client';

import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';

interface ComponentProps {
  // typed props
}

export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  // hooks
  const pathname = usePathname();
  
  // render
  return (
    <div className="...">
      {/* content */}
    </div>
  );
}
```

**Hook Usage:**
- `useCallback` with dependency arrays for event handlers and memoized functions
- `useRef` for uncontrolled element access (e.g., file input refs)
- `useState` for local component state
- `usePathname` from `next/navigation` for route-aware logic

## Styling & CSS

**Tailwind CSS 4 (dark mode only):**
- All styles use Tailwind utility classes (no `style={{}}` inline objects)
- CSS variables for dynamic values: `bg-[var(--bg-primary)]`, `text-[var(--text-primary)]`
- Dark mode only — no light mode variants
- Color tokens documented in project CLAUDE.md:
  - Background: `--bg-primary` (#0a0f0d), `--bg-card` (#151d19)
  - Text: `--text-primary` (#e8fff6), `--text-secondary` (#b8c4be), `--text-subtle` (#8a9590)
  - Accents: `--accent-green` (#7ed29a), `--accent-red` (#c87e7e), `--accent-yellow` (#d2c87e), `--accent-blue` (#7eb8d2)
  - Border: `--border-subtle`, `--border-medium`

**Typography:**
- Interface text: Geist Sans
- Data/metrics: Geist Mono with `tabular-nums` for alignment
- Never use: Inter, Roboto, Arial, serif fonts

**Motion:**
- Max 750ms duration
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Transform + opacity only (no color/shadow animations)
- Respect `prefers-reduced-motion` (animations disabled in reduced-motion mode)

**Anti-patterns (explicitly forbidden):**
- No 3-column card grids
- No colored left-borders
- No pure black colors
- No emoji in UI
- No inline `style={{}}` props
- No purple/cyan gradients
- No AI aesthetic palettes

## Component Naming & Organization

**File Structure:**
```
src/
├── app/
│   ├── layout.tsx
│   ├── error.tsx
│   ├── [route]/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [client].tsx (client components)
├── components/
│   ├── site-header.tsx
│   ├── file-drop-zone.tsx
│   ├── ui/
│   │   ├── confirm-dialog.tsx
│   │   ├── toast.tsx
│   │   └── textcraft/
│   │       └── index.ts (re-exports)
│   └── landing/
│       ├── boot-sequence.tsx
│       └── output-wall.tsx
├── lib/
│   ├── i18n.ts
│   ├── engine/ (analysis modules)
│   ├── adapters/ (data adapters)
│   ├── schema/ (validation)
│   ├── textcraft/ (ASCII art engine)
│   ├── pipeline/ (visualization config)
│   └── collectors/ (data collection)
```

**Naming Conventions:**
- Components: PascalCase (`FileDropZone`, `SiteHeader`)
- Utilities/helpers: camelCase (`sanitizeUrl`, `detectDeviceTier`)
- Types/interfaces: PascalCase (`FileParseResult`, `ComponentProps`)
- Constants: UPPER_SNAKE_CASE (file-level) or camelCase (config objects)
- Test files: `*.test.ts` or `*.test.tsx` colocated in `__tests__/` subdirectories

## Error Handling

**Error Boundaries:**
- Global error boundary: `src/app/error.tsx` (client component with reset)
- Not-found page: `src/app/not-found.tsx` (optional, auto-handled by Next.js)

**Error Component Pattern (see `src/app/error.tsx`):**
```tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1>{t('ui.error.title')}</h1>
      <button onClick={reset}>{t('ui.error.tryAgain')}</button>
    </div>
  );
}
```

**Error Handling in Utils:**
- Return meaningful status objects (not throwing): `{ status: 'ok' | 'insufficient_data', ... }`
- Use `try-catch` in async operations with context-specific fallbacks
- Validate input explicitly before processing

## Interfaces & Types

**Props Interface Pattern:**
```tsx
interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  results: FileParseResult[];
  isProcessing: boolean;
}

export interface FileParseResult {
  fileName: string;
  status: 'success' | 'error';
  profileCount?: number;
  error?: string;
}
```

**Return Type Pattern (Status Objects):**
```ts
export type PersonaScoreStatus = 'ok' | 'insufficient_data';

export interface PersonaScore {
  status: PersonaScoreStatus;
  postsAnalysed: number;
  contentDistribution: Record<string, number>;
  engagement: EngagementMetrics;
  tags: PersonaTag[];
  // ... more fields
}
```

## Internationalization (i18n)

**Pattern:**
```tsx
import { t } from '@/lib/i18n';

// NOT at top-level constants — locale freezes at import time
export function Component() {
  return <div>{t('ui.common.dashboard')}</div>;
}
```

**Key conventions:**
- Never call `t()` in top-level constants (see memory: feedback_i18n_toplevel_t)
- Call `t()` inside component body or functions
- Key format: `ui.section.item` (e.g., `ui.error.title`, `ui.nav.siteNavigation`)

## Accessibility

**HTML Semantics:**
- Use `<button>` not `<div>` for clickable elements
- Always provide `type="button"` for buttons (prevents form submission)
- Use `aria-label`, `aria-current`, `aria-hidden` appropriately
- Links: use `<Link>` from `next/link` with `href`

**Animation & Visibility:**
- Components render visible by default, hide after JS mount if needed
- Respect `prefers-reduced-motion` media query
- Tab order managed via semantic HTML (hidden elements out of tab order with `aria-hidden`)

## Next.js Specific

**Route Handlers:**
- Path: `src/app/api/[route]/route.ts`
- Export named functions: `GET`, `POST`, etc.
- Use `NextRequest` and `NextResponse`
- Timeout protection for long-running operations

**Loading States:**
- `src/app/[route]/loading.tsx` provides Suspense fallback
- Component structure: server component returns JSX for loading UI

## Constants & Configuration

**File-level Constants:**
```ts
const ACCEPTED_EXTENSIONS = ['.json', '.csv', '.xlsx', '.xls'];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_HOSTS = ['tiktok.com', 'douyin.com', 'www.tiktok.com', ...];
```

**Configuration Objects:**
```ts
export const TIER_CONFIG: Record<DeviceTier, TierOptions> = {
  high: { minElements: 80, maxElements: 120, animationEnabled: true },
  mid:  { minElements: 30, maxElements: 50,  animationEnabled: true },
  low:  { minElements: 0,  maxElements: 0,   animationEnabled: false },
};
```

**Environment & Dynamic Values:**
- Use `process.env` in server contexts (route handlers, layout)
- Browser APIs guarded: `if (typeof navigator === 'undefined') return fallback;`

## Code Quality

**Comments:**
- Module-level JSDoc for complex business logic
- Inline comments for non-obvious algorithms
- Section headers: `// --------------- Section Name ---------------`
- DO NOT comment obvious code

**Callbacks & Dependencies:**
- All callbacks in `useCallback` with explicit dependency arrays
- Event handlers: `const handleClick = useCallback(() => {...}, [deps])`

**Data Validation:**
- Zod schemas in `src/lib/schema/`
- Validate at adapter entry points
- Return safe fallbacks on validation failure

## Special Files

**CLAUDE.md (project instructions):**
Located at project root, contains:
- Project description
- Tech stack
- Commands
- Architecture overview
- Design context and color tokens
- Anti-patterns and design principles
- Never modify without understanding full implications
