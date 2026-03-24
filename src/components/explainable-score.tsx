'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import type { ScoreExplanation, ScoreFactor } from '@/lib/engine/explain';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExplainableScoreProps {
  label: string;
  score: number;
  explanation: ScoreExplanation;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--accent-green)';
  if (value >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

function impactColor(impact: ScoreFactor['impact']): string {
  switch (impact) {
    case 'positive':
      return 'var(--accent-green)';
    case 'negative':
      return 'var(--accent-red)';
    case 'neutral':
      return 'var(--text-subtle)';
  }
}

/** localStorage key for persisting expanded/collapsed state. */
function storageKey(label: string): string {
  return `explainable-score-${label.toLowerCase().replace(/\s+/g, '-')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExplainableScore({
  label,
  score,
  explanation,
  className,
}: ExplainableScoreProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(label));
      if (stored === 'true') setExpanded(true);
    } catch {
      // localStorage may be unavailable
    }
  }, [label]);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey(label), String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [label]);

  return (
    <div
      className={`rounded-lg ${className ?? ''}`}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between p-4 text-left"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <p
          className="text-xs font-medium"
          style={{ color: 'var(--text-subtle)' }}
        >
          {label}
        </p>
        <p
          className="metric-value text-xl font-semibold"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </p>
      </button>

      {/* Expandable detail panel */}
      <div
        id={panelId}
        role="region"
        aria-label={`${label} explanation`}
        style={{
          maxHeight: expanded ? '600px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out',
        }}
      >
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Formula */}
          <p
            className="rounded px-2 py-1.5 font-mono text-xs leading-relaxed"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            {explanation.formula}
          </p>

          {/* Factors */}
          <div className="mt-3 space-y-2">
            {explanation.factors.map((factor) => (
              <FactorRow key={factor.name} factor={factor} />
            ))}
          </div>

          {/* Top posts */}
          {explanation.factors.some((f) => f.topPostIds.length > 0) && (
            <p
              className="mt-3 text-xs"
              style={{ color: 'var(--text-subtle)' }}
            >
              Driven by{' '}
              {explanation.factors
                .flatMap((f) => f.topPostIds)
                .filter((v, i, a) => a.indexOf(v) === i)
                .length}{' '}
              posts
            </p>
          )}

          {/* Summary */}
          <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {explanation.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factor row sub-component
// ---------------------------------------------------------------------------

function FactorRow({ factor }: { factor: ScoreFactor }) {
  // Bar width proportional to weight (0-1) scaled to percentage
  const barWidth = Math.round(factor.weight * 100);

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-24 shrink-0 truncate text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
        title={factor.name}
      >
        {factor.name}
      </span>

      {/* Bar container */}
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${barWidth}%`,
            background: impactColor(factor.impact),
            opacity: 0.7,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <span
        className="w-10 shrink-0 text-right text-xs font-medium"
        style={{ color: impactColor(factor.impact) }}
      >
        {typeof factor.value === 'number' && factor.value % 1 !== 0
          ? factor.value.toFixed(1)
          : factor.value}
      </span>
    </div>
  );
}
