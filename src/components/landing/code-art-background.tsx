'use client'

/**
 * CodeArtBackground — Client Component
 *
 * Canvas-based keyword field with vignette overlay.
 * Uses textcraft engine for deterministic keyword positioning
 * and sine-wave drift animation on <canvas>.
 */

import CanvasTextField from './canvas-text-field'

const KEYWORDS = [
  'persona', 'growth', 'engage', 'niche', 'viral', 'content',
  'creator', 'insight', 'benchmark', 'strategy', 'retention', 'audience',
]

const TEXT_FIELD_OPTIONS = {
  seed: 42,
  sizeRange: [10, 22] as [number, number],
  alphaRange: [0.03, 0.12] as [number, number],
  speedRange: [0.15, 0.35] as [number, number],
}

export default function CodeArtBackground() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full h-full overflow-hidden"
    >
      {/* Canvas keyword field */}
      <CanvasTextField keywords={KEYWORDS} options={TEXT_FIELD_OPTIONS} />

      {/* Radial vignette overlay — darkens edges, keeps center clear */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,_transparent_0%,_var(--bg-primary)_100%)]"
      />
    </div>
  )
}
