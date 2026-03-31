/**
 * Disk-level snapshot format for persisted creator data.
 *
 * A CreatorSnapshot wraps a CreatorProfile with collection metadata.
 * Files are written to ~/.dashpersona/data/{platform}-{uniqueId}-{ISO8601}.json
 * by the Electron Collector and read by the web app's /api/profiles route.
 *
 * @module schema/snapshot
 */

import type { CreatorProfile, Platform } from './creator-data';
import { validateCreatorProfile } from './validate';

// ---------------------------------------------------------------------------
// Current schema version
// ---------------------------------------------------------------------------

/** Bump when the CreatorSnapshot shape changes in a breaking way. */
export const SNAPSHOT_SCHEMA_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The on-disk JSON format for a persisted creator data snapshot.
 * Wraps CreatorProfile with metadata required for STOR-01 and STOR-03.
 */
export interface CreatorSnapshot {
  /** Schema version for forward-compat checks. Value: "1.0.0". */
  schemaVersion: string;

  /** ISO-8601 timestamp of this collection run (millisecond precision). */
  collectedAt: string;

  /**
   * Platform slug — duplicated from profile.platform for fast filename
   * derivation without deep object access.
   */
  platform: Platform;

  /**
   * Creator handle — duplicated from profile.profile.uniqueId for fast
   * filename derivation without deep object access.
   */
  uniqueId: string;

  /** Full creator data collected during this run. */
  profile: CreatorProfile;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an unknown value as a CreatorSnapshot.
 * Validates wrapper fields AND the nested CreatorProfile.
 */
export function validateCreatorSnapshot(
  data: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, errors: ['Snapshot must be a plain object'] };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.schemaVersion !== 'string' || obj.schemaVersion.length === 0) {
    errors.push('Missing or invalid "schemaVersion" field');
  }
  if (typeof obj.collectedAt !== 'string' || obj.collectedAt.length === 0) {
    errors.push('Missing or invalid "collectedAt" field');
  }
  if (typeof obj.platform !== 'string' || obj.platform.length === 0) {
    errors.push('Missing or invalid "platform" field');
  }
  if (typeof obj.uniqueId !== 'string' || obj.uniqueId.length === 0) {
    errors.push('Missing or invalid "uniqueId" field');
  }

  // Validate nested profile
  const profileResult = validateCreatorProfile(obj.profile);
  if (!profileResult.valid) {
    for (const e of profileResult.errors) {
      errors.push(`profile.${e}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type-guard that narrows unknown to CreatorSnapshot.
 */
export function isCreatorSnapshot(data: unknown): data is CreatorSnapshot {
  return validateCreatorSnapshot(data).valid;
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a platform uniqueId for safe use in a filename.
 * Strips or replaces characters outside [a-zA-Z0-9_-].
 */
export function sanitizeUniqueId(uniqueId: string): string {
  return uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Format an ISO-8601 timestamp for filesystem-safe use in a filename.
 * Converts "2026-03-31T12:34:56.789Z" → "20260331T123456Z"
 * (removes dashes, dots, colons; keeps compact UTC format).
 */
export function formatTimestampForFilename(isoTimestamp: string): string {
  return isoTimestamp.replace(/[-:.]/g, '').replace(/\.\d+Z$/, 'Z');
}

/**
 * Generate the canonical filename for a snapshot.
 *
 * Format: `{platform}-{sanitizedUniqueId}-{compactISO}.json`
 * Example: `tiktok-codeclass_official-20260331T123456Z.json`
 */
export function snapshotFilename(
  platform: string,
  uniqueId: string,
  collectedAt: string,
): string {
  const safePlatform = platform.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  const safeId = sanitizeUniqueId(uniqueId);
  const safeTs = formatTimestampForFilename(collectedAt);
  return `${safePlatform}-${safeId}-${safeTs}.json`;
}
