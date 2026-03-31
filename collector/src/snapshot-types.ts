/**
 * Snapshot types and utilities for the Collector (CJS-compatible copy).
 *
 * This file re-declares CreatorProfile, CreatorSnapshot, and helpers that
 * are also defined in src/lib/schema/ (root Next.js app). It exists because
 * the collector uses its own tsconfig ("module": "commonjs", include: src/**)
 * and cannot directly import from the root src/ tree.
 *
 * KEEP IN SYNC with: src/lib/schema/creator-data.ts, src/lib/schema/snapshot.ts
 *
 * @module collector/snapshot-types
 */

// ---------------------------------------------------------------------------
// Minimal CreatorProfile subset (enough for validation and wrapping)
// ---------------------------------------------------------------------------

export type Platform = 'douyin' | 'tiktok' | 'xhs' | (string & {});
export type DataSource = 'demo' | 'html_parse' | 'manual_import' | 'extension' | 'browser' | 'cdp' | 'collector';

export interface ProfileInfo {
  nickname: string;
  uniqueId: string;
  avatarUrl?: string;
  followers: number;
  likesTotal: number;
  videosCount: number;
  bio?: string;
}

export interface Post {
  postId: string;
  desc: string;
  publishedAt?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  completionRate?: number;
  bounceRate?: number;
  avgWatchDuration?: number;
  tags?: string[];
  contentType?: string;
}

export interface HistorySnapshot {
  fetchedAt: string;
  profile: {
    followers: number;
    likesTotal: number;
    videosCount: number;
  };
}

export interface CreatorProfile {
  platform: Platform;
  profileUrl: string;
  fetchedAt: string;
  source: DataSource;
  profile: ProfileInfo;
  posts: Post[];
  history?: HistorySnapshot[];
  fanPortrait?: unknown;
}

// ---------------------------------------------------------------------------
// CreatorSnapshot
// ---------------------------------------------------------------------------

/** Bump when the on-disk snapshot shape changes in a breaking way. */
export const SNAPSHOT_SCHEMA_VERSION = '1.0.0';

export interface CreatorSnapshot {
  schemaVersion: string;
  collectedAt: string;
  platform: Platform;
  uniqueId: string;
  profile: CreatorProfile;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateCreatorSnapshot(
  data: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Snapshot must be a plain object'] };
  }

  if (typeof data.schemaVersion !== 'string' || data.schemaVersion.length === 0) {
    errors.push('Missing or invalid "schemaVersion"');
  }
  if (typeof data.collectedAt !== 'string' || data.collectedAt.length === 0) {
    errors.push('Missing or invalid "collectedAt"');
  }
  if (typeof data.platform !== 'string' || data.platform.length === 0) {
    errors.push('Missing or invalid "platform"');
  }
  if (typeof data.uniqueId !== 'string' || data.uniqueId.length === 0) {
    errors.push('Missing or invalid "uniqueId"');
  }

  // Validate nested profile (minimal checks)
  if (!isObject(data.profile)) {
    errors.push('"profile" must be a plain object');
  } else {
    const p = data.profile;
    if (typeof p.platform !== 'string') errors.push('profile.platform must be a string');
    if (typeof p.profileUrl !== 'string') errors.push('profile.profileUrl must be a string');
    if (typeof p.fetchedAt !== 'string') errors.push('profile.fetchedAt must be a string');
    if (typeof p.source !== 'string') errors.push('profile.source must be a string');
    if (!isObject(p.profile)) {
      errors.push('profile.profile must be a plain object');
    } else {
      const info = p.profile as Record<string, unknown>;
      if (typeof info.nickname !== 'string' || info.nickname.length === 0) {
        errors.push('profile.profile.nickname must be a non-empty string');
      }
      if (typeof info.uniqueId !== 'string' || info.uniqueId.length === 0) {
        errors.push('profile.profile.uniqueId must be a non-empty string');
      }
    }
    if (!Array.isArray(p.posts)) errors.push('profile.posts must be an array');
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

export function sanitizeUniqueId(uniqueId: string): string {
  return uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function formatTimestampForFilename(isoTimestamp: string): string {
  return isoTimestamp.replace(/[-:.]/g, '').replace(/\.\d+Z$/, 'Z');
}

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
