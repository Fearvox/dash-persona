'use client'

/**
 * CanvasTextField — Client Component
 *
 * Renders textcraft-generated keywords onto a <canvas> with sine-wave
 * drift animation. Deterministic positioning via seeded PRNG in
 * generateTextField. Respects prefers-reduced-motion.
 */

import { useRef, useCallback, useEffect } from 'react'
import {
  generateTextField,
  initMeasure,
  type TextFieldKeyword,
} from '@/lib/textcraft'
import type { TextFieldOptions } from '@/lib/textcraft/composers/text-field'

interface CanvasTextFieldProps {
  keywords: string[]
  options?: Partial<TextFieldOptions>
}

// Green accent: rgba(126, 210, 154, alpha)
const KEYWORD_COLOR_RGB = '126, 210, 154'

export default function CanvasTextField({ keywords, options }: CanvasTextFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const reducedMotionRef = useRef(false)
  const fieldsRef = useRef<TextFieldKeyword[]>([])

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)

    const fields = fieldsRef.current
    for (let i = 0; i < fields.length; i++) {
      const kw = fields[i]

      // Sine-wave drift: unique phase per keyword
      const phase = i * 1.37
      const driftX = Math.sin(time * 0.0005 * kw.vx + phase) * 30
      const driftY = Math.cos(time * 0.0004 * kw.vy + phase) * 20

      // Breathing opacity
      const breathe = 0.5 + 0.5 * Math.sin(time * 0.001 + phase)
      const alpha = kw.alpha * (0.6 + 0.4 * breathe)

      // Wrap position within canvas bounds
      let x = ((kw.x + driftX) % width + width) % width
      let y = ((kw.y + driftY) % height + height) % height

      ctx.font = `700 ${kw.size}px var(--font-mono, monospace)`
      ctx.fillStyle = `rgba(${KEYWORD_COLOR_RGB}, ${alpha})`
      ctx.fillText(kw.text, x, y)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // --- Reduced motion check ---
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mql.matches

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
      if (e.matches) {
        // Stop animation loop, draw single frame
        cancelAnimationFrame(rafRef.current)
        draw(ctx, 0)
      } else {
        // Restart animation
        startLoop()
      }
    }
    mql.addEventListener('change', handleMotionChange)

    // --- Resize handling ---
    const syncSize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Regenerate field positions for new dimensions
      fieldsRef.current = generateTextField(keywords, {
        width: rect.width,
        height: rect.height,
        seed: options?.seed ?? 42,
        sizeRange: options?.sizeRange ?? [10, 22],
        alphaRange: options?.alphaRange ?? [0.03, 0.12],
        speedRange: options?.speedRange ?? [0.15, 0.35],
        ...options,
      })

      // If reduced motion, just draw one frame after resize
      if (reducedMotionRef.current) {
        draw(ctx, 0)
      }
    }

    const ro = new ResizeObserver(syncSize)
    const parent = canvas.parentElement
    if (parent) ro.observe(parent)
    syncSize()

    // --- Animation loop ---
    function startLoop() {
      const loop = (time: number) => {
        if (reducedMotionRef.current) return
        draw(ctx!, time)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    if (!reducedMotionRef.current) {
      startLoop()
    } else {
      draw(ctx, 0)
    }

    // --- Init pretext measure for future usage ---
    initMeasure()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      mql.removeEventListener('change', handleMotionChange)
    }
  }, [keywords, options, draw])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
    />
  )
}
