/**
 * Adapter registry — central place to register, look up, and invoke
 * data adapters.
 *
 * Built-in adapters (demo, manual_import) are registered automatically
 * on module load. Third-party or experimental adapters can be registered
 * at runtime via {@link registerAdapter}.
 *
 * @module adapters/registry
 */

import type { CreatorProfile } from '../schema/creator-data';
import type { DataAdapter, AdapterError } from './types';
import { DemoAdapter } from './demo-adapter';
import { ManualImportAdapter } from './manual-import-adapter';
import { HTMLParseAdapter } from './html-parse-adapter';
import { ExtensionAdapter } from './extension-adapter';
import { FileImportAdapter } from './file-import-adapter';

// ---------------------------------------------------------------------------
// Registry state
// ---------------------------------------------------------------------------

const adapters: Map<string, DataAdapter> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a data adapter. Overwrites any existing adapter with the
 * same `name`.
 */
export function registerAdapter(adapter: DataAdapter): void {
  adapters.set(adapter.name, adapter);
}

/**
 * Retrieve a registered adapter by name.
 */
export function getAdapter(name: string): DataAdapter | undefined {
  return adapters.get(name);
}

/**
 * List all currently registered adapters.
 */
export function listAdapters(): DataAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Attempt to collect a creator profile using the preferred adapter,
 * falling back to other registered adapters on failure.
 *
 * The fallback order is: preferred adapter first (if specified), then
 * all remaining adapters in registration order.
 *
 * @param input - The input string passed to `adapter.collect()`.
 * @param preferredAdapter - Name of the adapter to try first.
 * @returns The first successfully collected profile, or `null` with
 *          an error describing why all adapters failed.
 */
export async function collectWithFallback(
  input: string,
  preferredAdapter?: string,
): Promise<{ profile: CreatorProfile | null; error?: AdapterError }> {
  // Build ordered list: preferred first, then the rest
  const ordered: DataAdapter[] = [];
  if (preferredAdapter) {
    const preferred = adapters.get(preferredAdapter);
    if (preferred) {
      ordered.push(preferred);
    }
  }
  for (const adapter of adapters.values()) {
    if (!ordered.includes(adapter)) {
      ordered.push(adapter);
    }
  }

  if (ordered.length === 0) {
    return {
      profile: null,
      error: {
        adapter: 'registry',
        code: 'UNKNOWN',
        message: 'No adapters registered',
      },
    };
  }

  let lastError: AdapterError | undefined;

  for (const adapter of ordered) {
    try {
      const profile = await adapter.collect(input);
      if (profile) {
        return { profile };
      }
    } catch (err) {
      lastError = toAdapterError(adapter.name, err);
    }
  }

  return {
    profile: null,
    error: lastError ?? {
      adapter: ordered[ordered.length - 1].name,
      code: 'UNKNOWN',
      message: 'All adapters returned null without throwing',
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAdapterError(adapterName: string, err: unknown): AdapterError {
  if (err instanceof Error) {
    // Map known error patterns to codes
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return { adapter: adapterName, code: 'TIMEOUT', message: err.message };
    }
    if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) {
      return { adapter: adapterName, code: 'PARSE_ERROR', message: err.message };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
      return { adapter: adapterName, code: 'NETWORK_ERROR', message: err.message };
    }
    if (msg.includes('blocked') || msg.includes('403') || msg.includes('forbidden')) {
      return { adapter: adapterName, code: 'BLOCKED', message: err.message };
    }
    if (msg.includes('invalid url') || msg.includes('invalid_url')) {
      return { adapter: adapterName, code: 'INVALID_URL', message: err.message };
    }
    return { adapter: adapterName, code: 'UNKNOWN', message: err.message };
  }

  return {
    adapter: adapterName,
    code: 'UNKNOWN',
    message: String(err),
  };
}

// ---------------------------------------------------------------------------
// Auto-register built-in adapters
// ---------------------------------------------------------------------------

registerAdapter(new DemoAdapter());
registerAdapter(new ManualImportAdapter());
registerAdapter(new HTMLParseAdapter());
registerAdapter(new ExtensionAdapter());
registerAdapter(new FileImportAdapter());
