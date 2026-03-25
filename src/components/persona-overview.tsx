'use client';

import { overallScore, type PersonaScore } from '@/lib/engine';
import type { ScoreExplanation } from '@/lib/engine/explain';
import type { AnalysisDelta } from '@/lib/history/analysis-types';
import ExplainableScore from './explainable-score';
import MiniDelta from './mini-delta';

interface PersonaOverviewProps {
  scores: Record<string, PersonaScore>;
  explanations?: Record<string, Record<string, ScoreExplanation>>;
  onViewPosts?: (postIds: string[]) => void;
  /** Optional analysis delta for showing trend changes. */
  analysisDelta?: AnalysisDelta | null;
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

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--accent-green)';
  if (value >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

/** Compute a 0-100 "viral potential" score from engagement data. */
function viralPotentialScore(score: PersonaScore): number {
  if (score.engagement.byCategory.length === 0) return 0;
  const bestRate = score.engagement.byCategory[0].meanEngagementRate;
  // Scale: 15%+ engagement = 100, linear down
  return Math.min(Math.round(bestRate * 100 * 6.67), 100);
}

/** Collect all unique post IDs from explanation factors for a dimension. */
function collectPostIds(
  explanations: Record<string, Record<string, ScoreExplanation>> | undefined,
  platform: string,
  dimension: string,
): string[] {
  const exp = explanations?.[platform]?.[dimension];
  if (!exp) return [];
  return exp.factors
    .flatMap((f) => f.topPostIds)
    .filter((v, i, a) => a.indexOf(v) === i);
}

export default function PersonaOverview({
  scores,
  explanations,
  onViewPosts,
  analysisDelta,
}: PersonaOverviewProps) {
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

  // Dimension data for ExplainableScore or fallback
  const platformExplanations = explanations?.[bestPlatform];

  const dimensions = [
    {
      label: 'Content Mix',
      score: diversityScore,
      key: 'contentMix',
    },
    {
      label: 'Engagement Rate',
      score: engagementScore,
      key: 'engagementProfile',
    },
    {
      label: 'Posting Rhythm',
      score: bestScore.rhythm.consistencyScore,
      key: 'rhythm',
    },
    {
      label: 'Persona Consistency',
      score: bestScore.consistency.score,
      key: 'personaConsistency',
    },
    {
      label: 'Growth Health',
      score: growthScore,
      key: 'growthHealth',
    },
    {
      label: 'Viral Potential',
      score: viral,
      key: 'viralPotential',
    },
  ];

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
          <div className="flex items-center gap-1.5">
            <p
              className="text-xs font-medium"
              style={{ color: 'var(--text-subtle)' }}
            >
              Overall Score
            </p>
            {analysisDelta?.hasPrevious && (
              <MiniDelta value={analysisDelta.scoreChange} />
            )}
          </div>
          <p
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Best: {bestPlatform}
          </p>
        </div>

        {/* Dimension grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          {dimensions.map((dim) => {
            const exp = platformExplanations?.[dim.key];
            if (exp) {
              return (
                <div key={dim.key}>
                  <ExplainableScore
                    label={dim.label}
                    score={dim.score}
                    explanation={exp}
                  />
                  {onViewPosts && (
                    <ViewPostsButton
                      postIds={collectPostIds(explanations, bestPlatform, dim.key)}
                      onClick={onViewPosts}
                    />
                  )}
                </div>
              );
            }
            // Fallback: static display (no explanation available)
            return (
              <div
                key={dim.key}
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
                  {dim.label}
                </p>
                <p
                  className="metric-value mt-1 text-xl font-semibold"
                  style={{ color: scoreColor(dim.score) }}
                >
                  {dim.score}
                </p>
              </div>
            );
          })}
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

function ViewPostsButton({
  postIds,
  onClick,
}: {
  postIds: string[];
  onClick: (ids: string[]) => void;
}) {
  if (postIds.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onClick(postIds)}
      className="mt-1 w-full text-center text-xs font-medium"
      style={{
        color: 'var(--accent-green)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 0',
      }}
    >
      View posts ({postIds.length})
    </button>
  );
}
