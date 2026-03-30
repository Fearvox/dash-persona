'use client';

import { useEffect, useState } from 'react';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { t } from '@/lib/i18n';

type CollectorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; profile: CreatorProfile }
  | { status: 'error'; message: string };

/** Map known API error substrings to user-friendly messages. */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('timed out'))
    return t('ui.components.errorTimedOut');
  if (lower.includes('not allowed'))
    return t('ui.components.errorNotAllowed');
  if (lower.includes('could not find'))
    return t('ui.components.errorCouldNotFind');
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
          throw new Error(t('ui.components.errorInvalidResponse'));
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
            message: t('ui.components.errorNoProfile'),
          });
          onError();
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          message:
            err instanceof Error ? err.message : t('ui.components.errorNetwork'),
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
      className="rounded-xl border p-6 border-[var(--border-subtle)] bg-[var(--bg-card)]"
    >
      {state.status === 'loading' && (
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-green)] border-t-transparent"
          />
          <p className="text-sm text-[var(--text-secondary)]">
            {t('ui.components.fetchingLive')}
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div>
          <p className="text-sm font-medium text-[var(--accent-red,#ef4444)]">
            {t('ui.components.liveCollectionFailed')}
          </p>
          <p
            className="mt-1 text-sm text-[var(--text-subtle)]"
          >
            {state.message}
          </p>
          <p
            className="mt-3 text-sm text-[var(--text-subtle)]"
          >
            {t('ui.components.fallingBackDemo')}
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
            className="text-[var(--accent-green)]"
            aria-hidden="true"
          >
            <path d="M3 8l4 4 6-7" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('ui.components.liveDataCollected', { userId: state.profile.profile.uniqueId })}
          </p>
        </div>
      )}
    </div>
  );
}
