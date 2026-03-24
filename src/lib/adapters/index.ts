// Adapter types
export type { DataAdapter, AdapterError } from './types';

// Demo adapter
export { DemoAdapter, getDemoProfile, DEMO_PROFILES } from './demo-adapter';
export type { DemoPersonaType } from './demo-adapter';

// Manual import adapter
export { ManualImportAdapter, ManualImportError } from './manual-import-adapter';
export type { ManualImportErrorCode } from './manual-import-adapter';

// HTML parse adapter (TikTok)
export { HTMLParseAdapter, parseTikTokProfile, isTikTokUrl } from './html-parse-adapter';

// Registry
export {
  registerAdapter,
  getAdapter,
  listAdapters,
  collectWithFallback,
} from './registry';
