import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHistoryStore,
  resetHistoryStoreCache,
  profileKey,
  MAX_SNAPSHOTS,
} from '../store';
import type { HistorySnapshot } from '../../schema/creator-data';

/**
 * These tests use the in-memory fallback store (no IndexedDB in Node).
 */
beforeEach(() => {
  resetHistoryStoreCache();
});

function makeSnapshot(fetchedAt: string, followers = 1000): HistorySnapshot {
  return {
    fetchedAt,
    profile: { followers, likesTotal: 5000, videosCount: 10 },
  };
}

describe('profileKey', () => {
  it('returns "platform:uniqueId"', () => {
    expect(profileKey('douyin', 'creator123')).toBe('douyin:creator123');
    expect(profileKey('tiktok', '@handle')).toBe('tiktok:@handle');
  });
});

describe('HistoryStore (in-memory)', () => {
  describe('saveSnapshot', () => {
    it('appends to an empty profile', async () => {
      const store = createHistoryStore();
      const key = profileKey('douyin', 'user1');
      const snap = makeSnapshot('2024-01-01T00:00:00Z');

      await store.saveSnapshot(key, snap);

      const snapshots = await store.getSnapshots(key);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].fetchedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('appends to an existing profile', async () => {
      const store = createHistoryStore();
      const key = profileKey('douyin', 'user1');

      await store.saveSnapshot(key, makeSnapshot('2024-01-01T00:00:00Z', 1000));
      await store.saveSnapshot(key, makeSnapshot('2024-01-02T00:00:00Z', 1100));
      await store.saveSnapshot(key, makeSnapshot('2024-01-03T00:00:00Z', 1200));

      const snapshots = await store.getSnapshots(key);
      expect(snapshots).toHaveLength(3);
    });
  });

  describe('getSnapshots', () => {
    it('returns [] for unknown key', async () => {
      const store = createHistoryStore();
      const result = await store.getSnapshots('tiktok:nobody');
      expect(result).toEqual([]);
    });

    it('returns snapshots in chronological (oldest-first) order', async () => {
      const store = createHistoryStore();
      const key = profileKey('tiktok', 'user2');

      // Save in non-chronological order
      await store.saveSnapshot(key, makeSnapshot('2024-03-01T00:00:00Z'));
      await store.saveSnapshot(key, makeSnapshot('2024-01-01T00:00:00Z'));
      await store.saveSnapshot(key, makeSnapshot('2024-02-01T00:00:00Z'));

      const snapshots = await store.getSnapshots(key);
      expect(snapshots[0].fetchedAt).toBe('2024-01-01T00:00:00Z');
      expect(snapshots[1].fetchedAt).toBe('2024-02-01T00:00:00Z');
      expect(snapshots[2].fetchedAt).toBe('2024-03-01T00:00:00Z');
    });
  });

  describe('trim behaviour', () => {
    it('removes oldest snapshots when exceeding MAX_SNAPSHOTS', async () => {
      const store = createHistoryStore();
      const key = profileKey('xhs', 'trimtest');

      // Save MAX_SNAPSHOTS + 2 entries
      const total = MAX_SNAPSHOTS + 2;
      for (let i = 0; i < total; i++) {
        const date = new Date(2020, 0, 1 + i).toISOString();
        await store.saveSnapshot(key, makeSnapshot(date, 1000 + i));
      }

      const snapshots = await store.getSnapshots(key);
      expect(snapshots).toHaveLength(MAX_SNAPSHOTS);

      // Oldest two should have been dropped — newest should remain
      const last = snapshots[snapshots.length - 1];
      const expectedLastDate = new Date(2020, 0, 1 + total - 1).toISOString();
      expect(last.fetchedAt).toBe(expectedLastDate);
    });
  });

  describe('clearProfile', () => {
    it('removes snapshots for only the specified profile', async () => {
      const store = createHistoryStore();
      const key1 = profileKey('douyin', 'alpha');
      const key2 = profileKey('douyin', 'beta');

      await store.saveSnapshot(key1, makeSnapshot('2024-01-01T00:00:00Z'));
      await store.saveSnapshot(key2, makeSnapshot('2024-01-01T00:00:00Z'));

      await store.clearProfile(key1);

      expect(await store.getSnapshots(key1)).toEqual([]);
      expect(await store.getSnapshots(key2)).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('removes all stored snapshots', async () => {
      const store = createHistoryStore();
      const key1 = profileKey('douyin', 'alpha');
      const key2 = profileKey('tiktok', 'beta');

      await store.saveSnapshot(key1, makeSnapshot('2024-01-01T00:00:00Z'));
      await store.saveSnapshot(key2, makeSnapshot('2024-01-01T00:00:00Z'));

      await store.clearAll();

      expect(await store.getSnapshots(key1)).toEqual([]);
      expect(await store.getSnapshots(key2)).toEqual([]);
    });
  });
});
