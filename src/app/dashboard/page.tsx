import type { Metadata } from 'next';
import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  comparePlatforms,
  generateStrategySuggestions,
  explainPersonaScore,
  compareToBenchmarkByNiche,
  type PersonaScore,
} from '@/lib/engine';
import type { ScoreExplanation } from '@/lib/engine/explain';
import type { Post } from '@/lib/schema/creator-data';
import DashboardInteractive from '@/components/dashboard-interactive';
import PlatformComparison from '@/components/platform-comparison';
import StrategySuggestions from '@/components/strategy-suggestions';
import LiveDashboardWrapper from '@/components/live-dashboard-wrapper';
import ExtensionDataLoader from '@/components/extension-data-loader';
import ForYouCard from '@/components/for-you-card';

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
  const isExtension = params.source === 'extension';
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
      // No URL or invalid URL -- direct user to onboarding
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

  // --- Extension mode ---
  if (isExtension) {
    const fallbackProfiles = getDemoProfile(personaType);
    return (
      <ExtensionDataLoader fallbackProfiles={fallbackProfiles}>
        {({ profiles, isExtensionData, isLoading }) => {
          if (isLoading) {
            return (
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Waiting for extension data...
                </p>
              </div>
            );
          }
          if (!isExtensionData) {
            return (
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Extension Data
                </h1>
                <p
                  className="max-w-md text-center text-sm leading-6"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  No extension data received yet. Open the Data Passport extension
                  on creator.douyin.com and click &quot;Collect&quot;.
                  Using demo data as fallback.
                </p>
                <Link
                  href={`/dashboard?source=demo&persona=${personaType}`}
                  className="nav-pill"
                >
                  View demo instead
                </Link>
              </div>
            );
          }
          // Extension data received — render normal dashboard
          // Redirect to demo dashboard with extension profiles loaded via localStorage
          return null;
        }}
      </ExtensionDataLoader>
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

  // 3. Compute explanations for each platform
  const explanations: Record<string, Record<string, ScoreExplanation>> = {};
  for (const [platform, profile] of Object.entries(profiles)) {
    explanations[platform] = explainPersonaScore(
      personaScores[platform],
      profile.posts,
    );
  }

  // 4. Cross-platform comparison
  const comparison = comparePlatforms(Object.values(profiles));

  // 5. Strategy suggestions (use the best-scoring platform's PersonaScore)
  const bestPlatform =
    comparison.bestEngagementPlatform ?? Object.keys(personaScores)[0];
  const bestPersonaScore = personaScores[bestPlatform] ?? Object.values(personaScores)[0];
  const suggestions = generateStrategySuggestions(bestPersonaScore, comparison);

  // 6. Benchmark comparison (niche-aware)
  const benchmarkResult = compareToBenchmarkByNiche(
    profiles[bestPlatform] ?? Object.values(profiles)[0],
    bestPersonaScore,
  );

  // 7. Collect all posts across platforms for the PostDrawer
  const allPosts: Post[] = Object.values(profiles).flatMap((p) => p.posts);

  const sourceParam = params.source ?? 'demo';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      {/* Header — compact */}
      <header className="animate-stagger animate-stagger-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-green)' }}
            aria-label="Back to home"
          >
            &larr;
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Dashboard
          </h1>
          {isDemo && (
            <span className="badge badge-green">Demo</span>
          )}
          <span
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            {personaType}
          </span>
        </div>
        <Link
          href="/settings"
          className="nav-pill"
          aria-label="Settings"
        >
          Settings
        </Link>
      </header>

      {/* 2-zone grid: Main (left) + Sidebar (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* For You */}
          <section className="animate-stagger animate-stagger-1">
            <ForYouCard profiles={profiles} />
          </section>

          {/* Growth Overview */}
          <section
            className="animate-stagger animate-stagger-2"
            aria-labelledby="growth-heading"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="growth-heading" className="kicker">
                Growth Overview
              </h2>
              <Link
                href={`/compare?source=${sourceParam}&persona=${personaType}`}
                className="nav-pill"
              >
                View details &rarr;
              </Link>
            </div>
            <DashboardInteractive
              profiles={profiles}
              personaScores={personaScores}
              explanations={explanations}
              allPosts={allPosts}
              source={sourceParam}
              personaType={personaType}
              benchmarkResult={benchmarkResult}
            />
          </section>

          {/* Cross-Platform Comparison */}
          <section
            className="animate-stagger animate-stagger-3"
            aria-labelledby="platforms-heading"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="platforms-heading" className="kicker">
                Cross-Platform Comparison
              </h2>
              <Link
                href={`/compare?source=${sourceParam}&persona=${personaType}`}
                className="nav-pill"
              >
                View details &rarr;
              </Link>
            </div>
            <PlatformComparison comparison={comparison} />
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="flex flex-col gap-6">
          {/* Strategy Suggestions */}
          <section
            className="animate-stagger animate-stagger-1"
            aria-labelledby="strategy-heading"
          >
            <h2 id="strategy-heading" className="kicker mb-3">
              Strategy Suggestions
            </h2>
            <StrategySuggestions suggestions={suggestions} />
          </section>

          {/* Quick Links */}
          <nav
            className="animate-stagger animate-stagger-2 flex flex-col gap-3"
            aria-label="Quick links"
          >
            <h2 className="kicker">Quick Links</h2>

            <Link
              href={`/calendar?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: 'rgba(126, 210, 154, 0.12)',
                  color: 'var(--accent-green)',
                }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Content Calendar
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Schedule posts based on engagement patterns
                </p>
              </div>
            </Link>

            <Link
              href={`/timeline?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: 'rgba(126, 184, 210, 0.12)',
                  color: 'var(--accent-blue)',
                }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="4.5" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="11.5" r="1.5" fill="currentColor"/>
                  <path d="M9.5 4.5H12M9.5 8H13M9.5 11.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Persona Timeline
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Track strategy experiments and decisions
                </p>
              </div>
            </Link>

            <Link
              href={`/compare?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: 'rgba(210, 200, 126, 0.12)',
                  color: 'var(--accent-yellow)',
                }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="8" width="3" height="6" rx="0.75" fill="currentColor"/>
                  <rect x="6.5" y="5" width="3" height="9" rx="0.75" fill="currentColor"/>
                  <rect x="11" y="2" width="3" height="12" rx="0.75" fill="currentColor"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Compare Platforms
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Side-by-side platform performance
                </p>
              </div>
            </Link>
          </nav>

          {/* Settings link */}
          <div className="animate-stagger animate-stagger-3">
            <Link
              href="/settings"
              className="card flex items-center gap-3 p-4 transition-colors"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.17 3.17l1.41 1.41M11.42 11.42l1.41 1.41M3.17 12.83l1.41-1.41M11.42 4.58l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Settings
              </p>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
