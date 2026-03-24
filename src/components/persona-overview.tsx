'use client';

import type { PersonaScore } from '@/lib/engine';

interface PersonaOverviewProps {
  scores: Record<string, PersonaScore>;
}

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--accent-green)';
  if (value >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

function tagColor(confidence: number): {
  bg: string;
  text: string;
} {
  if (confidence >= 0.7)
    return { bg: 'rgba(126, 210, 154, 0.15)', text: 'var(--accent-green)' };
  if (confidence >= 0.4)
    return { bg: 'rgba(210, 200, 126, 0.15)', text: 'var(--accent-yellow)' };
  return { bg: 'rgba(126, 184, 210, 0.15)', text: 'var(--accent-blue)' };
}

/** Compute a 0-100 "viral potential" score from engagement data. */
function viralPotentialScore(score: PersonaScore): number {
  if (score.engagement.byCategory.length === 0) return 0;
  const bestRate = score.engagement.byCategory[0].meanEngagementRate;
  // Scale: 15%+ engagement = 100, linear down
  return Math.min(Math.round(bestRate * 100 * 6.67), 100);
}

/** Compute a composite "overall" score (0-100). */
function overallScore(score: PersonaScore): number {
  const engagementPart = Math.min(score.engagement.overallRate * 100 * 5, 100);
  const rhythmPart = score.rhythm.consistencyScore;
  const consistencyPart = score.consistency.score;
  const growthPart =
    score.growthHealth.momentum === 'accelerating'
      ? 80
      : score.growthHealth.momentum === 'steady'
        ? 60
        : score.growthHealth.momentum === 'decelerating'
          ? 30
          : 0;

  return Math.round(
    engagementPart * 0.3 +
      rhythmPart * 0.2 +
      consistencyPart * 0.25 +
      growthPart * 0.25,
  );
}

interface DimensionCardProps {
  label: string;
  value: string;
  score: number;
}

function DimensionCard({ label, value, score }: DimensionCardProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-xs font-medium"
        style={{ color: 'var(--text-subtle)' }}
      >
        {label}
      </p>
      <p
        className="metric-value mt-1 text-xl font-semibold"
        style={{ color: scoreColor(score) }}
      >
        {value}
      </p>
    </div>
  );
}

export default function PersonaOverview({ scores }: PersonaOverviewProps) {
  // Find the best overall score across platforms
  const entries = Object.entries(scores);
  let bestPlatform = entries[0]?.[0] ?? '';
  let bestOverall = 0;

  for (const [platform, score] of entries) {
    const overall = overallScore(score);
    if (overall > bestOverall) {
      bestOverall = overall;
      bestPlatform = platform;
    }
  }

  const bestScore = scores[bestPlatform];
  if (!bestScore) return null;

  const diversityIndex = Object.keys(bestScore.contentDistribution).length;
  const diversityScore = Math.min(diversityIndex * 10, 100);
  const engagementPct = (bestScore.engagement.overallRate * 100).toFixed(1);
  const engagementScore = Math.min(
    Math.round(bestScore.engagement.overallRate * 100 * 5),
    100,
  );
  const rhythmValue = `${bestScore.rhythm.postsPerWeek}/wk`;
  const consistencyValue = `${bestScore.consistency.score}`;
  const growthValue =
    bestScore.growthHealth.momentum === 'insufficient_data'
      ? 'N/A'
      : `${bestScore.growthHealth.followerGrowthRate}%`;
  const growthScore =
    bestScore.growthHealth.momentum === 'accelerating'
      ? 80
      : bestScore.growthHealth.momentum === 'steady'
        ? 60
        : bestScore.growthHealth.momentum === 'decelerating'
          ? 30
          : 0;
  const viral = viralPotentialScore(bestScore);

  // Collect all unique tags across platforms
  const allTags = new Map<string, (typeof bestScore.tags)[0]>();
  for (const score of Object.values(scores)) {
    for (const tag of score.tags) {
      if (!allTags.has(tag.slug) || tag.confidence > allTags.get(tag.slug)!.confidence) {
        allTags.set(tag.slug, tag);
      }
    }
  }
  const tags = [...allTags.values()].sort(
    (a, b) => b.confidence - a.confidence,
  );

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {/* Big score */}
        <div className="flex flex-col items-center gap-2 sm:min-w-[120px]">
          <p
            className="metric-value text-5xl font-bold"
            style={{ color: scoreColor(bestOverall) }}
          >
            {bestOverall}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--text-subtle)' }}
          >
            Overall Score
          </p>
          <p
            className="text-[10px]"
            style={{ color: 'var(--text-subtle)' }}
          >
            Best: {bestPlatform}
          </p>
        </div>

        {/* Dimension grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <DimensionCard
            label="Content Mix"
            value={`${diversityIndex} types`}
            score={diversityScore}
          />
          <DimensionCard
            label="Engagement Rate"
            value={`${engagementPct}%`}
            score={engagementScore}
          />
          <DimensionCard
            label="Posting Rhythm"
            value={rhythmValue}
            score={bestScore.rhythm.consistencyScore}
          />
          <DimensionCard
            label="Persona Consistency"
            value={consistencyValue}
            score={bestScore.consistency.score}
          />
          <DimensionCard
            label="Growth Health"
            value={growthValue}
            score={growthScore}
          />
          <DimensionCard
            label="Viral Potential"
            value={`${viral}`}
            score={viral}
          />
        </div>
      </div>

      {/* Persona tags */}
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const colors = tagColor(tag.confidence);
            return (
              <span
                key={tag.slug}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: colors.bg, color: colors.text }}
                title={tag.evidence}
              >
                {tag.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
