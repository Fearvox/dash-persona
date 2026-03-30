import { describe, it, expect } from 'vitest';
import { generateNextContent } from '../next-content';
import { computePersonaScore } from '../persona';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { TrendingCollection } from '@/lib/collectors/trending-collector';

describe('next-content comparison: before vs after upgrade', () => {
  const profiles = getDemoProfile('tutorial');
  const profile = profiles['douyin'];
  const score = computePersonaScore(profile);
  const emptyTrending: TrendingCollection = {
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    platform: 'tiktok',
    nicheKeywords: [],
    posts: [],
    topics: [],
  };

  it('returns valid NextContentResult', () => {
    const result = generateNextContent(score, emptyTrending, null, profile.posts);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('scoring dimensions are all 0-100', () => {
    const result = generateNextContent(score, emptyTrending, null, profile.posts);
    for (const s of result.suggestions) {
      expect(s.scoring.trendAlignment).toBeGreaterThanOrEqual(0);
      expect(s.scoring.trendAlignment).toBeLessThanOrEqual(100);
      expect(s.scoring.nicheRelevance).toBeGreaterThanOrEqual(0);
      expect(s.scoring.nicheRelevance).toBeLessThanOrEqual(100);
      expect(s.scoring.gapOpportunity).toBeGreaterThanOrEqual(0);
      expect(s.scoring.gapOpportunity).toBeLessThanOrEqual(100);
      expect(s.scoring.engagementPotential).toBeGreaterThanOrEqual(0);
      expect(s.scoring.engagementPotential).toBeLessThanOrEqual(100);
    }
  });

  it('confidence is valid 0-100', () => {
    const result = generateNextContent(score, emptyTrending, null, profile.posts);
    for (const s of result.suggestions) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(100);
    }
  });

  it('priority values are valid', () => {
    const result = generateNextContent(score, emptyTrending, null, profile.posts);
    for (const s of result.suggestions) {
      expect(['high', 'medium', 'low']).toContain(s.priority);
    }
  });
});
