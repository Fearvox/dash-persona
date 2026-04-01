import { t } from '@/lib/i18n';

export interface PipelineModule {
  id: string;
  /** i18n key suffix for the label (e.g. "in-douyin" → t("pipeline.in-douyin.label")) */
  labelKey: string;
  codeName: string;        // Technical name (e.g., "HTMLParseAdapter")
  category: 'input' | 'adapter' | 'schema' | 'engine' | 'output';
  /** i18n key suffix for the description (e.g. "in-douyin" → t("pipeline.in-douyin.desc")) */
  descKey: string;
  color: string;           // CSS variable reference
}

export interface PipelineRoute {
  from: string;
  to: string;
  color: string;
}

/** Build pipeline modules. i18n keys (labelKey/descKey) are stored here;
 *  actual label/description strings are resolved at render time in
 *  PipelineModuleNode so they respect the current locale. */
function buildModules(): PipelineModule[] {
  const m = (id: string, codeName: string, category: PipelineModule['category'], color: string): PipelineModule => ({
    id,
    labelKey: `pipeline.${id}.label`,
    codeName,
    category,
    descKey: `pipeline.${id}.desc`,
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

// Category metadata for visual grouping — keys resolved at render time
export const CATEGORY_META: Record<string, { labelKey: string; color: string }> = {
  input: { labelKey: 'pipeline.category.input', color: 'var(--accent-blue)' },
  schema: { labelKey: 'pipeline.category.schema', color: 'var(--accent-highlight)' },
  adapter: { labelKey: 'pipeline.category.adapter', color: 'var(--accent-yellow)' },
  engine: { labelKey: 'pipeline.category.engine', color: 'var(--accent-green)' },
  output: { labelKey: 'pipeline.category.output', color: 'var(--accent-highlight)' },
};
