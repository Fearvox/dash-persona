'use client';

import type { ExperimentIdea } from '@/lib/engine/idea-generator';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IdeaCardsProps {
  ideas: ExperimentIdea[];
  onUseIdea: (idea: ExperimentIdea) => void;
}

// ---------------------------------------------------------------------------
// Impact badge styles
// ---------------------------------------------------------------------------

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'rgba(126, 210, 154, 0.15)', text: 'var(--accent-green)' },
  medium: { bg: 'rgba(210, 200, 126, 0.15)', text: 'var(--accent-yellow)' },
  low: { bg: 'rgba(126, 170, 210, 0.15)', text: 'var(--accent-blue, #6ea8d8)' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IdeaCards({ ideas, onUseIdea }: IdeaCardsProps) {
  if (ideas.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: 'var(--text-subtle)' }}
      >
        No experiment ideas available. Add more content data to unlock suggestions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ideas.slice(0, 5).map((idea) => {
        const impact = IMPACT_STYLES[idea.potentialImpact] ?? IMPACT_STYLES.low;

        return (
          <div
            key={idea.id}
            className="card p-4"
          >
            {/* Header: title + impact badge */}
            <div className="flex items-start justify-between gap-3">
              <h4
                className="text-sm font-semibold leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {idea.title}
              </h4>
              <span
                className="badge shrink-0 text-xs"
                style={{ background: impact.bg, color: impact.text }}
              >
                {idea.potentialImpact}
              </span>
            </div>

            {/* Hypothesis */}
            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {idea.hypothesis}
            </p>

            {/* Rationale */}
            <p
              className="mt-1.5 text-xs leading-relaxed"
              style={{ color: 'var(--text-subtle)' }}
            >
              {idea.rationale}
            </p>

            {/* Use idea button */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {idea.basedOn.slice(0, 2).map((point, i) => (
                  <span
                    key={i}
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    {point}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onUseIdea(idea)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: 'var(--accent-green)',
                  color: 'var(--bg-primary)',
                }}
              >
                Use this idea
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
