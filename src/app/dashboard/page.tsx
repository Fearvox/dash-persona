import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  runAllEngines,
  overallScore,
} from '@/lib/engine';
// Post type used via runAllEngines result
import DashboardInteractive from '@/components/dashboard-interactive';
import PlatformComparison from '@/components/platform-comparison';
import StrategySuggestions from '@/components/strategy-suggestions';
import LiveDashboardWrapper from '@/components/live-dashboard-wrapper';
import ExtensionDataLoader from '@/components/extension-data-loader';
import ForYouCard from '@/components/for-you-card';
import NicheDetectCard from '@/components/niche-detect-card';
import ImportDashboardLoader from '@/components/import-dashboard-loader';
import ExportButton from '@/components/export-button';
import { UpgradeBanner } from '@/components/upgrade-banner';
import AnalysisDeltaBadge from '@/components/analysis-delta-badge';
import { extractAnalysisSnapshot } from '@/lib/history/analysis-types';
import { profileKey } from '@/lib/history/store';

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
        ? `${t('ui.dashboard.demoDashboard')} — DashPersona`
        : `${t('ui.dashboard.title')} — DashPersona`,
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
  const isImport = params.source === 'import';
  const isDemo = params.source === 'demo';
  const liveUrl = params.url ?? '';
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  // --- Import mode (file upload workaround) ---
  if (isImport) {
    return <ImportDashboardLoader />;
  }

  // --- Live data collection mode ---
  if (isLive) {
    // Always prepare fallback demo data
    const fallbackProfiles = getDemoProfile(personaType);

    if (!liveUrl || !isValidUrl(liveUrl)) {
      // No URL or invalid URL -- direct user to onboarding
      return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {liveUrl ? t('ui.dashboard.invalidProfileUrl') : t('ui.dashboard.noProfileUrl')}
          </h1>
          <p
            className="max-w-md text-center text-sm leading-6 text-[var(--text-secondary)]"
          >
            {liveUrl
              ? t('ui.dashboard.invalidUrlMessage')
              : t('ui.dashboard.noUrlMessage')}
          </p>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
          >
            {t('ui.common.goToOnboarding')}
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
        {({ profiles, isExtensionData, isLoading, error }) => {
          if (isLoading) {
            return (
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('ui.dashboard.waitingExtension')}
                </p>
              </div>
            );
          }
          if (error) {
            return (
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {t('ui.dashboard.extensionError')}
                </h1>
                <p
                  className="max-w-md text-center text-sm leading-6 text-[var(--accent-red)]"
                >
                  {error}
                </p>
                <Link
                  href={`/dashboard?source=demo&persona=${personaType}`}
                  className="nav-pill"
                >
                  {t('ui.common.viewDemoInstead')}
                </Link>
              </div>
            );
          }
          if (!isExtensionData) {
            return (
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {t('ui.dashboard.extensionData')}
                </h1>
                <p
                  className="max-w-md text-center text-sm leading-6 text-[var(--text-secondary)]"
                >
                  {t('ui.dashboard.noExtensionData')}
                </p>
                <Link
                  href={`/dashboard?source=demo&persona=${personaType}`}
                  className="nav-pill"
                >
                  {t('ui.common.viewDemoInstead')}
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

  // 2-7. Run all engines in parallel
  const {
    personaScores,
    explanations,
    comparison,
    suggestions,
    benchmarkResult,
    nicheResult,
    allPosts,
    bestPlatform,
  } = await runAllEngines(profiles);

  // 8. Build analysis snapshot for history tracking
  const bestProfile = profiles[bestPlatform] ?? Object.values(profiles)[0];
  const bestScore = personaScores[bestPlatform] ?? Object.values(personaScores)[0];
  const bestOverall = overallScore(bestScore);
  const analysisSnapshot = extractAnalysisSnapshot(
    bestPlatform,
    bestOverall,
    bestScore,
    nicheResult,
  );
  // Fill profile-level fields that extractAnalysisSnapshot can't access
  analysisSnapshot.followers = bestProfile.profile.followers;
  analysisSnapshot.likesTotal = bestProfile.profile.likesTotal;

  const analysisStoreKey = profileKey(bestPlatform, bestProfile.profile.uniqueId);

  const sourceParam = params.source ?? 'demo';

  return (
    <div id="dashboard-content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      {/* Header — compact */}
      <header className="no-print animate-stagger animate-stagger-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80 text-[var(--accent-green)]"
            aria-label="Back to home"
          >
            &larr;
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            {t('ui.dashboard.title')}
          </h1>
          <AnalysisDeltaBadge current={analysisSnapshot} storeKey={analysisStoreKey} />
          {isDemo && (
            <span className="badge badge-green">{t('ui.common.demo')}</span>
          )}
          <span
            className="text-xs text-[var(--text-subtle)]"
          >
            {personaType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Link
            href="/settings"
            className="nav-pill"
            aria-label="Settings"
          >
            {t('ui.common.settings')}
          </Link>
        </div>
      </header>

      {/* Upgrade banner for demo mode */}
      {isDemo && (
        <div className="animate-stagger animate-stagger-0">
          <UpgradeBanner />
        </div>
      )}

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
                {t('ui.dashboard.growthOverview')}
              </h2>
              <Link
                href={`/compare?source=${sourceParam}&persona=${personaType}`}
                className="nav-pill"
              >
                {t('ui.common.viewDetails')} &rarr;
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
              analysisSnapshot={analysisSnapshot}
              analysisStoreKey={analysisStoreKey}
            />
          </section>

          {/* Cross-Platform Comparison */}
          <section
            className="animate-stagger animate-stagger-3"
            aria-labelledby="platforms-heading"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="platforms-heading" className="kicker">
                {t('ui.dashboard.crossPlatformComparison')}
              </h2>
              <Link
                href={`/compare?source=${sourceParam}&persona=${personaType}`}
                className="nav-pill"
              >
                {t('ui.common.viewDetails')} &rarr;
              </Link>
            </div>
            <PlatformComparison comparison={comparison} />
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="flex flex-col gap-6">
          {/* Niche Detection */}
          <section className="animate-stagger animate-stagger-1">
            <NicheDetectCard result={nicheResult} />
          </section>

          {/* Strategy Suggestions */}
          <section
            className="animate-stagger animate-stagger-2"
            aria-labelledby="strategy-heading"
          >
            <h2 id="strategy-heading" className="kicker mb-3">
              {t('ui.dashboard.strategySuggestions')}
            </h2>
            <StrategySuggestions suggestions={suggestions} />
          </section>

          {/* Quick Links */}
          <nav
            className="animate-stagger animate-stagger-3 flex flex-col gap-3"
            aria-label="Quick links"
          >
            <h2 className="kicker">{t('ui.dashboard.quickLinks')}</h2>

            <Link
              href={`/calendar?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm bg-[rgba(126,_210,_154,_0.12)] text-[var(--accent-green)]"
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
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {t('ui.dashboard.contentCalendar')}
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug text-[var(--text-subtle)]"
                >
                  {t('ui.dashboard.contentCalendarDesc')}
                </p>
              </div>
            </Link>

            <Link
              href={`/timeline?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm bg-[rgba(126,_184,_210,_0.12)] text-[var(--accent-blue)]"
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
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {t('ui.dashboard.personaTimeline')}
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug text-[var(--text-subtle)]"
                >
                  {t('ui.dashboard.personaTimelineDesc')}
                </p>
              </div>
            </Link>

            <Link
              href={`/compare?source=${sourceParam}&persona=${personaType}`}
              className="card flex items-start gap-3 p-4 transition-colors"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm bg-[rgba(210,_200,_126,_0.12)] text-[var(--accent-yellow)]"
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
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {t('ui.dashboard.comparePlatforms')}
                </p>
                <p
                  className="mt-0.5 text-xs leading-snug text-[var(--text-subtle)]"
                >
                  {t('ui.dashboard.comparePlatformsDesc')}
                </p>
              </div>
            </Link>
          </nav>

          {/* Settings link */}
          <div className="animate-stagger animate-stagger-4">
            <Link
              href="/settings"
              className="card flex items-center gap-3 p-4 transition-colors"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm bg-[rgba(255,_255,_255,_0.06)] text-[var(--text-secondary)]"
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.17 3.17l1.41 1.41M11.42 11.42l1.41 1.41M3.17 12.83l1.41-1.41M11.42 4.58l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <p
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                {t('ui.common.settings')}
              </p>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
