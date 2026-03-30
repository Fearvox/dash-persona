import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Install Guide — DashPersona',
  description: 'Use the DASH Collector desktop app to collect real creator center data.',
};

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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(126,_210,_154,_0.15)] text-sm font-bold text-[var(--accent-green)]"
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3
            className="text-base font-semibold leading-snug text-[var(--text-primary)]"
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
      className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3"
    >
      <code
        className="font-mono text-sm leading-relaxed text-[var(--accent-green)]"
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
        className="mb-2 text-sm font-semibold text-[var(--text-primary)]"
      >
        {question}
      </h4>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
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
          className="text-sm font-medium text-[var(--accent-green)] transition-colors hover:opacity-80"
        >
          &larr; {t('ui.install.backToHome')}
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {t('ui.install.pageTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
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
            className="card border-[rgba(126,_210,_154,_0.2)] p-4"
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-green)]"
            >
              {t('ui.install.unlock1Title')}
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {t('ui.install.unlock1Desc')}
            </p>
          </div>

          <div
            className="card border-[rgba(210,_200,_126,_0.2)] p-4"
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-yellow)]"
            >
              {t('ui.install.unlock2Title')}
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {t('ui.install.unlock2Desc')}
            </p>
          </div>

          <div
            className="card border-[rgba(126,_184,_210,_0.2)] p-4"
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]"
            >
              {t('ui.install.unlock3Title')}
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
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
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(126,_210,_154,_0.15)] text-xs text-[var(--accent-green)]"
                >
                  &#10003;
                </span>
                <span className="text-[var(--text-secondary)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Recommended: DASH Collector (3 steps) ── */}
      <section aria-labelledby="recommended-heading">
        <h2 id="recommended-heading" className="kicker mb-1">
          {t('ui.install.recommendedHeading')}
        </h2>
        <p className="mb-4 text-xs text-[var(--text-subtle)]">
          {t('ui.install.recommendedDesc')}
        </p>
        <div className="flex flex-col gap-4">
          {/* Step 1 — Download */}
          <StepCard step={1} title={t('ui.install.step1Title')}>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('ui.install.step1Desc')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-lg border border-[rgba(126,_210,_154,_0.2)] bg-[rgba(126,_210,_154,_0.1)] px-4 py-2 text-xs font-medium text-[var(--accent-green)]"
              >
                {t('ui.install.step1DownloadMac')}
              </span>
              <span
                className="inline-flex items-center rounded-lg border border-[rgba(126,_184,_210,_0.2)] bg-[rgba(126,_184,_210,_0.1)] px-4 py-2 text-xs font-medium text-[var(--accent-blue)]"
              >
                {t('ui.install.step1DownloadWin')}
              </span>
              <span
                className="inline-flex items-center rounded-lg border border-[rgba(210,_200,_126,_0.2)] bg-[rgba(210,_200,_126,_0.1)] px-4 py-2 text-xs font-medium text-[var(--accent-yellow)]"
              >
                {t('ui.install.step1DownloadLinux')}
              </span>
            </div>
          </StepCard>

          {/* Step 2 — Launch & Login */}
          <StepCard step={2} title={t('ui.install.step2Title')}>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('ui.install.step2Desc')}
            </p>
          </StepCard>

          {/* Step 3 — Collect */}
          <StepCard step={3} title={t('ui.install.step3Title')}>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('ui.install.step3Desc')}
            </p>
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent-green)] px-6 text-sm font-semibold text-[var(--bg-primary)] transition-colors hover:opacity-90"
            >
              {t('ui.install.step3Cta')} &rarr;
            </Link>
          </StepCard>
        </div>
      </section>

      {/* ── CLI fallback (collapsible) ── */}
      <section aria-labelledby="cli-heading">
        <h2 id="cli-heading" className="kicker mb-1">
          {t('ui.install.cliHeading')}
        </h2>
        <p className="mb-4 text-xs text-[var(--text-subtle)]">
          {t('ui.install.cliDesc')}
        </p>
        <details
          className="card border border-[var(--border-subtle)]"
        >
          <summary
            className="cursor-pointer px-5 py-4 text-sm font-medium text-[var(--text-secondary)]"
          >
            {t('ui.install.cliToggle')}
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-5">
            {/* CLI Step 1 */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                1. {t('ui.install.cliStep1Title')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {t('ui.install.cliStep1Desc')}
              </p>
            </div>

            {/* CLI Step 2 */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                2. {t('ui.install.cliStep2Title')}
              </h4>
              <p className="mt-1 mb-2 text-xs text-[var(--text-secondary)]">
                {t('ui.install.cliStep2Desc')}
              </p>
              <CommandBlock command="npm install -g @anthropic-ai/claude-code" />
            </div>

            {/* CLI Step 3 */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                3. {t('ui.install.cliStep3Title')}
              </h4>
              <p className="mt-1 mb-2 text-xs text-[var(--text-secondary)]">
                {t('ui.install.cliStep3Desc')}
              </p>
              <CommandBlock command="claude skill install --global github.com/eze-is/web-access" />
            </div>

            {/* CLI Step 4 */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                4. {t('ui.install.cliStep4Title')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {t('ui.install.cliStep4Desc')}
              </p>
            </div>
          </div>
        </details>
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
      <footer className="border-t border-t-[var(--border-subtle)] pt-6">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--accent-green)] transition-colors hover:opacity-80"
        >
          &larr; {t('ui.install.backToHome')}
        </Link>
      </footer>
    </div>
  );
}
