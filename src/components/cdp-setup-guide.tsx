'use client';

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { saveProfiles } from '@/lib/store/profile-store';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SetupPhase = 'checking' | 'setup' | 'login-check' | 'ready' | 'done';

type LoginStatus = 'unknown' | 'checking' | 'logged_in' | 'not_logged_in';

interface PlatformLoginState {
  status: LoginStatus;
  username?: string;
}

type SupportedPlatform = {
  id: 'douyin' | 'xhs' | 'tiktok';
  label: string;
  available: boolean;
  needsInput: boolean;
  inputHint: string;
  inputPlaceholder: string;
  hint: string;
  loginUrl: string;
  loginLabel: string;
};

type PlatformCollectStatus = 'idle' | 'collecting' | 'done' | 'error';

interface PlatformCollectState {
  status: PlatformCollectStatus;
  postsCount?: number;
  error?: string;
  errorCode?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function getPlatforms(): SupportedPlatform[] {
  return [
    {
      id: 'douyin',
      label: t('platform.douyin'),
      available: true,
      needsInput: false,
      inputHint: '',
      inputPlaceholder: '',
      hint: t('ui.components.cdpReadsCreatorCenter'),
      loginUrl: 'https://creator.douyin.com',
      loginLabel: 'creator.douyin.com',
    },
    {
      id: 'xhs',
      label: t('platform.xhs'),
      available: true,
      needsInput: false,
      inputHint: '',
      inputPlaceholder: '',
      hint: t('ui.components.cdpReadsCreatorCenter'),
      loginUrl: 'https://creator.xiaohongshu.com',
      loginLabel: 'creator.xiaohongshu.com',
    },
    {
      id: 'tiktok',
      label: t('platform.tiktok'),
      available: true,
      needsInput: false,
      inputHint: '',
      inputPlaceholder: '',
      hint: t('ui.components.cdpReadsTikTokStudio'),
      loginUrl: 'https://www.tiktok.com/tiktokstudio',
      loginLabel: 'tiktok.com/tiktokstudio',
    },
  ];
}

const PLATFORMS = getPlatforms();

const SETUP_COMMAND = 'bash ~/.claude/skills/web-access/scripts/check-deps.sh';

const HEALTH_POLL_INTERVAL_MS = 5_000;

// Error recovery map — built at call-time so t() picks up current locale
function getErrorRecovery(): Record<string, { title: string; steps: string[] }> {
  return {
    PROXY_NOT_RUNNING: {
      title: t('ui.components.cdpErrProxyTitle'),
      steps: [
        t('ui.components.cdpErrProxy1'),
        `Run: ${SETUP_COMMAND}`,
        t('ui.components.cdpErrProxy3'),
        t('ui.components.cdpErrProxy4'),
      ],
    },
    NOT_LOGGED_IN: {
      title: t('ui.components.cdpErrLoginTitle'),
      steps: [
        t('ui.components.cdpErrLogin1'),
        t('ui.components.cdpErrLogin2'),
        t('ui.components.cdpErrLogin3'),
      ],
    },
    TIMEOUT: {
      title: t('ui.components.cdpErrTimeoutTitle'),
      steps: [
        t('ui.components.cdpErrTimeout1'),
        t('ui.components.cdpErrTimeout2'),
        t('ui.components.cdpErrTimeout3'),
      ],
    },
    PARSE_ERROR: {
      title: t('ui.components.cdpErrParseTitle'),
      steps: [
        t('ui.components.cdpErrParse1'),
        t('ui.components.cdpErrParse2'),
        t('ui.components.cdpErrParse3'),
      ],
    },
  };
}

const PHASE_STEP: Record<SetupPhase, number> = {
  checking: 0,
  setup: 0,
  'login-check': 1,
  ready: 2,
  done: 3,
};

// ---------------------------------------------------------------------------
// Utility sub-components (kept unchanged)
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-green)] border-t-transparent"
      aria-hidden="true"
    />
  );
}

function CheckIcon() {
  return (
    <span className="text-sm leading-none text-[var(--accent-green)]" aria-hidden="true">
      &#10003;
    </span>
  );
}

function CrossIcon() {
  return (
    <span className="text-sm leading-none text-[var(--accent-red)]" aria-hidden="true">
      &#10007;
    </span>
  );
}

function StatusBar({
  icon,
  label,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  accent: 'green' | 'red' | 'neutral';
}) {
  const labelColor =
    accent === 'green'
      ? 'text-[var(--accent-green)]'
      : accent === 'red'
        ? 'text-[var(--accent-red)]'
        : 'text-[var(--text-primary)]';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${labelColor}`}>{label}</p>
        {sub && <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{sub}</p>}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard not available — silently ignore
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? t('ui.components.cdpCopyAriaCopied') : t('ui.components.cdpCopyAriaDefault')}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-white/5"
      style={{ color: copied ? 'var(--accent-green)' : 'var(--text-subtle)' }}
    >
      {copied ? t('ui.components.cdpCopied') : t('ui.components.cdpCopy')}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step indicator (kept unchanged)
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    t('ui.components.cdpStepSetup'),
    t('ui.components.cdpStepLogin'),
    t('ui.components.cdpStepCollect'),
    t('ui.components.cdpStepDone'),
  ];
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && (
            <div
              className="h-px flex-1 transition-colors duration-300"
              style={{ background: i <= currentStep ? 'var(--accent-green)' : 'var(--border-subtle)' }}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono transition-colors duration-300 ${
                i < currentStep
                  ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                  : i === currentStep
                    ? 'border-2 border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border border-[var(--border-subtle)] text-[var(--text-subtle)]'
              }`}
            >
              {i < currentStep ? <CheckIcon /> : i + 1}
            </div>
            <span className="text-[0.65rem] text-[var(--text-subtle)]">{label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Troubleshoot section (kept unchanged)
// ---------------------------------------------------------------------------

function TroubleshootSection({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {open ? '▾' : '▸'} {title}
      </button>
      {open && (
        <ul className="mt-1.5 ml-3 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item} className="text-xs text-[var(--text-subtle)]">
              — {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup instructions panel (kept unchanged)
// ---------------------------------------------------------------------------

function SetupInstructions({ onRecheck, isChecking }: { onRecheck: () => void; isChecking: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Recommend DASH Collector */}
      <div className="rounded-lg border border-[rgba(126,210,154,0.2)] bg-[rgba(126,210,154,0.06)] px-4 py-4">
        <p className="text-xs font-semibold text-[var(--accent-green)]">
          {t('ui.components.cdpCollectorRecommend')}
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
          {t('ui.components.cdpCollectorRecommendDesc')}
        </p>
        <a
          href="/install"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-green)] transition-colors hover:opacity-80"
        >
          {t('ui.components.cdpCollectorRecommendLink')} &rarr;
        </a>
      </div>

      <p className="text-xs text-[var(--text-subtle)]">
        {t('ui.components.cdpManualSetupTitle')}
      </p>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
          {t('ui.components.cdpStep1Header')}
        </p>
        <ol className="mt-3 flex flex-col gap-2">
          <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span className="mt-px shrink-0 text-[var(--text-subtle)]">1.</span>
            <span>
              {t('ui.components.cdpStep1_1')}{' '}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]">
                chrome://inspect/#remote-debugging
              </code>{' '}
              {t('ui.components.cdpStep1_1_suffix')}
            </span>
          </li>
          <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span className="mt-px shrink-0 text-[var(--text-subtle)]">2.</span>
            <span>
              {t('ui.components.cdpStep1_2_pre')}{' '}
              <strong className="font-medium text-[var(--text-primary)]">
                {t('ui.components.cdpStep1_2_strong')}
              </strong>
              {t('ui.components.cdpStep1_2_suffix')}
            </span>
          </li>
        </ol>
        <TroubleshootSection
          title={t('ui.components.cdpTroubleshoot')}
          items={[
            t('ui.components.cdpTs1_1'),
            t('ui.components.cdpTs1_2'),
            t('ui.components.cdpTs1_3'),
          ]}
        />
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
          {t('ui.components.cdpStep2Header')}
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {t('ui.components.cdpStep2Desc')}
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-[var(--text-primary)]">
            {SETUP_COMMAND}
          </code>
          <CopyButton text={SETUP_COMMAND} />
        </div>
        <TroubleshootSection
          title={t('ui.components.cdpTroubleshoot')}
          items={[
            t('ui.components.cdpTs2_1'),
            t('ui.components.cdpTs2_2'),
            t('ui.components.cdpTs2_3'),
          ]}
        />
      </div>

      <button
        type="button"
        onClick={onRecheck}
        disabled={isChecking}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-medium)] text-sm font-medium transition-colors disabled:opacity-50 hover:border-[var(--accent-green)] hover:text-[var(--accent-green)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {isChecking && <Spinner />}
        {isChecking ? t('ui.components.cdpChecking') : t('ui.components.cdpRecheckBtn')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login check panel (kept unchanged)
// ---------------------------------------------------------------------------

function LoginCheckPanel({
  loginStates,
  onCheckLogin,
  onContinue,
  onSkip,
}: {
  loginStates: Record<string, PlatformLoginState>;
  onCheckLogin: (platformId: 'douyin' | 'xhs' | 'tiktok') => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const allConfirmed = PLATFORMS.every(
    (p) => loginStates[p.id]?.status === 'logged_in',
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)] mb-3">
          {t('ui.components.cdpVerifyLogins')}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {t('ui.components.cdpLoginDesc')}
        </p>
        <div className="flex flex-col gap-3">
          {PLATFORMS.map((p) => {
            const state = loginStates[p.id] ?? { status: 'unknown' };
            return (
              <div
                key={p.id}
                className="flex flex-col gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <LoginDot status={state.status} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {p.label}
                    </span>
                    {state.status === 'logged_in' && state.username && (
                      <span className="text-xs text-[var(--text-subtle)] truncate">
                        {t('ui.components.cdpLoginAs', { username: state.username })}
                      </span>
                    )}
                    {state.status === 'checking' && (
                      <Spinner />
                    )}
                  </div>
                  {state.status !== 'logged_in' && state.status !== 'checking' && (
                    <button
                      type="button"
                      onClick={() => onCheckLogin(p.id)}
                      className="shrink-0 rounded px-2 py-1 text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-green)] hover:text-[var(--accent-green)] transition-colors"
                    >
                      {t('ui.components.cdpCheckLoginBtn')}
                    </button>
                  )}
                  {state.status === 'logged_in' && (
                    <span className="shrink-0 text-xs text-[var(--accent-green)]">{t('ui.components.cdpLoginReady')}</span>
                  )}
                </div>
                {state.status !== 'logged_in' && (
                  <p className="text-xs text-[var(--text-subtle)]">
                    {t('ui.components.cdpOpenInChrome')}{' '}
                    <a
                      href={p.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[0.7rem] text-[var(--text-secondary)] hover:text-[var(--accent-green)] underline underline-offset-2 transition-colors"
                    >
                      {p.loginLabel}
                    </a>{' '}
                    {t('ui.components.cdpOpenAndLogin')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={!allConfirmed}
          className="flex h-10 flex-1 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
        >
          {t('ui.common.continue')}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex h-10 items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent-green)] hover:text-[var(--accent-green)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('ui.common.cancel')}
        </button>
      </div>
      <p className="text-xs text-[var(--text-subtle)]">
        {t('ui.components.cdpSkipLoginNote')}
      </p>
    </div>
  );
}

function LoginDot({ status }: { status: LoginStatus }) {
  if (status === 'logged_in') {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: 'var(--accent-green)' }}
        aria-label={t('ui.components.cdpLoginDotLoggedIn')}
      />
    );
  }
  if (status === 'not_logged_in') {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: 'var(--accent-red)' }}
        aria-label={t('ui.components.cdpLoginDotNotLoggedIn')}
      />
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ background: 'var(--border-medium)' }}
      aria-label={t('ui.components.cdpLoginDotUnknown')}
    />
  );
}

// ---------------------------------------------------------------------------
// PlatformStatusDot — colored dot for collection status
// ---------------------------------------------------------------------------

function PlatformStatusDot({ status }: { status: PlatformCollectStatus }) {
  const colorMap: Record<PlatformCollectStatus, string> = {
    idle: 'var(--border-medium)',
    collecting: 'var(--accent-yellow)',
    done: 'var(--accent-green)',
    error: 'var(--accent-red)',
  };
  const labelMap: Record<PlatformCollectStatus, string> = {
    idle: t('ui.components.cdpStatusIdle'),
    collecting: t('ui.components.cdpStatusCollecting'),
    done: t('ui.components.cdpStatusDone'),
    error: t('ui.components.cdpStatusError'),
  };
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ background: colorMap[status] }}
      aria-label={labelMap[status]}
    />
  );
}

// ---------------------------------------------------------------------------
// MultiCollectPanel — all 3 platforms as independent cards
// ---------------------------------------------------------------------------

function MultiCollectPanel({
  collectStates,
  loginStates,
  xhsInput,
  onXhsInputChange,
  onCollectPlatform,
  onCollectAll,
  onLaunchDashboard,
}: {
  collectStates: Record<string, PlatformCollectState>;
  loginStates: Record<string, PlatformLoginState>;
  xhsInput: string;
  onXhsInputChange: (value: string) => void;
  onCollectPlatform: (platformId: 'douyin' | 'xhs' | 'tiktok') => void;
  onCollectAll: () => void;
  onLaunchDashboard: () => void;
}) {
  const hasAnyVerifiedIdle = PLATFORMS.some((p) => {
    const login = loginStates[p.id]?.status;
    const collect = collectStates[p.id]?.status;
    const isVerified = login === 'logged_in';
    const isIdle = collect === 'idle';
    if (!isVerified || !isIdle) return false;
    if (p.needsInput) return xhsInput.trim().length > 0;
    return true;
  });

  const anyCollecting = PLATFORMS.some((p) => collectStates[p.id]?.status === 'collecting');
  const anyDone = PLATFORMS.some((p) => collectStates[p.id]?.status === 'done');

  return (
    <div className="flex flex-col gap-3">
      {PLATFORMS.map((p) => {
        const loginState = loginStates[p.id] ?? { status: 'unknown' };
        const collectState = collectStates[p.id] ?? { status: 'idle' };
        const isVerified = loginState.status === 'logged_in';
        const { status } = collectState;

        const canCollect =
          isVerified &&
          status === 'idle' &&
          (!p.needsInput || xhsInput.trim().length > 0);

        let statusText: string;
        if (!isVerified) {
          statusText = t('ui.components.cdpNotVerified');
        } else if (status === 'collecting') {
          statusText = t('ui.components.cdpCollecting');
        } else if (status === 'done') {
          statusText = t('ui.components.cdpPostsCount', { count: collectState.postsCount ?? 0, plural: (collectState.postsCount ?? 0) !== 1 ? 's' : '' });
        } else if (status === 'error') {
          statusText = t('ui.components.cdpFailed');
        } else {
          statusText = p.hint;
        }

        return (
          <div
            key={p.id}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <PlatformStatusDot status={isVerified ? status : 'idle'} />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {p.label}
                </span>
                {status === 'collecting' && <Spinner />}
                {status === 'done' && <CheckIcon />}
                {status === 'error' && <CrossIcon />}
              </div>
              <button
                type="button"
                onClick={() => onCollectPlatform(p.id)}
                disabled={!canCollect}
                className="shrink-0 flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
              >
                {status === 'collecting' ? t('ui.components.cdpCollecting') : status === 'done' ? t('ui.components.cdpRecollect') : t('ui.components.cdpCollect')}
              </button>
            </div>

            {/* Status / hint line */}
            <p
              className="text-xs"
              style={{
                color:
                  status === 'error'
                    ? 'var(--accent-red)'
                    : status === 'done'
                      ? 'var(--accent-green)'
                      : 'var(--text-subtle)',
              }}
            >
              {statusText}
            </p>

            {/* Error detail with recovery hint */}
            {status === 'error' && collectState.errorCode && getErrorRecovery()[collectState.errorCode] && (
              <TroubleshootSection
                title={t('ui.components.cdpHowToFix')}
                items={getErrorRecovery()[collectState.errorCode].steps}
              />
            )}

            {/* XHS URL input — shown when idle and verified */}
            {p.needsInput && isVerified && (status === 'idle' || status === 'error') && (
              <input
                type="text"
                value={xhsInput}
                onChange={(e) => onXhsInputChange(e.target.value)}
                placeholder={p.inputPlaceholder}
                disabled={false}
                className="h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-green)] disabled:opacity-50"
              />
            )}
          </div>
        );
      })}

      {/* Collect All button */}
      <button
        type="button"
        onClick={onCollectAll}
        disabled={!hasAnyVerifiedIdle || anyCollecting}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-medium)] text-sm font-medium transition-colors disabled:opacity-40 hover:border-[var(--accent-green)] hover:text-[var(--accent-green)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {anyCollecting && <Spinner />}
        {anyCollecting ? t('ui.components.cdpCollecting') : t('ui.components.cdpCollectAll')}
      </button>

      {/* Launch Dashboard — shown when at least one platform has data */}
      {anyDone && !anyCollecting && (
        <button
          type="button"
          onClick={onLaunchDashboard}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
        >
          {t('ui.common.launchDashboard')}
        </button>
      )}

      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        {t('ui.components.cdpCollectPanelNote')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiDonePanel — combined results after collection
// ---------------------------------------------------------------------------

function MultiDonePanel({
  collectStates,
  onLaunch,
  onRetryFailed,
}: {
  collectStates: Record<string, PlatformCollectState>;
  onLaunch: () => void;
  onRetryFailed: () => void;
}) {
  const results = PLATFORMS.map((p) => ({
    platform: p,
    state: collectStates[p.id] ?? { status: 'idle' as PlatformCollectStatus },
  }));

  const totalPosts = results.reduce(
    (sum, { state }) => sum + (state.status === 'done' ? (state.postsCount ?? 0) : 0),
    0,
  );
  const doneCount = results.filter(({ state }) => state.status === 'done').length;
  const hasErrors = results.some(({ state }) => state.status === 'error');
  const canLaunch = totalPosts > 0;

  return (
    <div className="flex flex-col gap-4">
      <StatusBar
        icon={<CheckIcon />}
        label={t('ui.components.cdpCollectionComplete')}
        sub={t('ui.components.cdpCollectionSummary', { posts: totalPosts, plural: totalPosts !== 1 ? 's' : '', platforms: doneCount, platformPlural: doneCount !== 1 ? 's' : '' })}
        accent="green"
      />

      {/* Per-platform summary */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 flex flex-col gap-2">
        {results.map(({ platform, state }) => {
          if (state.status === 'idle') return null;
          return (
            <div key={platform.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {state.status === 'done' ? <CheckIcon /> : <CrossIcon />}
                <span className="text-xs text-[var(--text-secondary)]">{platform.label}</span>
              </div>
              <span
                className="text-xs font-mono"
                style={{
                  color:
                    state.status === 'done'
                      ? 'var(--accent-green)'
                      : 'var(--accent-red)',
                }}
              >
                {state.status === 'done'
                  ? t('ui.components.cdpPostsCount', { count: state.postsCount ?? 0 })
                  : state.error ?? t('ui.components.cdpFailed')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onLaunch}
          disabled={!canLaunch}
          className="flex h-10 flex-1 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
        >
          {t('ui.common.launchDashboard')}
        </button>
        {hasErrors && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="flex h-10 items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('ui.components.cdpRetryFailed')}
          </button>
        )}
      </div>

      {!canLaunch && (
        <p className="text-xs text-[var(--text-subtle)]">
          {t('ui.components.cdpNeedOneCollection')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CdpSetupGuide() {
  const router = useRouter();

  const [phase, setPhase] = useState<SetupPhase>('checking');
  const [loginStates, setLoginStates] = useState<Record<string, PlatformLoginState>>({
    douyin: { status: 'unknown' },
    xhs: { status: 'unknown' },
    tiktok: { status: 'unknown' },
  });
  const [collectStates, setCollectStates] = useState<Record<string, PlatformCollectState>>({
    douyin: { status: 'idle' },
    xhs: { status: 'idle' },
    tiktok: { status: 'idle' },
  });
  const [xhsInput, setXhsInput] = useState('');
  const [collectedProfiles, setCollectedProfiles] = useState<Record<string, CreatorProfile>>({});

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = PHASE_STEP[phase];

  // ── Health check ──────────────────────────────────────────────────────────

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/cdp-collect');
      if (!res.ok) return false;
      const data = await res.json() as { connected?: boolean };
      return data.connected === true;
    } catch {
      return false;
    }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setPhase('checking');
    const connected = await checkHealth();
    setPhase(connected ? 'login-check' : 'setup');
  }, [checkHealth]);

  // ── Auto-poll while in setup state ────────────────────────────────────────

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPoll = useCallback(() => {
    stopPoll();
    pollTimerRef.current = setInterval(async () => {
      const connected = await checkHealth();
      if (connected) {
        stopPoll();
        setPhase('login-check');
      }
    }, HEALTH_POLL_INTERVAL_MS);
  }, [checkHealth, stopPoll]);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Initial health check on mount
  useEffect(() => {
    runHealthCheck();
    return () => {
      stopPoll();
    };
  }, [runHealthCheck, stopPoll]);

  // Start/stop auto-poll based on phase
  useEffect(() => {
    if (phase === 'setup') {
      startPoll();
    } else {
      stopPoll();
    }
  }, [phase, startPoll, stopPoll]);

  // Merge collected profiles with existing data and persist
  useEffect(() => {
    if (Object.keys(collectedProfiles).length > 0) {
      const existingRaw = sessionStorage.getItem('dashpersona-import-profiles');
      const existing: Record<string, CreatorProfile> = existingRaw
        ? JSON.parse(existingRaw)
        : {};
      const merged = { ...existing, ...collectedProfiles };
      sessionStorage.setItem('dashpersona-import-profiles', JSON.stringify(merged));
      saveProfiles(merged); // Persist to IndexedDB
    }
  }, [collectedProfiles]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCheckLogin = useCallback(async (platformId: 'douyin' | 'xhs' | 'tiktok') => {
    setLoginStates((prev) => ({
      ...prev,
      [platformId]: { status: 'checking' },
    }));

    try {
      const res = await fetch('/api/cdp-collect');
      if (!res.ok) throw new Error('proxy_unreachable');
      await new Promise<void>((resolve) => setTimeout(resolve, 800));
      setLoginStates((prev) => ({
        ...prev,
        [platformId]: { status: 'logged_in' },
      }));
    } catch {
      setLoginStates((prev) => ({
        ...prev,
        [platformId]: { status: 'not_logged_in' },
      }));
    }
  }, []);

  const handleLoginContinue = useCallback(() => {
    setPhase('ready');
  }, []);

  const handleLoginSkip = useCallback(() => {
    setPhase('ready');
  }, []);

  const collectPlatform = useCallback(async (platformId: 'douyin' | 'xhs' | 'tiktok') => {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;

    // XHS requires a URL input
    if (platform.needsInput && xhsInput.trim().length === 0) return;

    setCollectStates((prev) => ({
      ...prev,
      [platformId]: { status: 'collecting' },
    }));

    try {
      const res = await fetch('/api/cdp-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          input: platform.needsInput ? xhsInput.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as {
          error?: string;
          code?: string;
        };
        const code = data.code;
        const msg = data.error ?? `Collection failed: ${res.status}`;
        setCollectStates((prev) => ({
          ...prev,
          [platformId]: { status: 'error', error: msg, errorCode: code },
        }));
        return;
      }

      const { profile } = await res.json() as { profile: CreatorProfile };

      setCollectedProfiles((prev) => ({ ...prev, [platformId]: profile }));
      setCollectStates((prev) => ({
        ...prev,
        [platformId]: { status: 'done', postsCount: profile.posts.length },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCollectStates((prev) => ({
        ...prev,
        [platformId]: { status: 'error', error: msg },
      }));
    }
  }, [xhsInput]);

  const collectAll = useCallback(() => {
    PLATFORMS.forEach((p) => {
      const loginStatus = loginStates[p.id]?.status;
      const collectStatus = collectStates[p.id]?.status;
      const isVerified = loginStatus === 'logged_in';
      const isIdle = collectStatus === 'idle';
      if (!isVerified || !isIdle) return;
      if (p.needsInput && xhsInput.trim().length === 0) return;
      void collectPlatform(p.id);
    });
  }, [loginStates, collectStates, xhsInput, collectPlatform]);

  const handleLaunchDashboard = useCallback(() => {
    router.push('/dashboard?source=import');
  }, [router]);

  const handleRetryFailed = useCallback(() => {
    setCollectStates((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key].status === 'error') {
          next[key] = { status: 'idle' };
        }
      }
      return next;
    });
    setPhase('ready');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Step indicator — shown for all phases except the initial checking */}
      {phase !== 'checking' && (
        <StepIndicator currentStep={currentStep} />
      )}

      {/* Checking state */}
      {phase === 'checking' && (
        <StatusBar
          icon={<Spinner />}
          label={t('ui.components.cdpCheckingProxy')}
          accent="neutral"
        />
      )}

      {/* Setup state */}
      {phase === 'setup' && (
        <>
          <StatusBar
            icon={<CrossIcon />}
            label={t('ui.components.cdpProxyNotRunningStatus')}
            sub={t('ui.components.cdpProxyNotRunningSub')}
            accent="red"
          />
          <SetupInstructions
            onRecheck={runHealthCheck}
            isChecking={false}
          />
        </>
      )}

      {/* Login check state */}
      {phase === 'login-check' && (
        <>
          <StatusBar
            icon={<CheckIcon />}
            label={t('ui.components.cdpProxyConnected')}
            sub={t('ui.components.cdpVerifyLoginsSub')}
            accent="green"
          />
          <LoginCheckPanel
            loginStates={loginStates}
            onCheckLogin={handleCheckLogin}
            onContinue={handleLoginContinue}
            onSkip={handleLoginSkip}
          />
        </>
      )}

      {/* Ready state — multi-platform parallel collection */}
      {phase === 'ready' && (
        <>
          <StatusBar
            icon={<CheckIcon />}
            label={t('ui.components.cdpReadyToCollect')}
            sub={t('ui.components.cdpReadyToCollectSub')}
            accent="green"
          />
          <MultiCollectPanel
            collectStates={collectStates}
            loginStates={loginStates}
            xhsInput={xhsInput}
            onXhsInputChange={setXhsInput}
            onCollectPlatform={collectPlatform}
            onCollectAll={collectAll}
            onLaunchDashboard={handleLaunchDashboard}
          />
        </>
      )}

      {/* Done state — combined results */}
      {phase === 'done' && (
        <MultiDonePanel
          collectStates={collectStates}
          onLaunch={handleLaunchDashboard}
          onRetryFailed={handleRetryFailed}
        />
      )}
    </div>
  );
}
