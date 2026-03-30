'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';

const NAV_LINKS = [
  { href: '/dashboard?source=demo&persona=tutorial', key: 'ui.common.dashboard' },
  { href: '/portrait', key: 'ui.portrait.title' },
  { href: '/pipeline', key: 'ui.pipeline.title' },
  { href: '/settings', key: 'ui.common.settings' },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();

  // Hide header on landing page (has its own boot sequence)
  if (pathname === '/') return null;

  return (
    <>
      {/* Fixed header bar */}
      <header
        className="fixed top-0 right-0 left-0 z-40 flex h-12 items-center justify-between px-6 backdrop-blur-md"
        style={{
          background: 'rgba(10, 15, 13, 0.80)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center transition-opacity hover:opacity-80"
          aria-label={t('ui.common.backToHome')}
        >
          <img
            src="/dash-logo.svg"
            alt="DASH"
            width={90}
            height={20}
            className="block"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1" aria-label={t('ui.nav.siteNavigation')}>
          {NAV_LINKS.map(({ href, key }) => {
            const linkPath = href.split('?')[0];
            const isActive =
              pathname === linkPath ||
              (linkPath === '/dashboard' && pathname === '/dashboard');
            return (
              <Link
                key={key}
                href={href}
                className="nav-pill"
                style={{
                  color: isActive ? 'var(--accent-green)' : undefined,
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Spacer to push content below fixed header */}
      <div className="h-12 shrink-0" aria-hidden="true" />
    </>
  );
}
