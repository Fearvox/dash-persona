/**
 * Storage utilities for the DashPersona Collector.
 *
 * Handles atomic JSON writes to ~/.dashpersona/data/ and directory
 * initialization. The atomic write pattern (tmp file + rename) ensures
 * no partial writes reach the data directory even on crash or power loss.
 * On macOS APFS, fs.rename within the same directory is atomic.
 *
 * @module collector/storage
 */

import { writeFile, rename, mkdir, readdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Directory layout
// ---------------------------------------------------------------------------

/** Root directory for all DashPersona user data. */
export function getDashPersonaDir(): string {
  return join(homedir(), '.dashpersona');
}

/** Directory where snapshot JSON files are written. */
export function getDataDir(): string {
  return join(getDashPersonaDir(), 'data');
}

// ---------------------------------------------------------------------------
// Error classification for write operations
// ---------------------------------------------------------------------------

export interface StorageError {
  error: string;
  code: string;
  /** Actionable guidance for the user — suitable for a GitHub issue report. */
  remediation: string;
}

/**
 * Classify a filesystem error into a typed StorageError with
 * actionable remediation guidance.
 */
export function classifyStorageError(err: unknown, context: string): StorageError {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as NodeJS.ErrnoException).code ?? '';

  if (code === 'EACCES' || code === 'EPERM') {
    return {
      error: `Permission denied writing to ${context}`,
      code: 'WRITE_PERMISSION_DENIED',
      remediation:
        'Check that ~/.dashpersona/data/ is owned by your user and has write permissions (chmod 755).',
    };
  }
  if (code === 'ENOSPC') {
    return {
      error: 'Disk full — could not write snapshot',
      code: 'WRITE_DISK_FULL',
      remediation: 'Free up disk space and retry collection.',
    };
  }
  if (message.includes('rename') || code === 'EXDEV') {
    return {
      error: `Atomic rename failed writing to ${context}`,
      code: 'WRITE_ATOMIC_RENAME_FAILED',
      remediation:
        'Ensure the tmp directory and data directory are on the same filesystem. Contact support if this persists.',
    };
  }
  if (message.includes('mkdir') || code === 'ENOENT') {
    return {
      error: `Could not create data directory ${context}`,
      code: 'WRITE_DIR_CREATE_FAILED',
      remediation:
        'Ensure ~/.dashpersona/ is accessible and your user has write permissions to the home directory.',
    };
  }
  if (message.includes('JSON') || message.includes('circular') || message.includes('BigInt')) {
    return {
      error: 'Profile data could not be serialized to JSON',
      code: 'WRITE_SERIALIZE_FAILED',
      remediation:
        'This is likely a bug in the Collector. Please file a GitHub issue with the creator URL.',
    };
  }
  return {
    error: `Snapshot write failed: ${message}`,
    code: 'WRITE_INTERNAL_ERROR',
    remediation:
      'An unexpected error occurred. Please file a GitHub issue with the error message above.',
  };
}

// ---------------------------------------------------------------------------
// Directory initialization
// ---------------------------------------------------------------------------

/**
 * Ensure ~/.dashpersona/data/ exists.
 * Safe to call multiple times — mkdir recursive is idempotent.
 * Also cleans up any orphaned .tmp-*.json files left by crashed writes.
 */
export async function ensureDataDir(): Promise<void> {
  const dataDir = getDataDir();
  await mkdir(dataDir, { recursive: true });
  await cleanOrphanedTmpFiles(dataDir);
}

/**
 * Remove any .tmp-*.json orphan files left by previously crashed writes.
 * These are safe to delete since a rename has not yet occurred.
 */
async function cleanOrphanedTmpFiles(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return; // dir may not exist yet — ensureDataDir handles that
  }
  const orphans = entries.filter((f) => f.startsWith('.tmp-') && f.endsWith('.json'));
  await Promise.all(
    orphans.map((f) =>
      unlink(join(dir, f)).catch(() => {
        /* ignore individual delete failures */
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Atomic write
// ---------------------------------------------------------------------------

/**
 * Write `data` to `filePath` atomically using the tmp-then-rename pattern.
 *
 * 1. Ensures the target directory exists.
 * 2. Writes JSON to a temp file (`.tmp-{uuid}.json`) in the same directory.
 * 3. Renames tmp → final path (atomic on APFS/HFS+).
 *
 * @throws StorageError-shaped object on any failure
 */
export async function atomicWriteJSON(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath);

  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    throw classifyStorageError(err, dir);
  }

  let json: string;
  try {
    json = JSON.stringify(data, null, 2);
  } catch (err) {
    throw classifyStorageError(err, filePath);
  }

  const tmpPath = join(dir, `.tmp-${randomUUID()}.json`);

  try {
    await writeFile(tmpPath, json, 'utf-8');
  } catch (err) {
    // Clean up tmp file if write failed
    await unlink(tmpPath).catch(() => {});
    throw classifyStorageError(err, dir);
  }

  try {
    await rename(tmpPath, filePath);
  } catch (err) {
    // Clean up tmp file if rename failed
    await unlink(tmpPath).catch(() => {});
    throw classifyStorageError(err, filePath);
  }
}
