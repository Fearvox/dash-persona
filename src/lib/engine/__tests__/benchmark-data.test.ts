import { describe, it, expect } from 'vitest';
import {
  BENCHMARK_NICHES,
  NICHE_BENCHMARKS,
  generateBenchmarkProfiles,
} from '../benchmark-data';

// ---------------------------------------------------------------------------
// BENCHMARK_NICHES
// ---------------------------------------------------------------------------

describe('BENCHMARK_NICHES', () => {
  it('has exactly 10 entries', () => {
    expect(BENCHMARK_NICHES.length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// NICHE_BENCHMARKS
// ---------------------------------------------------------------------------

describe('NICHE_BENCHMARKS', () => {
  it('has an entry for each niche', () => {
    for (const niche of BENCHMARK_NICHES) {
      expect(NICHE_BENCHMARKS[niche]).toBeDefined();
      expect(NICHE_BENCHMARKS[niche].niche).toBe(niche);
    }
  });
});

// ---------------------------------------------------------------------------
// generateBenchmarkProfiles
// ---------------------------------------------------------------------------

describe('generateBenchmarkProfiles', () => {
  it('returns 20 profiles for tutorial niche', () => {
    const profiles = generateBenchmarkProfiles('tutorial', 20);
    expect(profiles).toHaveLength(20);
  });

  it('generated profiles have role: "benchmark"', () => {
    const profiles = generateBenchmarkProfiles('gaming', 5);
    for (const p of profiles) {
      expect(p.role).toBe('benchmark');
    }
  });

  it('output is deterministic — two calls produce identical results', () => {
    const first = generateBenchmarkProfiles('food', 10);
    const second = generateBenchmarkProfiles('food', 10);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('each profile has between 15 and 25 posts', () => {
    const profiles = generateBenchmarkProfiles('fitness', 20);
    for (const p of profiles) {
      expect(p.posts.length).toBeGreaterThanOrEqual(15);
      expect(p.posts.length).toBeLessThanOrEqual(25);
    }
  });

  it('post engagement values are non-negative', () => {
    const profiles = generateBenchmarkProfiles('beauty', 10);
    for (const p of profiles) {
      for (const post of p.posts) {
        expect(post.likes).toBeGreaterThanOrEqual(0);
        expect(post.comments).toBeGreaterThanOrEqual(0);
        expect(post.shares).toBeGreaterThanOrEqual(0);
        expect(post.saves).toBeGreaterThanOrEqual(0);
        expect(post.views).toBeGreaterThan(0);
      }
    }
  });

  it('returns an empty array for unknown niche (type guard)', () => {
    // @ts-expect-error — intentionally passing invalid niche
    const profiles = generateBenchmarkProfiles('unknown_niche', 5);
    expect(profiles).toHaveLength(0);
  });
});
