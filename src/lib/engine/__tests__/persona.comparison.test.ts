import { describe, it, expect } from 'vitest';
import { computePersonaScore } from '../persona';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

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
