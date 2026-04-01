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

async function readFromIndexedDB(): Promise<Record<string, CreatorProfile>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current');
    const result = await new Promise<Record<string, CreatorProfile> | undefined>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Record<string, CreatorProfile> | undefined);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();

    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return result;
    }
  } catch {
    // IndexedDB unavailable
  }
  return {};
}

// ---------------------------------------------------------------------------
// Internal: write to IndexedDB
// ---------------------------------------------------------------------------

async function writeToIndexedDB(profiles: Record<string, CreatorProfile>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(profiles, 'current');
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

function readSessionCache(): Record<string, CreatorProfile> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CreatorProfile>;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // Parse error or unavailable
  }
  return null;
}

function writeSessionCache(profiles: Record<string, CreatorProfile>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(profiles));
  } catch {
    // sessionStorage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Internal: fetch from collector API and persist to store
// ---------------------------------------------------------------------------

interface SnapshotLike {
  platform: string;
  profile: CreatorProfile;
}

async function fetchAndPersistCollectorData(): Promise<Record<string, CreatorProfile>> {
  try {
    const res = await fetch('/api/profiles');
    const data = await res.json() as { source: string; profiles: SnapshotLike[] };
    if (data.source === 'real' && Array.isArray(data.profiles) && data.profiles.length > 0) {
      const loaded: Record<string, CreatorProfile> = {};
      for (const snap of data.profiles) {
        // Snapshots are sorted newest-first. Keep the first (newest) per platform.
        if (loaded[snap.platform]) continue;
        const p = snap.profile;
        if (!p.profileUrl) p.profileUrl = 'https://creator.douyin.com';
        loaded[snap.platform] = p;
      }
      // Persist collector data to IndexedDB so it survives navigation
      await saveProfiles(loaded);
      return loaded;
    }
  } catch {
    // API unavailable — fall through
  }
  return {};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save profiles by MERGING with existing data. New profiles override
 * existing ones for the same platform key. Writes to IndexedDB (persistent)
 * and syncs sessionStorage cache.
 */
export async function saveProfiles(
  newProfiles: Record<string, CreatorProfile>,
): Promise<void> {
  // Merge with existing IndexedDB data (not sessionStorage — IndexedDB is truth)
  const existing = await readFromIndexedDB();
  const merged = { ...existing, ...newProfiles };

  // Persist to IndexedDB
  await writeToIndexedDB(merged);

  // Sync sessionStorage cache
  writeSessionCache(merged);
}

/**
 * Load all stored profiles. Tries sessionStorage first (sync, fast),
 * falls back to IndexedDB (async, persistent).
 *
 * This is a low-level read. Prefer `resolveProfiles()` for page-level
 * loading which also checks the collector API.
 */
export async function loadProfiles(): Promise<Record<string, CreatorProfile>> {
  // Try sessionStorage cache first (fast path)
  const cached = readSessionCache();
  if (cached) return cached;

  // Fall back to IndexedDB
  const stored = await readFromIndexedDB();
  if (Object.keys(stored).length > 0) {
    // Re-sync sessionStorage cache
    writeSessionCache(stored);
    return stored;
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
 * When data is found from any source, it is persisted to IndexedDB
 * and synced to sessionStorage. Returns an empty object only when
 * no real data exists anywhere.
 *
 * Pages should show demo data ONLY when this returns an empty record.
 */
export async function resolveProfiles(): Promise<Record<string, CreatorProfile>> {
  // 1. sessionStorage cache (fast path — avoids async for repeat visits)
  const cached = readSessionCache();
  if (cached) return cached;

  // 2. IndexedDB (persistent store — survives tab close)
  const stored = await readFromIndexedDB();
  if (Object.keys(stored).length > 0) {
    writeSessionCache(stored);
    return stored;
  }

  // 3. /api/profiles (Electron Collector data from filesystem)
  const collector = await fetchAndPersistCollectorData();
  if (Object.keys(collector).length > 0) {
    return collector;
  }

  // No real data found anywhere
  return {};
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
    tx.objectStore(STORE_NAME).delete('current');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}
