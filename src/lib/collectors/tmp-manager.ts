/**
 * Temporary file storage manager for dash-persona.
 *
 * Manages trending data, screenshots, and analysis results under a shared
 * OS temp directory with automatic 15-day expiry and a 500 MB storage cap.
 *
 * @module collectors/tmp-manager
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TMP_ROOT = path.join(os.tmpdir(), 'dash-persona');
const RETENTION_DAYS = 15;
const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB

const SUBDIRS = {
  raw: 'raw',
  screenshot: 'shots',
  analysis: 'analysis',
} as const;

const META_PATH = path.join(TMP_ROOT, 'meta.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TmpFileMeta {
  id: string;
  path: string;           // relative to TMP_ROOT
  type: 'raw' | 'screenshot' | 'analysis';
  createdAt: string;      // ISO-8601
  expiresAt: string;      // ISO-8601
  platform: string;
  sizeBytes: number;
}

interface MetaStore {
  version: 1;
  files: TmpFileMeta[];
  totalSizeBytes: number;
  lastCleanup: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ensureDirs(): void {
  fs.mkdirSync(path.join(TMP_ROOT, 'raw'), { recursive: true });
  fs.mkdirSync(path.join(TMP_ROOT, 'shots'), { recursive: true });
  fs.mkdirSync(path.join(TMP_ROOT, 'analysis'), { recursive: true });
}

function loadMeta(): MetaStore {
  try {
    const raw = fs.readFileSync(META_PATH, 'utf8');
    return JSON.parse(raw) as MetaStore;
  } catch {
    return {
      version: 1,
      files: [],
      totalSizeBytes: 0,
      lastCleanup: new Date().toISOString(),
    };
  }
}

function saveMeta(meta: MetaStore): void {
  ensureDirs();
  const tmp = META_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8');
  fs.renameSync(tmp, META_PATH);
}

/**
 * Build a deterministic file ID from its constituent parts.
 * Format: `{type}-{platform}-{label}-{YYYYMMDD-HHmmss}`
 */
function buildId(
  type: 'raw' | 'screenshot' | 'analysis',
  platform: string,
  label: string,
  now: Date,
): string {
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  const timestamp = [
    String(now.getFullYear()),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  // Sanitise platform and label so they are safe in file names.
  const safe = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${type}-${safe(platform)}-${safe(label)}-${timestamp}`;
}

/**
 * Add a new entry to the meta store and persist it.
 * Also prunes entries whose backing file no longer exists.
 */
function registerFile(entry: TmpFileMeta): void {
  const meta = loadMeta();

  // Remove stale entries whose files were manually deleted.
  meta.files = meta.files.filter((f) => {
    const abs = path.join(TMP_ROOT, f.path);
    return fs.existsSync(abs);
  });

  // Recalculate total to stay consistent with any manual deletions.
  meta.totalSizeBytes = meta.files.reduce((sum, f) => sum + f.sizeBytes, 0);

  meta.files.push(entry);
  meta.totalSizeBytes += entry.sizeBytes;

  saveMeta(meta);
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

/**
 * Save arbitrary JSON data to the `raw/` or `analysis/` subdirectory.
 *
 * The file is written as pretty-printed JSON and tracked in `meta.json`.
 * Returns the metadata record for the saved file.
 */
export function saveJsonData(
  data: unknown,
  options: { type: 'raw' | 'analysis'; platform: string; label: string },
): TmpFileMeta {
  ensureDirs();

  const now = new Date();
  const id = buildId(options.type, options.platform, options.label, now);
  const subdir = SUBDIRS[options.type];
  const filename = `${id}.json`;
  const relativePath = path.join(subdir, filename);
  const absPath = path.join(TMP_ROOT, relativePath);

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(absPath, content, 'utf8');

  const sizeBytes = Buffer.byteLength(content, 'utf8');
  const expiresAt = new Date(
    now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const entry: TmpFileMeta = {
    id,
    path: relativePath,
    type: options.type,
    createdAt: now.toISOString(),
    expiresAt,
    platform: options.platform,
    sizeBytes,
  };

  registerFile(entry);
  return entry;
}

/**
 * Save a PNG screenshot buffer to the `shots/` subdirectory.
 *
 * Returns the metadata record for the saved file.
 */
export function saveScreenshot(
  buffer: Buffer,
  options: { platform: string; label: string },
): TmpFileMeta {
  ensureDirs();

  const now = new Date();
  const id = buildId('screenshot', options.platform, options.label, now);
  const filename = `${id}.png`;
  const relativePath = path.join('shots', filename);
  const absPath = path.join(TMP_ROOT, relativePath);

  fs.writeFileSync(absPath, buffer);

  const sizeBytes = buffer.byteLength;
  const expiresAt = new Date(
    now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const entry: TmpFileMeta = {
    id,
    path: relativePath,
    type: 'screenshot',
    createdAt: now.toISOString(),
    expiresAt,
    platform: options.platform,
    sizeBytes,
  };

  registerFile(entry);
  return entry;
}

/**
 * Load a previously saved JSON file by its tracking ID.
 *
 * Returns `null` if the ID is unknown or the backing file has been deleted.
 */
export function loadJsonData<T = unknown>(id: string): T | null {
  const meta = loadMeta();
  const entry = meta.files.find((f) => f.id === id);
  if (!entry) return null;

  const absPath = path.join(TMP_ROOT, entry.path);
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Load a previously saved screenshot as a `Buffer` by its tracking ID.
 *
 * Returns `null` if the ID is unknown or the backing file has been deleted.
 */
export function loadScreenshot(id: string): Buffer | null {
  const meta = loadMeta();
  const entry = meta.files.find((f) => f.id === id);
  if (!entry) return null;

  const absPath = path.join(TMP_ROOT, entry.path);
  try {
    return fs.readFileSync(absPath);
  } catch {
    return null;
  }
}

/**
 * Resolve the absolute filesystem path for a tracked file by its ID.
 *
 * Returns `null` if the ID is unknown.
 */
export function getFilePath(id: string): string | null {
  const meta = loadMeta();
  const entry = meta.files.find((f) => f.id === id);
  if (!entry) return null;
  return path.join(TMP_ROOT, entry.path);
}

/**
 * Return all tracked file records, optionally filtered to a single type.
 */
export function listFiles(type?: TmpFileMeta['type']): TmpFileMeta[] {
  const meta = loadMeta();
  if (type === undefined) return meta.files;
  return meta.files.filter((f) => f.type === type);
}

/**
 * Delete expired files and, if storage still exceeds the cap, delete the
 * oldest files first until usage is within the limit.
 *
 * Returns the number of files deleted and total bytes freed.
 */
export function cleanupExpired(): { deleted: number; freedBytes: number } {
  const meta = loadMeta();
  const now = new Date();

  let deleted = 0;
  let freedBytes = 0;

  // Phase 1: remove entries past their expiry date.
  const surviving: TmpFileMeta[] = [];
  for (const entry of meta.files) {
    if (new Date(entry.expiresAt) < now) {
      const absPath = path.join(TMP_ROOT, entry.path);
      try {
        fs.unlinkSync(absPath);
      } catch {
        // File may already be gone — count it as deleted regardless.
      }
      deleted++;
      freedBytes += entry.sizeBytes;
    } else {
      surviving.push(entry);
    }
  }

  // Phase 2: if still over cap, evict oldest-first.
  let currentBytes = surviving.reduce((sum, f) => sum + f.sizeBytes, 0);

  if (currentBytes > MAX_STORAGE_BYTES) {
    // Sort ascending by createdAt so oldest come first.
    surviving.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    while (surviving.length > 0 && currentBytes > MAX_STORAGE_BYTES) {
      const oldest = surviving.shift()!;
      const absPath = path.join(TMP_ROOT, oldest.path);
      try {
        fs.unlinkSync(absPath);
      } catch {
        // Already gone.
      }
      currentBytes -= oldest.sizeBytes;
      deleted++;
      freedBytes += oldest.sizeBytes;
    }
  }

  meta.files = surviving;
  meta.totalSizeBytes = surviving.reduce((sum, f) => sum + f.sizeBytes, 0);
  meta.lastCleanup = now.toISOString();
  saveMeta(meta);

  return { deleted, freedBytes };
}

/**
 * Return a summary of current storage usage.
 */
export function getStorageStats(): {
  totalFiles: number;
  totalSizeBytes: number;
  byType: Record<string, { count: number; sizeBytes: number }>;
  oldestFile: string | null;
  newestFile: string | null;
} {
  const meta = loadMeta();
  const files = meta.files;

  const byType: Record<string, { count: number; sizeBytes: number }> = {};
  for (const f of files) {
    if (!byType[f.type]) {
      byType[f.type] = { count: 0, sizeBytes: 0 };
    }
    byType[f.type].count++;
    byType[f.type].sizeBytes += f.sizeBytes;
  }

  let oldestFile: string | null = null;
  let newestFile: string | null = null;

  if (files.length > 0) {
    let oldest = files[0];
    let newest = files[0];

    for (const f of files) {
      if (new Date(f.createdAt) < new Date(oldest.createdAt)) oldest = f;
      if (new Date(f.createdAt) > new Date(newest.createdAt)) newest = f;
    }

    oldestFile = oldest.id;
    newestFile = newest.id;
  }

  return {
    totalFiles: files.length,
    totalSizeBytes: meta.totalSizeBytes,
    byType,
    oldestFile,
    newestFile,
  };
}

/**
 * Return the absolute path to the shared temp root directory.
 *
 * Useful for external tooling that needs to reference the directory directly.
 */
export function getTmpRoot(): string {
  return TMP_ROOT;
}
