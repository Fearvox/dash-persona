/**
 * Unified profile persistence and loading for DashPersona.
 *
 * This module is the SINGLE SOURCE OF TRUTH for creator profile data.
 * All pages must use `resolveProfiles()` to load data — no per-page
 * loading chains.
 *
 * Data priority (highest to lowest):
 *   1. IndexedDB (persistent, survives tab close + browser restart)
 *   2. /api/profiles (Electron Collector filesystem data)
 *   3. Empty → redirect to onboarding
 *
 * sessionStorage is used ONLY as a performance cache to speed up
 * synchronous reads. It is never a primary data source.
 *
 * When data is imported/collected, callers must use `saveProfiles()`
 * which writes to IndexedDB and syncs the sessionStorage cache.
 *
 * @module store/profile-store
 */

import type { CreatorProfile } from '../schema/creator-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Extended return type from resolveProfiles() carrying source metadata
 * alongside profiles. Enables downstream UI to render source-aware
 * badges, banners, and error cards.
 */
export interface ResolvedProfiles {
  profiles: Record<string, CreatorProfile>;
  source: 'real' | 'demo' | 'error' | 'empty';
  collectedAt?: string;  // ISO-8601 from newest snapshot (when source === 'real')
  reason?: string;       // Human-readable explanation (demo/error)
  code?: string;         // Machine-readable error code (error only)
}

/** Metadata stored separately in IndexedDB alongside profile data. */
interface SourceMeta {
  source: 'real' | 'demo' | 'error';
  collectedAt?: string;
  reason?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'dashpersona-profiles';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const SESSION_KEY = 'dashpersona-import-profiles';

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Internal: read directly from IndexedDB (bypasses sessionStorage)
// ---------------------------------------------------------------------------

async function readFromIndexedDB(): Promise<{
  profiles: Record<string, CreatorProfile>;
  meta: SourceMeta | null;
}> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const profilesReq = store.get('current');
    const metaReq = store.get('current-meta');

    const [profiles, meta] = await new Promise<
      [Record<string, CreatorProfile> | undefined, SourceMeta | undefined]
    >((resolve, reject) => {
      tx.oncomplete = () =>
        resolve([
          profilesReq.result as Record<string, CreatorProfile> | undefined,
          metaReq.result as SourceMeta | undefined,
        ]);
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    if (profiles && typeof profiles === 'object' && Object.keys(profiles).length > 0) {
      return { profiles, meta: meta ?? null };
    }
  } catch {
    // IndexedDB unavailable
  }
  return { profiles: {}, meta: null };
}

// ---------------------------------------------------------------------------
// Internal: write to IndexedDB
// ---------------------------------------------------------------------------

async function writeToIndexedDB(
  profiles: Record<string, CreatorProfile>,
  meta?: SourceMeta,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(profiles, 'current');
    if (meta) {
      store.put(meta, 'current-meta');
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}

// ---------------------------------------------------------------------------
// Internal: sessionStorage cache helpers
// ---------------------------------------------------------------------------

function readSessionCache(): ResolvedProfiles | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Backward compat: old format stored bare Record<string, CreatorProfile>
      if (parsed && typeof parsed === 'object') {
        if ('source' in parsed && 'profiles' in parsed) {
          // New format with metadata
          const rp = parsed as unknown as ResolvedProfiles;
          if (rp.profiles && typeof rp.profiles === 'object' && Object.keys(rp.profiles).length > 0) {
            return rp;
          }
        } else if (Object.keys(parsed).length > 0) {
          // Old format: bare profiles record — wrap with default source
          return {
            profiles: parsed as unknown as Record<string, CreatorProfile>,
            source: 'real' as const,
          };
        }
      }
    }
  } catch {
    // Parse error or unavailable
  }
  return null;
}

function writeSessionCache(resolved: ResolvedProfiles): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(resolved));
  } catch {
    // sessionStorage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Internal: fetch from collector API and persist to store
// ---------------------------------------------------------------------------

interface SnapshotLike {
  platform: string;
  collectedAt?: string;
  profile: CreatorProfile;
}

interface ApiResponse {
  source: 'real' | 'demo' | 'error';
  profiles: SnapshotLike[];
  reason?: string;
  code?: string;
}

async function fetchAndPersistCollectorData(): Promise<ResolvedProfiles> {
  try {
    const res = await fetch('/api/profiles');
    const data = (await res.json()) as ApiResponse;

    if (data.source === 'real' && Array.isArray(data.profiles) && data.profiles.length > 0) {
      const loaded: Record<string, CreatorProfile> = {};
      for (const snap of data.profiles) {
        // Snapshots are sorted newest-first. Keep the first (newest) per platform.
        if (loaded[snap.platform]) continue;
        const p = snap.profile;
        if (!p.profileUrl) p.profileUrl = 'https://creator.douyin.com';
        loaded[snap.platform] = p;
      }
      const collectedAt = data.profiles[0]?.collectedAt;
      const result: ResolvedProfiles = {
        profiles: loaded,
        source: 'real',
        collectedAt,
      };
      // Persist collector data to IndexedDB so it survives navigation
      await saveProfiles(loaded, { source: 'real', collectedAt });
      return result;
    }

    if (data.source === 'demo') {
      const loaded: Record<string, CreatorProfile> = {};
      if (Array.isArray(data.profiles)) {
        for (const p of data.profiles as unknown as CreatorProfile[]) {
          if (p.platform) {
            loaded[p.platform] = p;
          }
        }
      }
      return {
        profiles: loaded,
        source: 'demo',
        reason: data.reason,
      };
    }

    if (data.source === 'error') {
      return {
        profiles: {},
        source: 'error',
        reason: data.reason,
        code: data.code,
      };
    }
  } catch {
    // API unavailable — fall through
  }
  return {
    profiles: {},
    source: 'error' as const,
    reason: 'Could not reach the data service',
    code: 'FETCH_ERROR',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save profiles by MERGING with existing data. New profiles override
 * existing ones for the same platform key. Writes to IndexedDB (persistent)
 * and syncs sessionStorage cache.
 *
 * @param meta Optional source metadata to persist alongside profiles.
 */
export async function saveProfiles(
  newProfiles: Record<string, CreatorProfile>,
  meta?: SourceMeta,
): Promise<void> {
  // Merge with existing IndexedDB data (not sessionStorage — IndexedDB is truth)
  const existing = await readFromIndexedDB();
  const merged = { ...existing.profiles, ...newProfiles };

  // Persist to IndexedDB (with meta if provided)
  await writeToIndexedDB(merged, meta);

  // Sync sessionStorage cache
  const resolvedMeta = meta ?? existing.meta;
  writeSessionCache({
    profiles: merged,
    source: resolvedMeta?.source ?? 'real',
    collectedAt: resolvedMeta?.collectedAt,
    reason: resolvedMeta?.reason,
    code: resolvedMeta?.code,
  });
}

/**
 * Load all stored profiles. Tries sessionStorage first (sync, fast),
 * falls back to IndexedDB (async, persistent).
 *
 * This is a low-level read. Prefer `resolveProfiles()` for page-level
 * loading which also checks the collector API.
 *
 * Returns bare `Record<string, CreatorProfile>` for backward compat
 * with page loaders that haven't migrated to ResolvedProfiles yet.
 */
export async function loadProfiles(): Promise<Record<string, CreatorProfile>> {
  // Try sessionStorage cache first (fast path)
  const cached = readSessionCache();
  if (cached) return cached.profiles;

  // Fall back to IndexedDB
  const stored = await readFromIndexedDB();
  if (Object.keys(stored.profiles).length > 0) {
    // Re-sync sessionStorage cache
    writeSessionCache({
      profiles: stored.profiles,
      source: stored.meta?.source ?? 'real',
      collectedAt: stored.meta?.collectedAt,
      reason: stored.meta?.reason,
      code: stored.meta?.code,
    });
    return stored.profiles;
  }

  return {};
}

/**
 * Unified profile resolver — the SINGLE entry point for all pages.
 *
 * Checks all data sources in priority order:
 *   1. sessionStorage cache (fast, sync)
 *   2. IndexedDB (persistent)
 *   3. /api/profiles (Electron Collector filesystem data)
 *
 * Returns a ResolvedProfiles object carrying source metadata (source,
 * collectedAt, reason, code) alongside the profile map. Returns
 * `{ profiles: {}, source: 'empty' }` only when no data exists anywhere.
 */
export async function resolveProfiles(): Promise<ResolvedProfiles> {
  // 1. sessionStorage cache (fast path — avoids async for repeat visits)
  const cached = readSessionCache();
  if (cached) return cached;

  // 2. IndexedDB (persistent store — survives tab close)
  const stored = await readFromIndexedDB();
  if (Object.keys(stored.profiles).length > 0) {
    const resolved: ResolvedProfiles = {
      profiles: stored.profiles,
      source: stored.meta?.source ?? 'real',
      collectedAt: stored.meta?.collectedAt,
      reason: stored.meta?.reason,
      code: stored.meta?.code,
    };
    writeSessionCache(resolved);
    return resolved;
  }

  // 3. /api/profiles (Electron Collector data from filesystem)
  const collector = await fetchAndPersistCollectorData();
  if (Object.keys(collector.profiles).length > 0) {
    return collector;
  }

  // Return metadata from collector even if profiles empty (e.g. error/demo info)
  if (collector.source !== 'error' || collector.code) {
    return collector;
  }

  // No real data found anywhere
  return { profiles: {}, source: 'empty' };
}

/**
 * Clear all stored profiles (for explicit user action only).
 */
export async function clearProfiles(): Promise<void> {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('current');
    store.delete('current-meta');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}
