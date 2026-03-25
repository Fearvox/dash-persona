import type { Metadata } from 'next';
import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import { generateContentPlan } from '@/lib/engine';
import CalendarClient from './calendar-client';

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
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  // Load demo profiles and generate content plan
  const profiles = getDemoProfile(personaType);
  const plan = generateContentPlan(profiles, 14);

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
          Need More Data
        </h1>
        <p
          className="max-w-md text-center text-sm leading-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          The content calendar needs at least 10 posts to generate meaningful
          scheduling recommendations. You currently have{' '}
          <strong>{plan.dataPoints}</strong> post
          {plan.dataPoints === 1 ? '' : 's'}.
        </p>
        <p
          className="max-w-sm text-center text-xs"
          style={{ color: 'var(--text-subtle)' }}
        >
          Keep publishing and check back once you have more content to analyse.
        </p>
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
          Content Calendar
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          {plan.dataPoints} posts analysed &middot; {plan.slots.length} slots
          generated
        </p>
      </header>

      {/* Interactive calendar */}
      <CalendarClient plan={plan} />
    </div>
  );
}
