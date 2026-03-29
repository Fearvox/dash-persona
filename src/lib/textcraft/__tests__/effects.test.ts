import { describe, it, expect } from 'vitest'
import { drift } from '../effects/drift'
import { assemble } from '../effects/assemble'
import { composeEffects } from '../effects/compose'
import type { Glyph } from '../core/types'

const makeGlyphs = (n: number): Glyph[] =>
  Array.from({ length: n }, (_, i) => ({
    char: String.fromCharCode(65 + i),
    x: i * 10, y: 0, opacity: 1, color: '#7ed29a', scale: 1,
  }))

describe('drift effect', () => {
  it('returns same number of glyphs', () => {
    expect(drift(0, makeGlyphs(5))).toHaveLength(5)
  })
  it('modifies positions over time', () => {
    const input = makeGlyphs(3)
    const f0 = drift(0, input)
    const f100 = drift(100, input)
    expect(f100.some((g, i) => g.x !== f0[i].x || g.y !== f0[i].y)).toBe(true)
  })
  it('does not mutate input', () => {
    const input = makeGlyphs(3)
    const origX = input[0].x
    drift(50, input)
    expect(input[0].x).toBe(origX)
  })
})

describe('assemble effect', () => {
  it('hides glyphs before reveal frame', () => {
    const out = assemble(0, makeGlyphs(10))
    expect(out[0].opacity).toBeGreaterThan(0)
    expect(out[9].opacity).toBe(0)
  })
  it('reveals all after enough frames', () => {
    assemble(1000, makeGlyphs(5)).forEach(g => expect(g.opacity).toBeGreaterThan(0))
  })
})

describe('composeEffects', () => {
  it('applies left to right', () => {
    const double = (_: number, gs: Glyph[]) => gs.map(g => ({ ...g, x: g.x * 2 }))
    const addTen = (_: number, gs: Glyph[]) => gs.map(g => ({ ...g, x: g.x + 10 }))
    expect(composeEffects(double, addTen)(0, makeGlyphs(1))[0].x).toBe(10)
  })
})
