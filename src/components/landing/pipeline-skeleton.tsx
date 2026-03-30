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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        padding: '32px 16px',
      }}
      aria-busy="true"
      aria-label={t('ui.a11y.loadingPipeline')}
    >
      {ROWS.map((row, rowIdx) => (
        <div key={row.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Kicker label */}
          <span
            className="kicker"
            style={{ marginBottom: 4 }}
          >
            {t(row.key)}
          </span>

          {/* Connecting lines from previous row */}
          {rowIdx > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: GAP + BOX_W,
                marginTop: -8,
                marginBottom: -4,
              }}
            >
              {Array.from({ length: Math.min(3, ROWS[rowIdx - 1].count) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 1,
                    height: 24,
                    borderLeft: '1px dashed var(--border-subtle)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Placeholder boxes */}
          {row.grid ? (
            // 3x3 grid for engine modules
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(3, ${BOX_W}px)`,
                gap: GAP,
              }}
            >
              {Array.from({ length: row.count }).map((_, i) => (
                <SkeletonBox key={i} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: GAP, flexWrap: 'wrap', justifyContent: 'center' }}>
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
      style={{
        width: BOX_W,
        height: BOX_H,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}
