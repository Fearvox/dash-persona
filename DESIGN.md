# DESIGN.md — DashPersona Design System

> Canonical design reference. When code and this document disagree, update whichever is wrong.
> For cross-project aesthetic judgment, see `TASTES.md`.

---

## 1. Users

Content creators managing presence across Douyin, TikTok, and Red Note. Data-literate but not engineers — they want to understand performance without AI black boxes. Primary context: desktop analytics review, often comparing platforms side-by-side. Secondary audience: hackathon judges and YC-caliber investors evaluating in 2-minute windows.

---

## 2. Brand

**Name:** DashPersona
**Symbol:** DASH (—/) — horizontal dash + diagonal slash, SVG `viewBox 0 0 32 20`
**Parent:** Zonic Design Studio
**Voice:** Technical but approachable — explains the "why" behind every number.
**Tone:** Confident without boastful. Data speaks, not marketing copy.
**Emotional goals:** Professional competence ("this tool knows what it's doing") + curiosity ("I want to explore deeper").

---

## 3. Design Principles

1. **Every pixel earns its place** — No decorative elements. If it doesn't inform or enable action, remove it.
2. **Data density over whitespace** — Operational tool, not a marketing site. Compact, readable, information-rich.
3. **Transparency as trust** — Every score has a traceable explanation. No AI magic, no black boxes.
4. **Hierarchy through typography, not decoration** — Font size, weight, and color create levels. Not borders, shadows, or gradients.
5. **Subtraction default** — When in doubt, remove. The best interface is the one you don't notice.
6. **Visual hierarchy at a glance** — The eye should know where to look before reading. Layering, not adding.

---

## 4. Anti-Patterns (BANNED)

- 3-column equal-card feature grids
- Colored left-border on cards (use corner dot instead)
- Pure black `#000000` (use botanical greens)
- Emoji in UI surfaces
- Purple/cyan neon gradients
- Generic hero copy ("Welcome to…", "Unlock the power of…")
- Cards without purpose (cards must be the interaction, not decoration)
- `style={{}}` inline styles (use Tailwind utilities + CSS variables)
- Inter, Roboto, Arial, Open Sans, serif fonts
- Large border-radius (`>16px`) on functional containers — pills and avatars only
- Drop shadows for elevation — use border-subtle opacity steps instead
- Skeleton loaders that feel like placeholder for placeholder's sake — use shimmer only on meaningful data-loading transitions

---

## 5. Color System

Dark mode only. Deep botanical greens as base. Single accent family with semantic variants.

### Tokens

| Token | Value | Role |
|-------|-------|------|
| `--bg-primary` | `#0a0f0d` | Page background |
| `--bg-secondary` | `#111916` | Elevated surfaces |
| `--bg-card` | `#151d19` | Card backgrounds |
| `--bg-card-hover` | `#1a241f` | Card hover state |
| `--border-subtle` | `rgba(255,255,255, 0.08)` | Default borders |
| `--border-medium` | `rgba(255,255,255, 0.12)` | Hover/active borders |
| `--text-primary` | `#e8fff6` | Headings, primary text |
| `--text-secondary` | `#b8c4be` | Body text, descriptions |
| `--text-subtle` | `#8a9590` | Labels, metadata |
| `--accent-green` | `#7ed29a` | Primary accent, success, focus ring |
| `--accent-red` | `#c87e7e` | Danger, decline |
| `--accent-yellow` | `#d2c87e` | Warning, pending |
| `--accent-blue` | `#7eb8d2` | Info, secondary accent |
| `--accent-highlight` | `#f0f545` | Emphasis, nav hover (neon pollen) |

### Badge Colors

Badges use 15% opacity background of the accent color with full-color text:
- Green: `rgba(126, 210, 154, 0.15)` / `--accent-green`
- Red: `rgba(200, 126, 126, 0.15)` / `--accent-red`
- Yellow: `rgba(210, 200, 126, 0.15)` / `--accent-yellow`

### Usage Rules

- **Never mix** two saturated accents in the same component. One accent per context.
- **Status colors** are semantic: green=positive/success, red=negative/danger, yellow=warning/pending, blue=info/neutral.
- **Highlight yellow** (`#f0f545`) is reserved for navigation hover and rare emphasis. Not for data.

---

## 6. Typography

### Fonts

| Context | Font | Fallback |
|---------|------|----------|
| Interface | Geist Sans | `system-ui, sans-serif` |
| Data/metrics | Geist Mono | `SF Mono, monospace` |

Loaded via `next/font/google` as CSS variables: `--font-geist-sans`, `--font-geist-mono`.

### Scale

| Element | Size | Weight | Extra |
|---------|------|--------|-------|
| Page heading | 24–28px | 700 | `tracking-tight` |
| Section heading | 18–20px | 600 | `tracking-tight` |
| Card heading | 15–16px | 600 | — |
| Body | 14px | 400 | `leading-relaxed` |
| Kicker/label | 11px | 500 | `tracking-0.04em`, uppercase, `--text-subtle` |
| Metric value | 20–32px | 700 | Geist Mono, `tabular-nums` |
| Small metric | 14px | 600 | Geist Mono, `tabular-nums` |

### Rules

- All numbers, metrics, and IDs use monospace with `font-variant-numeric: tabular-nums`.
- Kicker labels: `.kicker` class — 11px, weight 500, 0.04em tracking, uppercase, muted.
- **BANNED fonts:** Inter, Roboto, Arial, Open Sans, any serif.

---

## 7. Spacing & Layout

### Spacing Scale

Use Tailwind's default scale. Preferred values for consistency:

| Use | Value |
|-----|-------|
| Component internal padding | `p-4` (16px) to `p-6` (24px) |
| Card padding | `p-4` (compact) or `p-5` (standard) |
| Section gap | `gap-6` (24px) to `gap-8` (32px) |
| Inline element gap | `gap-2` (8px) to `gap-3` (12px) |
| Page horizontal padding | `px-4` (mobile) / `px-6` (desktop) |

### Page Layout

- Root: `min-h-full flex flex-col` on `<body>`.
- Header: `<SiteHeader />` — persistent across all pages.
- Main: `<main id="main-content" className="flex-1">`.
- Footer: `<SiteFooter />`.
- Content max-width: `max-w-7xl mx-auto` (1280px) for dashboard views.
- No fixed sidebar — content is full-width within max-width.

### Grid Patterns

- **Dashboard:** 2-zone layout (primary content area + sidebar summary). NOT equal 3-column grids.
- **Comparison:** Side-by-side columns per platform, auto-collapsing on narrow viewports.
- **Detail pages:** Single column with section dividers.

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | `<640px` | Single column, stacked cards, `px-4` |
| Tablet | `640–1024px` | 2 columns where useful, `px-6` |
| Desktop | `>1024px` | Full layout, side-by-side comparisons |

### Known TODO

- Pipeline visualization needs vertical scroll below `768px` (currently horizontal-only).

---

## 9. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `6px` | Inputs, small buttons |
| `--radius-md` | `12px` | Toasts, secondary containers |
| `--radius-lg` | `16px` | Cards, modals, primary containers |
| `--radius-xl` | `24px` | Reserved (rare, large surfaces only) |
| `9999px` | pill | Badges, nav pills, avatars |

**Rule:** Functional containers stay at `--radius-lg` max. Only pills and avatars go full-round.

---

## 10. Components

### Cards

```
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
```

- Hover: border → `--border-medium`, bg → `--bg-card-hover`.
- Interactive cards add `.card-interactive` for lift on hover (`translateY(-2px)`).
- **No** colored left-borders. Use a corner accent dot if status indication is needed.
- **No** drop shadows. Elevation is communicated through background color steps.

### Buttons

Two tiers: `.btn-primary` and `.btn-outline`.
- Hover: `translateY(-1px)`.
- Active: `translateY(1px) scale(0.98)`.
- Transition: `0.15s cubic-bezier(0.22, 1, 0.36, 1)` on transform, bg, color, border, opacity.
- Disabled: reduce opacity, no transform.

### Badges

```
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}
```

Variants: `.badge-green`, `.badge-red`, `.badge-yellow`.

### Navigation

- `.nav-pill`: 12px, weight 500, pill shape, `--text-subtle` default.
- Hover: `rgba(240, 245, 69, 0.12)` background, `--accent-highlight` text.
- Active state: full `--accent-highlight` text, no background.

### Modals

- Backdrop: `rgba(10, 15, 13, 0.75)` + `blur(12px)`, z-index 100.
- Panel: `--bg-card`, `--border-medium`, `--radius-lg`, max-width `28rem`, z-index 101.
- Enter animation: `scale(0.97→1)` over `0.2s`.
- Focus trap required — keyboard users must not escape the modal.

### Toast

- Position: fixed bottom, z-index 110.
- Enter: `slide-in-up 0.3s`, auto-dismiss with `fade-out` at 2.5s.
- Variants: `.toast-success` (green), `.toast-error` (red).
- `pointer-events: none` — toasts never block interaction.

---

## 11. Charts (Recharts)

- Background: transparent (inherits card bg).
- Grid lines: `rgba(255,255,255, 0.05)` — barely visible.
- Axis labels: `--text-subtle`, 11px, Geist Mono.
- Data lines: `--accent-green` primary, `--accent-blue` secondary, `--accent-yellow` tertiary.
- Tooltips: `--bg-secondary` bg, `--border-subtle` border, `--radius-md`.
- Sparklines: stroke only, no fill, 1.5px weight.
- Radar charts: single fill with 20% opacity, stroke at full accent color.

---

## 12. Motion

### Easing

All animations: `cubic-bezier(0.22, 1, 0.36, 1)`.

### Durations

| Category | Duration |
|----------|----------|
| Micro-interaction (hover, active) | `100–150ms` |
| Enter/exit (modals, toasts) | `200–300ms` |
| Page transition (shimmer, reveal) | `400–500ms` |
| Max ceiling | `750ms` |

### Allowed Properties

Only `transform` and `opacity` — GPU-accelerated. Exception: `color`, `background-color`, `border-color` on interactive elements (0.15s).

### Patterns

| Pattern | Implementation |
|---------|---------------|
| Button tactile | hover `translateY(-1px)`, active `translateY(1px) scale(0.98)` |
| Card lift | hover `translateY(-2px)` + border shift |
| Scroll reveal | `translateY(16px) → 0` + `opacity 0 → 1`, IntersectionObserver |
| Stagger | 100ms increments, `.animate-stagger-{0..4}` |
| Modal enter | `scale(0.97→1)` + `opacity(0→1)` |
| Shimmer | sweep gradient `translateX(-100% → 100%)` at 1.6s cycle |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  .animate-stagger, .reveal-on-scroll { opacity: 1 !important; visibility: visible !important; }
}
```

No exceptions. Content must be fully visible without animation.

---

## 13. Z-Index Scale

| Layer | Value |
|-------|-------|
| Skip-to-content link | 50 |
| Modal backdrop | 100 |
| Modal panel | 101 |
| Toast | 110 |

No other z-index values should be introduced without updating this table.

---

## 14. Empty & Loading States

- **Data loading:** Shimmer bar (`.analyzing-shimmer-bar`) with staggered fade-in. Green accent shimmer sweep. Used for the "Analyzing…" transition from landing to dashboard.
- **Skeleton:** `skeleton-pulse` keyframe (opacity 0.4 ↔ 0.15). Use sparingly — only for content areas where the user expects data to appear.
- **Empty state:** Text message in `--text-subtle` + a single actionable CTA. No illustrations, no emoji, no decorative placeholders.
- **Error state:** `.toast-error` for transient errors. Inline red text (`--accent-red`) for form validation. Error pages use minimal layout with retry action.

---

## 15. Accessibility

- Focus ring: `2px solid var(--accent-green)`, `outline-offset: 2px` on `:focus-visible`.
- Skip-to-content link: sr-only by default, visible on focus, z-50.
- Semantic landmarks: `<header>`, `<main id="main-content">`, `<footer>`.
- `color-scheme: dark` on `<html>`.
- All interactive elements must be keyboard-reachable.
- `aria-label` on icon-only buttons.
- Platform tab groups: need arrow-key nav fix (TODO).

### Print

Print media inverts to light: white bg, dark text, no nav/header, cards get `#ddd` border. SVGs switch to `color-scheme: light`.

---

## 16. Internationalization

- Default lang: `zh` (set on `<html>`).
- Switching: `LocaleToggle` component + `LocaleInitializer` for hydration-safe init.
- 700+ i18n keys covering all pages and pipeline visualization.
- Kicker labels and UI chrome are localized; metric values and data stay numeric.

---

## 17. File Organization

```
src/app/globals.css        — All design tokens, utility classes, keyframes
src/app/layout.tsx         — Root layout (fonts, header, footer, toast, locale)
src/components/ui/         — Shared UI primitives (toast, confirm-dialog, etc.)
src/components/            — Page-level components (site-header, site-footer, etc.)
```

**Rule:** No component-level CSS files. Everything is Tailwind utilities referencing CSS variables from `globals.css`.

---

## 18. References

**Aspire toward:** Linear, Vercel Dashboard, Raycast
**Avoid becoming:** Generic SaaS template, bubbly startup dashboard, AI-aesthetic portfolio
