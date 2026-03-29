import { registerBuiltinFont } from './registry'
import type { AsciiFont } from '../core/types'

export const DASH_BRAND_FONT: AsciiFont = {
  name: 'dash-brand',
  height: 4,
  spacing: 1,
  charMap: {
    ' ': ['  ', '  ', '  ', '  '],
    'A': [' __ ', '|__|', '|  |', '    '],
    'C': [' __ ', '|  ', '|__', '    '],
    'D': ['__  ', '|  \\', '|__/', '    '],
    'E': [' ___', '|__ ', '|___', '    '],
    'G': [' __ ', '|  _', '|__|', '    '],
    'I': ['_', '|', '|', ' '],
    'L': ['    ', '|   ', '|___', '    '],
    'N': ['    ', '|\\ |', '| \\|', '    '],
    'O': [' __ ', '|  |', '|__|', '    '],
    'R': [' __ ', '|__|', '| \\ ', '    '],
    'T': ['___', ' | ', ' | ', '   '],
    'U': ['    ', '|  |', '|__|', '    '],
  },
}

registerBuiltinFont(DASH_BRAND_FONT)
