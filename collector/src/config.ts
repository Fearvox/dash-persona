/**
 * Collector configuration store.
 *
 * Persists settings to ~/.dashpersona/config.json using plain fs operations.
 * The schema includes both active Phase 1 fields AND Phase 2 reserved fields
 * (scheduler config) with safe defaults — avoiding a config migration later.
 *
 * Initialize by calling initConfig() in app.whenReady() before server start.
 *
 * @module collector/config
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getDashPersonaDir, getDataDir } from './storage';

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

/**
 * Full configuration schema for the Collector.
 *
 * Phase 1 active: schemaVersion, dataDir, preferences.
 * Phase 2 reserved: scheduler (empty defaults, populated by Phase 2).
 */
export type SchedulerInterval = 'every-6h' | 'every-12h' | 'daily' | 'weekly';

export type RetentionPolicy =
  | { mode: 'count'; maxEntries: number }
  | { mode: 'days'; maxDays: number }
  | { mode: 'all' };

export interface CollectorConfig {
  /** Config format version. Increment on breaking schema changes. */
  schemaVersion: string;

  /** Absolute path to the data directory for snapshot writes. */
  dataDir: string;

  /** User-facing preferences. */
  preferences: {
    /** Whether the Collector opens at system login. */
    openAtLogin: boolean;
  };

  /**
   * Scheduler configuration.
   * Job definitions are persisted separately in ~/.dashpersona/jobs.json.
   */
  scheduler: {
    /** Whether the scheduler is active. */
    enabled: boolean;
    /** Default collection interval for new jobs. */
    defaultInterval: SchedulerInterval;
    /** Default number of posts to collect per creator. */
    postCount: number;
  };

  /** Run log retention configuration. */
  runLog: {
    retention: RetentionPolicy;
  };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function buildDefaults(): CollectorConfig {
  return {
    schemaVersion: '1.0.0',
    dataDir: getDataDir(),
    preferences: {
      openAtLogin: false,
    },
    scheduler: {
      enabled: false,
      defaultInterval: 'daily',
      postCount: 20,
    },
    runLog: {
      retention: { mode: 'count', maxEntries: 500 },
    },
  };
}

// ---------------------------------------------------------------------------
// Config file path
// ---------------------------------------------------------------------------

function getConfigPath(): string {
  return join(getDashPersonaDir(), 'config.json');
}

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

let config: CollectorConfig | null = null;

/**
 * Initialize the config store. Must be called once after app.whenReady().
 * Subsequent calls are no-ops (returns existing config).
 *
 * Reads existing config.json if present, merges with defaults for any
 * missing fields, and writes back to ensure all fields exist on disk.
 *
 * Config is stored at: ~/.dashpersona/config.json
 */
export function initConfig(): CollectorConfig {
  if (config) return config;

  const configPath = getConfigPath();
  const defaults = buildDefaults();

  // Ensure directory exists
  mkdirSync(getDashPersonaDir(), { recursive: true });

  // Try to read existing config
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CollectorConfig>;
    // Merge: existing values override defaults
    config = { ...defaults, ...parsed };
  } catch {
    // File doesn't exist or is invalid — use defaults
    config = defaults;
  }

  // Write back to ensure all fields are present on disk
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(`[collector] Config loaded from: ${configPath}`);
  return config;
}

/**
 * Get the active config.
 * @throws Error if initConfig() has not been called yet.
 */
export function getConfig(): CollectorConfig {
  if (!config) {
    throw new Error('[collector] Config not initialized — call initConfig() first');
  }
  return config;
}

/**
 * Persist a config delta to disk.
 * Merges the provided partial config into the active config and saves.
 *
 * @throws Error if initConfig() has not been called yet.
 */
export function saveConfig(delta: Partial<CollectorConfig>): void {
  const current = getConfig();
  const updated: CollectorConfig = {
    ...current,
    ...delta,
    scheduler: { ...current.scheduler, ...(delta.scheduler ?? {}) },
    runLog: { ...current.runLog, ...(delta.runLog ?? {}) },
    preferences: { ...current.preferences, ...(delta.preferences ?? {}) },
  };
  config = updated;
  writeFileSync(getConfigPath(), JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Convenience: read the data directory path from config.
 * Falls back to the default data dir if config is uninitialized.
 */
export function getConfiguredDataDir(): string {
  try {
    return getConfig().dataDir;
  } catch {
    return getDataDir();
  }
}
