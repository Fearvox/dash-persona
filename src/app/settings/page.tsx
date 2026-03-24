'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createLearningStore, derivePreferences, type UserPreferences } from '@/lib/learning';

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Red Note',
};

function formatTimeRange(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    derivePreferences().then(setPreferences);
  }, []);

  const handleClear = useCallback(async () => {
    const store = createLearningStore();
    await store.clear();
    setPreferences({
      topSections: [],
      preferredTimeRange: 168,
      focusPlatform: null,
      dismissedContentTypes: [],
      interactionCount: 0,
    });
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      {/* Header */}
      <header>
        <Link
          href="/dashboard?source=demo&persona=tutorial"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Settings
        </h1>
      </header>

      {/* Learning Data Section */}
      <section aria-labelledby="learning-heading">
        <h2 id="learning-heading" className="kicker mb-4">
          Learning Data
        </h2>
        <div className="card p-6">
          {preferences === null ? (
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'var(--accent-green)', borderTopColor: 'transparent' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                Loading preferences...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Interaction count */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Total interactions tracked
                </span>
                <span
                  className="metric-value text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {preferences.interactionCount}
                </span>
              </div>

              {/* Preferences summary */}
              <div>
                <h3
                  className="mb-3 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Your preferences
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-subtle)' }}>
                      Top sections
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {preferences.topSections.length > 0
                        ? preferences.topSections.slice(0, 3).join(', ')
                        : 'None yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-subtle)' }}>
                      Focus platform
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {preferences.focusPlatform
                        ? (PLATFORM_LABELS[preferences.focusPlatform] ?? preferences.focusPlatform)
                        : 'None yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-subtle)' }}>
                      Preferred time range
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {formatTimeRange(preferences.preferredTimeRange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clear button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex h-9 items-center justify-center rounded-full px-5 text-xs font-semibold transition-colors"
                  style={{
                    background: 'rgba(200, 126, 126, 0.15)',
                    color: 'var(--accent-red)',
                  }}
                >
                  Clear Learning Data
                </button>
                {cleared && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--accent-green)' }}
                    role="status"
                  >
                    Cleared successfully
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section aria-labelledby="about-heading">
        <h2 id="about-heading" className="kicker mb-4">
          About
        </h2>
        <div className="card p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-subtle)' }}>Version</span>
              <span
                className="metric-value"
                style={{ color: 'var(--text-secondary)' }}
              >
                0.1.0
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-subtle)' }}>License</span>
              <span style={{ color: 'var(--text-secondary)' }}>BSL 1.1</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-subtle)' }}>Source</span>
              <a
                href="https://github.com/openclaw/dash-persona"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-green)' }}
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
