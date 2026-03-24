'use client';

import { useEffect, useState } from 'react';
import type { CreatorProfile } from '@/lib/schema/creator-data';

type CollectorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; profile: CreatorProfile }
  | { status: 'error'; message: string };

/** Map known API error substrings to user-friendly messages. */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('timed out'))
    return 'TikTok took too long to respond. This sometimes happens due to rate limiting.';
  if (lower.includes('not allowed'))
    return 'This URL is not supported. Please use a TikTok profile URL.';
  if (lower.includes('could not find'))
    return 'Could not extract profile data. The page may be private or geo-restricted.';
  return raw;
}

interface LiveCollectorProps {
  url: string;
  onSuccess: (profile: CreatorProfile) => void;
  onError: () => void;
}

export default function LiveCollector({
  url,
  onSuccess,
  onError,
}: LiveCollectorProps) {
  const [state, setState] = useState<CollectorState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    async function collect() {
      setState({ status: 'loading' });

      try {
        const res = await fetch('/api/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (cancelled) return;

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error('Server returned an invalid response. Please try again.');
        }

        if (!res.ok) {
          const raw = data?.error ?? `Request failed (${res.status})`;
          const msg = friendlyError(raw);
          setState({ status: 'error', message: msg });
          onError();
          return;
        }

        if (data?.profile) {
          setState({ status: 'success', profile: data.profile });
          onSuccess(data.profile);
        } else {
          setState({
            status: 'error',
            message: 'No profile data returned',
          });
          onError();
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Network error',
        });
        onError();
      }
    }

    collect();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-card)',
      }}
    >
      {state.status === 'loading' && (
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--accent-green)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fetching live data from TikTok&hellip; This may take a few seconds.
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--accent-red, #ef4444)' }}>
            Live collection failed
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--text-subtle)' }}
          >
            {state.message}
          </p>
          <p
            className="mt-3 text-sm"
            style={{ color: 'var(--text-subtle)' }}
          >
            Falling back to demo data&hellip;
          </p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="flex items-center gap-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--accent-green)' }}
            aria-hidden="true"
          >
            <path d="M3 8l4 4 6-7" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Live data collected for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              @{state.profile.profile.uniqueId}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
