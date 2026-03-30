'use client';

import dynamic from 'next/dynamic';
import { t } from '@/lib/i18n';
import PipelineSkeleton from '@/components/landing/pipeline-skeleton';

const PipelineViewer = dynamic(
  () => import('@/components/landing/pipeline-viewer'),
  { ssr: false, loading: () => <PipelineSkeleton /> },
);

export default function PipelineStandalonePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <header>
        <h1
          className="text-xl font-bold tracking-tight sm:text-2xl text-[var(--text-primary)]"
        >
          {t('ui.pipeline.title')}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-subtle)]">
          {t('ui.pipeline.subtitle')}
        </p>
      </header>
      <PipelineViewer standalone />
    </div>
  );
}
