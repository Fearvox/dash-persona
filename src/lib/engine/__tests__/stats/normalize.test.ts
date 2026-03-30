import { describe, it, expect } from 'vitest';
import { safeDivide, recalibrateSteps, rankNormalize } from '../../stats/normalize';

// ---------------------------------------------------------------------------
// safeDivide
// ---------------------------------------------------------------------------

describe('safeDivide', () => {
  it('returns normal division result', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it('returns 0 when divisor is zero (default fallback)', () => {
    expect(safeDivide(10, 0)).toBe(0);
  });

  it('returns custom fallback when divisor is zero', () => {
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// recalibrateSteps — piecewise-linear step normalization
// ---------------------------------------------------------------------------

describe('recalibrateSteps', () => {
  const steps = [0, 25, 50, 75, 95];

  it('maps step positions to evenly spaced 0–100', () => {
    expect(recalibrateSteps(0, steps)).toBe(0);
    expect(recalibrateSteps(25, steps)).toBe(25);
    expect(recalibrateSteps(50, steps)).toBe(50);
    expect(recalibrateSteps(75, steps)).toBe(75);
    expect(recalibrateSteps(95, steps)).toBe(100);
  });

  it('interpolates between steps', () => {
    // Value 12.5 is halfway between step 0 (out=0) and step 25 (out=25)
    const result = recalibrateSteps(12.5, steps);
    expect(result).toBeCloseTo(12.5, 5);
  });

  it('clamps below minimum to 0', () => {
    expect(recalibrateSteps(-10, steps)).toBe(0);
  });

  it('clamps above maximum to 100', () => {
    expect(recalibrateSteps(200, steps)).toBe(100);
  });

  it('returns value as-is when steps is empty', () => {
    expect(recalibrateSteps(42, [])).toBe(42);
  });

  it('returns 50 when steps has a single element', () => {
    expect(recalibrateSteps(42, [10])).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// rankNormalize — percentile-rank normalization across dimensions
// ---------------------------------------------------------------------------

describe('rankNormalize', () => {
  it('normalizes 3 items with mixed-scale dimensions to 0–100', () => {
    const suggestions = [
      { views: 1000, likes: 5 },
      { views: 5000, likes: 50 },
      { views: 100000, likes: 10 },
    ];
    const result = rankNormalize(suggestions, ['views', 'likes']);

    for (const row of result) {
      expect(row.views).toBeGreaterThanOrEqual(0);
      expect(row.views).toBeLessThanOrEqual(100);
      expect(row.likes).toBeGreaterThanOrEqual(0);
      expect(row.likes).toBeLessThanOrEqual(100);
    }
  });

  it('returns 50 for all dims with a single suggestion', () => {
    const suggestions = [{ a: 999, b: 1 }];
    const result = rankNormalize(suggestions, ['a', 'b']);
    expect(result[0].a).toBeCloseTo(50, 0);
    expect(result[0].b).toBeCloseTo(50, 0);
  });

  it('preserves relative ordering within dimension', () => {
    const suggestions = [
      { score: 10 },
      { score: 30 },
      { score: 20 },
    ];
    const result = rankNormalize(suggestions, ['score']);

    // Original order: 10 < 20 < 30 → normalized should preserve: result[0] < result[2] < result[1]
    expect(result[0].score).toBeLessThan(result[2].score);
    expect(result[2].score).toBeLessThan(result[1].score);
  });

  it('handles ties by assigning average rank', () => {
    const suggestions = [
      { x: 10 },
      { x: 10 },
      { x: 30 },
    ];
    const result = rankNormalize(suggestions, ['x']);

    // Two tied values should get the same normalized score
    expect(result[0].x).toBe(result[1].x);
    // The non-tied value should be higher
    expect(result[2].x).toBeGreaterThan(result[0].x);
  });

  it('returns empty array for empty input', () => {
    expect(rankNormalize([], ['a'])).toEqual([]);
  });
});
