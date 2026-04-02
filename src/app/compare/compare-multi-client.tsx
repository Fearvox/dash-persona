'use client';

import dynamic from 'next/dynamic';

const CompareMultiClient = dynamic(
  () => import('./compare-multi-client-inner').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">Loading comparison…</p>
      </div>
    ),
  },
);

export default CompareMultiClient;
