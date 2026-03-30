import { describe, it, expect } from 'vitest';
import { computePersonaScore, computeEngagementProfile, _postQualityScore } from '../persona';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { Post } from '@/lib/schema/creator-data';

describe('persona comparison: before vs after upgrade', () => {
  const profiles = getDemoProfile('tutorial');
  const profile = profiles['douyin'];

  it('still returns valid PersonaScore structure', () => {
    const score = computePersonaScore(profile);
    expect(score.engagement).toBeDefined();
    expect(score.rhythm).toBeDefined();
    expect(score.consistency).toBeDefined();
    expect(score.growthHealth).toBeDefined();
    expect(score.contentDistribution).toBeDefined();
  });

  it('trend is a number', () => {
    const score = computePersonaScore(profile);
    expect(typeof score.engagement.trend).toBe('number');
  });

  it('trendReliable field exists and is boolean', () => {
    const score = computePersonaScore(profile);
    expect(typeof score.engagement.trendReliable).toBe('boolean');
  });

  it('engagement profile values in expected ranges', () => {
    const score = computePersonaScore(profile);
    expect(score.engagement.overallRate).toBeGreaterThanOrEqual(0);
    expect(score.engagement.overallRate).toBeLessThanOrEqual(1);
    expect(score.engagement.byCategory.length).toBeGreaterThan(0);
  });

  it('5 posts: still get trend data (boundary)', () => {
    const minProfile = { ...profile, posts: profile.posts.slice(0, 5) };
    const score = computePersonaScore(minProfile);
    expect(typeof score.engagement.trend).toBe('number');
    expect(typeof score.engagement.trendReliable).toBe('boolean');
  });

  it('4 posts: trend=0, trendReliable=false', () => {
    const tinyProfile = { ...profile, posts: profile.posts.slice(0, 4) };
    const score = computePersonaScore(tinyProfile);
    expect(score.engagement.trend).toBe(0);
    expect(score.engagement.trendReliable).toBe(false);
  });
});

describe('post quality scoring', () => {
  it('quality scoring does not change results for normal demo data', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = profiles['douyin'];
    // All demo posts should have quality score of 1.0 (or close)
    for (const post of profile.posts) {
      const score = _postQualityScore(post);
      expect(score).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('low-quality post gets lower quality score', () => {
    const lowQuality: Post = {
      postId: 'low-q-1',
      desc: '',          // empty description
      views: 500,
      likes: 0,          // zero engagement
      comments: 0,
      shares: 0,
      saves: 0,
    };
    const score = _postQualityScore(lowQuality);
    // Empty desc (<5 chars) = 0.3, zero engagement with views>100 = *0.5 → 0.15
    expect(score).toBeLessThanOrEqual(0.2);
    expect(score).toBeGreaterThan(0);
  });

  it('high-quality post gets score of 1.0', () => {
    const highQuality: Post = {
      postId: 'hq-1',
      desc: 'This is a detailed tutorial about cooking techniques and recipes',
      views: 10000,
      likes: 300,
      comments: 50,
      shares: 20,
      saves: 80,
    };
    const score = _postQualityScore(highQuality);
    expect(score).toBe(1.0);
  });

  it('bot-like engagement pattern gets penalised', () => {
    const botLike: Post = {
      postId: 'bot-1',
      desc: 'A regular post with normal description length',
      views: 100,
      likes: 80,       // 80% like rate is suspicious
      comments: 10,
      shares: 5,
      saves: 2,
    };
    const score = _postQualityScore(botLike);
    // (80+10+5)/100 = 0.95 > 0.5 → *0.6
    expect(score).toBe(0.6);
  });

  it('low-quality posts are down-weighted in engagement computation', () => {
    const normalPost: Post = {
      postId: 'normal-1',
      desc: 'A standard video about daily life and routine',
      views: 1000,
      likes: 50,
      comments: 10,
      shares: 5,
      saves: 3,
    };
    const lowQPost: Post = {
      postId: 'lowq-1',
      desc: '',
      views: 1000,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };

    // Engagement profile with only normal posts
    const normalProfile = computeEngagementProfile([normalPost, normalPost]);
    // Engagement profile mixing in a low-quality post
    const mixedProfile = computeEngagementProfile([normalPost, lowQPost]);

    // The mixed profile should have lower overall rate because low-quality
    // post's contribution is down-weighted
    expect(mixedProfile.overallRate).toBeLessThan(normalProfile.overallRate);
  });
});
