'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportDashboardLoader() {
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem('dashpersona-import-profiles');
    if (!raw) {
      router.replace('/onboarding');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const first = Object.values(parsed)[0];
      // Bridge to existing extension data flow
      localStorage.setItem('dashpersona-extension-profile', JSON.stringify(first));
      // Clean up to prevent stale data on back/forward navigation
      sessionStorage.removeItem('dashpersona-import-profiles');
      router.replace('/dashboard?source=extension');
    } catch {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
      <p className="text-sm text-[var(--text-secondary)]">Loading imported data...</p>
    </div>
  );
}
