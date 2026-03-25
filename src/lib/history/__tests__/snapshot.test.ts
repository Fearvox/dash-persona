import { describe, it, expect } from 'vitest';
import { extractSnapshot, mergeHistory, profileKeyFromProfile } from '../snapshot';
import { MAX_SNAPSHOTS } from '../store';
import type { CreatorProfile, HistorySnapshot } from '../../schema/creator-data';

function makeProfile(overrides?: Partial<CreatorProfile>): CreatorProfile {
  return {
    platform: 'douyin',
    profileUrl: 'https://www.douyin.com/user/test',
    fetchedAt: '2024-06-15T12:00:00Z',
    source: 'demo',
    profile: {
      nickname: 'Test Creator',
      uniqueId: 'testcreator',
      followers: 50_000,
      likesTotal: 250_000,
      videosCount: 120,
    },
    posts: [],
    ...overrides,
  };
}

function makeSnapshot(fetchedAt: string, followers = 1000): HistorySnapshot {
  return {
    fetchedAt,
    profile: { followers, likesTotal: 5000, videosCount: 10 },
  };
}

describe('extractSnapshot', () => {
  it('picks the correct fields from a CreatorProfile', () => {
    const profile = makeProfile();
    const snap = extractSnapshot(profile);

    expect(snap.fetchedAt).toBe('2024-06-15T12:00:00Z');
    expect(snap.profile.followers).toBe(50_000);
    expect(snap.profile.likesTotal).toBe(250_000);
    expect(snap.profile.videosCount).toBe(120);
  });

  it('does not include extra profile fields', () => {
    const profile = makeProfile();
    const snap = extractSnapshot(profile);
    // The snapshot profile should only have the three tracked metrics
    expect(Object.keys(snap.profile)).toEqual(['followers', 'likesTotal', 'videosCount']);
  });
});

describe('mergeHistory', () => {
  it('deduplicates by fetchedAt', () => {
    const existing = [makeSnapshot('2024-01-01T00:00:00Z', 1000)];
    const incoming = [makeSnapshot('2024-01-01T00:00:00Z', 1000)];

    const merged = mergeHistory(existing, incoming);
    expect(merged).toHaveLength(1);
  });

  it('keeps both entries when fetchedAt values differ', () => {
    const existing = [makeSnapshot('2024-01-01T00:00:00Z')];
    const incoming = [makeSnapshot('2024-01-02T00:00:00Z')];

    const merged = mergeHistory(existing, incoming);
    expect(merged).toHaveLength(2);
  });

  it('maintains oldest-first chronological order', () => {
    const existing = [
      makeSnapshot('2024-03-01T00:00:00Z'),
      makeSnapshot('2024-01-01T00:00:00Z'),
    ];
    const incoming = [makeSnapshot('2024-02-01T00:00:00Z')];

    const merged = mergeHistory(existing, incoming);
    expect(merged[0].fetchedAt).toBe('2024-01-01T00:00:00Z');
    expect(merged[1].fetchedAt).toBe('2024-02-01T00:00:00Z');
    expect(merged[2].fetchedAt).toBe('2024-03-01T00:00:00Z');
  });

  it('trims to MAX_SNAPSHOTS keeping the newest entries', () => {
    const existing: HistorySnapshot[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS; i++) {
      existing.push(makeSnapshot(new Date(2020, 0, 1 + i).toISOString(), 1000 + i));
    }
    const incoming = [makeSnapshot(new Date(2020, 0, 1 + MAX_SNAPSHOTS).toISOString(), 9999)];

    const merged = mergeHistory(existing, incoming);
    expect(merged).toHaveLength(MAX_SNAPSHOTS);
    // The newest entry should be retained
    expect(merged[merged.length - 1].profile.followers).toBe(9999);
    // The very first (oldest) entry should have been dropped
    expect(merged[0].profile.followers).toBe(1001);
  });

  it('handles empty arrays gracefully', () => {
    expect(mergeHistory([], [])).toEqual([]);
    const snap = makeSnapshot('2024-01-01T00:00:00Z');
    expect(mergeHistory([snap], [])).toEqual([snap]);
    expect(mergeHistory([], [snap])).toEqual([snap]);
  });
});

describe('profileKeyFromProfile', () => {
  it('returns "platform:uniqueId"', () => {
    const profile = makeProfile();
    expect(profileKeyFromProfile(profile)).toBe('douyin:testcreator');
  });

  it('handles different platforms', () => {
    const profile = makeProfile({ platform: 'tiktok' });
    expect(profileKeyFromProfile(profile)).toBe('tiktok:testcreator');
  });
});
