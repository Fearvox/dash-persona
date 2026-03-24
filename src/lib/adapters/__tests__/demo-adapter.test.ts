import { describe, it, expect } from 'vitest';
import { getDemoProfile, type DemoPersonaType } from '../demo-adapter';

const PERSONA_TYPES: DemoPersonaType[] = ['tutorial', 'entertainment', 'lifestyle'];

// ---------------------------------------------------------------------------
// getDemoProfile
// ---------------------------------------------------------------------------

describe('getDemoProfile', () => {
  it('returns 3 platforms for each persona type', () => {
    for (const type of PERSONA_TYPES) {
      const profiles = getDemoProfile(type);
      const platforms = Object.keys(profiles);
      expect(platforms).toHaveLength(3);
      expect(platforms).toContain('douyin');
      expect(platforms).toContain('tiktok');
      expect(platforms).toContain('xhs');
    }
  });

  it('each profile has exactly 30 posts', () => {
    for (const type of PERSONA_TYPES) {
      const profiles = getDemoProfile(type);
      for (const [platform, profile] of Object.entries(profiles)) {
        expect(profile.posts).toHaveLength(30);
      }
    }
  });

  it('history snapshots are chronological (oldest first)', () => {
    for (const type of PERSONA_TYPES) {
      const profiles = getDemoProfile(type);
      for (const profile of Object.values(profiles)) {
        const history = profile.history ?? [];
        expect(history.length).toBeGreaterThan(0);

        for (let i = 1; i < history.length; i++) {
          const prev = new Date(history[i - 1].fetchedAt).getTime();
          const curr = new Date(history[i].fetchedAt).getTime();
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
      }
    }
  });

  it('is deterministic: same input produces same output', () => {
    const first = getDemoProfile('tutorial');
    const second = getDemoProfile('tutorial');

    for (const platform of ['douyin', 'tiktok', 'xhs'] as const) {
      const a = first[platform];
      const b = second[platform];

      // Same platform, same profile info
      expect(a.platform).toBe(b.platform);
      expect(a.profile.nickname).toBe(b.profile.nickname);
      expect(a.profile.followers).toBe(b.profile.followers);

      // Same number of posts with same IDs
      expect(a.posts.length).toBe(b.posts.length);
      for (let i = 0; i < a.posts.length; i++) {
        expect(a.posts[i].postId).toBe(b.posts[i].postId);
        expect(a.posts[i].views).toBe(b.posts[i].views);
        expect(a.posts[i].likes).toBe(b.posts[i].likes);
      }

      // Same history snapshots (follower values are deterministic)
      expect(a.history?.length).toBe(b.history?.length);
      for (let i = 0; i < (a.history?.length ?? 0); i++) {
        expect(a.history![i].profile.followers).toBe(b.history![i].profile.followers);
      }
    }
  });

  it('each profile has required top-level fields', () => {
    for (const type of PERSONA_TYPES) {
      const profiles = getDemoProfile(type);
      for (const profile of Object.values(profiles)) {
        expect(typeof profile.platform).toBe('string');
        expect(typeof profile.profileUrl).toBe('string');
        expect(typeof profile.fetchedAt).toBe('string');
        expect(profile.source).toBe('demo');
        expect(typeof profile.profile.nickname).toBe('string');
        expect(typeof profile.profile.uniqueId).toBe('string');
        expect(typeof profile.profile.followers).toBe('number');
      }
    }
  });

  it('posts have valid metric fields', () => {
    const profiles = getDemoProfile('entertainment');
    const profile = profiles.douyin;

    for (const post of profile.posts) {
      expect(typeof post.postId).toBe('string');
      expect(typeof post.desc).toBe('string');
      expect(typeof post.views).toBe('number');
      expect(typeof post.likes).toBe('number');
      expect(typeof post.comments).toBe('number');
      expect(typeof post.shares).toBe('number');
      expect(typeof post.saves).toBe('number');
      expect(post.views).toBeGreaterThanOrEqual(0);
      expect(post.likes).toBeGreaterThanOrEqual(0);
    }
  });

  it('throws on unknown persona type', () => {
    expect(() => getDemoProfile('unknown' as DemoPersonaType)).toThrow();
  });
});
