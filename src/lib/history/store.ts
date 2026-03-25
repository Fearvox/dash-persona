/**
 * IndexedDB persistence layer for growth history snapshots, with an in-memory
 * fallback for environments where IndexedDB is unavailable (e.g. SSR, tests).
 *
 * @module history/store
 */

import type { HistorySnapshot } from '../schema/creator-data';
import type { AnalysisSnapshot } from './analysis-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_SNAPSHOTS = 365;
const MAX_ANALYSIS_SNAPSHOTS = 100;

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
  // Analysis snapshot methods
  saveAnalysisSnapshot(key: string, snapshot: AnalysisSnapshot): Promise<void>;
  getLastAnalysis(key: string): Promise<AnalysisSnapshot | null>;
  getAnalysisHistory(key: string): Promise<AnalysisSnapshot[]>;
}

/** Shape of a record stored in IndexedDB. */
interface HistoryRecord {
  key: string;
  snapshots: HistorySnapshot[];
}

/** Shape of an analysis record stored in IndexedDB. */
interface AnalysisRecord {
  key: string;
  snapshots: AnalysisSnapshot[];
}

// ---------------------------------------------------------------------------
// IndexedDB store
// ---------------------------------------------------------------------------

const DB_NAME = 'dashpersona-history';
const DB_VERSION = 2;
const STORE_NAME = 'snapshots';
const ANALYSIS_STORE_NAME = 'analysis';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(ANALYSIS_STORE_NAME)) {
        db.createObjectStore(ANALYSIS_STORE_NAME, { keyPath: 'key' });
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
        const tx = db.transaction([STORE_NAME, ANALYSIS_STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.objectStore(ANALYSIS_STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async saveAnalysisSnapshot(key, snapshot) {
      const db = await openDB();

      const existing = await new Promise<AnalysisRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(ANALYSIS_STORE_NAME, 'readonly');
        const req = tx.objectStore(ANALYSIS_STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result as AnalysisRecord | undefined);
        req.onerror = () => reject(req.error);
      });

      const snapshots = existing ? [...existing.snapshots, snapshot] : [snapshot];
      const trimmed = snapshots.length > MAX_ANALYSIS_SNAPSHOTS
        ? snapshots.slice(snapshots.length - MAX_ANALYSIS_SNAPSHOTS)
        : snapshots;

      const record: AnalysisRecord = { key, snapshots: trimmed };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(ANALYSIS_STORE_NAME, 'readwrite');
        tx.objectStore(ANALYSIS_STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async getLastAnalysis(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(ANALYSIS_STORE_NAME, 'readonly');
        const req = tx.objectStore(ANALYSIS_STORE_NAME).get(key);
        req.onsuccess = () => {
          const record = req.result as AnalysisRecord | undefined;
          if (!record || record.snapshots.length === 0) {
            resolve(null);
            return;
          }
          // Return the most recent snapshot
          const sorted = [...record.snapshots].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
          resolve(sorted[0]);
        };
        req.onerror = () => reject(req.error);
      });
    },

    async getAnalysisHistory(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(ANALYSIS_STORE_NAME, 'readonly');
        const req = tx.objectStore(ANALYSIS_STORE_NAME).get(key);
        req.onsuccess = () => {
          const record = req.result as AnalysisRecord | undefined;
          if (!record) {
            resolve([]);
            return;
          }
          const sorted = [...record.snapshots].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
          resolve(sorted);
        };
        req.onerror = () => reject(req.error);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

function createInMemoryStore(): HistoryStore {
  const data = new Map<string, HistorySnapshot[]>();
  const analysisData = new Map<string, AnalysisSnapshot[]>();

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
      analysisData.delete(key);
    },

    async clearAll() {
      data.clear();
      analysisData.clear();
    },

    async saveAnalysisSnapshot(key, snapshot) {
      const existing = analysisData.get(key) ?? [];
      const updated = [...existing, snapshot];
      const trimmed = updated.length > MAX_ANALYSIS_SNAPSHOTS
        ? updated.slice(updated.length - MAX_ANALYSIS_SNAPSHOTS)
        : updated;
      analysisData.set(key, trimmed);
    },

    async getLastAnalysis(key) {
      const snapshots = analysisData.get(key);
      if (!snapshots || snapshots.length === 0) return null;
      const sorted = [...snapshots].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      return sorted[0];
    },

    async getAnalysisHistory(key) {
      const snapshots = analysisData.get(key);
      if (!snapshots) return [];
      return [...snapshots].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
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
