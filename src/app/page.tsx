'use client';

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import BootSequence from '@/components/landing/boot-sequence';
import { OutputWall } from '@/components/landing/output-wall';
import PipelineSkeleton from '@/components/landing/pipeline-skeleton';
import { TextcraftDivider } from '@/components/ui/textcraft';

// Lazy load React Flow pipeline (235KB) — only loads when scrolled into view
const PipelineViewer = dynamic(
  () => import('@/components/landing/pipeline-viewer'),
  {
    ssr: false,
    loading: () => <PipelineSkeleton />,
  },
);

// ---------------------------------------------------------------------------
// Error Boundary — fallback to simple landing if cinematic breaks
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
}

class CinematicErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <SimpleFallbackLanding />;
    }
    return this.props.children;
  }
}

function SimpleFallbackLanding() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <img src="/logo-icon.svg" alt="DashPersona logo" width={40} height={40} />
      <h1
        className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
        style={{ color: 'var(--text-primary)' }}
      >
        DashPersona
      </h1>
      <p
        className="mt-2 text-lg font-medium"
        style={{ color: 'var(--accent-green)' }}
      >
        Data-Agnostic Creator Intelligence Engine
      </p>
      <p
        className="mt-4 max-w-md text-sm leading-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        Analyze your social media presence across Douyin, TikTok, and Red Note
        with deterministic, AI-free algorithms.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/dashboard?source=demo&persona=tutorial"
          className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold"
          style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)' }}
        >
          Try Demo
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex h-12 items-center justify-center rounded-full border px-8 text-sm font-semibold"
          style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main landing page — continuous scroll narrative
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <CinematicErrorBoundary>
      <div className="flex flex-col">
        {/* Act 1: Boot Sequence — full viewport */}
        <BootSequence />

        {/* Divider: Boot → Pipeline */}
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <TextcraftDivider label="PIPELINE" />
        </div>

        {/* Act 2: Algorithm Pipeline — vertical flow */}
        <section
          className="mx-auto w-full max-w-6xl px-6 py-16"
          aria-labelledby="pipeline-heading"
        >
          <h2
            id="pipeline-heading"
            className="kicker mb-2"
          >
            {t('ui.landing.howItWorks')}
          </h2>
          <p
            className="mb-8 max-w-lg text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('ui.landing.pipelineDesc')}
          </p>
          <PipelineViewer />
        </section>

        {/* Divider: Pipeline → Output */}
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <TextcraftDivider label="OUTPUT" />
        </div>

        {/* Act 3: Output Wall + CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <OutputWall />
        </section>
      </div>
    </CinematicErrorBoundary>
  );
}
