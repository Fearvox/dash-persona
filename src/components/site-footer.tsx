'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SiteFooter() {
  const pathname = usePathname();

  // Hide footer on landing page
  if (pathname === '/') return null;

  return (
    <footer
      className="flex flex-col items-center gap-2 px-6 py-4"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-center gap-6">
        <Link href="/" className="nav-pill">
          Home
        </Link>
        <Link href="/dashboard?source=demo&persona=tutorial" className="nav-pill">
          Dashboard
        </Link>
        <Link href="/settings" className="nav-pill">
          Settings
        </Link>
      </div>
      <span
        className="text-xs"
        style={{ color: 'var(--text-subtle)' }}
      >
        v0.1.0
      </span>
    </footer>
  );
}
