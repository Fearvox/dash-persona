import { describe, it, expect } from 'vitest'
import { measureText, measureLines } from '../core/measure'

describe('measureText', () => {
  it('returns MeasureResult shape', () => {
    const result = measureText('hello world', '16px Geist Mono', 200)
    expect(result).toHaveProperty('width')
    expect(result).toHaveProperty('height')
    expect(result).toHaveProperty('lineCount')
    expect(result.lineCount).toBeGreaterThanOrEqual(1)
  })
})

describe('measureLines', () => {
  it('returns array of TextLine objects', () => {
    const lines = measureLines('hello world', '16px Geist Mono', 200)
    expect(Array.isArray(lines)).toBe(true)
    lines.forEach(line => {
      expect(line).toHaveProperty('text')
      expect(line).toHaveProperty('width')
    })
  })
})
