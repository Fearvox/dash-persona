'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { PersonaTreeNode } from '@/lib/schema/persona-tree';
import type { ExperimentIdea } from '@/lib/engine/idea-generator';
import { detectConflicts } from '@/lib/engine';
import { scoreColor } from '@/lib/utils/constants';
import ExperimentForm from '@/components/experiment-form';
import IdeaCards from '@/components/idea-cards';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';

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

const OUTCOME_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  mainline: { bg: 'rgba(126, 210, 154, 0.15)', text: 'var(--accent-green)' },
  branch: { bg: 'rgba(210, 200, 126, 0.15)', text: 'var(--accent-yellow)' },
  boundary: { bg: 'rgba(200, 126, 126, 0.15)', text: 'var(--accent-red)' },
};

// ---------------------------------------------------------------------------
// Node card
// ---------------------------------------------------------------------------

function NodeCard({
  node,
  isSelected,
  onClick,
  onDiscard,
  onSetOutcome,
}: {
  node: PersonaTreeNode;
  isSelected: boolean;
  onClick: () => void;
  onDiscard: () => void;
  onSetOutcome: (outcome: 'mainline' | 'branch' | 'boundary') => void;
}) {
  const status = STATUS_STYLES[node.status] ?? STATUS_STYLES.planned;
  const hasConflict = detectConflicts(node);

  return (
    <div
      className="flex flex-col gap-0"
      style={{ minWidth: 220, maxWidth: 280 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="card w-full cursor-pointer p-4 text-left transition-all"
        style={{
          borderColor: isSelected ? 'var(--accent-green)' : undefined,
          borderWidth: isSelected ? '2px' : undefined,
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
            className="badge text-xs"
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
          className="mt-1 text-xs leading-relaxed"
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
              className="text-xs"
              style={{ color: 'var(--text-subtle)' }}
            >
              composite
            </span>
            {hasConflict && (
              <span
                className="badge text-xs"
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

      {/* Outcome selector + discard button */}
      <div className="mt-1 flex items-center gap-1">
        {(['mainline', 'branch', 'boundary'] as const).map((outcome) => {
          const isActive = node.outcome === outcome;
          const style = OUTCOME_STYLES[outcome];
          return (
            <button
              key={outcome}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetOutcome(outcome);
              }}
              className="rounded px-2 py-0.5 text-xs font-medium transition-colors"
              style={{
                background: isActive ? style.bg : 'transparent',
                color: isActive ? style.text : 'var(--text-subtle)',
                border: isActive
                  ? `1px solid ${style.text}`
                  : '1px solid transparent',
              }}
              aria-label={`Set outcome to ${outcome}`}
            >
              {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
            </button>
          );
        })}
        {node.status !== 'discarded' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDiscard();
            }}
            className="ml-auto rounded px-2 py-0.5 text-xs font-medium transition-colors"
            style={{
              color: 'var(--accent-red)',
              background: 'transparent',
              border: '1px solid transparent',
            }}
            aria-label={`Discard experiment ${node.id}`}
          >
            Discard
          </button>
        )}
      </div>
    </div>
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
    <div className="card p-5">
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
                  className="metric-value text-xs"
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
                className="mt-1 text-xs"
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
                className="mt-1 text-xs"
                style={{ color: 'var(--text-subtle)' }}
              >
                Merged back to: {node.decision.mergedBack}
              </p>
            )}
            {node.decision.rejected && (
              <p
                className="mt-1 text-xs"
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
            className="mt-1 text-xs leading-relaxed"
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

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function Lane({
  label,
  nodes,
  selectedId,
  onSelect,
  onDiscard,
  onSetOutcome,
}: {
  label: string;
  nodes: PersonaTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDiscard: (id: string) => void;
  onSetOutcome: (id: string, outcome: 'mainline' | 'branch' | 'boundary') => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to the rightmost (latest) node on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [nodes.length]);

  const scrollToLatest = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, []);

  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="kicker">{label}</p>
      <div className="relative">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2" role="list">
          {nodes.map((node, idx) => (
            <div key={node.id} className="flex shrink-0 flex-col items-center gap-0" role="listitem">
              <div className="flex items-center gap-0">
                <NodeCard
                  node={node}
                  isSelected={selectedId === node.id}
                  onClick={() => onSelect(node.id)}
                  onDiscard={() => onDiscard(node.id)}
                  onSetOutcome={(outcome) => onSetOutcome(node.id, outcome)}
                />
                {/* Connector line between nodes in same lane */}
                {idx < nodes.length - 1 && (
                  <div
                    className="h-px w-6 shrink-0"
                    style={{ background: 'var(--border-medium)' }}
                  />
                )}
              </div>
              {/* Date label below each node */}
              <span
                className="mt-1 text-xs"
                style={{ color: 'var(--text-subtle)' }}
              >
                {formatShortDate(node.startedAt)}
              </span>
            </div>
          ))}
        </div>
        {/* Scroll to latest button */}
        {nodes.length > 2 && (
          <button
            type="button"
            onClick={scrollToLatest}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg px-2 py-1 text-xs font-medium transition-opacity"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--accent-green)',
              border: '1px solid var(--border-subtle)',
              borderRight: 'none',
            }}
            aria-label="Scroll to latest experiment"
          >
            &rarr; Latest
          </button>
        )}
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
  ideas?: ExperimentIdea[];
  platform?: string;
}

export default function TimelineClient({
  nodes: initialNodes,
  lanes: initialLanes,
  ideas = [],
  platform = 'douyin',
}: TimelineClientProps) {
  const storageKey = `dashpersona-timeline-${platform}`;

  const [treeNodes, setTreeNodes] = useState<PersonaTreeNode[]>(() => {
    if (typeof window === 'undefined') return initialNodes;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as PersonaTreeNode[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore corrupt data
    }
    return initialNodes;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPrefill, setFormPrefill] = useState<Partial<PersonaTreeNode> | null>(null);

  // One-time platform-switch hint
  const hintKey = 'dashpersona-timeline-hint-dismissed';
  const [showHint, setShowHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(hintKey);
  });
  const dismissHint = useCallback(() => {
    setShowHint(false);
    try { localStorage.setItem(hintKey, '1'); } catch { /* noop */ }
  }, []);

  // Dirty check: compare current state against server-computed initial nodes
  const isDirty = useMemo(
    () => JSON.stringify(treeNodes) !== JSON.stringify(initialNodes),
    [treeNodes, initialNodes],
  );

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(treeNodes));
      showToast('Changes saved', 'success');
    } catch {
      showToast('Failed to save — storage unavailable', 'error');
    }
  }, [storageKey, treeNodes]);

  const handleResetConfirm = useCallback(() => {
    setTreeNodes(initialNodes);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setShowResetConfirm(false);
    showToast('Tree reset to computed state', 'success');
  }, [initialNodes, storageKey]);

  // Recompute lanes from local state
  const lanes = useMemo(() => {
    const mainline: PersonaTreeNode[] = [];
    const branches: PersonaTreeNode[] = [];
    const boundaries: PersonaTreeNode[] = [];

    for (const node of treeNodes) {
      switch (node.outcome) {
        case 'mainline':
          mainline.push(node);
          break;
        case 'branch':
          branches.push(node);
          break;
        case 'boundary':
          boundaries.push(node);
          break;
      }
    }

    const byDate = (a: PersonaTreeNode, b: PersonaTreeNode) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();

    mainline.sort(byDate);
    branches.sort(byDate);
    boundaries.sort(byDate);

    return { mainline, branches, boundaries };
  }, [treeNodes]);

  // Extract unique series values
  const allSeries = useMemo(() => {
    const set = new Set<string>();
    for (const node of treeNodes) {
      set.add(node.series);
    }
    return [...set].sort();
  }, [treeNodes]);

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
    () => treeNodes.find((n) => n.id === selectedId) ?? null,
    [treeNodes, selectedId],
  );

  // --- Handlers ---

  const handleDiscard = useCallback((nodeId: string) => {
    setTreeNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, status: 'discarded' as const } : n,
      ),
    );
  }, []);

  const handleSetOutcome = useCallback(
    (nodeId: string, outcome: 'mainline' | 'branch' | 'boundary') => {
      setTreeNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, outcome } : n)),
      );
    },
    [],
  );

  const handleFormSubmit = useCallback(
    (partial: Partial<PersonaTreeNode>) => {
      const newNode: PersonaTreeNode = {
        id: partial.id ?? `PE-${Date.now().toString(36)}`,
        parentId: partial.parentId ?? null,
        title: partial.title ?? 'Untitled Experiment',
        series: partial.series ?? 'content-mix',
        status: partial.status ?? 'planned',
        outcome: partial.outcome ?? 'branch',
        hypothesis: partial.hypothesis ?? '',
        startedAt: partial.startedAt ?? new Date().toISOString(),
        variants: partial.variants ?? [],
      };

      setTreeNodes((prev) => [...prev, newNode]);
      setShowForm(false);
      setFormPrefill(null);
    },
    [],
  );

  const handleUseIdea = useCallback((idea: ExperimentIdea) => {
    setFormPrefill({
      title: idea.title,
      hypothesis: idea.hypothesis,
      series: idea.series,
    });
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setFormPrefill(null);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Platform-switch hint (one-time) */}
      {showHint && (
        <div
          className="flex items-center justify-between rounded-lg px-4 py-2.5 text-xs"
          style={{
            background: 'rgba(126, 184, 210, 0.08)',
            border: '1px solid rgba(126, 184, 210, 0.2)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Each platform has its own timeline — switch the platform capsule
            <span
              className="ml-1 inline-block font-medium"
              style={{ color: 'var(--accent-blue)' }}
            >
              ↗ above right
            </span>
            {' '}to compare experiment trees across Douyin, TikTok, and Red Note.
          </span>
          <button
            type="button"
            onClick={dismissHint}
            className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-subtle)' }}
            aria-label="Dismiss hint"
          >
            Got it
          </button>
        </div>
      )}

      {/* Header with New Experiment button */}
      <div className="flex items-center justify-between">
        {/* Series filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSeriesFilter(null)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background:
                seriesFilter === null
                  ? 'var(--accent-green)'
                  : 'var(--bg-secondary)',
              color:
                seriesFilter === null
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
                background:
                  seriesFilter === series
                    ? 'var(--accent-green)'
                    : 'var(--bg-secondary)',
                color:
                  seriesFilter === series
                    ? 'var(--bg-primary)'
                    : 'var(--text-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {series}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDirty && (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent-green)',
                  color: 'var(--bg-primary)',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(200, 126, 126, 0.15)',
                  color: 'var(--accent-red)',
                }}
              >
                Reset
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setFormPrefill(null);
              setShowForm(true);
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent-green)',
              color: 'var(--bg-primary)',
            }}
          >
            + New Experiment
          </button>
        </div>
      </div>

      {/* Experiment form modal with backdrop blur */}
      {showForm && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCancelForm(); }}>
          <div className="modal-panel" style={{ maxWidth: '36rem' }}>
            <h3
              className="mb-4 text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {formPrefill ? 'Create Experiment from Idea' : 'New Experiment'}
            </h3>
            <ExperimentForm
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              parentNodes={treeNodes}
              editingNode={
                formPrefill
                  ? ({
                      title: formPrefill.title ?? '',
                      hypothesis: formPrefill.hypothesis ?? '',
                      series: formPrefill.series ?? '',
                    } as PersonaTreeNode)
                  : undefined
              }
              existingSeries={allSeries}
            />
          </div>
        </div>
      )}

      {/* Tree visualization: 3 lanes */}
      <div className="flex flex-col gap-6">
        {/* Branches lane (top) */}
        <Lane
          label="Branches"
          nodes={filteredLanes.branches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDiscard={handleDiscard}
          onSetOutcome={handleSetOutcome}
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
          onDiscard={handleDiscard}
          onSetOutcome={handleSetOutcome}
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
          onDiscard={handleDiscard}
          onSetOutcome={handleSetOutcome}
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

      {/* Idea Generator section */}
      {ideas.length > 0 && (
        <section aria-labelledby="ideas-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="ideas-heading" className="kicker">
              Experiment Ideas
            </h2>
            <span
              className="text-xs"
              style={{ color: 'var(--text-subtle)' }}
            >
              {ideas.length} suggestion{ideas.length !== 1 ? 's' : ''} based on
              your data
            </span>
          </div>
          <IdeaCards ideas={ideas} onUseIdea={handleUseIdea} />
        </section>
      )}

      {/* Reset confirmation dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset experiment tree?"
        description="This will discard all manual edits (outcome changes, discarded nodes, new experiments) and revert to the server-computed tree. This action cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
