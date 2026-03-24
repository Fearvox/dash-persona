import type { Metadata } from 'next';
import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  comparePlatforms,
  generateStrategySuggestions,
  type PersonaScore,
} from '@/lib/engine';
import GrowthSparklines from '@/components/growth-sparklines';
import PersonaOverview from '@/components/persona-overview';
import PlatformComparison from '@/components/platform-comparison';
import StrategySuggestions from '@/components/strategy-suggestions';
import LiveDashboardWrapper from '@/components/live-dashboard-wrapper';

interface DashboardSearchParams {
  source?: string;
  persona?: string;
  url?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.source === 'demo'
        ? 'Demo Dashboard — DashPersona'
        : 'Dashboard — DashPersona',
  };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface DashboardPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

const VALID_PERSONAS = new Set<DemoPersonaType>([
  'tutorial',
  'entertainment',
  'lifestyle',
]);

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const isLive = params.source === 'live';
  const isDemo = params.source === 'demo';
  const liveUrl = params.url ?? '';
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  // --- Live data collection mode ---
  if (isLive) {
    // Always prepare fallback demo data
    const fallbackProfiles = getDemoProfile(personaType);

    if (!liveUrl || !isValidUrl(liveUrl)) {
      // No URL or invalid URL — direct user to onboarding
      return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {liveUrl ? 'Invalid profile URL' : 'No profile URL provided'}
          </h1>
          <p
            className="max-w-md text-center text-sm leading-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            {liveUrl
              ? 'The URL provided is not valid. Please go through the onboarding flow and paste a valid TikTok profile URL.'
              : 'To use live data collection, please go through the onboarding flow and paste your TikTok profile URL.'}
          </p>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent-green)',
              color: 'var(--bg-primary)',
            }}
          >
            Go to Onboarding
          </Link>
        </div>
      );
    }

    return (
      <LiveDashboardWrapper url={liveUrl} fallbackProfiles={fallbackProfiles} />
    );
  }

  // --- Demo mode (default) ---
  // 1. Get demo profiles (one per platform)
  const profiles = getDemoProfile(personaType);

  // 2. Compute persona score for each platform
  const personaScores: Record<string, PersonaScore> = {};
  for (const [platform, profile] of Object.entries(profiles)) {
    personaScores[platform] = computePersonaScore(profile);
  }

  // 3. Cross-platform comparison
  const comparison = comparePlatforms(Object.values(profiles));

  // 4. Strategy suggestions (use the best-scoring platform's PersonaScore)
  const bestPlatform =
    comparison.bestEngagementPlatform ?? Object.keys(personaScores)[0];
  const bestPersonaScore = personaScores[bestPlatform] ?? Object.values(personaScores)[0];
  const suggestions = generateStrategySuggestions(bestPersonaScore, comparison);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* 1. Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-green)' }}
            aria-label="Back to home"
          >
            &larr; DashPersona
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Dashboard
          </h1>
          {isDemo && (
            <span className="badge badge-green mt-1">Demo Mode</span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          Persona: {personaType}
        </p>
      </header>

      {/* 2. Growth Overview */}
      <section aria-labelledby="growth-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="growth-heading" className="kicker">
            Growth Overview
          </h2>
          <Link
            href={`/compare?source=${params.source ?? 'demo'}&persona=${personaType}`}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--text-subtle)' }}
          >
            <span className="detail-link">View details &rarr;</span>
          </Link>
        </div>
        <GrowthSparklines profiles={profiles} />
      </section>

      {/* 3. Persona Score */}
      <section aria-labelledby="persona-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="persona-heading" className="kicker">
            Persona Score
          </h2>
          <Link
            href={`/persona?source=${params.source ?? 'demo'}&persona=${personaType}`}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--text-subtle)' }}
          >
            <span className="detail-link">View details &rarr;</span>
          </Link>
        </div>
        <PersonaOverview scores={personaScores} />
      </section>

      {/* 4. Cross-Platform Comparison */}
      <section aria-labelledby="platforms-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="platforms-heading" className="kicker">
            Cross-Platform Comparison
          </h2>
          <Link
            href={`/compare?source=${params.source ?? 'demo'}&persona=${personaType}`}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--text-subtle)' }}
          >
            <span className="detail-link">View details &rarr;</span>
          </Link>
        </div>
        <PlatformComparison comparison={comparison} />
      </section>

      {/* 5. Persona Timeline */}
      <section aria-labelledby="timeline-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="timeline-heading" className="kicker">
            Persona Timeline
          </h2>
          <Link
            href={`/timeline?source=${params.source ?? 'demo'}&persona=${personaType}`}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--text-subtle)' }}
          >
            <span className="detail-link">View details &rarr;</span>
          </Link>
        </div>
        <div className="card p-5">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Content Strategy Experiments
          </p>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: 'var(--text-subtle)' }}
          >
            Track content strategy experiments as a tree of decisions. View
            experiment outcomes, scoring breakdowns, and decision rationale.
          </p>
        </div>
      </section>

      {/* 6. Strategy Suggestions */}
      <section aria-labelledby="strategy-heading">
        <h2 id="strategy-heading" className="kicker mb-3">
          Strategy Suggestions
        </h2>
        <StrategySuggestions suggestions={suggestions} />
      </section>
    </div>
  );
}
