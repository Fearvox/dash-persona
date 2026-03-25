// Adapter types
export type { DataAdapter, AdapterError } from './types';

// Demo adapter
export { DemoAdapter, getDemoProfile, DEMO_PROFILES } from './demo-adapter';
export type { DemoPersonaType } from './demo-adapter';

// Manual import adapter
export { ManualImportAdapter, ManualImportError } from './manual-import-adapter';
export type { ManualImportErrorCode } from './manual-import-adapter';

// HTML parse adapter (TikTok + XHS)
export {
  HTMLParseAdapter,
  parseTikTokProfile,
  parseXhsProfile,
  parseProfileHtml,
  detectPlatformFromUrl,
  detectPlatformFromHtml,
  isTikTokUrl,
  isXhsUrl,
} from './html-parse-adapter';

// Browser adapter (bb-browser CLI)
export { BrowserAdapter, BrowserAdapterError, execBrowser, parseBrowserOutput } from './browser-adapter';
export type { BrowserAdapterErrorCode } from './browser-adapter';

// Registry
export {
  registerAdapter,
  getAdapter,
  listAdapters,
  collectWithFallback,
} from './registry';
