import { describe, it, expect } from 'vitest';
import { adaptiveThreshold } from '../../stats/threshold';

// ---------------------------------------------------------------------------
// adaptiveThreshold — sample-size-aware threshold scaling
// ---------------------------------------------------------------------------

describe('adaptiveThreshold', () => {
  it('returns baseThreshold at reference sample size (100)', () => {
    const result = adaptiveThreshold(1.5, 100);
    expect(result).toBeCloseTo(1.5, 5);
  });

  it('widens for small samples: n=25 → 2× base', () => {
    const result = adaptiveThreshold(1.5, 25);
    // sqrt(100/25) = sqrt(4) = 2 → 1.5 * 2 = 3.0
    expect(result).toBeCloseTo(3.0, 5);
  });

  it('tightens for large samples: n=400 → 0.5× base', () => {
    const result = adaptiveThreshold(1.5, 400);
    // sqrt(100/400) = sqrt(0.25) = 0.5 → 1.5 * 0.5 = 0.75
    expect(result).toBeCloseTo(0.75, 5);
  });

  it('returns Infinity below minSamples', () => {
    expect(adaptiveThreshold(1.5, 3, 5)).toBe(Infinity);
  });

  it('default minSamples is 5: n=4 → Infinity, n=5 → finite', () => {
    expect(adaptiveThreshold(1.5, 4)).toBe(Infinity);
    const result = adaptiveThreshold(1.5, 5);
    expect(result).not.toBe(Infinity);
    expect(Number.isFinite(result)).toBe(true);
  });

  describe('percentage thresholds', () => {
    it('scales correctly for small base (0.15) at n=10', () => {
      const result = adaptiveThreshold(0.15, 10);
      // sqrt(100/10) = sqrt(10) ≈ 3.162 → 0.15 * 3.162 ≈ 0.4743
      expect(result).toBeCloseTo(0.4743, 3);
    });

    it('returns base at reference size for percentage threshold', () => {
      const result = adaptiveThreshold(0.15, 100);
      expect(result).toBeCloseTo(0.15, 5);
    });
  });

  it('is monotonically decreasing with sample size', () => {
    const sizes = [10, 25, 50, 100, 200, 400];
    const thresholds = sizes.map((n) => adaptiveThreshold(1.5, n));

    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeLessThan(thresholds[i - 1]);
    }
  });
});
