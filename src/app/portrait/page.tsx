'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { TextcraftEmpty } from '@/components/ui/textcraft';
import {
  renderProgressBar,
  renderBrailleLine,
  renderPortraitText,
  type PortraitData,
  type PortraitMetric,
} from '@/lib/textcraft';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { loadProfiles } from '@/lib/store/profile-store';
import { computePersonaScore, overallScore, generatePersonaTags } from '@/lib/engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorForValue(value: number): string {
  if (value >= 0.7) return 'var(--accent-green)';
  if (value >= 0.5) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

function deriveMetrics(profile: CreatorProfile): PortraitMetric[] {
  const score = computePersonaScore(profile);
  const overall = overallScore(score) / 100;
  const eng = Math.min(score.engagement.overallRate * 5, 1);
  const rhythm = score.rhythm.consistencyScore / 100;
  const consist = score.consistency.score / 100;
  const growth =
    score.growthHealth.momentum === 'accelerating'
      ? 0.8
      : score.growthHealth.momentum === 'steady'
        ? 0.6
        : score.growthHealth.momentum === 'decelerating'
          ? 0.3
          : 0;

  return [
    { label: 'TOTAL', value: overall, color: colorForValue(overall) },
    { label: 'ENGMT', value: eng, color: colorForValue(eng) },
    { label: 'RHYTH', value: rhythm, color: colorForValue(rhythm) },
    { label: 'CNSST', value: consist, color: colorForValue(consist) },
    { label: 'GRWTH', value: growth, color: colorForValue(growth) },
  ];
}

function deriveTags(profile: CreatorProfile): string[] {
  const score = computePersonaScore(profile);
  const tags = generatePersonaTags(score);
  return tags.slice(0, 5).map((tag) => tag.label);
}

function deriveTrend(profile: CreatorProfile): number[] {
  const posts = profile.posts ?? [];
  if (posts.length === 0) return [];
  // Use likes from recent posts as a simple 30-day trend proxy
  const recent = posts.slice(0, 30);
  return recent.map((p) => p.likes ?? 0).reverse();
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    douyin: 'Douyin',
    tiktok: 'TikTok',
    xhs: 'Red Note',
  };
  return map[platform] ?? platform;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortraitPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load creator data
  useEffect(() => {
    loadProfiles()
      .then((profiles) => {
        const entries = Object.values(profiles);
        if (entries.length > 0) {
          setProfile(entries[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---------- No data state ----------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('ui.common.loading')}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <TextcraftEmpty message={t('ui.portrait.noData')} />
        <Link
          href="/onboarding"
          className="text-sm underline underline-offset-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
        >
          {t('ui.common.goToOnboarding')}
        </Link>
      </div>
    );
  }

  // ---------- Derive portrait data ----------

  const nickname = profile.profile?.nickname ?? profile.profile?.uniqueId ?? 'Unknown';
  const platform = platformLabel(profile.platform ?? 'unknown');
  const postCount = profile.posts?.length ?? 0;
  const window = `${postCount} posts`;
  const metrics = deriveMetrics(profile);
  const tags = deriveTags(profile);
  const trendData = deriveTrend(profile);

  const portraitData: PortraitData = {
    name: nickname,
    platform,
    window,
    tags,
    metrics,
    trendData,
  };

  // ---------- Actions ----------

  function handleCopyText() {
    const text = renderPortraitText(portraitData);
    navigator.clipboard.writeText(text).then(() => {
      setToast(t('ui.portrait.copied'));
    }).catch(() => {
      // Fallback: ignored silently
    });
  }

  async function handleExportPng() {
    if (!containerRef.current) return;
    const { default: html2canvas } = await import('html2canvas-pro');
    const canvas = await html2canvas(containerRef.current, {
      backgroundColor: '#0a0f0d',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `dashpersona-portrait-${nickname}.png`;
    link.click();
    setToast(t('ui.portrait.exported'));
  }

  // ---------- Render ----------

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard?source=import"
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.common.backToDashboard')}
        </Link>
        <h1
          className="font-mono text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('ui.portrait.title')}
        </h1>
      </header>

      {/* Portrait container */}
      <div
        ref={containerRef}
        className="portrait-mono rounded-lg border p-6"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Identity Box — all ASCII, no CJK inside box to avoid width mismatch */}
        <pre className="text-sm leading-snug" style={{ color: 'var(--accent-green)' }}>
{`\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513
\u2503  CREATOR ID                 \u2503
\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B
\u2503  \u2588\u2588 ${nickname.slice(0, 22).padEnd(22)} \u2503
\u2503                             \u2503
\u2503  \u25B8 ${platform.padEnd(24)}\u2503
\u2503  \u25B8 ${window.padEnd(24)}\u2503
\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B`}
        </pre>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4">
            <pre
              className="text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {(() => {
                const tagCells = tags.map((tag) => ` ${tag} `);
                const top =
                  '\u250C' +
                  tagCells.map((c) => '\u2500'.repeat(c.length)).join('\u252C') +
                  '\u2510';
                const mid = '\u2502' + tagCells.join('\u2502') + '\u2502';
                const bot =
                  '\u2514' +
                  tagCells.map((c) => '\u2500'.repeat(c.length)).join('\u2534') +
                  '\u2518';
                return `${top}\n${mid}\n${bot}`;
              })()}
            </pre>
          </div>
        )}

        {/* Metrics */}
        <div className="mt-6">
          <p
            className="mb-2 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            {t('ui.portrait.performanceMatrix')}
          </p>
          <div className="flex flex-col gap-0.5">
            {metrics.map((m) => {
              const isExpanded = expandedMetric === m.label;
              const dimmed = expandedMetric !== null && !isExpanded;
              return (
                <button
                  key={m.label}
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-left transition-opacity"
                  style={{ opacity: dimmed ? 0.5 : 1 }}
                  onClick={() =>
                    setExpandedMetric(isExpanded ? null : m.label)
                  }
                >
                  <span
                    className="w-14 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {m.label}
                  </span>
                  <pre
                    className="text-sm"
                    style={{ color: m.color }}
                  >
                    {renderProgressBar(m.value, 10)}
                  </pre>
                  <span
                    className="w-10 text-right text-xs tabular-nums"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {`${Math.round(m.value * 100)}%`}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            className="mt-2 text-[9px]"
            style={{ color: 'var(--text-subtle)' }}
          >
            {t('ui.portrait.hover')}
          </p>
        </div>

        {/* Trend */}
        {trendData.length > 0 && (
          <div className="mt-6">
            <p
              className="mb-2 text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              {t('ui.portrait.trend30d')}
            </p>
            <pre
              className="text-base leading-none"
              style={{ color: 'var(--accent-green)' }}
            >
              {renderBrailleLine(trendData)}
            </pre>
          </div>
        )}

        {/* Footer branding */}
        <div className="mt-6 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <span
            className="text-[10px] tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            DASH &mdash;/ Creator Intelligence
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
          }}
          onClick={handleCopyText}
        >
          {t('ui.portrait.copyText')}
        </button>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
          }}
          onClick={handleExportPng}
        >
          {t('ui.portrait.exportPng')}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md border px-4 py-2 text-xs"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-green)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
