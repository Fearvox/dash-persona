# TASTES.md — DashPersona Design Taste

> Aesthetic constraints for all design, UI, and visual work. Read this before any creative decision.

---

## Brand Identity

**Name:** DashPersona — Creator Intelligence Engine
**Symbol:** DASH (—/) monogram
**Parent:** Zonic Design Studio
**Mode:** Dark mode ONLY (no light mode)
**Personality:** Precise. Curious. Transparent.

---

## Color Palette

### Core Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0a0f0d` | Main background (NEVER pure black `#000`) |
| `--bg-secondary` | `#111916` | Secondary surfaces |
| `--bg-card` | `#151d19` | Card backgrounds |
| `--bg-card-hover` | `#1a241f` | Card hover state |

### Borders
| Token | Value |
|-------|-------|
| `--border-subtle` | `rgba(255,255,255,0.08)` |
| `--border-medium` | `rgba(255,255,255,0.12)` |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#e8fff6` | Primary text |
| `--text-secondary` | `#b8c4be` | Secondary text |
| `--text-subtle` | `#8a9590` | Muted/disabled text |

### Accents
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-green` | `#7ed29a` | Positive metrics, success, CTAs |
| `--accent-red` | `#c87e7e` | Negative metrics, errors |
| `--accent-yellow` | `#d2c87e` | Warnings, demo indicators |
| `--accent-blue` | `#7eb8d2` | Informational |
| `--accent-highlight` | `#f0f545` | Active nav, emphasis (sparingly) |

### Badge Variants
- `.badge-green` — `rgba(126,210,154,0.15)` bg, `--accent-green` text
- `.badge-red` — `rgba(200,126,126,0.15)` bg, `--accent-red` text
- `.badge-yellow` — `rgba(210,200,126,0.15)` bg, `--accent-yellow` text

---

## Typography

**Interface:** Geist Sans (variable, loaded via `next/font/google`)
**Metrics/Data:** Geist Mono (variable, `tabular-nums` for alignment)

### Scale
- `.metric-value` — font-mono + tabular-nums
- `.kicker` — uppercase label: `0.6875rem`, weight 500, `0.04em` letter-spacing

### BANNED
- Inter, Roboto, Arial, any serif font

---

## Motion

**Max duration:** 750ms
**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (sharp ease-out, not soft)

**Allowed properties:** transform + opacity ONLY
**Forbidden:** color transitions, shadow transitions

**Reduced motion:** `prefers-reduced-motion` disables ALL animations

### Keyframe Library
- `fade-in` — opacity 0→1
- `scale-in` — opacity 0 + scale(0.95) + translateY(8px)
- `modal-enter` — opacity 0 + scale(0.97)
- `slide-in-up` — opacity 0 + translateY(12px)
- `fade-out` — opacity 1→0
- `code-drift` — canvas keyword drift (landing only)
- `skeleton-pulse` — opacity 0.4→0.15
- `breathe` — opacity 0.45→0.7
- `pulse-strong` — opacity 1→0.4
- `shimmer-sweep` — translateX(-100%)→100%

### Stagger
`.animate-stagger-0` through `.animate-stagger-4` (100ms increments)

### Tactile Feedback (Buttons)
```css
button:hover:not(:disabled) { transform: translateY(-1px); }
button:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
```

---

## Anti-Patterns (Explicitly Forbidden)

1. **No 3-column card grids** — avoid rigid 3-column layouts
2. **No colored left-borders** — no left-border accent strips on cards
3. **No pure black** — `--bg-primary` is `#0a0f0d` (dark green-tinted, not `#000`)
4. **No emoji in UI** — use unicode symbols sparingly: `↑` `↓` `―` `✓` `✗`
5. **No inline `style={{ }}`** — use Tailwind + CSS variables only
6. **No purple/cyan gradients**
7. **No AI aesthetic palettes** — no gradient-heavy, AI-tool aesthetics

---

## Design Principles

1. **Every pixel earns its place** — no decoration without function
2. **Data density over whitespace** — this is a tool, not a marketing page
3. **Transparency as trust** — show the data, show the source, show the method
4. **Hierarchy through typography, not decoration** — weight and size over borders and backgrounds
5. **Subtraction default** — when in doubt, remove

---

## Layout & Component Patterns

### Card
```css
background: var(--bg-card);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-lg); /* 1rem */
```
Hover: border-color → `--border-medium`, background → `--bg-card-hover`

### Card Interactive (with lift)
```css
transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1),
            background-color 0.2s cubic-bezier(0.22, 1, 0.36, 1);
transform: translateY(-2px) on hover;
```

### Nav Pill
```css
font-size: 0.75rem;
font-weight: 500;
padding: 0.25rem 0.75rem;
border-radius: 9999px;
color: var(--text-subtle);
```
Hover: `background: rgba(240, 245, 69, 0.12)`, `color: var(--accent-highlight)`

### Modal/Backdrop
- Backdrop: `z-index: 100`, `rgba(10,15,13,0.75)`, `backdrop-filter: blur(12px)`
- Panel: `z-index: 101`, max-width `28rem`, `border-radius: var(--radius-lg)`
- Animation: `modal-enter` (scale 0.97 + opacity)

### Toast
- Position: `fixed bottom-6 right-6 z-[110]`
- Variants: `.toast-success` (green tint), `.toast-error` (red tint)
- Auto-dismiss: 2.5s with slide-in-up + fade-out

### Focus State
```css
*:focus-visible {
  outline: 2px solid var(--accent-green);
  outline-offset: 2px;
}
```

---

## Radius Scale

| Token | Value |
|-------|-------|
| `--radius-sm` | `0.375rem` (6px) |
| `--radius-md` | `0.75rem` (12px) |
| `--radius-lg` | `1rem` (16px) |
| `--radius-xl` | `1.5rem` (24px) |

---

## Z-Index Scale

| Layer | Value |
|-------|-------|
| backdrop | 100 |
| modal (relative to backdrop) | 101 |
| toast | 110 |

---

## Tech Stack (Design-Relevant)

- **Charts:** Recharts 3.8.0 (primary charting)
- **Graphs:** @xyflow/react 12.10.1 + elkjs 0.11.1 (pipeline visualization)
- **Canvas:** html2canvas-pro 2.0.2 (for Textcraft rendering)
- **ASCII Art:** @chenglou/pretext 0.0.2 (font measuring)
- **CSS:** Tailwind CSS 4 + PostCSS (CSS-first config, no tailwind.config.js)

---

## Landing Page Exceptions

The cinematic landing (`/`) may use additional effects:
- `code-drift` animation for canvas keyword background
- Full-viewport boot sequence with ASCII art
- These are landing-only and should NOT leak into app UI

---

## Print/PDF Override

When printing or exporting PDF:
- Hide: header, nav, `.nav-pill`, `.no-print`, `aside`
- Cards: white background + `#ddd` border
- Charts/SVGs: `color-scheme: light`

---

## References

- Color tokens: `src/app/globals.css` (`:root` section)
- Motion/keyframes: `src/app/globals.css`
- Component patterns: `src/components/ui/`, `src/components/`
- Brand rules: `CLAUDE.md` Design Context section

---

*Last updated: 2026-04-03 — Initial taste extraction from codebase*