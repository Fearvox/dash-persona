import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import { generateContentPlan } from '@/lib/engine';
import CalendarClient from './calendar-client';
import ImportCalendarLoader from './import-calendar-loader';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; persona?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.source === 'demo'
        ? 'Demo Content Calendar — DashPersona'
        : 'Content Calendar — DashPersona',
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS = new Set<DemoPersonaType>([
  'tutorial',
  'entertainment',
  'lifestyle',
]);

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface CalendarPageProps {
  searchParams: Promise<{ source?: string; persona?: string }>;
}

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;

  if (params.source === 'import') {
    return <ImportCalendarLoader />;
  }

  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  // Load demo profiles and generate content plan
  const profiles = getDemoProfile(personaType);
  const plan = generateContentPlan(profiles, 35);

  // Cold start: insufficient data
  if (plan.dataPoints < 10) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('ui.calendar.needMoreData')}
        </h1>
        <p
          className="max-w-md text-center text-sm leading-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('ui.calendar.needMoreDataPre')}{' '}
          <strong>{plan.dataPoints}</strong>
          {' '}{t('ui.calendar.needMoreDataPost', { plural: plan.dataPoints === 1 ? '' : t('ui.calendar.posts') })}
        </p>
        <p
          className="max-w-sm text-center text-xs"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.calendar.keepPublishing')}
        </p>
        <Link
          href="/onboarding"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--accent-green)',
            color: 'var(--accent-green)',
            background: 'transparent',
          }}
        >
          {t('ui.common.importMoreData')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {t('ui.calendar.title')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          {t('ui.calendar.subtitle', { dataPoints: plan.dataPoints, slots: plan.slots.length })}
        </p>
      </header>

      {/* Interactive calendar */}
      <CalendarClient plan={plan} />
    </div>
  );
}
