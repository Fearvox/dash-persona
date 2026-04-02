'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { getAllProfiles } from '@/lib/store/profile-store';
import { PLATFORM_LABELS } from '@/lib/utils/constants';

interface CreatorPickerProps {
  selected: CreatorProfile[];
  onChange: (selected: CreatorProfile[]) => void;
  max?: number;
  min?: number;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CreatorPicker({
  selected,
  onChange,
  max = 5,
  min = 2,
}: CreatorPickerProps) {
  const [allProfiles, setAllProfiles] = useState<CreatorProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles().then((profiles) => {
      setAllProfiles(profiles);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allProfiles;
    const q = search.toLowerCase();
    return allProfiles.filter(
      (p) =>
        p.profile.nickname.toLowerCase().includes(q) ||
        p.profile.uniqueId.toLowerCase().includes(q) ||
        (p.profile.bio ?? '').toLowerCase().includes(q),
    );
  }, [allProfiles, search]);

  const isSelected = useCallback(
    (p: CreatorProfile) =>
      selected.some(
        (s) => s.platform === p.platform && s.profileUrl === p.profileUrl,
      ),
    [selected],
  );

  const toggle = useCallback(
    (p: CreatorProfile) => {
      if (isSelected(p)) {
        onChange(selected.filter((s) => s.profileUrl !== p.profileUrl));
      } else if (selected.length < max) {
        onChange([...selected, p]);
      }
    },
    [isSelected, max, onChange, selected],
  );

  const remove = useCallback(
    (profileUrl: string) => {
      onChange(selected.filter((s) => s.profileUrl !== profileUrl));
    },
    [onChange, selected],
  );

  const atMin = selected.length <= min;
  const atMax = selected.length >= max;

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search creators..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-[var(--bg-card)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent-green)] transition-colors"
      />

      {/* Profile list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse h-12 rounded-md bg-[var(--bg-card)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-[var(--text-subtle)]">
          {allProfiles.length === 0
            ? 'No profiles saved yet.'
            : 'No creators match your search.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {filtered.map((p) => {
            const selectedFlag = isSelected(p);
            const disabled = !selectedFlag && atMax;
            return (
              <li key={`${p.platform}-${p.profileUrl}`}>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={disabled}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                    'border',
                    selectedFlag
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--bg-card)] bg-[var(--bg-card)]/50',
                    disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:border-[var(--accent-green)]/50',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {/* Checkbox indicator */}
                  <span
                    className={[
                      'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      selectedFlag
                        ? 'bg-[var(--accent-green)] border-[var(--accent-green)]'
                        : 'border-[var(--text-subtle)]',
                    ].join(' ')}
                  >
                    {selectedFlag && (
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        className="w-3 h-3"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="var(--bg-primary)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  {/* Platform badge */}
                  <span className="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                    {PLATFORM_LABELS[p.platform] ?? p.platform}
                  </span>

                  {/* Name + handle */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-[var(--text-primary)] truncate">
                      {p.profile.nickname}
                    </span>
                    <span className="block text-xs text-[var(--text-subtle)] truncate">
                      @{p.profile.uniqueId}
                    </span>
                  </span>

                  {/* Follower count */}
                  <span className="flex-shrink-0 text-xs font-mono text-[var(--text-secondary)] tabular-nums">
                    {formatFollowers(p.profile.followers)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Selection meta */}
      <div className="flex items-center justify-between text-xs text-[var(--text-subtle)]">
        <span>
          {selected.length < min
            ? `Select at least ${min - selected.length} more`
            : selected.length === min
              ? 'Minimum reached'
              : `${selected.length} selected`}
        </span>
        <span>{max - selected.length} slots remaining</span>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={`${p.platform}-${p.profileUrl}`}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-xs text-[var(--text-primary)]"
            >
              {PLATFORM_LABELS[p.platform] ?? p.platform}
              <span className="text-[var(--text-secondary)]">
                {p.profile.nickname}
              </span>
              <button
                type="button"
                onClick={() => remove(p.profileUrl)}
                disabled={atMin}
                className={[
                  'ml-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                  atMin
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-[var(--accent-green)]/30 cursor-pointer',
                ].join(' ')}
                aria-label={`Remove ${p.profile.nickname}`}
              >
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-2.5 h-2.5"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l8 8M10 2l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
