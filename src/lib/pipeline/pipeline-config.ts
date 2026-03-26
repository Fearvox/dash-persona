import { t } from '@/lib/i18n';

export interface PipelineModule {
  id: string;
  label: string;           // Human-readable (e.g., "Collects your profile")
  codeName: string;        // Technical name (e.g., "HTMLParseAdapter")
  category: 'input' | 'adapter' | 'schema' | 'engine' | 'output';
  description: string;     // One-line description
  color: string;           // CSS variable reference
}

export interface PipelineRoute {
  from: string;
  to: string;
  color: string;
}

/** Build pipeline modules with localized labels/descriptions. */
function buildModules(): PipelineModule[] {
  const m = (id: string, codeName: string, category: PipelineModule['category'], color: string): PipelineModule => ({
    id,
    label: t(`pipeline.${id}.label`),
    codeName,
    category,
    description: t(`pipeline.${id}.desc`),
    color,
  });

  return [
    // Inputs (4)
    m('in-douyin', 'Douyin', 'input', 'var(--accent-blue)'),
    m('in-tiktok', 'TikTok', 'input', 'var(--accent-blue)'),
    m('in-xhs', 'Red Note', 'input', 'var(--accent-blue)'),
    m('in-manual', 'JSON / CSV', 'input', 'var(--accent-blue)'),
    // Schema validation (1)
    m('schema', 'CreatorDataSchema', 'schema', 'var(--accent-highlight)'),
    // Adapters (3)
    m('adapter-demo', 'DemoAdapter', 'adapter', 'var(--accent-yellow)'),
    m('adapter-html', 'HTMLParseAdapter', 'adapter', 'var(--accent-yellow)'),
    m('adapter-manual', 'ManualImportAdapter', 'adapter', 'var(--accent-yellow)'),
    // Engine modules (9) — must match src/lib/engine/index.ts exports
    m('eng-growth', 'growth.ts', 'engine', 'var(--accent-green)'),
    m('eng-persona', 'persona.ts', 'engine', 'var(--accent-green)'),
    m('eng-comparator', 'comparator.ts', 'engine', 'var(--accent-green)'),
    m('eng-benchmark', 'benchmark.ts', 'engine', 'var(--accent-green)'),
    m('eng-strategy', 'strategy.ts', 'engine', 'var(--accent-green)'),
    m('eng-explain', 'explain.ts', 'engine', 'var(--accent-green)'),
    m('eng-planner', 'content-planner.ts', 'engine', 'var(--accent-green)'),
    m('eng-tree', 'persona-tree.ts', 'engine', 'var(--accent-green)'),
    m('eng-ideas', 'idea-generator.ts', 'engine', 'var(--accent-green)'),
    // Outputs (5)
    m('out-dashboard', '/dashboard', 'output', 'var(--accent-highlight)'),
    m('out-persona', '/persona', 'output', 'var(--accent-highlight)'),
    m('out-calendar', '/calendar', 'output', 'var(--accent-highlight)'),
    m('out-timeline', '/timeline', 'output', 'var(--accent-highlight)'),
    m('out-compare', '/compare', 'output', 'var(--accent-highlight)'),
  ];
}

export const PIPELINE_MODULES: PipelineModule[] = buildModules();

// Routes: input->schema, schema->adapters, adapters->engines, engines->outputs
export const PIPELINE_ROUTES: PipelineRoute[] = [
  // All inputs -> schema
  ...['in-douyin', 'in-tiktok', 'in-xhs', 'in-manual'].map(id => ({ from: id, to: 'schema', color: 'var(--accent-blue)' })),
  // Schema -> all adapters
  ...['adapter-demo', 'adapter-html', 'adapter-manual'].map(id => ({ from: 'schema', to: id, color: 'var(--accent-highlight)' })),
  // All adapters -> all engines (fan-out)
  ...['adapter-demo', 'adapter-html', 'adapter-manual'].flatMap(adapter =>
    ['eng-growth', 'eng-persona', 'eng-comparator', 'eng-benchmark', 'eng-strategy', 'eng-explain', 'eng-planner', 'eng-tree', 'eng-ideas'].map(eng => ({
      from: adapter, to: eng, color: 'var(--accent-yellow)',
    }))
  ),
  // Engines -> relevant outputs
  { from: 'eng-growth', to: 'out-dashboard', color: 'var(--accent-green)' },
  { from: 'eng-persona', to: 'out-persona', color: 'var(--accent-green)' },
  { from: 'eng-persona', to: 'out-dashboard', color: 'var(--accent-green)' },
  { from: 'eng-comparator', to: 'out-compare', color: 'var(--accent-green)' },
  { from: 'eng-comparator', to: 'out-dashboard', color: 'var(--accent-green)' },
  { from: 'eng-planner', to: 'out-calendar', color: 'var(--accent-green)' },
  { from: 'eng-tree', to: 'out-timeline', color: 'var(--accent-green)' },
  { from: 'eng-ideas', to: 'out-timeline', color: 'var(--accent-green)' },
  { from: 'eng-strategy', to: 'out-dashboard', color: 'var(--accent-green)' },
  { from: 'eng-benchmark', to: 'out-compare', color: 'var(--accent-green)' },
  { from: 'eng-explain', to: 'out-persona', color: 'var(--accent-green)' },
  { from: 'eng-explain', to: 'out-dashboard', color: 'var(--accent-green)' },
];

// Category metadata for visual grouping
export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  input: { label: t('pipeline.category.input'), color: 'var(--accent-blue)' },
  schema: { label: t('pipeline.category.schema'), color: 'var(--accent-highlight)' },
  adapter: { label: t('pipeline.category.adapter'), color: 'var(--accent-yellow)' },
  engine: { label: t('pipeline.category.engine'), color: 'var(--accent-green)' },
  output: { label: t('pipeline.category.output'), color: 'var(--accent-highlight)' },
};
