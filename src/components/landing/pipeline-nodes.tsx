'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { PipelineModule } from '@/lib/pipeline/pipeline-config';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Node data shape — uses i18n keys (resolved at render time)
// ---------------------------------------------------------------------------

type PipelineNodeData = Pick<
  PipelineModule,
  'labelKey' | 'descKey' | 'codeName'
> & {
  color: string;
  horizontal?: boolean;
};

export type PipelineNode = Node<PipelineNodeData, 'pipeline'>;

// ---------------------------------------------------------------------------
// Component — resolves i18n keys on every render so locale changes propagate
// ---------------------------------------------------------------------------

function PipelineModuleNode({ data }: NodeProps<PipelineNode>) {
  const label = t(data.labelKey);
  const description = data.descKey ? t(data.descKey) : '';

  return (
    <div
      className="w-[160px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2.5 relative transition-[border-color,transform] duration-150 ease-in-out cursor-default hover:border-[var(--border-medium)] hover:scale-[1.01]"
    >
      {/* Corner color indicator (8x8) */}
      <div
        className="absolute top-1.5 left-1.5 w-2 h-2 rounded-[var(--radius-sm)]"
        style={{ background: data.color }}
      />

      {/* Primary label */}
      <p
        className="text-[13px] font-medium text-[var(--text-primary)] m-0 mt-0.5 leading-[1.3]"
      >
        {label}
      </p>

      {/* Code name */}
      <p
        className="text-[11px] font-mono text-[var(--text-subtle)] mt-[3px] mb-0 leading-[1.2]"
      >
        {data.codeName}
      </p>

      {/* Description */}
      {description && (
        <p
          className="text-[11px] text-[var(--text-subtle)] mt-1 mb-0 leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {description}
        </p>
      )}

      {/* Handles — direction-aware */}
      <Handle
        type="target"
        position={data.horizontal ? Position.Left : Position.Top}
        className="!w-1 !h-1 !min-w-1 !min-h-1 !bg-[var(--border-subtle)] !border-none"
      />
      <Handle
        type="source"
        position={data.horizontal ? Position.Right : Position.Bottom}
        className="!w-1 !h-1 !min-w-1 !min-h-1 !bg-[var(--border-subtle)] !border-none"
      />
    </div>
  );
}

export default memo(PipelineModuleNode);
