'use client';

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/schema/creator-data';

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

const PLATFORMS: SupportedPlatform[] = [
  {
    id: 'douyin',
    label: 'Douyin',
    available: true,
    needsInput: false,
    inputHint: '',
    inputPlaceholder: '',
    hint: 'Reads from your Creator Center — no URL needed',
    loginUrl: 'https://creator.douyin.com',
    loginLabel: 'creator.douyin.com',
  },
  {
    id: 'xhs',
    label: 'Red Note',
    available: true,
    needsInput: true,
    inputHint: 'Profile URL',
    inputPlaceholder: 'https://www.xiaohongshu.com/user/profile/...',
    hint: 'Paste your Red Note profile URL',
    loginUrl: 'https://www.xiaohongshu.com',
    loginLabel: 'xiaohongshu.com',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    available: true,
    needsInput: false,
    inputHint: '',
    inputPlaceholder: '',
    hint: 'Reads from your TikTok Studio — no URL needed',
    loginUrl: 'https://www.tiktok.com/tiktokstudio',
    loginLabel: 'tiktok.com/tiktokstudio',
  },
];

const SETUP_COMMAND = 'bash ~/.claude/skills/web-access/scripts/check-deps.sh';

const HEALTH_POLL_INTERVAL_MS = 5_000;

// Error recovery map
const ERROR_RECOVERY: Record<string, { title: string; steps: string[] }> = {
  PROXY_NOT_RUNNING: {
    title: 'CDP Proxy is not running',
    steps: [
      'Open your terminal',
      `Run: ${SETUP_COMMAND}`,
      'Wait for the "proxy: ready" message',
      'Come back here and retry',
    ],
  },
  NOT_LOGGED_IN: {
    title: 'Not logged in to the platform',
    steps: [
      'Open the platform website in your Chrome browser',
      'Log in with your account credentials',
      'Come back here and click Collect again',
    ],
  },
  TIMEOUT: {
    title: 'Collection timed out',
    steps: [
      'The page may be loading slowly',
      'Make sure your internet connection is stable',
      'Try again — it usually works on retry',
    ],
  },
  PARSE_ERROR: {
    title: 'Could not read page data',
    steps: [
      'The platform page structure may have changed',
      'Try refreshing the platform page in Chrome first',
      'If the issue persists, try again later',
    ],
  },
};

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
      aria-label={copied ? 'Copied' : 'Copy command'}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-white/5"
      style={{ color: copied ? 'var(--accent-green)' : 'var(--text-subtle)' }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step indicator (kept unchanged)
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ['Setup', 'Login', 'Collect', 'Done'];
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
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
          Step 1 — Enable Chrome Remote Debugging
        </p>
        <ol className="mt-3 flex flex-col gap-2">
          <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span className="mt-px shrink-0 text-[var(--text-subtle)]">1.</span>
            <span>
              Open{' '}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]">
                chrome://inspect/#remote-debugging
              </code>{' '}
              in your Chrome browser.
            </span>
          </li>
          <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
            <span className="mt-px shrink-0 text-[var(--text-subtle)]">2.</span>
            <span>
              Check{' '}
              <strong className="font-medium text-[var(--text-primary)]">
                &ldquo;Allow remote debugging for this browser instance&rdquo;
              </strong>
              .
            </span>
          </li>
        </ol>
        <TroubleshootSection
          title="Troubleshoot"
          items={[
            '"Page not found?" — Make sure you\'re using Google Chrome (not Safari or Firefox)',
            '"No checkbox visible?" — Scroll down, it may be below the fold',
            '"Still not working?" — Restart Chrome completely, then try again',
          ]}
        />
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
          Step 2 — Start CDP Proxy
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Run this command in your terminal:
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-[var(--text-primary)]">
            {SETUP_COMMAND}
          </code>
          <CopyButton text={SETUP_COMMAND} />
        </div>
        <TroubleshootSection
          title="Troubleshoot"
          items={[
            '"node" not found? — Install Node.js from nodejs.org (version 22+)',
            '"Port already in use?" — Another proxy may be running; this is fine',
            '"Chrome auth popup?" — Click "Allow" in your Chrome browser',
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
        {isChecking ? 'Checking...' : 'Recheck Connection'}
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
          Verify platform logins
        </p>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Data collection reads from your existing browser sessions. Make sure
          you are logged in to each platform you want to collect.
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
                        as {state.username}
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
                      Check Login
                    </button>
                  )}
                  {state.status === 'logged_in' && (
                    <span className="shrink-0 text-xs text-[var(--accent-green)]">Ready</span>
                  )}
                </div>
                {state.status !== 'logged_in' && (
                  <p className="text-xs text-[var(--text-subtle)]">
                    Open{' '}
                    <a
                      href={p.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[0.7rem] text-[var(--text-secondary)] hover:text-[var(--accent-green)] underline underline-offset-2 transition-colors"
                    >
                      {p.loginLabel}
                    </a>{' '}
                    in Chrome and log in
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
          Continue
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex h-10 items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent-green)] hover:text-[var(--accent-green)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Skip
        </button>
      </div>
      <p className="text-xs text-[var(--text-subtle)]">
        Skip if you prefer to verify manually. You can always retry if collection
        fails with a login error.
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
        aria-label="Logged in"
      />
    );
  }
  if (status === 'not_logged_in') {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: 'var(--accent-red)' }}
        aria-label="Not logged in"
      />
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ background: 'var(--border-medium)' }}
      aria-label="Status unknown"
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
    idle: 'Idle',
    collecting: 'Collecting',
    done: 'Done',
    error: 'Error',
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
          statusText = 'Not verified';
        } else if (status === 'collecting') {
          statusText = 'Collecting...';
        } else if (status === 'done') {
          statusText = `${collectState.postsCount ?? 0} post${(collectState.postsCount ?? 0) !== 1 ? 's' : ''}`;
        } else if (status === 'error') {
          statusText = 'Failed';
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
                {status === 'collecting' ? 'Collecting...' : status === 'done' ? 'Recollect' : 'Collect'}
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
            {status === 'error' && collectState.errorCode && ERROR_RECOVERY[collectState.errorCode] && (
              <TroubleshootSection
                title="How to fix"
                items={ERROR_RECOVERY[collectState.errorCode].steps}
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
        {anyCollecting ? 'Collecting...' : 'Collect All Verified Platforms'}
      </button>

      {/* Launch Dashboard — shown when at least one platform has data */}
      {anyDone && !anyCollecting && (
        <button
          type="button"
          onClick={onLaunchDashboard}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
        >
          Launch Dashboard
        </button>
      )}

      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        Collect each platform individually or all at once. You can launch the
        dashboard anytime after at least one platform is collected.
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
        label="Collection complete"
        sub={`${totalPosts} post${totalPosts !== 1 ? 's' : ''} across ${doneCount} platform${doneCount !== 1 ? 's' : ''}`}
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
                  ? `${state.postsCount ?? 0} posts`
                  : state.error ?? 'Failed'}
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
          Launch Dashboard
        </button>
        {hasErrors && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="flex h-10 items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Retry Failed
          </button>
        )}
      </div>

      {!canLaunch && (
        <p className="text-xs text-[var(--text-subtle)]">
          At least one successful collection is required to launch the dashboard.
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

  // Keep sessionStorage in sync as profiles are collected (no auto-transition)
  useEffect(() => {
    if (Object.keys(collectedProfiles).length > 0) {
      sessionStorage.setItem(
        'dashpersona-import-profiles',
        JSON.stringify(collectedProfiles),
      );
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
          label="Checking CDP proxy connection..."
          accent="neutral"
        />
      )}

      {/* Setup state */}
      {phase === 'setup' && (
        <>
          <StatusBar
            icon={<CrossIcon />}
            label="CDP proxy not running"
            sub="Follow the steps below to connect your Chrome browser."
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
            label="CDP proxy connected"
            sub="Verify your platform logins before collecting."
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
            label="CDP proxy connected"
            sub="Select platforms and collect data."
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
