import type { Effect } from '../core/types'
export const drift: Effect = (frame, glyphs) => {
  const t = frame * 0.015
  return glyphs.map((g, i) => {
    const phase = i * 1.3
    return {
      ...g,
      x: g.x + Math.sin(t + phase) * 8,
      y: g.y + Math.cos(t * 0.7 + phase) * 5,
      opacity: g.opacity * (0.7 + 0.3 * Math.sin(t * 0.5 + phase)),
    }
  })
}
