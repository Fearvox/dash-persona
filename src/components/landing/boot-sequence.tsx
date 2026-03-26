'use client';

/**
 * BootSequence — Client Component (Act 1)
 *
 * Full-viewport cinematic boot screen with:
 *  - CodeArtBackground (deterministic DASH text art)
 *  - Centered brand identity (logo + name + taglines)
 *  - CTA buttons: "Try Demo" (primary) + "Get Started" (outline)
 *  - Scroll-down indicator with pulse
 *
 * Uses 3-tier device detection to scale element count.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CodeArtBackground from './code-art-background';
import { detectDeviceTier, TIER_CONFIG } from '@/lib/pipeline/device-tier';
import { t } from '@/lib/i18n';

/** Mulberry32 PRNG — produces a deterministic count from min/max range */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function BootSequence() {
  // SSR default: mid tier range, pick a deterministic count
  const midConfig = TIER_CONFIG.mid;
  const defaultCount = Math.round(
    midConfig.minElements + (midConfig.maxElements - midConfig.minElements) * mulberry32(42)(),
  );

  const [elementCount, setElementCount] = useState(defaultCount);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tier = detectDeviceTier();
    const config = TIER_CONFIG[tier];
    // Deterministic count within tier range using same seed
    const rand = mulberry32(42);
    const count = Math.round(
      config.minElements + (config.maxElements - config.minElements) * rand(),
    );
    setElementCount(count);
    setMounted(true);
  }, []);

  return (
    <section
      aria-labelledby="boot-heading"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Layer 0: Code art background */}
      <div className="absolute inset-0 z-0">
        <CodeArtBackground count={elementCount} />
      </div>

      {/* Layer 1: Center content */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-opacity duration-700 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Brand identity */}
        <div className="flex items-center gap-3 mb-4">
          <Image
            src="/logo-icon.svg"
            alt="DashPersona logo"
            width={40}
            height={40}
            priority
          />
          <h1
            id="boot-heading"
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            DashPersona
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="text-lg font-medium sm:text-xl"
          style={{ color: 'var(--accent-green)' }}
        >
          {t('ui.landing.tagline')}
        </p>

        {/* Sub-tagline */}
        <p
          className="mt-2 text-sm sm:text-base"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.landing.subTagline')}
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard?source=demo&persona=tutorial"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent-green)',
              color: 'var(--bg-primary)',
            }}
          >
            {t('ui.landing.tryDemo')}
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-full border px-8 text-sm font-semibold transition-colors hover:bg-white/5"
            style={{
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          >
            {t('ui.landing.getStarted')}
          </Link>
          <Link
            href="/install"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--accent-yellow)' }}
          >
            {t('ui.landing.installFull')}
          </Link>
        </div>
      </div>

      {/* Layer 2: Scroll indicator */}
      <div className="absolute bottom-8 z-10 flex flex-col items-center gap-2 scroll-indicator">
        <span
          className="text-xs"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.landing.scrollToExplore')}
        </span>
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-bounce"
          style={{ color: 'var(--accent-green)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
