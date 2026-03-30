import { describe, it, expect, beforeEach } from 'vitest'
import { registerFont, getFont, listFonts, clearFonts } from '../fonts/registry'
import type { AsciiFont } from '../core/types'

const mockFont: AsciiFont = {
  name: 'test',
  charMap: { A: ['  A  ', ' A A ', 'AAAAA', 'A   A'] },
  height: 4,
  spacing: 1,
}

describe('font registry', () => {
  beforeEach(() => clearFonts())

  it('registers and retrieves a font', () => {
    registerFont(mockFont)
    expect(getFont('test')).toEqual(mockFont)
  })

  it('returns undefined for unknown font', () => {
    expect(getFont('nonexistent')).toBeUndefined()
  })

  it('lists all registered fonts', () => {
    registerFont(mockFont)
    registerFont({ ...mockFont, name: 'other' })
    expect(listFonts()).toEqual(['test', 'other'])
  })

  it('overwrites font with same name', () => {
    registerFont(mockFont)
    const updated = { ...mockFont, spacing: 2 }
    registerFont(updated)
    expect(getFont('test')?.spacing).toBe(2)
  })
})

import '../fonts/dash-brand'

describe('dash-brand font', () => {
  it('is auto-registered on import', () => {
    expect(getFont('dash-brand')).toBeDefined()
  })

  it('has consistent row heights', () => {
    const font = getFont('dash-brand')!
    for (const [char, rows] of Object.entries(font.charMap)) {
      expect(rows.length, `char "${char}" should have ${font.height} rows`).toBe(font.height)
    }
  })

  it('covers all chars needed for CREATOR INTELLIGENCE ENGINE', () => {
    const font = getFont('dash-brand')!
    const needed = new Set('CREATOR INTELLIGENCE ENGINE'.split(''))
    for (const char of needed) {
      expect(font.charMap[char], `missing char: "${char}"`).toBeDefined()
    }
  })
})

import '../fonts/block-digits'

describe('block-digits font', () => {
  it('is auto-registered', () => {
    expect(getFont('block-digits')).toBeDefined()
  })

  it('covers 0-9 and %', () => {
    const font = getFont('block-digits')!
    for (const char of '0123456789%') {
      expect(font.charMap[char], `missing: "${char}"`).toBeDefined()
    }
  })
})
