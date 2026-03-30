// ---------------------------------------------------------------------------
// Pipeline Skeleton — static loading placeholder
// ---------------------------------------------------------------------------

import { t } from '@/lib/i18n';

const ROWS: ReadonlyArray<{ key: string; count: number; grid?: boolean }> = [
  { key: 'ui.pipeline.dataSources', count: 4 },
  { key: 'ui.pipeline.adapters', count: 3 },
  { key: 'ui.pipeline.analysisEngine', count: 9, grid: true },
  { key: 'ui.pipeline.outputViews', count: 5 },
];

const BOX_W = 140;
const BOX_H = 56;
const GAP = 12;

export default function PipelineSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-8 px-4 py-8"
      aria-busy="true"
      aria-label={t('ui.a11y.loadingPipeline')}
    >
      {ROWS.map((row, rowIdx) => (
        <div key={row.key} className="flex flex-col items-center gap-3">
          {/* Kicker label */}
          <span
            className="kicker mb-1"
          >
            {t(row.key)}
          </span>

          {/* Connecting lines from previous row */}
          {rowIdx > 0 && (
            <div
              className="flex justify-center -mt-2 -mb-1"
              style={{ gap: GAP + BOX_W }}
            >
              {Array.from({ length: Math.min(3, ROWS[rowIdx - 1].count) }).map((_, i) => (
                <div
                  key={i}
                  className="w-px h-6 border-l border-dashed border-[var(--border-subtle)]"
                />
              ))}
            </div>
          )}

          {/* Placeholder boxes */}
          {row.grid ? (
            // 3x3 grid for engine modules
            <div
              className="grid grid-cols-[repeat(3,140px)] gap-3"
            >
              {Array.from({ length: row.count }).map((_, i) => (
                <SkeletonBox key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap justify-center">
              {Array.from({ length: row.count }).map((_, i) => (
                <SkeletonBox key={i} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonBox() {
  return (
    <div
      className="w-[140px] h-[56px] bg-[var(--bg-secondary)] rounded-[var(--radius-md)] animate-[skeleton-pulse_1.5s_ease-in-out_infinite]"
    />
  );
}
