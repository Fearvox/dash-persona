import { describe, it, expect } from 'vitest';
import { linearTrend, safeTrend } from '../../stats/regression';

// ---------------------------------------------------------------------------
// linearTrend
// ---------------------------------------------------------------------------

describe('linearTrend', () => {
  it('returns zeroed result for empty array', () => {
    const r = linearTrend([]);
    expect(r.slope).toBe(0);
    expect(r.intercept).toBe(0);
    expect(r.rSquared).toBe(0);
    expect(r.pValue).toBe(1);
    expect(r.significant).toBe(false);
  });

  it('returns intercept-only for single value', () => {
    const r = linearTrend([42]);
    expect(r.slope).toBe(0);
    expect(r.intercept).toBe(42);
    expect(r.rSquared).toBe(0);
    expect(r.pValue).toBe(1);
    expect(r.significant).toBe(false);
  });

  it('detects perfect positive trend [1,2,3,4,5]', () => {
    const r = linearTrend([1, 2, 3, 4, 5]);
    expect(r.slope).toBeCloseTo(1, 5);
    expect(r.rSquared).toBeCloseTo(1, 5);
    expect(r.significant).toBe(true);
  });

  it('detects perfect negative trend [5,4,3,2,1]', () => {
    const r = linearTrend([5, 4, 3, 2, 1]);
    expect(r.slope).toBeCloseTo(-1, 5);
    expect(r.rSquared).toBeCloseTo(1, 5);
    expect(r.significant).toBe(true);
  });

  it('reports flat data [5,5,5,5,5] as not significant', () => {
    const r = linearTrend([5, 5, 5, 5, 5]);
    expect(r.slope).toBeCloseTo(0, 5);
    expect(r.significant).toBe(false);
  });

  it('reports noisy data as not significant', () => {
    const r = linearTrend([3, 7, 2, 8, 4, 6, 3, 7]);
    expect(r.pValue).toBeGreaterThan(0.05);
    expect(r.significant).toBe(false);
  });

  it('computes slope for two values but pValue = 1 (df=0)', () => {
    const r = linearTrend([1, 3]);
    expect(r.slope).toBeCloseTo(2, 5);
    expect(r.pValue).toBe(1);
    expect(r.significant).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// safeTrend
// ---------------------------------------------------------------------------

describe('safeTrend', () => {
  it('returns null when n < minN (default 5)', () => {
    expect(safeTrend([1, 2, 3, 4])).toBeNull();
  });

  it('returns TrendResult when n >= minN (default 5)', () => {
    const r = safeTrend([1, 2, 3, 4, 5]);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(1, 5);
  });

  it('respects custom minN parameter', () => {
    expect(safeTrend([1, 2], 3)).toBeNull();
    expect(safeTrend([1, 2, 3], 3)).not.toBeNull();
  });

  it('defaults minN to 5', () => {
    // 4 values should return null with default minN
    expect(safeTrend([10, 20, 30, 40])).toBeNull();
    // 5 values should return a result
    expect(safeTrend([10, 20, 30, 40, 50])).not.toBeNull();
  });
});
