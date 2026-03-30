import type { Effect } from '../core/types'
export const assemble: Effect = (frame, glyphs) => {
  const revealRate = 3
  return glyphs.map((g, i) => {
    const revealFrame = i * revealRate
    if (frame < revealFrame) return { ...g, opacity: 0 }
    const fadeProgress = Math.min((frame - revealFrame + 10) / 10, 1)
    return { ...g, opacity: g.opacity * fadeProgress }
  })
}
