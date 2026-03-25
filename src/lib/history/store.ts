/**
 * IndexedDB persistence layer for growth history snapshots, with an in-memory
 * fallback for environments where IndexedDB is unavailable (e.g. SSR, tests).
 *
 * @module history/store
 */

import type { HistorySnapshot } from '../schema/creator-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_SNAPSHOTS = 365;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Produces a canonical storage key for a creator profile.
 */
export function profileKey(platform: string, uniqueId: string): string {
  return `${platform}:${uniqueId}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryStore {
  saveSnapshot(key: string, snapshot: HistorySnapshot): Promise<void>;
  getSnapshots(key: string): Promise<HistorySnapshot[]>;
  clearProfile(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

/** Shape of a record stored in IndexedDB. */
interface HistoryRecord {
  key: string;
  snapshots: HistorySnapshot[];
}

// ---------------------------------------------------------------------------
// IndexedDB store
// ---------------------------------------------------------------------------

const DB_NAME = 'dashpersona-history';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createIndexedDBStore(): HistoryStore {
  return {
    async saveSnapshot(key, snapshot) {
      const db = await openDB();

      // Load existing record
      const existing = await new Promise<HistoryRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result as HistoryRecord | undefined);
        req.onerror = () => reject(req.error);
      });

      const snapshots = existing ? [...existing.snapshots, snapshot] : [snapshot];

      // Trim to MAX_SNAPSHOTS (remove oldest)
      const trimmed = snapshots.length > MAX_SNAPSHOTS
        ? snapshots.slice(snapshots.length - MAX_SNAPSHOTS)
        : snapshots;

      const record: HistoryRecord = { key, snapshots: trimmed };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async getSnapshots(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => {
          const record = req.result as HistoryRecord | undefined;
          if (!record) {
            resolve([]);
            return;
          }
          // Return sorted oldest-first
          const sorted = [...record.snapshots].sort(
            (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
          );
          resolve(sorted);
        };
        req.onerror = () => reject(req.error);
      });
    },

    async clearProfile(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async clearAll() {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

function createInMemoryStore(): HistoryStore {
  const data = new Map<string, HistorySnapshot[]>();

  return {
    async saveSnapshot(key, snapshot) {
      const existing = data.get(key) ?? [];
      const updated = [...existing, snapshot];
      const trimmed = updated.length > MAX_SNAPSHOTS
        ? updated.slice(updated.length - MAX_SNAPSHOTS)
        : updated;
      data.set(key, trimmed);
    },

    async getSnapshots(key) {
      const snapshots = data.get(key);
      if (!snapshots) return [];
      return [...snapshots].sort(
        (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
      );
    },

    async clearProfile(key) {
      data.delete(key);
    },

    async clearAll() {
      data.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let cachedStore: HistoryStore | null = null;

/**
 * Create (or return the cached) history store instance.
 * Tries IndexedDB first; falls back to in-memory if unavailable.
 */
export function createHistoryStore(): HistoryStore {
  if (cachedStore) return cachedStore;

  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined' &&
      window.indexedDB !== null
    ) {
      cachedStore = createIndexedDBStore();
    } else {
      cachedStore = createInMemoryStore();
    }
  } catch {
    cachedStore = createInMemoryStore();
  }

  return cachedStore;
}

/**
 * Reset the cached store (useful for testing).
 */
export function resetHistoryStoreCache(): void {
  cachedStore = null;
}
