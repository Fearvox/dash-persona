// Type stub for @chenglou/pretext — the package ships .ts source files
// with .ts import extensions that fail tsc. This stub provides just
// enough type info for our measure.ts wrapper.
declare module '@chenglou/pretext' {
  export function prepare(text: string, font: string): unknown
  export function layout(prepared: unknown, maxWidth: number, lineHeight: number): { height: number; lineCount: number }
  export function prepareWithSegments(text: string, font: string): unknown
  export function layoutWithLines(prepared: unknown, maxWidth: number, lineHeight: number): { lines: Array<{ text: string; width: number }> }
  export function clearCache(): void
  export function setLocale(locale: string): void
}
