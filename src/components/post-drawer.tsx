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

const PLATFORM_COLORS: Record<string, string> = {
  douyin: '#fe2c55',
  tiktok: '#25f4ee',
  xhs: '#ff2442',
};

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

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
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

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop (mobile overlay + click-outside) */}
      <div
        onClick={handleBackdropClick}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0, 0, 0, 0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '100vw',
          zIndex: 50,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-medium)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            id={headingId}
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title} ({sortedPosts.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-subtle)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </div>

        {/* Sort controls */}
        <div
          className="flex shrink-0 gap-2 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {(['views', 'likes', 'date'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background:
                  sortKey === key
                    ? 'var(--accent-green)'
                    : 'var(--bg-secondary)',
                color:
                  sortKey === key
                    ? 'var(--bg-primary)'
                    : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {/* Post list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {sortedPosts.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: 'var(--text-subtle)' }}
            >
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Post card sub-component
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: Post }) {
  const platformBadgeColor = post.contentType
    ? PLATFORM_COLORS[post.contentType] ?? 'var(--accent-blue)'
    : 'var(--accent-blue)';

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Description */}
      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--text-primary)' }}
      >
        {truncate(post.desc, 120)}
      </p>

      {/* Platform badge */}
      {post.contentType && (
        <span
          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: `${platformBadgeColor}20`,
            color: platformBadgeColor,
          }}
        >
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
    <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(value)}
      </span>{' '}
      {label.toLowerCase()}
    </span>
  );
}
