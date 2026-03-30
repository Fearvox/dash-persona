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

  it('produces >= 13 signals from demo data', () => {
    const vector = collectSignals(profile, score);
    expect(vector.signals.length).toBeGreaterThanOrEqual(13);
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

  it('all signals have weight field >= 0', () => {
    const vector = collectSignals(profile, score);
    for (const signal of vector.signals) {
      expect(signal.weight).toBeGreaterThanOrEqual(0);
      expect(typeof signal.weight).toBe('number');
    }
  });

  it('douyin profile has higher completionRate weight than default', () => {
    // Demo profile is douyin — completionRate weight should be 8 (douyin override)
    const vector = collectSignals(profile, score);
    const cr = vector.signals.find((s) => s.id === 'completionRate');
    // completionRate may be absent if no posts have completionRate data
    if (cr) {
      expect(cr.weight).toBe(8); // douyin override
    }
    // Verify douyin engagementRate uses default (5) since douyin overrides it to 5
    const er = vector.signals.find((s) => s.id === 'engagementRate');
    expect(er).toBeDefined();
    expect(er!.weight).toBe(5);
  });
});
