import { describe, it, expect } from 'vitest';
import { validateCreatorProfile, isCreatorProfile } from '../validate';
import { getDemoProfile } from '../../adapters/demo-adapter';

// ---------------------------------------------------------------------------
// validateCreatorProfile
// ---------------------------------------------------------------------------

describe('validateCreatorProfile', () => {
  it('returns valid: true for a correct profile', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = profiles.douyin;

    const result = validateCreatorProfile(profile);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid: true for all demo persona types', () => {
    for (const type of ['tutorial', 'entertainment', 'lifestyle'] as const) {
      const profiles = getDemoProfile(type);
      for (const profile of Object.values(profiles)) {
        const result = validateCreatorProfile(profile);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      }
    }
  });

  it('returns valid: false for non-object input', () => {
    expect(validateCreatorProfile(null).valid).toBe(false);
    expect(validateCreatorProfile(undefined).valid).toBe(false);
    expect(validateCreatorProfile('string').valid).toBe(false);
    expect(validateCreatorProfile(42).valid).toBe(false);
  });

  it('reports missing top-level fields', () => {
    const result = validateCreatorProfile({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('platform'))).toBe(true);
    expect(result.errors.some((e) => e.includes('profileUrl'))).toBe(true);
    expect(result.errors.some((e) => e.includes('fetchedAt'))).toBe(true);
    expect(result.errors.some((e) => e.includes('source'))).toBe(true);
  });

  it('reports missing profile sub-fields', () => {
    const result = validateCreatorProfile({
      platform: 'douyin',
      profileUrl: 'https://example.com',
      fetchedAt: '2024-01-01T00:00:00Z',
      source: 'demo',
      profile: {},
      posts: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('nickname'))).toBe(true);
    expect(result.errors.some((e) => e.includes('uniqueId'))).toBe(true);
  });

  it('reports invalid post entries', () => {
    const result = validateCreatorProfile({
      platform: 'douyin',
      profileUrl: 'https://example.com',
      fetchedAt: '2024-01-01T00:00:00Z',
      source: 'demo',
      profile: {
        nickname: 'Test',
        uniqueId: 'test',
        followers: 100,
        likesTotal: 500,
        videosCount: 10,
      },
      posts: [{ postId: '', desc: 123 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('posts[0]'))).toBe(true);
  });

  it('validates history snapshots when present', () => {
    const result = validateCreatorProfile({
      platform: 'douyin',
      profileUrl: 'https://example.com',
      fetchedAt: '2024-01-01T00:00:00Z',
      source: 'demo',
      profile: {
        nickname: 'Test',
        uniqueId: 'test',
        followers: 100,
        likesTotal: 500,
        videosCount: 10,
      },
      posts: [],
      history: [{ fetchedAt: '', profile: 'not-an-object' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('history[0]'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isCreatorProfile
// ---------------------------------------------------------------------------

describe('isCreatorProfile', () => {
  it('returns true for a valid profile', () => {
    const profiles = getDemoProfile('tutorial');
    expect(isCreatorProfile(profiles.douyin)).toBe(true);
  });

  it('returns false for invalid input', () => {
    expect(isCreatorProfile(null)).toBe(false);
    expect(isCreatorProfile({})).toBe(false);
    expect(isCreatorProfile({ platform: 'douyin' })).toBe(false);
  });
});
