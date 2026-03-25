'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { PipelineModule } from '@/lib/pipeline/pipeline-config';

// ---------------------------------------------------------------------------
// Node data shape
// ---------------------------------------------------------------------------

type PipelineNodeData = Pick<
  PipelineModule,
  'label' | 'codeName' | 'description' | 'color'
>;

export type PipelineNode = Node<PipelineNodeData, 'pipeline'>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PipelineModuleNode({ data }: NodeProps<PipelineNode>) {
  return (
    <div
      style={{
        width: 160,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        position: 'relative',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border-medium)';
        el.style.transform = 'scale(1.01)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border-subtle)';
        el.style.transform = 'scale(1)';
      }}
    >
      {/* Corner color indicator (8x8) */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 8,
          height: 8,
          borderRadius: 'var(--radius-sm)',
          background: data.color,
        }}
      />

      {/* Primary label */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: 0,
          marginTop: 2,
          lineHeight: 1.3,
        }}
      >
        {data.label}
      </p>

      {/* Code name */}
      <p
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-subtle)',
          margin: '3px 0 0',
          lineHeight: 1.2,
        }}
      >
        {data.codeName}
      </p>

      {/* Description */}
      {data.description && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-subtle)',
            margin: '4px 0 0',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.description}
        </p>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 4,
          height: 4,
          background: 'var(--border-subtle)',
          border: 'none',
          minWidth: 4,
          minHeight: 4,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 4,
          height: 4,
          background: 'var(--border-subtle)',
          border: 'none',
          minWidth: 4,
          minHeight: 4,
        }}
      />
    </div>
  );
}

export default memo(PipelineModuleNode);
