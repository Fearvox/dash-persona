import type { AsciiFont } from '../core/types'

const builtins = new Map<string, AsciiFont>()
const fonts = new Map<string, AsciiFont>()

export function registerFont(font: AsciiFont): void {
  fonts.set(font.name, font)
}

/** Register a built-in font that survives clearFonts() */
export function registerBuiltinFont(font: AsciiFont): void {
  builtins.set(font.name, font)
}

export function getFont(name: string): AsciiFont | undefined {
  return fonts.get(name) ?? builtins.get(name)
}

export function listFonts(): string[] {
  return [...fonts.keys()]
}

export function clearFonts(): void {
  fonts.clear()
}
