/**
 * IndexedDB persistence for collected CreatorProfile records.
 *
 * Every import or collection operation should call `saveProfiles()` which
 * merges new data with existing profiles and syncs to sessionStorage.
 * The dashboard loads from sessionStorage (fast, sync) with IndexedDB
 * as a fallback for data that survives tab close / browser restart.
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Save profiles by MERGING with existing data. New profiles override
 * existing ones for the same platform key. Also syncs to sessionStorage.
 */
export async function saveProfiles(
  newProfiles: Record<string, CreatorProfile>,
): Promise<void> {
  // Merge with existing
  const existing = await loadProfiles();
  const merged = { ...existing, ...newProfiles };

  // Persist to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(merged, 'current');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable — sessionStorage only
  }

  // Sync to sessionStorage for fast reads
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Load all stored profiles. Tries sessionStorage first (sync, fast),
 * falls back to IndexedDB (async, persistent).
 */
export async function loadProfiles(): Promise<Record<string, CreatorProfile>> {
  // Try sessionStorage first
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CreatorProfile>;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // Parse error — fall through to IndexedDB
  }

  // Fallback to IndexedDB
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
      // Re-sync to sessionStorage
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      } catch { /* ignore */ }
      return result;
    }
  } catch {
    // IndexedDB unavailable
  }

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
