/**
 * Run log persistence for DashPersona Collector.
 *
 * Maintains a history of all collection runs (manual and scheduled) at
 * ~/.dashpersona/run-log.json. Supports configurable retention policies
 * with a confirmation gate before any data is pruned.
 *
 * The log is an append-only array of RunLogEntry objects. Full atomic
 * rewrites are used (load -> push -> atomicWriteJSON) which is safe up to
 * ~1000 entries x 300 bytes = ~300KB.
 *
 * @module collector/run-log
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { dialog } from 'electron';
import { atomicWriteJSON, getDashPersonaDir } from './storage';
import type { RetentionPolicy } from './config';
import type { Platform } from './snapshot-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunLogStatus = 'success' | 'failed' | 'captcha' | 'skipped';

export interface RunLogError {
  code: string;
  message: string;
  remediation: string;
}

export interface RunLogEntry {
  /** UUID, for deduplication and external reference. */
  id: string;
  /** ISO8601 timestamp of when the run completed. */
  timestamp: string;
  creatorUniqueId: string;
  platform: Platform;
  status: RunLogStatus;
  /** Total duration of the collection run in milliseconds. */
  durationMs: number;
  /** Snapshot filename written on success — omitted on failure. */
  snapshotFile?: string;
  /** Error details — present only when status is 'failed' or 'captcha'. */
  error?: RunLogError;
}

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------

function getRunLogPath(): string {
  return join(getDashPersonaDir(), 'run-log.json');
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load all run log entries from disk.
 * Returns an empty array if the file does not exist or cannot be parsed.
 */
export async function loadRunLog(): Promise<RunLogEntry[]> {
  try {
    const raw = await readFile(getRunLogPath(), 'utf-8');
    return JSON.parse(raw) as RunLogEntry[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/**
 * Append a new entry to the run log.
 *
 * Performs a full atomic rewrite (load -> push -> atomicWriteJSON).
 * Safe for files up to ~1000 entries. Re-evaluate for Phase 4+ if needed.
 *
 * @param entryInput - All fields except `id` (auto-generated) and `timestamp` (auto-set if absent)
 */
export async function appendRunLog(
  entryInput: Omit<RunLogEntry, 'id' | 'timestamp'> & { timestamp?: string },
): Promise<RunLogEntry> {
  const entry: RunLogEntry = {
    id: randomUUID(),
    timestamp: entryInput.timestamp ?? new Date().toISOString(),
    creatorUniqueId: entryInput.creatorUniqueId,
    platform: entryInput.platform,
    status: entryInput.status,
    durationMs: entryInput.durationMs,
    ...(entryInput.snapshotFile !== undefined
      ? { snapshotFile: entryInput.snapshotFile }
      : {}),
    ...(entryInput.error !== undefined ? { error: entryInput.error } : {}),
  };

  const entries = await loadRunLog();
  entries.push(entry);
  await atomicWriteJSON(getRunLogPath(), entries);
  return entry;
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

export interface RetentionResult {
  kept: RunLogEntry[];
  removed: RunLogEntry[];
}

/**
 * Compute which entries to keep and which to remove given a retention policy.
 * Does NOT write to disk — call pruneRunLog() to commit.
 */
export function applyRetention(
  entries: RunLogEntry[],
  policy: RetentionPolicy,
): RetentionResult {
  if (policy.mode === 'all') {
    return { kept: entries, removed: [] };
  }

  if (policy.mode === 'count') {
    if (entries.length <= policy.maxEntries) {
      return { kept: entries, removed: [] };
    }
    const kept = entries.slice(-policy.maxEntries);
    const removed = entries.slice(0, entries.length - policy.maxEntries);
    return { kept, removed };
  }

  // mode === 'days'
  const cutoffMs = Date.now() - policy.maxDays * 86_400_000;
  const kept = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoffMs);
  const removed = entries.filter((e) => new Date(e.timestamp).getTime() < cutoffMs);
  return { kept, removed };
}

// ---------------------------------------------------------------------------
// Prune with confirmation dialog
// ---------------------------------------------------------------------------

/**
 * Apply retention policy to the run log, showing a confirmation dialog
 * before deleting any entries.
 *
 * Per D-13: user must confirm before any data is deleted.
 *
 * @returns true if pruning was confirmed and executed, false if cancelled
 */
export async function pruneRunLog(policy: RetentionPolicy): Promise<boolean> {
  const entries = await loadRunLog();
  const { kept, removed } = applyRetention(entries, policy);

  if (removed.length === 0) {
    return true;
  }

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Purge old entries?',
    message: 'Purge old entries?',
    detail: [
      `This will permanently delete ${removed.length} ${removed.length === 1 ? 'entry' : 'entries'}.`,
      `This cannot be undone.`,
      ``,
      `Retained entries: ${kept.length}`,
      `Entries to delete: ${removed.length}`,
    ].join('\n'),
    buttons: [`Delete ${removed.length} ${removed.length === 1 ? 'entry' : 'entries'}`, 'Keep all'],
    defaultId: 1,
    cancelId: 1,
  });

  if (response !== 0) {
    return false;
  }

  await atomicWriteJSON(getRunLogPath(), kept);
  return true;
}

// ---------------------------------------------------------------------------
// Auto-prune (called after each append — silent, no dialog)
// ---------------------------------------------------------------------------

/**
 * Silently apply retention policy after an append if the entry count
 * exceeds the threshold. Does NOT show a dialog — used for automatic
 * background maintenance. Only activates for count-based policies.
 */
export async function autoTrimIfNeeded(policy: RetentionPolicy): Promise<void> {
  if (policy.mode === 'all') return;
  if (policy.mode === 'days') return;

  const entries = await loadRunLog();
  const threshold = policy.maxEntries * 2;
  if (entries.length <= threshold) return;

  const { kept } = applyRetention(entries, policy);
  await atomicWriteJSON(getRunLogPath(), kept);
}
