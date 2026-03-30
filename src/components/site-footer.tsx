'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { LocaleToggle } from '@/components/locale-toggle';

export default function SiteFooter() {
  const pathname = usePathname();

  // Hide footer on landing page
  if (pathname === '/') return null;

  return (
    <footer
      className="flex flex-col items-center gap-2 px-6 py-4 border-t border-t-[var(--border-subtle)]"
    >
      <div className="flex items-center justify-center gap-6">
        <Link href="/" className="nav-pill">
          {t('ui.common.home')}
        </Link>
        <Link href="/dashboard?source=demo&persona=tutorial" className="nav-pill">
          {t('ui.common.dashboard')}
        </Link>
        <Link href="/portrait" className="nav-pill">
          {t('ui.portrait.title')}
        </Link>
        <Link href="/settings" className="nav-pill">
          {t('ui.common.settings')}
        </Link>
        <LocaleToggle />
      </div>
      <span
        className="text-xs text-[var(--text-subtle)]"
      >
        {t('ui.common.version')}
      </span>
    </footer>
  );
}
