'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import type { Post } from '@/lib/schema/creator-data';
import { formatNumber } from '@/lib/engine';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PostDrawerProps {
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  filterPostIds?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SortKey = 'views' | 'likes' | 'date';

function sortPosts(posts: Post[], key: SortKey): Post[] {
  const sorted = [...posts];
  switch (key) {
    case 'views':
      sorted.sort((a, b) => b.views - a.views);
      break;
    case 'likes':
      sorted.sort((a, b) => b.likes - a.likes);
      break;
    case 'date':
      sorted.sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });
      break;
  }
  return sorted;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PostDrawer({
  posts,
  isOpen,
  onClose,
  title = 'Posts',
  filterPostIds,
}: PostDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [sortKey, setSortKey] = useState<SortKey>('views');

  // Filter posts if filterPostIds is provided
  const filteredPosts = filterPostIds
    ? posts.filter((p) => filterPostIds.includes(p.postId))
    : posts;

  const sortedPosts = sortPosts(filteredPosts, sortKey);

  // Close on escape + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Focus the first focusable element on open
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = panel.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap: cycle focus within the drawer
      if (e.key === 'Tab' && panel) {
        const currentFocusables = panel.querySelectorAll<HTMLElement>(focusableSelector);
        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  // No body scroll lock — user can still scroll the page behind the modal

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
    >
      {/* Centered modal panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-[1] flex w-full max-w-xl h-[70vh] flex-col bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-lg animate-[modal-enter_0.2s_cubic-bezier(0.22,1,0.36,1)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2
            id={headingId}
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            {title} ({sortedPosts.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-secondary)] text-[var(--text-subtle)] border border-[var(--border-subtle)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Sort controls */}
        <div className="flex shrink-0 gap-2 px-5 py-3 border-b border-[var(--border-subtle)]">
          {(['views', 'likes', 'date'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border-none cursor-pointer transition-colors ${
                sortKey === key
                  ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {/* Post list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {sortedPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-subtle)]">
              No posts to display.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedPosts.map((post) => (
                <PostCard key={post.postId} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card sub-component
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: Post }) {
  return (
    <div className="rounded-lg p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      {/* Description */}
      <p className="text-xs leading-relaxed text-[var(--text-primary)]">
        {truncate(post.desc, 120)}
      </p>

      {/* Content type badge */}
      {post.contentType && (
        <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          {post.contentType}
        </span>
      )}

      {/* Metrics row */}
      <div className="mt-2 flex flex-wrap gap-3">
        <MetricPill label="Views" value={post.views} />
        <MetricPill label="Likes" value={post.likes} />
        <MetricPill label="Comments" value={post.comments} />
        <MetricPill label="Shares" value={post.shares} />
        <MetricPill label="Saves" value={post.saves} />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-xs text-[var(--text-subtle)]">
      <span className="font-medium text-[var(--text-secondary)]">
        {formatNumber(value)}
      </span>{' '}
      {label.toLowerCase()}
    </span>
  );
}
