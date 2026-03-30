import type { Effect } from '../core/types'
export function composeEffects(...effects: Effect[]): Effect {
  return (frame, glyphs) => effects.reduce((gs, effect) => effect(frame, gs), glyphs)
}
