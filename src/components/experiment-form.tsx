'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { PersonaTreeNode } from '@/lib/schema/persona-tree';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExperimentFormProps {
  onSubmit: (node: Partial<PersonaTreeNode>) => void;
  onCancel: () => void;
  parentNodes?: PersonaTreeNode[];
  editingNode?: PersonaTreeNode;
  /** Existing series values for autocomplete. */
  existingSeries?: string[];
}

// ---------------------------------------------------------------------------
// ID generator (deterministic from timestamp + title hash)
// ---------------------------------------------------------------------------

let formCounter = 0;

function generateNodeId(title: string): string {
  formCounter++;
  const hash = title
    .split('')
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const num = Math.abs(hash + formCounter) % 10000;
  return `PE-${String(num).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExperimentForm({
  onSubmit,
  onCancel,
  parentNodes = [],
  editingNode,
  existingSeries = [],
}: ExperimentFormProps) {
  const [title, setTitle] = useState(editingNode?.title ?? '');
  const [hypothesis, setHypothesis] = useState(editingNode?.hypothesis ?? '');
  const [series, setSeries] = useState(editingNode?.series ?? '');
  const [parentId, setParentId] = useState<string | null>(
    editingNode?.parentId ?? null,
  );
  const [status, setStatus] = useState<'planned' | 'running'>(
    editingNode?.status === 'running' ? 'running' : 'planned',
  );
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);
  const seriesRef = useRef<HTMLDivElement>(null);

  // Close autocomplete on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (seriesRef.current && !seriesRef.current.contains(e.target as Node)) {
        setShowSeriesDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filtered series suggestions
  const filteredSeries = useMemo(() => {
    if (!series.trim()) return existingSeries;
    const lower = series.toLowerCase();
    return existingSeries.filter((s) => s.toLowerCase().includes(lower));
  }, [series, existingSeries]);

  // Validation
  const isValid = title.trim().length > 0 && hypothesis.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const node: Partial<PersonaTreeNode> = {
      id: editingNode?.id ?? generateNodeId(title),
      parentId,
      title: title.trim(),
      hypothesis: hypothesis.trim(),
      series: series.trim() || 'content-mix',
      status,
      outcome: 'branch',
      startedAt: editingNode?.startedAt ?? new Date().toISOString(),
      variants: editingNode?.variants ?? [],
    };

    onSubmit(node);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      aria-label="Experiment form"
    >
      <fieldset className="flex flex-col gap-5 border-none p-0 m-0">
        <legend className="sr-only">Experiment details</legend>
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="exp-title"
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Title <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <input
          id="exp-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Tutorial Content Deep-dive"
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          required
          autoFocus
        />
      </div>

      {/* Hypothesis */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="exp-hypothesis"
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Hypothesis <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <textarea
          id="exp-hypothesis"
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="If we increase tutorial content from 10% to 25%..."
          rows={3}
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            resize: 'vertical',
          }}
          required
        />
      </div>

      {/* Series with autocomplete */}
      <div className="flex flex-col gap-1.5" ref={seriesRef}>
        <label
          htmlFor="exp-series"
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Series
        </label>
        <div className="relative">
          <input
            id="exp-series"
            type="text"
            value={series}
            onChange={(e) => {
              setSeries(e.target.value);
              setShowSeriesDropdown(true);
            }}
            onFocus={() => setShowSeriesDropdown(true)}
            placeholder="e.g. content-mix, hook-style"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            autoComplete="off"
          />
          {showSeriesDropdown && filteredSeries.length > 0 && (
            <ul
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg shadow-lg"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
              }}
              role="listbox"
            >
              {filteredSeries.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={series === s}
                    className="w-full px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                    style={{
                      color: 'var(--text-primary)',
                      background:
                        series === s
                          ? 'var(--bg-secondary)'
                          : 'transparent',
                    }}
                    onClick={() => {
                      setSeries(s);
                      setShowSeriesDropdown(false);
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Parent node */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="exp-parent"
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Parent Node
        </label>
        <select
          id="exp-parent"
          value={parentId ?? ''}
          onChange={(e) => setParentId(e.target.value || null)}
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">None (root node)</option>
          {parentNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.id} - {node.title}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="exp-status"
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Status
        </label>
        <select
          id="exp-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'planned' | 'running')}
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="planned">Planned</option>
          <option value="running">Running</option>
        </select>
      </div>

      </fieldset>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!isValid}
          className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          style={{
            background: isValid ? 'var(--accent-green)' : 'var(--bg-secondary)',
            color: isValid ? 'var(--bg-primary)' : 'var(--text-subtle)',
            opacity: isValid ? 1 : 0.5,
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          {editingNode ? 'Update Experiment' : 'Create Experiment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
