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
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CodeArtBackground from './code-art-background';
import { t } from '@/lib/i18n';
import { LocaleToggle } from '@/components/locale-toggle';

export default function BootSequence() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      aria-labelledby="boot-heading"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-primary)]"
    >
      {/* Layer 0: Code art background */}
      <div className="absolute inset-0 z-0">
        <CodeArtBackground />
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
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-[var(--text-primary)]"
          >
            DashPersona
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="mt-2 text-lg font-medium sm:text-xl text-[var(--accent-green)]"
        >
          {t('ui.landing.tagline')}
        </p>

        {/* Sub-tagline */}
        <p
          className="mt-1 text-sm sm:text-base text-[var(--text-subtle)]"
        >
          {t('ui.landing.subTagline')}
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard?source=demo&persona=tutorial"
            className="btn-primary inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold bg-[var(--accent-green)] text-[var(--bg-primary)]"
          >
            {t('ui.landing.tryDemo')}
          </Link>
          <Link
            href="/onboarding"
            className="btn-outline inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-medium)] px-8 text-sm font-semibold hover:bg-white/5 text-[var(--text-primary)]"
          >
            {t('ui.landing.getStarted')}
          </Link>
          <Link
            href="/install"
            className="btn-outline inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-medium hover:bg-white/5 text-[var(--accent-yellow)]"
          >
            {t('ui.landing.installFull')}
          </Link>
        </div>
      </div>

      {/* Locale toggle — top right */}
      <div className="absolute top-4 right-6 z-10">
        <LocaleToggle />
      </div>

      {/* Layer 2: Scroll indicator */}
      <div className="absolute bottom-8 z-10 flex flex-col items-center gap-2 scroll-indicator">
        <span
          className="text-xs text-[var(--text-subtle)]"
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
          className="animate-bounce text-[var(--accent-green)]"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
