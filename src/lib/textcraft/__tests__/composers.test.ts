import { describe, it, expect } from 'vitest'
import '../fonts/dash-brand'
import '../fonts/block-digits'
import { renderAsciiText } from '../composers/ascii-logo'
import { renderProgressBar, renderColumnChart } from '../composers/char-chart'
import { renderBrailleLine } from '../composers/braille-line'
import { generateTextField } from '../composers/text-field'
import { renderPortraitText } from '../composers/data-portrait'

describe('ascii-logo', () => {
  it('renders text using registered font', () => {
    const result = renderAsciiText('ACE', 'dash-brand')
    expect(result).toContain('A')
    expect(result.split('\n').length).toBeGreaterThanOrEqual(4)
  })
  it('returns empty for unknown font', () => {
    expect(renderAsciiText('HI', 'nonexistent')).toBe('')
  })
  it('handles unmapped chars', () => {
    expect(renderAsciiText('A?B', 'dash-brand').split('\n').length).toBeGreaterThanOrEqual(4)
  })
})

describe('char-chart', () => {
  it('renders progress bar with correct ratio', () => {
    const bar = renderProgressBar(0.7, 10)
    expect((bar.match(/\u2588/g) || []).length).toBe(7)
    expect((bar.match(/\u2591/g) || []).length).toBe(3)
  })
  it('clamps to 0-1', () => {
    expect(renderProgressBar(1.5, 10)).toBe('\u2588'.repeat(10))
    expect(renderProgressBar(-0.5, 10)).toBe('\u2591'.repeat(10))
  })
  it('renders column chart', () => {
    expect(renderColumnChart([0.5, 1.0, 0.25], { height: 4 })).toHaveLength(4)
  })
})

describe('braille-line', () => {
  it('renders braille chars', () => {
    const result = renderBrailleLine([10, 20, 15, 30, 25])
    for (const ch of result) {
      if (ch !== ' ' && ch !== '\n') {
        const code = ch.codePointAt(0)!
        expect(code).toBeGreaterThanOrEqual(0x2800)
        expect(code).toBeLessThanOrEqual(0x28FF)
      }
    }
  })
  it('handles single point', () => {
    expect(renderBrailleLine([42]).length).toBeGreaterThan(0)
  })
  it('handles empty', () => {
    expect(renderBrailleLine([])).toBe('')
  })
})

describe('text-field', () => {
  it('generates correct count', () => {
    expect(generateTextField(['a', 'b', 'c'], { width: 400, height: 200 })).toHaveLength(3)
  })
  it('positions within bounds', () => {
    generateTextField(['a', 'b', 'c', 'd', 'e'], { width: 100, height: 50, seed: 99 })
      .forEach(kw => {
        expect(kw.x).toBeGreaterThanOrEqual(0)
        expect(kw.x).toBeLessThanOrEqual(100)
        expect(kw.y).toBeGreaterThanOrEqual(0)
        expect(kw.y).toBeLessThanOrEqual(50)
      })
  })
  it('is deterministic', () => {
    const a = generateTextField(['x'], { width: 100, height: 100, seed: 42 })
    const b = generateTextField(['x'], { width: 100, height: 100, seed: 42 })
    expect(a[0].x).toBe(b[0].x)
  })
})

describe('data-portrait', () => {
  it('renders complete portrait', () => {
    const text = renderPortraitText({
      name: 'demo', platform: 'TikTok', window: '30d',
      tags: ['food', 'vlog'],
      metrics: [{ label: 'engage', value: 0.78, color: '#7ed29a' }],
      trendData: [10, 20, 15, 30, 25, 35],
    })
    expect(text).toContain('CREATOR  ID')
    expect(text).toContain('demo')
    expect(text).toContain('DASH')
  })
  it('uses heavy box drawing', () => {
    const text = renderPortraitText({
      name: 'test', platform: 'X', window: '7d',
      tags: [], metrics: [], trendData: [],
    })
    expect(text).toContain('\u250F')
    expect(text).toContain('\u251B')
  })
})
