/**
 * IndexedDB persistence layer for learning events, with an in-memory fallback
 * for environments where IndexedDB is unavailable (e.g. private browsing).
 *
 * @module learning/store
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackingEvent {
  id: string;
  type: 'click' | 'expand' | 'dismiss' | 'view' | 'time_on_section';
  target: string;
  section: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export interface LearningStore {
  trackEvent(event: Omit<TrackingEvent, 'id' | 'timestamp'>): Promise<void>;
  getEvents(since?: number): Promise<TrackingEvent[]>;
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// IndexedDB store
// ---------------------------------------------------------------------------

const DB_NAME = 'dashpersona-learning';
const DB_VERSION = 1;
const STORE_NAME = 'events';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createIndexedDBStore(): LearningStore {
  return {
    async trackEvent(partial) {
      const event: TrackingEvent = {
        ...partial,
        id: generateId(),
        timestamp: Date.now(),
      };
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add(event);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async getEvents(since?: number) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        if (since !== undefined) {
          const index = store.index('timestamp');
          const range = IDBKeyRange.lowerBound(since, false);
          const request = index.getAll(range);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      });
    },

    async clear() {
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

const MAX_IN_MEMORY_EVENTS = 500;

function createInMemoryStore(): LearningStore {
  let events: TrackingEvent[] = [];

  return {
    async trackEvent(partial) {
      const event: TrackingEvent = {
        ...partial,
        id: generateId(),
        timestamp: Date.now(),
      };
      events.push(event);
      // Trim oldest events when over capacity
      if (events.length > MAX_IN_MEMORY_EVENTS) {
        events = events.slice(events.length - MAX_IN_MEMORY_EVENTS);
      }
    },

    async getEvents(since?: number) {
      if (since !== undefined) {
        return events.filter((e) => e.timestamp >= since);
      }
      return [...events];
    },

    async clear() {
      events = [];
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let cachedStore: LearningStore | null = null;

/**
 * Create (or return the cached) learning store instance.
 * Tries IndexedDB first; falls back to in-memory if unavailable.
 */
export function createLearningStore(): LearningStore {
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
export function resetStoreCache(): void {
  cachedStore = null;
}
