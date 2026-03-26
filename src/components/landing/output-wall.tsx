import Link from 'next/link';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Output view data
// ---------------------------------------------------------------------------

interface OutputView {
  name: string;
  href: string;
  description: string;
  icon: string; // SVG path
  gradientFrom: string;
  gradientTo: string;
  noiseOpacity: number;
  span?: number;
}

function getOutputViews(): readonly OutputView[] {
  return [
    {
      name: t('ui.landing.viewDashboard'),
      href: '/dashboard?source=demo&persona=tutorial',
      description: t('ui.landing.viewDashboardDesc'),
      icon: 'M3 12h4l3 8 4-16 3 8h4', // sparkline/pulse
      gradientFrom: '#7ed29a',
      gradientTo: '#7eb8d2',
      noiseOpacity: 0.12,
      span: 2,
    },
    {
      name: t('ui.landing.viewPersona'),
      href: '/persona?source=demo&persona=tutorial',
      description: t('ui.landing.viewPersonaDesc'),
      icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2', // clock/score
      gradientFrom: '#7ed29a',
      gradientTo: '#d2c87e',
      noiseOpacity: 0.10,
    },
    {
      name: t('ui.landing.viewCalendar'),
      href: '/calendar?source=demo&persona=tutorial',
      description: t('ui.landing.viewCalendarDesc'),
      icon: 'M4 4h16v16H4zM4 9h16M9 4v16', // calendar grid
      gradientFrom: '#d2c87e',
      gradientTo: '#f0f545',
      noiseOpacity: 0.08,
    },
    {
      name: t('ui.landing.viewTimeline'),
      href: '/timeline?source=demo&persona=tutorial',
      description: t('ui.landing.viewTimelineDesc'),
      icon: 'M6 3v18M6 9h6v6H6M12 12h6v6h-6', // tree branches
      gradientFrom: '#7eb8d2',
      gradientTo: '#7ed29a',
      noiseOpacity: 0.10,
    },
    {
      name: t('ui.landing.viewCompare'),
      href: '/compare?source=demo&persona=tutorial',
      description: t('ui.landing.viewCompareDesc'),
      icon: 'M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9', // grid compare
      gradientFrom: '#f0f545',
      gradientTo: '#7ed29a',
      noiseOpacity: 0.12,
    },
  ];
}

// ---------------------------------------------------------------------------
// Inline SVG noise pattern (deterministic, no external assets)
// ---------------------------------------------------------------------------

function NoiseFilter({ id }: { id: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter={`url(#${id})`} opacity="0.08" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Output Wall component
// ---------------------------------------------------------------------------

export function OutputWall() {
  const outputViews = getOutputViews();
  return (
    <div className="flex flex-col gap-16">
      {/* Output view cards */}
      <section aria-labelledby="output-wall-heading">
        <h2 id="output-wall-heading" className="kicker mb-2">
          {t('ui.landing.outputViews')}
        </h2>
        <p
          className="mb-6 max-w-lg text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('ui.landing.outputDescription')}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outputViews.map((view) => (
            <Link
              key={view.name}
              href={view.href}
              className={`card group flex flex-col overflow-hidden transition-all${
                view.span === 2 ? ' col-span-1 sm:col-span-2' : ''
              }`}
            >
              {/* Cover: gradient + noise + icon */}
              <div
                className="relative flex h-32 items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${view.gradientFrom}18, ${view.gradientTo}18)`,
                }}
              >
                <NoiseFilter id={`noise-${view.name.replace(/\s/g, '')}`} />
                <svg
                  aria-hidden="true"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative z-10 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    color: view.gradientFrom,
                    opacity: 0.5,
                  }}
                >
                  <path d={view.icon} />
                </svg>
                {/* Subtle gradient overlay for depth */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${view.gradientFrom}10, transparent 70%)`,
                  }}
                />
              </div>

              {/* Card content */}
              <div className="p-4">
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {view.name}
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {view.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-4">
          <Link
            href="/dashboard?source=demo&persona=tutorial"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent-green)',
              color: 'var(--bg-primary)',
            }}
          >
            {t('ui.landing.tryDemo')}
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-full border px-8 text-sm font-semibold transition-colors hover:bg-white/5"
            style={{
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          >
            {t('ui.landing.getStarted')}
          </Link>
        </div>
      </div>

      {/* Powered by Dash footer */}
      <footer
        className="flex flex-col items-center gap-3 pt-8 pb-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--text-subtle)' }}
          >
            {t('ui.common.poweredBy')}
          </span>
          {/* DASH Symbol: horizontal dash + diagonal slash */}
          <svg
            viewBox="0 0 32 20"
            fill="none"
            aria-hidden="true"
            style={{ height: '0.7em', width: 'auto' }}
          >
            <line x1="1" y1="10" x2="31" y2="10" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="11" y1="18" x2="21" y2="2" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span
            className="text-sm font-extrabold uppercase"
            style={{ color: 'var(--text-secondary)', letterSpacing: '-0.06em' }}
          >
            DASH
          </span>
        </div>
        <p
          className="text-xs"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.common.customDigitalSystems')}
        </p>
      </footer>
    </div>
  );
}
