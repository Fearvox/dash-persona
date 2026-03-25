import { describe, it, expect } from 'vitest';
import { compareToBenchmark, compareToBenchmarkByNiche } from '../benchmark';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import { generateBenchmarkProfiles } from '../benchmark-data';

// ---------------------------------------------------------------------------
// compareToBenchmark (existing behaviour)
// ---------------------------------------------------------------------------

describe('compareToBenchmark', () => {
  it('returns empty result when no benchmarks provided', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const result = compareToBenchmark(user, []);
    expect(result.benchmarkCount).toBe(0);
    expect(result.metrics).toHaveLength(0);
    expect(result.summary).toBeTruthy();
  });

  it('returns 3 metrics for a valid benchmark set', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const benchmarks = generateBenchmarkProfiles('tutorial', 10);
    const result = compareToBenchmark(user, benchmarks);
    expect(result.metrics).toHaveLength(3);
  });

  it('benchmarkCount matches the number of benchmark profiles provided', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const benchmarks = generateBenchmarkProfiles('tutorial', 15);
    const result = compareToBenchmark(user, benchmarks);
    expect(result.benchmarkCount).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// compareToBenchmarkByNiche
// ---------------------------------------------------------------------------

describe('compareToBenchmarkByNiche', () => {
  it('returns a valid result for the tutorial demo profile', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const result = compareToBenchmarkByNiche(user);
    expect(result).toBeDefined();
    expect(result.benchmarkCount).toBeGreaterThan(0);
    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
  });

  it('result includes niche and nicheLabel fields', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const result = compareToBenchmarkByNiche(user);
    expect(typeof result.niche).toBe('string');
    expect(result.niche.length).toBeGreaterThan(0);
    expect(typeof result.nicheLabel).toBe('string');
    expect(result.nicheLabel.length).toBeGreaterThan(0);
  });

  it('benchmarkCount equals 20', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const result = compareToBenchmarkByNiche(user);
    expect(result.benchmarkCount).toBe(20);
  });

  it('has all 3 metric names: Followers, Engagement Rate, Post Count', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    const result = compareToBenchmarkByNiche(user);
    const metricNames = result.metrics.map((m) => m.metric);
    expect(metricNames).toContain('Followers');
    expect(metricNames).toContain('Engagement Rate');
    expect(metricNames).toContain('Post Count');
  });

  it('works without a userScore argument', () => {
    const profiles = getDemoProfile('entertainment');
    const user = Object.values(profiles)[0];
    expect(() => compareToBenchmarkByNiche(user)).not.toThrow();
  });

  it('accepts optional userScore for content distribution hint', () => {
    const profiles = getDemoProfile('tutorial');
    const user = Object.values(profiles)[0];
    // Provide a partial userScore with contentDistribution
    const mockScore = { contentDistribution: { tutorial: 80, knowledge: 20 } } as never;
    const result = compareToBenchmarkByNiche(user, mockScore);
    expect(result.niche).toBe('tutorial');
    expect(result.nicheLabel).toBe('Tutorial & Education');
  });
});
