'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Component } from 'react';
import type { ReactNode } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  PanOnScrollMode,
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
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// ELK layout
// ---------------------------------------------------------------------------

const elk = new ELK();

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;

type LayoutDirection = 'DOWN' | 'RIGHT';

interface LayoutResult {
  nodes: PipelineNode[];
  width: number;
  height: number;
  direction: LayoutDirection;
}

async function computeLayout(direction: LayoutDirection): Promise<LayoutResult> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': direction === 'RIGHT' ? '40' : '60',
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

  const isHorizontal = direction === 'RIGHT';
  const nodes = (laid.children ?? []).map((child) => {
    const mod = PIPELINE_MODULES.find((m) => m.id === child.id)!;
    return {
      id: child.id,
      type: 'pipeline' as const,
      position: { x: child.x ?? 0, y: child.y ?? 0 },
      data: {
        labelKey: mod.labelKey,
        descKey: mod.descKey,
        codeName: mod.codeName,
        color: mod.color,
        horizontal: isHorizontal,
      },
    };
  });

  return {
    nodes,
    width: laid.width ?? 800,
    height: laid.height ?? 600,
    direction,
  };
}

// ---------------------------------------------------------------------------
// Breakpoint hook
// ---------------------------------------------------------------------------

const HORIZONTAL_BREAKPOINT = 1024;

function useLayoutDirection(): LayoutDirection {
  const [dir, setDir] = useState<LayoutDirection>(
    typeof window !== 'undefined' && window.innerWidth >= HORIZONTAL_BREAKPOINT
      ? 'RIGHT'
      : 'DOWN',
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${HORIZONTAL_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setDir(e.matches ? 'RIGHT' : 'DOWN');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return dir;
}

// ---------------------------------------------------------------------------
// Scroll indicators
// ---------------------------------------------------------------------------

function ScrollIndicators({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 48,
          height: '100%',
          background: 'linear-gradient(to right, var(--bg-primary), transparent)',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0.8,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 48,
          height: '100%',
          background: 'linear-gradient(to left, var(--bg-primary), transparent)',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0.8,
        }}
      />
    </>
  );
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
  const direction = useLayoutDirection();
  const edges = useMemo(buildEdges, []);
  const containerRef = useRef<HTMLDivElement>(null);

  const runLayout = useCallback(async (dir: LayoutDirection) => {
    try {
      const result = await computeLayout(dir);
      setLayout(result);
    } catch {
      // If elkjs fails, leave null so skeleton stays visible
    }
  }, []);

  useEffect(() => {
    runLayout(direction);
  }, [runLayout, direction]);

  // Horizontal wheel → pan on wide screens
  useEffect(() => {
    const el = containerRef.current;
    if (!el || direction !== 'RIGHT') return;

    const handleWheel = (e: WheelEvent) => {
      // Only intercept vertical scroll when pipeline is focused/hovered
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaX === 0) {
        // ReactFlow handles its own pan — no extra transform needed
        // but we prevent page scroll while hovering the pipeline
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [direction]);

  if (!layout) {
    return <PipelineSkeleton />;
  }

  const isHorizontal = layout.direction === 'RIGHT';

  // Horizontal: shorter height, let width expand; Vertical: use graph height
  const containerHeight = standalone
    ? '100vh'
    : isHorizontal
      ? `${Math.max(layout.height + 80, 400)}px`
      : `${Math.max(layout.height + 80, 600)}px`;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Pipeline visualization"
      className="w-full relative outline-none"
      style={{
        height: containerHeight,
        padding: standalone ? 24 : 0,
      }}
    >
      <ScrollIndicators show={isHorizontal} />
      <ReactFlow
        nodes={layout.nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: isHorizontal ? 0.1 : 0.15,
          maxZoom: isHorizontal ? 0.75 : 0.85,
        }}
        minZoom={0.3}
        maxZoom={2}
        panOnDrag
        panOnScroll={isHorizontal}
        panOnScrollMode={isHorizontal ? PanOnScrollMode.Horizontal : undefined}
        zoomOnScroll={!isHorizontal}
        zoomOnPinch
        preventScrolling={isHorizontal}
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
