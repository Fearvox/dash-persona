/**
 * Runtime validation helpers for {@link CreatorProfile}.
 *
 * These functions provide cheap, synchronous validation suitable for
 * ingestion boundaries (API routes, file imports, extension messages).
 * They do **not** depend on a schema library -- the checks are hand-rolled
 * to avoid adding a runtime dependency for a handful of invariants.
 *
 * @module schema/validate
 */

import type { CreatorProfile } from './creator-data';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Return `true` if `v` is a plain object (not null, not array). */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Assert a field exists and matches the expected type. */
function requireField(
  obj: Record<string, unknown>,
  field: string,
  type: 'string' | 'number' | 'object' | 'boolean',
  errors: string[],
): void {
  if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
    errors.push(`Missing required field "${field}"`);
    return;
  }
  if (type === 'object') {
    if (!isObject(obj[field])) {
      errors.push(`Field "${field}" must be an object`);
    }
  } else if (typeof obj[field] !== type) {
    errors.push(`Field "${field}" must be of type ${type}, got ${typeof obj[field]}`);
  }
}

/** Assert a numeric field is a non-negative finite number. */
function requireNonNegativeNumber(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  const v = obj[field];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    errors.push(`Field "${field}" must be a non-negative number`);
  }
}

// ---------------------------------------------------------------------------
// Post validation
// ---------------------------------------------------------------------------

function validatePost(post: unknown, index: number, errors: string[]): void {
  const prefix = `posts[${index}]`;
  if (!isObject(post)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (typeof post.postId !== 'string' || post.postId.length === 0) {
    errors.push(`${prefix}.postId must be a non-empty string`);
  }
  if (typeof post.desc !== 'string') {
    errors.push(`${prefix}.desc must be a string`);
  }
  for (const metric of ['views', 'likes', 'comments', 'shares', 'saves'] as const) {
    if (typeof post[metric] !== 'number' || !Number.isFinite(post[metric] as number)) {
      errors.push(`${prefix}.${metric} must be a finite number`);
    }
  }
}

// ---------------------------------------------------------------------------
// ProfileInfo validation
// ---------------------------------------------------------------------------

function validateProfileInfo(profile: unknown, errors: string[]): void {
  if (!isObject(profile)) {
    errors.push('"profile" must be an object');
    return;
  }
  if (typeof profile.nickname !== 'string' || profile.nickname.length === 0) {
    errors.push('"profile.nickname" must be a non-empty string');
  }
  if (typeof profile.uniqueId !== 'string' || profile.uniqueId.length === 0) {
    errors.push('"profile.uniqueId" must be a non-empty string');
  }
  requireNonNegativeNumber(profile, 'followers', errors);
  requireNonNegativeNumber(profile, 'likesTotal', errors);
  requireNonNegativeNumber(profile, 'videosCount', errors);
}

// ---------------------------------------------------------------------------
// HistorySnapshot validation
// ---------------------------------------------------------------------------

function validateHistorySnapshot(snap: unknown, index: number, errors: string[]): void {
  const prefix = `history[${index}]`;
  if (!isObject(snap)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (typeof snap.fetchedAt !== 'string' || snap.fetchedAt.length === 0) {
    errors.push(`${prefix}.fetchedAt must be a non-empty ISO-8601 string`);
  }
  if (!isObject(snap.profile)) {
    errors.push(`${prefix}.profile must be an object`);
    return;
  }
  const sp = snap.profile as Record<string, unknown>;
  requireNonNegativeNumber(sp, 'followers', errors);
  requireNonNegativeNumber(sp, 'likesTotal', errors);
  requireNonNegativeNumber(sp, 'videosCount', errors);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate that an unknown value conforms to the {@link CreatorProfile} shape.
 *
 * @returns An object with `valid: true` and an empty `errors` array on
 *          success, or `valid: false` with a human-readable list of issues.
 */
export function validateCreatorProfile(
  data: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['Input must be a plain object'] };
  }

  // Top-level scalar fields
  requireField(data, 'platform', 'string', errors);
  requireField(data, 'profileUrl', 'string', errors);
  requireField(data, 'fetchedAt', 'string', errors);
  requireField(data, 'source', 'string', errors);

  // ProfileInfo
  validateProfileInfo(data.profile, errors);

  // Posts array
  if (!Array.isArray(data.posts)) {
    errors.push('"posts" must be an array');
  } else {
    for (let i = 0; i < data.posts.length; i++) {
      validatePost(data.posts[i], i, errors);
    }
  }

  // Optional history array
  if (data.history !== undefined && data.history !== null) {
    if (!Array.isArray(data.history)) {
      errors.push('"history" must be an array when present');
    } else {
      for (let i = 0; i < data.history.length; i++) {
        validateHistorySnapshot(data.history[i], i, errors);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type-guard that narrows `unknown` to {@link CreatorProfile}.
 *
 * Use at ingestion boundaries where you need a typed value and want to
 * discard invalid payloads silently.
 *
 * @example
 * ```ts
 * const raw = JSON.parse(body);
 * if (isCreatorProfile(raw)) {
 *   const score = computePersonaScore(raw);
 * }
 * ```
 */
export function isCreatorProfile(data: unknown): data is CreatorProfile {
  return validateCreatorProfile(data).valid;
}
