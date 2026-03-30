import { describe, it, expect } from 'vitest';
import { empiricalPercentile, batchPercentile } from '../../stats/percentile';

// ---------------------------------------------------------------------------
// empiricalPercentile — Hazen plotting position
// ---------------------------------------------------------------------------

describe('empiricalPercentile', () => {
  it('returns 50 for an empty array', () => {
    expect(empiricalPercentile(42, [])).toBe(50);
  });

  it('returns 50 for a single-element array', () => {
    // rank = 1, hazen = (1 - 0.5) / 1 * 100 = 50
    expect(empiricalPercentile(10, [10])).toBe(50);
  });

  it('returns non-zero for value at minimum of 5-element array', () => {
    const sorted = [10, 20, 30, 40, 50];
    const result = empiricalPercentile(10, sorted);
    // rank = 1, hazen = (1 - 0.5) / 5 * 100 = 10
    expect(result).toBe(10);
    expect(result).toBeGreaterThan(0);
  });

  it('returns non-100 for value at maximum of 5-element array', () => {
    const sorted = [10, 20, 30, 40, 50];
    const result = empiricalPercentile(50, sorted);
    // rank = 5, hazen = (5 - 0.5) / 5 * 100 = 90
    expect(result).toBe(90);
    expect(result).toBeLessThan(100);
  });

  it('returns > 0 and < 50 for value below minimum', () => {
    const sorted = [10, 20, 30, 40, 50];
    const result = empiricalPercentile(5, sorted);
    // rank = 0 → clamped to 1, hazen = (1 - 0.5) / 5 * 100 = 10
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50);
  });

  it('returns > 50 and < 100 for value above maximum', () => {
    const sorted = [10, 20, 30, 40, 50];
    const result = empiricalPercentile(100, sorted);
    // rank = 5, hazen = (5 - 0.5) / 5 * 100 = 90
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThan(100);
  });

  describe('power-law distribution', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 50, 500];

    it('user at 8 is > 70', () => {
      const result = empiricalPercentile(8, sorted);
      // rank = 8, hazen = (8 - 0.5) / 10 * 100 = 75
      expect(result).toBeGreaterThan(70);
    });

    it('user at 500 is > 80 and < 100', () => {
      const result = empiricalPercentile(500, sorted);
      // rank = 10, hazen = (10 - 0.5) / 10 * 100 = 95
      expect(result).toBeGreaterThan(80);
      expect(result).toBeLessThan(100);
    });
  });
});

// ---------------------------------------------------------------------------
// batchPercentile
// ---------------------------------------------------------------------------

describe('batchPercentile', () => {
  it('preserves ordering of input values', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const values = [2, 5, 8];
    const results = batchPercentile(values, sorted);

    // Each successive value should produce a higher (or equal) percentile
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
    }
  });

  it('returns same length as input values', () => {
    const sorted = [10, 20, 30];
    const values = [15, 25];
    const results = batchPercentile(values, sorted);
    expect(results).toHaveLength(2);
  });
});
