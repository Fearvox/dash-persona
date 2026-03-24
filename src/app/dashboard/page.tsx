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

interface DashboardPageProps {
  searchParams: Promise<{ source?: string; persona?: string }>;
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
  const isDemo = params.source === 'demo';
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

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
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
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
        <h2 id="growth-heading" className="kicker mb-3">
          Growth Overview
        </h2>
        <GrowthSparklines profiles={profiles} />
      </section>

      {/* 3. Persona Score */}
      <section aria-labelledby="persona-heading">
        <h2 id="persona-heading" className="kicker mb-3">
          Persona Score
        </h2>
        <PersonaOverview scores={personaScores} />
      </section>

      {/* 4. Cross-Platform Comparison */}
      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" className="kicker mb-3">
          Cross-Platform Comparison
        </h2>
        <PlatformComparison comparison={comparison} />
      </section>

      {/* 5. Strategy Suggestions */}
      <section aria-labelledby="strategy-heading">
        <h2 id="strategy-heading" className="kicker mb-3">
          Strategy Suggestions
        </h2>
        <StrategySuggestions suggestions={suggestions} />
      </section>
    </div>
  );
}
