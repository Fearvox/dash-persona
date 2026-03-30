import { describe, it, expect } from 'vitest';
import { compareToBenchmarkByNiche } from '../benchmark';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

describe('benchmark comparison: before vs after upgrade', () => {
  const profiles = getDemoProfile('tutorial');
  const profile = profiles['douyin'];

  it('still returns valid BenchmarkResult structure', () => {
    const result = compareToBenchmarkByNiche(profile);
    expect(result.benchmarkCount).toBe(20);
    expect(result.metrics).toHaveLength(3);
    expect(result.niche).toBeDefined();
    expect(result.summary).toBeTruthy();
  });

  it('percentiles are never exactly 0 or 100 (Hazen fix)', () => {
    const result = compareToBenchmarkByNiche(profile);
    for (const m of result.metrics) {
      expect(m.percentile).toBeGreaterThan(0);
      expect(m.percentile).toBeLessThan(100);
    }
  });

  it('rank classifications are still valid', () => {
    const result = compareToBenchmarkByNiche(profile);
    for (const m of result.metrics) {
      expect(['above', 'at', 'below']).toContain(m.rank);
    }
  });
});
