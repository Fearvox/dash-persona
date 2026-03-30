import type { TextFieldKeyword } from '../core/types'

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface TextFieldOptions {
  width: number
  height: number
  seed?: number
  sizeRange?: [number, number]
  alphaRange?: [number, number]
  speedRange?: [number, number]
}

export function generateTextField(keywords: string[], opts: TextFieldOptions): TextFieldKeyword[] {
  const { width, height, seed = 42, sizeRange = [9, 15], alphaRange = [0.03, 0.1], speedRange = [0.15, 0.35] } = opts
  const rng = mulberry32(seed)
  return keywords.map(text => ({
    text,
    x: rng() * width,
    y: rng() * height,
    vx: (rng() - 0.5) * 2 * (speedRange[0] + rng() * (speedRange[1] - speedRange[0])),
    vy: (rng() - 0.5) * 2 * (speedRange[0] + rng() * (speedRange[1] - speedRange[0])),
    size: sizeRange[0] + rng() * (sizeRange[1] - sizeRange[0]),
    alpha: alphaRange[0] + rng() * (alphaRange[1] - alphaRange[0]),
  }))
}
