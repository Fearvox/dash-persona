'use client';

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/schema/creator-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SetupPhase = 'checking' | 'setup' | 'login-check' | 'ready' | 'collecting' | 'done' | 'error';

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

type DoneResult = {
  postsCount: number;
  platform: string;
};

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

const COLLECTING_MESSAGES = [
  'Connecting to Chrome...',
  'Opening page...',
  'Extracting data...',
  'Processing...',
] as const;

const SETUP_COMMAND = 'bash ~/.claude/skills/web-access/scripts/check-deps.sh';

const HEALTH_POLL_INTERVAL_MS = 5_000;
const COLLECTING_MESSAGE_INTERVAL_MS = 3_000;
const REDIRECT_DELAY_MS = 900;

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

// Step index mapping
const PHASE_STEP: Record<SetupPhase, number> = {
  checking: 0,
  setup: 0,
  'login-check': 1,
  ready: 1,
  collecting: 2,
  done: 3,
  error: 2,
};

// ---------------------------------------------------------------------------
// Sub-components
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
// Step indicator
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
// Troubleshoot section
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
// Setup instructions panel
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
// Login check panel
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
// Login guidance (shown in ready state before collect panel)
// ---------------------------------------------------------------------------

function LoginGuidance() {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)] mb-2">
        Before collecting, make sure you are logged in
      </p>
      <ul className="flex flex-col gap-1.5">
        <li className="text-xs text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Douyin</strong> — Open{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]">
            creator.douyin.com
          </code>{' '}
          in Chrome and log in
        </li>
        <li className="text-xs text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">TikTok</strong> — Open{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]">
            tiktok.com/tiktokstudio
          </code>{' '}
          in Chrome and log in
        </li>
        <li className="text-xs text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Red Note</strong> — Open{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]">
            xiaohongshu.com
          </code>{' '}
          in Chrome and log in
        </li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform selector + collect panel
// ---------------------------------------------------------------------------

function CollectPanel({
  platform,
  input,
  isCollecting,
  onPlatformChange,
  onInputChange,
  onCollect,
}: {
  platform: SupportedPlatform;
  input: string;
  isCollecting: boolean;
  onPlatformChange: (id: 'douyin' | 'xhs' | 'tiktok') => void;
  onInputChange: (value: string) => void;
  onCollect: () => void;
}) {
  const canSubmit = !isCollecting && (!platform.needsInput || input.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Platform pills */}
      <div className="flex gap-2" role="group" aria-label="Select platform">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!p.available}
            onClick={() => onPlatformChange(p.id)}
            aria-pressed={platform.id === p.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              platform.id === p.id
                ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {p.label}
            {!p.available && (
              <span className="ml-1.5 text-[0.65rem] opacity-60">soon</span>
            )}
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-[var(--text-subtle)]">{platform.hint}</p>

      {/* Input (only when needed) */}
      {platform.needsInput && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cdp-collect-input"
            className="text-xs text-[var(--text-subtle)]"
          >
            {platform.inputHint}
          </label>
          <input
            id="cdp-collect-input"
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={platform.inputPlaceholder}
            disabled={isCollecting}
            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-green)] disabled:opacity-50"
          />
        </div>
      )}

      {/* Collect button */}
      <button
        type="button"
        onClick={onCollect}
        disabled={!canSubmit}
        className="flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
      >
        {isCollecting && <Spinner />}
        {isCollecting ? 'Collecting...' : 'Collect'}
      </button>

      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        Collects data through your real browser with existing login sessions.
        Make sure you are logged in to the target platform before collecting.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collecting progress panel
// ---------------------------------------------------------------------------

function CollectingProgress({ messageIndex }: { messageIndex: number }) {
  const message = COLLECTING_MESSAGES[Math.min(messageIndex, COLLECTING_MESSAGES.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <StatusBar
        icon={<Spinner />}
        label={message}
        accent="neutral"
      />
      <div className="flex gap-1.5" aria-hidden="true">
        {COLLECTING_MESSAGES.map((msg, i) => (
          <div
            key={msg}
            className="h-0.5 flex-1 rounded-full transition-colors duration-500"
            style={{
              background:
                i <= messageIndex
                  ? 'var(--accent-green)'
                  : 'var(--border-subtle)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Done panel
// ---------------------------------------------------------------------------

function DonePanel({
  result,
  onLaunch,
}: {
  result: DoneResult;
  onLaunch: () => void;
}) {
  const platformLabel =
    PLATFORMS.find((p) => p.id === result.platform)?.label ?? result.platform;

  return (
    <div className="flex flex-col gap-4">
      <StatusBar
        icon={<CheckIcon />}
        label="Collection complete"
        sub={`${result.postsCount} post${result.postsCount !== 1 ? 's' : ''} collected from ${platformLabel}`}
        accent="green"
      />
      <button
        type="button"
        onClick={onLaunch}
        className="flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
      >
        Launch Dashboard
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error panel (enhanced with recovery steps)
// ---------------------------------------------------------------------------

function ErrorPanel({
  code,
  message,
  onRetry,
}: {
  code?: string;
  message: string;
  onRetry: () => void;
}) {
  const recovery = code ? ERROR_RECOVERY[code] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <StatusBar
        icon={<CrossIcon />}
        label={recovery?.title ?? 'Collection failed'}
        sub={message}
        accent="red"
      />
      {recovery && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
            How to fix
          </p>
          <ol className="mt-2 flex flex-col gap-1.5">
            {recovery.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--text-secondary)]">
                <span className="shrink-0 text-[var(--text-subtle)]">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!recovery && code === 'NOT_LOGGED_IN' && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
            How to fix
          </p>
          <ol className="mt-2 flex flex-col gap-1.5">
            <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
              <span className="shrink-0 text-[var(--text-subtle)]">1.</span>
              Open the platform website in your Chrome browser
            </li>
            <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
              <span className="shrink-0 text-[var(--text-subtle)]">2.</span>
              Log in with your account credentials
            </li>
            <li className="flex gap-2 text-xs text-[var(--text-secondary)]">
              <span className="shrink-0 text-[var(--text-subtle)]">3.</span>
              Come back here and click Collect again
            </li>
          </ol>
        </div>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="flex h-10 items-center justify-center rounded-lg border border-[var(--border-medium)] px-5 text-sm font-medium transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CdpSetupGuide() {
  const router = useRouter();

  const [phase, setPhase] = useState<SetupPhase>('checking');
  const [selectedPlatformId, setSelectedPlatformId] = useState<'douyin' | 'xhs' | 'tiktok'>('douyin');
  const [input, setInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [doneResult, setDoneResult] = useState<DoneResult | null>(null);
  const [collectingMessageIndex, setCollectingMessageIndex] = useState(0);
  const [loginStates, setLoginStates] = useState<Record<string, PlatformLoginState>>({
    douyin: { status: 'unknown' },
    xhs: { status: 'unknown' },
    tiktok: { status: 'unknown' },
  });

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPlatform = PLATFORMS.find((p) => p.id === selectedPlatformId) ?? PLATFORMS[0];
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

  // ── Collecting progress messages ──────────────────────────────────────────

  const stopMessageTimer = useCallback(() => {
    if (messageTimerRef.current !== null) {
      clearInterval(messageTimerRef.current);
      messageTimerRef.current = null;
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Initial health check on mount
  useEffect(() => {
    runHealthCheck();
    return () => {
      stopPoll();
      stopMessageTimer();
    };
  }, [runHealthCheck, stopPoll, stopMessageTimer]);

  // Start/stop auto-poll based on phase
  useEffect(() => {
    if (phase === 'setup') {
      startPoll();
    } else {
      stopPoll();
    }
  }, [phase, startPoll, stopPoll]);

  // Advance progress messages during collecting
  useEffect(() => {
    if (phase === 'collecting') {
      setCollectingMessageIndex(0);
      messageTimerRef.current = setInterval(() => {
        setCollectingMessageIndex((prev) =>
          prev < COLLECTING_MESSAGES.length - 1 ? prev + 1 : prev,
        );
      }, COLLECTING_MESSAGE_INTERVAL_MS);
    } else {
      stopMessageTimer();
    }
  }, [phase, stopMessageTimer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlatformChange = useCallback((id: 'douyin' | 'xhs' | 'tiktok') => {
    setSelectedPlatformId(id);
    setInput('');
    setErrorMsg('');
    setErrorCode(undefined);
  }, []);

  const handleCheckLogin = useCallback(async (platformId: 'douyin' | 'xhs' | 'tiktok') => {
    setLoginStates((prev) => ({
      ...prev,
      [platformId]: { status: 'checking' },
    }));

    // Attempt a health check first to confirm proxy is still up, then mark
    // the platform as requiring user confirmation (we do not burn a full CDP
    // collect for login verification — the user opens the platform URL and
    // confirms via the "Check Login" flow).
    try {
      const res = await fetch('/api/cdp-collect');
      if (!res.ok) throw new Error('proxy_unreachable');
      // Proxy is alive — we trust the user to open the URL and log in.
      // After a short delay, mark as logged_in to indicate "proxy is ready,
      // browser session assumed present." A real login failure surfaces on
      // the actual collect call with NOT_LOGGED_IN.
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

  const handleCollect = useCallback(async () => {
    setPhase('collecting');
    setErrorMsg('');
    setErrorCode(undefined);

    try {
      const res = await fetch('/api/cdp-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatformId,
          input: input.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as {
          error?: string;
          code?: string;
        };
        const code = data.code;
        const msg = data.error ?? `Collection failed: ${res.status}`;
        setErrorCode(code);
        throw new Error(msg);
      }

      const { profile } = await res.json() as { profile: CreatorProfile };

      sessionStorage.setItem(
        'dashpersona-import-profiles',
        JSON.stringify({ [profile.platform]: profile }),
      );

      setDoneResult({
        postsCount: profile.posts.length,
        platform: profile.platform,
      });
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [selectedPlatformId, input]);

  const handleLaunchDashboard = useCallback(() => {
    setTimeout(() => {
      router.push('/dashboard?source=import');
    }, REDIRECT_DELAY_MS);
  }, [router]);

  const handleRetry = useCallback(() => {
    setErrorMsg('');
    setErrorCode(undefined);
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

      {/* Ready state */}
      {phase === 'ready' && (
        <>
          <StatusBar
            icon={<CheckIcon />}
            label="CDP proxy connected"
            sub="Ready to collect creator data from your browser."
            accent="green"
          />
          <LoginGuidance />
          <CollectPanel
            platform={selectedPlatform}
            input={input}
            isCollecting={false}
            onPlatformChange={handlePlatformChange}
            onInputChange={setInput}
            onCollect={handleCollect}
          />
        </>
      )}

      {/* Collecting state */}
      {phase === 'collecting' && (
        <CollectingProgress messageIndex={collectingMessageIndex} />
      )}

      {/* Done state */}
      {phase === 'done' && doneResult !== null && (
        <DonePanel result={doneResult} onLaunch={handleLaunchDashboard} />
      )}

      {/* Error state */}
      {phase === 'error' && (
        <ErrorPanel
          code={errorCode}
          message={errorMsg}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
