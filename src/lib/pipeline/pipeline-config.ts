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

export const PIPELINE_MODULES: PipelineModule[] = [
  // Inputs (4)
  { id: 'in-douyin', label: 'Douyin Profile URL', codeName: 'Douyin', category: 'input', description: 'Chinese short-video platform', color: 'var(--accent-blue)' },
  { id: 'in-tiktok', label: 'TikTok Profile URL', codeName: 'TikTok', category: 'input', description: 'Global short-video platform', color: 'var(--accent-blue)' },
  { id: 'in-xhs', label: 'Red Note Profile URL', codeName: 'Red Note', category: 'input', description: 'Lifestyle sharing platform', color: 'var(--accent-blue)' },
  { id: 'in-manual', label: 'Manual Import', codeName: 'JSON / CSV', category: 'input', description: 'Upload your own data', color: 'var(--accent-blue)' },

  // Schema validation (1)
  { id: 'schema', label: 'Data Validation', codeName: 'CreatorDataSchema', category: 'schema', description: 'Validates and normalizes all inputs', color: 'var(--accent-highlight)' },

  // Adapters (3)
  { id: 'adapter-demo', label: 'Demo Data', codeName: 'DemoAdapter', category: 'adapter', description: 'Built-in sample datasets', color: 'var(--accent-yellow)' },
  { id: 'adapter-html', label: 'Profile Scraper', codeName: 'HTMLParseAdapter', category: 'adapter', description: 'Extracts data from public pages', color: 'var(--accent-yellow)' },
  { id: 'adapter-manual', label: 'File Importer', codeName: 'ManualImportAdapter', category: 'adapter', description: 'Parses uploaded JSON/CSV', color: 'var(--accent-yellow)' },

  // Engine modules (9) — must match src/lib/engine/index.ts exports
  { id: 'eng-growth', label: 'Growth Analysis', codeName: 'growth.ts', category: 'engine', description: 'Delta calculations, sparklines, trends', color: 'var(--accent-green)' },
  { id: 'eng-persona', label: 'Persona Scoring', codeName: 'persona.ts', category: 'engine', description: 'Content mix, engagement, rhythm, consistency', color: 'var(--accent-green)' },
  { id: 'eng-comparator', label: 'Cross-Platform Compare', codeName: 'comparator.ts', category: 'engine', description: 'Unified metrics across platforms', color: 'var(--accent-green)' },
  { id: 'eng-benchmark', label: 'Benchmark Analysis', codeName: 'benchmark.ts', category: 'engine', description: 'Compare against reference creators', color: 'var(--accent-green)' },
  { id: 'eng-strategy', label: 'Strategy Engine', codeName: 'strategy.ts', category: 'engine', description: 'Rule-based content suggestions', color: 'var(--accent-green)' },
  { id: 'eng-explain', label: 'Score Explanation', codeName: 'explain.ts', category: 'engine', description: 'Human-readable score breakdowns', color: 'var(--accent-green)' },
  { id: 'eng-planner', label: 'Content Planner', codeName: 'content-planner.ts', category: 'engine', description: 'Optimal posting schedule', color: 'var(--accent-green)' },
  { id: 'eng-tree', label: 'Persona Timeline', codeName: 'persona-tree.ts', category: 'engine', description: 'Experiment decision tree', color: 'var(--accent-green)' },
  { id: 'eng-ideas', label: 'Idea Generator', codeName: 'idea-generator.ts', category: 'engine', description: 'Data-driven experiment suggestions', color: 'var(--accent-green)' },

  // Outputs (5)
  { id: 'out-dashboard', label: 'Dashboard', codeName: '/dashboard', category: 'output', description: 'Growth overview + metrics', color: 'var(--accent-highlight)' },
  { id: 'out-persona', label: 'Persona Detail', codeName: '/persona', category: 'output', description: 'Dimension breakdown + tags', color: 'var(--accent-highlight)' },
  { id: 'out-calendar', label: 'Content Calendar', codeName: '/calendar', category: 'output', description: 'Publishing schedule', color: 'var(--accent-highlight)' },
  { id: 'out-timeline', label: 'Persona Timeline', codeName: '/timeline', category: 'output', description: 'Experiment decision tree', color: 'var(--accent-highlight)' },
  { id: 'out-compare', label: 'Cross-Platform Compare', codeName: '/compare', category: 'output', description: 'Side-by-side analysis', color: 'var(--accent-highlight)' },
];

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
  input: { label: 'Data Sources', color: 'var(--accent-blue)' },
  schema: { label: 'Validation', color: 'var(--accent-highlight)' },
  adapter: { label: 'Adapters', color: 'var(--accent-yellow)' },
  engine: { label: 'Analysis Engine', color: 'var(--accent-green)' },
  output: { label: 'Output Views', color: 'var(--accent-highlight)' },
};
