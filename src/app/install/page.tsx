import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: '安装指南 — DashPersona',
  description: 'DashPersona CLI 安装教程 — 获取完整数据分析功能',
};
// Note: metadata strings are hardcoded Chinese as they are static server-side metadata
// and cannot use the runtime t() function

/* ── Local helper components ────────────────────────────── */

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: 'rgba(126, 210, 154, 0.15)',
            color: 'var(--accent-green)',
          }}
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3
            className="text-base font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {children}
        </div>
      </div>
    </div>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div
      className="overflow-x-auto rounded-lg px-4 py-3"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <code
        className="text-sm leading-relaxed"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-green)',
        }}
      >
        {command}
      </code>
    </div>
  );
}


function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="card p-5">
      <h4
        className="mb-2 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {question}
      </h4>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {answer}
      </p>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function InstallPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      {/* ── Header ── */}
      <header>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
        >
          &larr; {t('ui.install.backToHome')}
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {t('ui.install.pageTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('ui.install.pageDesc')}
        </p>
      </header>

      {/* ── Full version unlocks ── */}
      <section aria-labelledby="unlocks-heading">
        <h2 id="unlocks-heading" className="kicker mb-4">
          {t('ui.install.unlocksHeading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div
            className="card p-4"
            style={{ borderColor: 'rgba(126, 210, 154, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-green)' }}
            >
              {t('ui.install.unlock1Title')}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.unlock1Desc')}
            </p>
          </div>

          <div
            className="card p-4"
            style={{ borderColor: 'rgba(210, 200, 126, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-yellow)' }}
            >
              {t('ui.install.unlock2Title')}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.unlock2Desc')}
            </p>
          </div>

          <div
            className="card p-4"
            style={{ borderColor: 'rgba(126, 184, 210, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-blue)' }}
            >
              {t('ui.install.unlock3Title')}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.unlock3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading" className="kicker mb-4">
          {t('ui.install.requirementsHeading')}
        </h2>
        <div className="card p-5">
          <ul className="flex flex-col gap-2">
            {[
              t('ui.install.req1'),
              t('ui.install.req2'),
              t('ui.install.req3'),
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{
                    background: 'rgba(126, 210, 154, 0.15)',
                    color: 'var(--accent-green)',
                  }}
                >
                  &#10003;
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5-step guide ── */}
      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="kicker mb-4">
          {t('ui.install.stepsHeading')}
        </h2>
        <div className="flex flex-col gap-4">
          {/* Step 1 */}
          <StepCard step={1} title={t('ui.install.step1Title')}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step1Desc')}
            </p>
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent-green)' }}
            >
              nodejs.org &rarr;
            </a>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step1VerifyDesc')}
            </p>
            <CommandBlock command="node --version" />
            <Image
              src="/screenshots/install-node-version.png"
              alt={t('ui.install.step1ImgAlt')}
              width={720}
              height={90}
              className="rounded-lg"
              style={{ border: '1px solid var(--border-subtle)' }}
            />
          </StepCard>

          {/* Step 2 */}
          <StepCard step={2} title={t('ui.install.step2Title')}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step2Desc')}
            </p>
            <CommandBlock command="npm install -g @anthropic-ai/claude-code" />
            <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
              {t('ui.install.step2VerifyPre')} <code
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >claude --version</code> {t('ui.install.step2VerifyPost')}
            </p>
          </StepCard>

          {/* Step 3 */}
          <StepCard step={3} title={t('ui.install.step3Title')}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step3Desc')}
            </p>
            <CommandBlock command="claude skill install --global github.com/eze-is/web-access" />
          </StepCard>

          {/* Step 4 */}
          <StepCard step={4} title={t('ui.install.step4Title')}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step4Desc')}
            </p>
            <ol
              className="flex flex-col gap-2 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>1.</span>
                <span>{t('ui.install.step4Sub1Pre')} <code
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >chrome://inspect/#remote-debugging</code></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>2.</span>
                <span>{t('ui.install.step4Sub2Pre')} <strong style={{ color: 'var(--text-primary)' }}>&quot;Allow remote debugging for this browser instance&quot;</strong> {t('ui.install.step4Sub2Post')}</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>3.</span>
                <span>{t('ui.install.step4Sub3')}</span>
              </li>
            </ol>
            <Image
              src="/screenshots/install-chrome-debugging.png"
              alt={t('ui.install.step4ImgAlt')}
              width={720}
              height={480}
              className="rounded-lg"
              style={{ border: '1px solid var(--border-subtle)' }}
            />
          </StepCard>

          {/* Step 5 */}
          <StepCard step={5} title={t('ui.install.step5Title')}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ui.install.step5Desc')}
            </p>
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                background: 'var(--accent-green)',
                color: 'var(--bg-primary)',
              }}
            >
              {t('ui.install.step5Cta')} &rarr;
            </Link>
          </StepCard>
        </div>
      </section>

      {/* ── Troubleshooting FAQ ── */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="kicker mb-4">
          {t('ui.install.faqHeading')}
        </h2>
        <div className="flex flex-col gap-3">
          <FaqItem
            question={t('ui.install.faq1Q')}
            answer={t('ui.install.faq1A')}
          />
          <FaqItem
            question={t('ui.install.faq2Q')}
            answer={t('ui.install.faq2A')}
          />
          <FaqItem
            question={t('ui.install.faq3Q')}
            answer={t('ui.install.faq3A')}
          />
          <FaqItem
            question={t('ui.install.faq4Q')}
            answer={t('ui.install.faq4A')}
          />
        </div>
      </section>

      {/* ── Footer link ── */}
      <footer className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
        >
          &larr; {t('ui.install.backToHome')}
        </Link>
      </footer>
    </div>
  );
}
