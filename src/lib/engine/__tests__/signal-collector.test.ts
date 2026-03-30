import { describe, it, expect } from 'vitest';
import { collectSignals } from '../signal-collector';
import { computePersonaScore } from '../persona';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

describe('signal-collector', () => {
  const profiles = getDemoProfile('tutorial');
  const profile = profiles['douyin'];
  const score = computePersonaScore(profile);

  it('returns valid SignalVector structure', () => {
    const vector = collectSignals(profile, score);
    expect(vector.profileId).toBeTruthy();
    expect(vector.platform).toBe('douyin');
    expect(vector.collectedAt).toBeTruthy();
    expect(Array.isArray(vector.signals)).toBe(true);
  });

  it('produces >= 12 signals from demo data', () => {
    const vector = collectSignals(profile, score);
    expect(vector.signals.length).toBeGreaterThanOrEqual(12);
  });

  it('all signals have valid bounds', () => {
    const vector = collectSignals(profile, score);
    for (const signal of vector.signals) {
      expect(signal.normalizedValue).toBeGreaterThanOrEqual(0);
      expect(signal.normalizedValue).toBeLessThanOrEqual(100);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.id).toBeTruthy();
      expect(signal.source).toBeTruthy();
      expect(['engagement', 'rhythm', 'growth', 'content', 'audience']).toContain(signal.category);
    }
  });

  it('signals are sorted by category then id', () => {
    const vector = collectSignals(profile, score);
    for (let i = 1; i < vector.signals.length; i++) {
      const prev = vector.signals[i - 1];
      const curr = vector.signals[i];
      if (prev.category === curr.category) {
        expect(prev.id <= curr.id).toBe(true);
      } else {
        expect(prev.category < curr.category).toBe(true);
      }
    }
  });

  it('is deterministic: same input same output', () => {
    const v1 = collectSignals(profile, score);
    const v2 = collectSignals(profile, score);
    expect(JSON.stringify(v1.signals)).toBe(JSON.stringify(v2.signals));
  });

  it('audienceQuality absent when no fanPortrait', () => {
    const vector = collectSignals(profile, score);
    const aq = vector.signals.find((s) => s.id === 'audienceQuality');
    expect(aq).toBeUndefined();
  });
});
