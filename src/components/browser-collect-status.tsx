'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CollectPhase = 'idle' | 'connecting' | 'collecting' | 'done' | 'error';

type SupportedPlatform = {
  id: string;
  label: string;
  available: boolean;
  hint: string;
};

const PLATFORMS: SupportedPlatform[] = [
  { id: 'xhs', label: t('platform.xhs'), available: true, hint: t('ui.components.userIdRequired') },
  { id: 'douyin', label: t('platform.douyin'), available: true, hint: t('ui.components.profileUrlRequired') },
  { id: 'tiktok', label: t('platform.tiktok'), available: false, hint: t('ui.components.comingSoon') },
];

// ---------------------------------------------------------------------------
// Phase indicator
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<CollectPhase, string> = {
  idle: '',
  connecting: t('ui.components.connectingBrowser'),
  collecting: t('ui.components.collectingData'),
  done: t('ui.components.collectionComplete'),
  error: t('ui.components.collectionFailed'),
};

function PhaseIndicator({ phase, errorMsg }: { phase: CollectPhase; errorMsg?: string }) {
  if (phase === 'idle') return null;

  const isActive = phase === 'connecting' || phase === 'collecting';
  const isError = phase === 'error';
  const isDone = phase === 'done';

  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)]">
      {isActive && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-green)] border-t-transparent" />
      )}
      {isDone && (
        <span className="text-sm text-[var(--accent-green)]">&#10003;</span>
      )}
      {isError && (
        <span className="text-sm text-[var(--accent-red)]">&#10007;</span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${isDone ? 'text-[var(--accent-green)]' : isError ? 'text-[var(--accent-red)]' : 'text-[var(--text-primary)]'}`}>
          {PHASE_LABELS[phase]}
        </p>
        {isError && errorMsg && (
          <p className="mt-1 text-xs text-[var(--text-subtle)]">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BrowserCollectStatus() {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>('xhs');
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<CollectPhase>('idle');
  const [errorMsg, setErrorMsg] = useState<string>();

  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);

  const handleCollect = useCallback(async () => {
    if (!input.trim()) return;

    setPhase('connecting');
    setErrorMsg(undefined);

    try {
      setPhase('collecting');

      const body: Record<string, string> = { platform };
      if (platform === 'xhs') {
        body.userId = input.trim();
      } else {
        body.url = input.trim();
      }

      const res = await fetch('/api/collect-browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error ?? `Collection failed: ${res.status}`);
      }

      const { profile } = await res.json() as { profile: CreatorProfile };

      // Store in sessionStorage and redirect to dashboard
      const profiles: Record<string, CreatorProfile> = { [profile.platform]: profile };
      sessionStorage.setItem('dashpersona-import-profiles', JSON.stringify(profiles));

      setPhase('done');

      // Brief pause to show success state before redirect
      setTimeout(() => {
        router.push('/dashboard?source=import');
      }, 800);
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [platform, input, router]);

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Platform selector */}
      <div className="flex gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!p.available}
            onClick={() => { setPlatform(p.id); setInput(''); setPhase('idle'); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              platform === p.id
                ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="browser-collect-input" className="text-xs text-[var(--text-subtle)]">
          {selectedPlatform?.hint ?? t('ui.components.enterIdentifier')}
        </label>
        <div className="flex gap-2">
          <input
            id="browser-collect-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={platform === 'xhs' ? 'e.g. 5f3c1a2b3c4d5e6f' : 'e.g. https://www.douyin.com/user/...'}
            className="h-10 flex-1 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-green)]"
          />
          <button
            type="button"
            onClick={handleCollect}
            disabled={!input.trim() || phase === 'connecting' || phase === 'collecting'}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
          >
            {phase === 'connecting' || phase === 'collecting' ? t('ui.components.collecting') : t('ui.components.collect')}
          </button>
        </div>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator phase={phase} errorMsg={errorMsg} />

      {/* Info note */}
      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        {t('ui.components.browserCollectInfo')}
      </p>
    </div>
  );
}
