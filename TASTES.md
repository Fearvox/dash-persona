# TASTES.md

## REJECT
- Never use Inter, Roboto, Arial, Open Sans, or serif fonts.
- Never use purple/cyan neon gradients or AI-aesthetic palettes.
- Never use 3-column equal-card feature grids.
- Never use colored left-borders on cards.
- Never use pure black `#000000` — use deep chromatic darks instead.
- Never use emoji in UI surfaces.
- Never use decorative elements that don't inform or enable action.
- Never use large border-radius (`>12px`) on functional containers — reserve roundness for pills and avatars.
- Never use generic hero copy ("Welcome to…", "Unlock the power of…").
- Never add whitespace where data density would serve better — this is an operational tool, not a brochure.

## REQUIRE
- Use monospace for all metrics, numbers, and IDs (`tabular-nums`).
- Maintain hierarchy through typography (size, weight, color) — not borders, shadows, or gradients.
- Ensure every score and metric has a traceable explanation visible to the user.
- Pair dark backgrounds with a single high-chroma accent family — never scatter multiple saturated hues.
- Use `transform` + `opacity` only for animations; cap duration at `750ms`, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Respect `prefers-reduced-motion` — disable all animation, show content immediately.
- Use kicker labels at `11px`, weight 500, `tracking-0.04em`, uppercase, muted.
- Keep visual hierarchy legible at a glance — the eye should know where to look before reading anything.

## WHEN AMBIGUOUS
- Subtract before adding — the best interface is the one you don't notice.
- If it looks like a default template output, it's wrong — redo it.
- Orient toward: Linear (product UI), Vercel Dashboard (data density), Raycast (keyboard-first precision), Teenage Engineering (industrial restraint).
