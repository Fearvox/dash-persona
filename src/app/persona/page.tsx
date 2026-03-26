import type { Metadata } from 'next';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  generateStrategySuggestions,
} from '@/lib/engine';
import { VALID_PERSONAS } from '@/lib/utils/constants';
import PersonaDetailContent from './persona-detail-content';
import ImportPersonaLoader from './import-persona-loader';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; persona?: string; platform?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.source === 'demo'
        ? 'Demo Persona Detail — DashPersona'
        : 'Persona Detail — DashPersona',
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS_SET = new Set<DemoPersonaType>(
  VALID_PERSONAS as readonly DemoPersonaType[],
);

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface PersonaPageProps {
  searchParams: Promise<{
    source?: string;
    persona?: string;
    platform?: string;
  }>;
}

export default async function PersonaPage({ searchParams }: PersonaPageProps) {
  const params = await searchParams;

  // Import mode — delegate to client component that loads real data
  if (params.source === 'import') {
    return <ImportPersonaLoader platform={params.platform ?? 'douyin'} />;
  }

  // Demo mode — server-side computation
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS_SET.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  const platformParam = params.platform ?? 'douyin';
  const platform = PLATFORMS.includes(platformParam as typeof PLATFORMS[number])
    ? platformParam
    : 'douyin';

  // Load data
  const profiles = getDemoProfile(personaType);
  const profile = profiles[platform];
  const score = computePersonaScore(profile);

  // Strategy (top 2)
  const suggestions = generateStrategySuggestions(score).slice(0, 2);

  return (
    <PersonaDetailContent
      score={score}
      suggestions={suggestions}
      platform={platform}
      platforms={[...PLATFORMS]}
      source={params.source ?? 'demo'}
      personaType={personaType}
    />
  );
}
