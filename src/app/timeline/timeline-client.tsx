'use client';

import { useState, useMemo } from 'react';
import type { PersonaTreeNode } from '@/lib/schema/persona-tree';
import { detectConflicts } from '@/lib/engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  adopted: {
    bg: 'rgba(126, 210, 154, 0.15)',
    text: 'var(--accent-green)',
    label: 'Adopted',
  },
  running: {
    bg: 'rgba(210, 200, 126, 0.15)',
    text: 'var(--accent-yellow)',
    label: 'Running',
  },
  discarded: {
    bg: 'rgba(200, 126, 126, 0.15)',
    text: 'var(--accent-red)',
    label: 'Discarded',
  },
  planned: {
    bg: 'rgba(138, 149, 144, 0.15)',
    text: 'var(--text-subtle)',
    label: 'Planned',
  },
};

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--accent-green)';
  if (value >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

// ---------------------------------------------------------------------------
// Node card
// ---------------------------------------------------------------------------

function NodeCard({
  node,
  isSelected,
  onClick,
}: {
  node: PersonaTreeNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = STATUS_STYLES[node.status] ?? STATUS_STYLES.planned;
  const hasConflict = detectConflicts(node);

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full cursor-pointer p-4 text-left transition-all"
      style={{
        borderColor: isSelected
          ? 'var(--accent-green)'
          : undefined,
        borderWidth: isSelected ? '2px' : undefined,
        minWidth: 220,
        maxWidth: 280,
      }}
      aria-pressed={isSelected}
    >
      {/* Header: ID + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="metric-value text-xs font-medium"
          style={{ color: 'var(--text-subtle)' }}
        >
          {node.id}
        </span>
        <span
          className="badge text-[10px]"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
      </div>

      {/* Title */}
      <p
        className="mt-2 text-sm font-semibold leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        {node.title}
      </p>

      {/* Hypothesis preview */}
      <p
        className="mt-1 text-[11px] leading-relaxed"
        style={{ color: 'var(--text-subtle)' }}
      >
        {node.hypothesis.length > 80
          ? node.hypothesis.slice(0, 80) + '...'
          : node.hypothesis}
      </p>

      {/* Composite score */}
      {node.scoring && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="metric-value text-lg font-bold"
            style={{ color: scoreColor(node.scoring.compositeScore) }}
          >
            {node.scoring.compositeScore}
          </span>
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-subtle)' }}
          >
            composite
          </span>
          {hasConflict && (
            <span
              className="badge text-[10px]"
              style={{
                background: 'rgba(210, 200, 126, 0.15)',
                color: 'var(--accent-yellow)',
              }}
            >
              Conflict
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span
          className="metric-value font-medium"
          style={{ color: scoreColor(value) }}
        >
          {value}/{max}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min((value / max) * 100, 100)}%`,
            background: scoreColor(value),
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function DetailPanel({ node }: { node: PersonaTreeNode }) {
  const status = STATUS_STYLES[node.status] ?? STATUS_STYLES.planned;
  const hasConflict = detectConflicts(node);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="metric-value text-sm font-medium"
              style={{ color: 'var(--text-subtle)' }}
            >
              {node.id}
            </span>
            <span
              className="badge"
              style={{ background: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            {hasConflict && (
              <span
                className="badge"
                style={{
                  background: 'rgba(210, 200, 126, 0.15)',
                  color: 'var(--accent-yellow)',
                }}
              >
                Metric Conflict
              </span>
            )}
          </div>
          <h3
            className="mt-1 text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {node.title}
          </h3>
        </div>
        <span
          className="text-xs"
          style={{ color: 'var(--text-subtle)' }}
        >
          Series: {node.series}
        </span>
      </div>

      {/* Hypothesis */}
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {node.hypothesis}
      </p>

      {/* Scoring breakdown */}
      {node.scoring && (
        <div className="mt-5">
          <p className="kicker mb-3">Scoring Breakdown</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Engagement" value={node.scoring.engagementScore} />
            <ScoreBar label="Retention" value={node.scoring.retentionScore} />
            <ScoreBar label="Growth" value={node.scoring.growthScore} />
            <ScoreBar label="Composite" value={node.scoring.compositeScore} />
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Threshold:{' '}
            {node.scoring.passesThreshold ? (
              <span style={{ color: 'var(--accent-green)' }}>Passes</span>
            ) : (
              <span style={{ color: 'var(--accent-red)' }}>Below</span>
            )}
          </p>
        </div>
      )}

      {/* Variants */}
      <div className="mt-5">
        <p className="kicker mb-3">Variants</p>
        <div className="flex flex-col gap-3">
          {node.variants.map((variant) => (
            <div
              key={variant.id}
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {variant.label}
                </span>
                <span
                  className="metric-value text-[10px]"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {variant.id}
                </span>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {variant.description}
              </p>
              <p
                className="mt-1 text-[10px]"
                style={{ color: 'var(--text-subtle)' }}
              >
                {variant.postIds.length} post{variant.postIds.length !== 1 ? 's' : ''}:{' '}
                {variant.postIds.slice(0, 5).join(', ')}
                {variant.postIds.length > 5 ? ` (+${variant.postIds.length - 5} more)` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Decision rationale */}
      {node.decision && (
        <div className="mt-5">
          <p className="kicker mb-3">Decision</p>
          <div
            className="rounded-lg p-3"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {node.decision.verdict}
            </p>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {node.decision.reason}
            </p>
            {node.decision.mergedBack && (
              <p
                className="mt-1 text-[10px]"
                style={{ color: 'var(--text-subtle)' }}
              >
                Merged back to: {node.decision.mergedBack}
              </p>
            )}
            {node.decision.rejected && (
              <p
                className="mt-1 text-[10px]"
                style={{ color: 'var(--accent-red)' }}
              >
                Rejected: {node.decision.rejected}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Conflict explanation */}
      {hasConflict && (
        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'rgba(210, 200, 126, 0.08)',
            border: '1px solid rgba(210, 200, 126, 0.2)',
          }}
        >
          <p
            className="text-xs font-semibold"
            style={{ color: 'var(--accent-yellow)' }}
          >
            Metric Conflict Detected
          </p>
          <p
            className="mt-1 text-[11px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {node.status === 'adopted'
              ? 'This experiment was adopted by human decision, but its composite score is below the adaptive threshold. The decision may be based on qualitative factors not captured by metrics.'
              : 'This experiment was discarded by human decision, but its composite score passes the adaptive threshold. The metrics suggest it might have been worth pursuing.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lane renderer
// ---------------------------------------------------------------------------

function Lane({
  label,
  nodes,
  selectedId,
  onSelect,
}: {
  label: string;
  nodes: PersonaTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="kicker">{label}</p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {nodes.map((node, idx) => (
          <div key={node.id} className="flex shrink-0 items-center gap-0">
            <NodeCard
              node={node}
              isSelected={selectedId === node.id}
              onClick={() => onSelect(node.id)}
            />
            {/* Connector line between nodes in same lane */}
            {idx < nodes.length - 1 && (
              <div
                className="h-px w-6 shrink-0"
                style={{ background: 'var(--border-medium)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main timeline client component
// ---------------------------------------------------------------------------

interface TimelineClientProps {
  nodes: PersonaTreeNode[];
  lanes: {
    mainline: PersonaTreeNode[];
    branches: PersonaTreeNode[];
    boundaries: PersonaTreeNode[];
  };
}

export default function TimelineClient({
  nodes,
  lanes,
}: TimelineClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  // Extract unique series values
  const allSeries = useMemo(() => {
    const set = new Set<string>();
    for (const node of nodes) {
      set.add(node.series);
    }
    return [...set].sort();
  }, [nodes]);

  // Filter lanes by series
  const filteredLanes = useMemo(() => {
    if (!seriesFilter) return lanes;
    const filterFn = (n: PersonaTreeNode) => n.series === seriesFilter;
    return {
      mainline: lanes.mainline.filter(filterFn),
      branches: lanes.branches.filter(filterFn),
      boundaries: lanes.boundaries.filter(filterFn),
    };
  }, [lanes, seriesFilter]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Series filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSeriesFilter(null)}
          className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          style={{
            background: seriesFilter === null
              ? 'var(--accent-green)'
              : 'var(--bg-secondary)',
            color: seriesFilter === null
              ? 'var(--bg-primary)'
              : 'var(--text-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          All
        </button>
        {allSeries.map((series) => (
          <button
            key={series}
            type="button"
            onClick={() =>
              setSeriesFilter(seriesFilter === series ? null : series)
            }
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background: seriesFilter === series
                ? 'var(--accent-green)'
                : 'var(--bg-secondary)',
              color: seriesFilter === series
                ? 'var(--bg-primary)'
                : 'var(--text-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {series}
          </button>
        ))}
      </div>

      {/* Tree visualization: 3 lanes */}
      <div className="flex flex-col gap-6">
        {/* Branches lane (top) */}
        <Lane
          label="Branches"
          nodes={filteredLanes.branches}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Vertical connectors from branches to mainline */}
        {filteredLanes.branches.length > 0 &&
          filteredLanes.mainline.length > 0 && (
            <div className="flex justify-center">
              <div
                className="h-6 w-px"
                style={{ background: 'var(--border-medium)' }}
              />
            </div>
          )}

        {/* Mainline lane (center) */}
        <Lane
          label="Mainline"
          nodes={filteredLanes.mainline}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Vertical connectors from mainline to boundaries */}
        {filteredLanes.boundaries.length > 0 &&
          filteredLanes.mainline.length > 0 && (
            <div className="flex justify-center">
              <div
                className="h-6 w-px"
                style={{ background: 'var(--border-medium)' }}
              />
            </div>
          )}

        {/* Boundaries lane (bottom) */}
        <Lane
          label="Boundaries"
          nodes={filteredLanes.boundaries}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <section aria-labelledby="detail-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="detail-heading" className="kicker">
              Experiment Detail
            </h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--text-subtle)' }}
            >
              Close
            </button>
          </div>
          <DetailPanel node={selectedNode} />
        </section>
      )}
    </div>
  );
}
