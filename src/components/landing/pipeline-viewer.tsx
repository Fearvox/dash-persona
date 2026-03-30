'use client';

import { useState, useEffect, useMemo, useCallback, Component } from 'react';
import type { ReactNode } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk.bundled.js';

import {
  PIPELINE_MODULES,
  PIPELINE_ROUTES,
} from '@/lib/pipeline/pipeline-config';
import PipelineModuleNode from './pipeline-nodes';
import type { PipelineNode } from './pipeline-nodes';
import PipelineSkeleton from './pipeline-skeleton';

// ---------------------------------------------------------------------------
// ELK layout
// ---------------------------------------------------------------------------

const elk = new ELK();

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;

interface LayoutResult {
  nodes: PipelineNode[];
  width: number;
  height: number;
}

async function computeLayout(): Promise<LayoutResult> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    },
    children: PIPELINE_MODULES.map((m) => ({
      id: m.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: PIPELINE_ROUTES.map((r, i) => ({
      id: `elk-e-${i}`,
      sources: [r.from],
      targets: [r.to],
    })),
  };

  const laid = await elk.layout(graph);

  const nodes = (laid.children ?? []).map((child) => {
    const mod = PIPELINE_MODULES.find((m) => m.id === child.id)!;
    return {
      id: child.id,
      type: 'pipeline' as const,
      position: { x: child.x ?? 0, y: child.y ?? 0 },
      data: {
        label: mod.label,
        codeName: mod.codeName,
        description: mod.description,
        color: mod.color,
      },
    };
  });

  return {
    nodes,
    width: laid.width ?? 800,
    height: laid.height ?? 600,
  };
}

// ---------------------------------------------------------------------------
// Edge factory
// ---------------------------------------------------------------------------

function buildEdges(): Edge[] {
  return PIPELINE_ROUTES.map((r, i) => ({
    id: `e-${i}`,
    source: r.from,
    target: r.to,
    animated: true,
    style: {
      stroke: r.color,
      strokeWidth: 1.5,
    },
  }));
}

// ---------------------------------------------------------------------------
// Error boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PipelineErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <PipelineSkeleton />;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Node types (stable reference)
// ---------------------------------------------------------------------------

const nodeTypes = { pipeline: PipelineModuleNode };

// ---------------------------------------------------------------------------
// Inner viewer (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

function PipelineFlow({ standalone }: { standalone: boolean }) {
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const edges = useMemo(buildEdges, []);

  const runLayout = useCallback(async () => {
    try {
      const result = await computeLayout();
      setLayout(result);
    } catch {
      // If elkjs fails, leave null so skeleton stays visible
    }
  }, []);

  useEffect(() => {
    runLayout();
  }, [runLayout]);

  if (!layout) {
    return <PipelineSkeleton />;
  }

  // Use computed graph dimensions + padding for the container
  const containerHeight = standalone ? '100vh' : `${Math.max(layout.height + 80, 600)}px`;

  return (
    <div
      className="w-full relative"
      style={{
        height: containerHeight,
        padding: standalone ? 24 : 0,
      }}
    >
      <ReactFlow
        nodes={layout.nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.85 }}
        minZoom={0.3}
        maxZoom={2}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        preventScrolling={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported wrapper
// ---------------------------------------------------------------------------

interface PipelineViewerProps {
  standalone?: boolean;
}

export default function PipelineViewer({ standalone = false }: PipelineViewerProps) {
  return (
    <PipelineErrorBoundary>
      <ReactFlowProvider>
        <PipelineFlow standalone={standalone} />
      </ReactFlowProvider>
    </PipelineErrorBoundary>
  );
}
