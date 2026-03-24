import { describe, it, expect } from 'vitest';
import {
  classifyContent,
  computePersonaScore,
  computePersonaConsistency,
  generatePersonaTags,
} from '../persona';
import { getDemoProfile } from '../../adapters/demo-adapter';
import type { Post } from '../../schema/creator-data';

// ---------------------------------------------------------------------------
// Helper: create a minimal post
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<Post> & { desc: string }): Post {
  return {
    postId: `test_${Math.random().toString(36).slice(2, 8)}`,
    views: 10_000,
    likes: 500,
    comments: 50,
    shares: 20,
    saves: 30,
    publishedAt: new Date(Date.now() - Math.random() * 30 * 86_400_000).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// classifyContent
// ---------------------------------------------------------------------------

describe('classifyContent', () => {
  it('classifies posts with tutorial keywords into the tutorial category', () => {
    const posts: Post[] = [
      makePost({ desc: '5分钟学会 CSS Grid 布局 #教程 #编程教学' }),
      makePost({ desc: 'React 18 tutorial for beginners, step by step guide' }),
    ];
    const dist = classifyContent(posts);
    expect(dist.has('tutorial')).toBe(true);
    expect(dist.get('tutorial')!).toBeGreaterThan(0);
  });

  it('classifies food-related posts correctly', () => {
    const posts: Post[] = [
      makePost({ desc: '今天做了一道美食，cooking 真好玩 #做饭' }),
      makePost({ desc: '吃播 mukbang challenge #美食' }),
    ];
    const dist = classifyContent(posts);
    expect(dist.has('food')).toBe(true);
  });

  it('assigns contentType to posts as a side effect', () => {
    const posts: Post[] = [
      makePost({ desc: '健身 workout 日常 #fitness' }),
    ];
    classifyContent(posts);
    expect(posts[0].contentType).toBeDefined();
    // "fitness" or "daily" are both valid matches
    expect(['fitness', 'daily']).toContain(posts[0].contentType);
  });

  it('returns an empty map for posts with no matching keywords', () => {
    const posts: Post[] = [
      makePost({ desc: 'xyzzy qwerty asdfgh' }),
    ];
    const dist = classifyContent(posts);
    expect(dist.size).toBe(0);
  });

  it('handles multi-category posts', () => {
    const posts: Post[] = [
      makePost({ desc: '旅行穿搭分享 travel fashion ootd' }),
    ];
    const dist = classifyContent(posts);
    expect(dist.has('travel')).toBe(true);
    expect(dist.has('fashion')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computePersonaScore
// ---------------------------------------------------------------------------

describe('computePersonaScore', () => {
  it('returns status "insufficient_data" for 0 posts', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = { ...profiles.douyin, posts: [] };
    const score = computePersonaScore(profile);
    expect(score.status).toBe('insufficient_data');
    expect(score.postsAnalysed).toBe(0);
    expect(score.tags).toEqual([]);
  });

  it('returns a complete score with all fields for valid input', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = profiles.douyin;
    const score = computePersonaScore(profile);

    expect(score.status).toBe('ok');
    expect(score.postsAnalysed).toBe(30);

    // contentDistribution is populated
    expect(Object.keys(score.contentDistribution).length).toBeGreaterThan(0);

    // engagement has expected shape
    expect(typeof score.engagement.overallRate).toBe('number');
    expect(typeof score.engagement.medianRate).toBe('number');
    expect(score.engagement.byCategory.length).toBeGreaterThan(0);

    // rhythm is populated
    expect(typeof score.rhythm.postsPerWeek).toBe('number');
    expect(score.rhythm.hourDistribution).toHaveLength(24);

    // consistency is populated
    expect(typeof score.consistency.score).toBe('number');
    expect(typeof score.consistency.isConsistent).toBe('boolean');

    // growthHealth is populated
    expect(typeof score.growthHealth.followerGrowthRate).toBe('number');
    expect(['accelerating', 'steady', 'decelerating', 'insufficient_data']).toContain(
      score.growthHealth.momentum,
    );

    // tags are generated
    expect(Array.isArray(score.tags)).toBe(true);
  });

  it('returns status "insufficient_data" when all posts have 0 views', () => {
    const profiles = getDemoProfile('entertainment');
    const profile = {
      ...profiles.douyin,
      posts: profiles.douyin.posts.map((p) => ({ ...p, views: 0 })),
    };
    const score = computePersonaScore(profile);
    expect(score.status).toBe('insufficient_data');
  });
});

// ---------------------------------------------------------------------------
// computePersonaConsistency
// ---------------------------------------------------------------------------

describe('computePersonaConsistency', () => {
  it('returns high consistency for identical posts', () => {
    const posts: Post[] = Array.from({ length: 15 }, (_, i) =>
      makePost({
        desc: '教程 tutorial step by step how to guide',
        contentType: 'tutorial',
      }),
    );
    // Manually set contentType since computePersonaConsistency reads it
    const result = computePersonaConsistency(posts);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.isConsistent).toBe(true);
    expect(result.dominantCategory).toBe('tutorial');
    expect(result.dominantCategoryPct).toBeGreaterThanOrEqual(80);
  });

  it('returns lower consistency for diverse posts', () => {
    // Create posts where each consecutive post has a different category,
    // ensuring maximum category variance between sliding windows.
    const categories = [
      'tutorial', 'food', 'travel', 'fitness', 'beauty',
      'tech', 'music', 'dance', 'pet', 'gaming',
      'entertainment', 'story', 'emotion', 'car', 'home',
      'book', 'health', 'art', 'outdoor', 'couple',
    ];
    const posts: Post[] = categories.map((cat) =>
      makePost({ desc: `${cat} post`, contentType: cat }),
    );
    const result = computePersonaConsistency(posts);
    // Identical posts score >= 80; diverse posts should score lower
    const identicalPosts: Post[] = Array.from({ length: 20 }, () =>
      makePost({ desc: 'tutorial', contentType: 'tutorial' }),
    );
    const identicalResult = computePersonaConsistency(identicalPosts);
    expect(result.score).toBeLessThan(identicalResult.score);
  });

  it('returns noData when fewer posts than window size', () => {
    const posts: Post[] = [
      makePost({ desc: 'only one post', contentType: 'tutorial' }),
    ];
    const result = computePersonaConsistency(posts);
    expect(result.score).toBe(0);
    expect(result.isConsistent).toBe(false);
    expect(result.dominantCategory).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generatePersonaTags
// ---------------------------------------------------------------------------

describe('generatePersonaTags', () => {
  it('produces tags with confidence > 0 for a valid persona score', () => {
    const profiles = getDemoProfile('tutorial');
    const score = computePersonaScore(profiles.douyin);

    // The score should produce at least one tag
    const tags = generatePersonaTags(score);
    expect(tags.length).toBeGreaterThan(0);

    for (const tag of tags) {
      expect(tag.confidence).toBeGreaterThan(0);
      expect(tag.confidence).toBeLessThanOrEqual(1);
      expect(typeof tag.label).toBe('string');
      expect(typeof tag.slug).toBe('string');
      expect(typeof tag.evidence).toBe('string');
      expect(tag.label.length).toBeGreaterThan(0);
      expect(tag.slug.length).toBeGreaterThan(0);
    }
  });

  it('returns at most 8 tags', () => {
    const profiles = getDemoProfile('entertainment');
    const score = computePersonaScore(profiles.douyin);
    const tags = generatePersonaTags(score);
    expect(tags.length).toBeLessThanOrEqual(8);
  });

  it('returns tags sorted by confidence descending', () => {
    const profiles = getDemoProfile('lifestyle');
    const score = computePersonaScore(profiles.xhs);
    const tags = generatePersonaTags(score);
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i - 1].confidence).toBeGreaterThanOrEqual(tags[i].confidence);
    }
  });
});
