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

describe('dataCompleteness signal', () => {
  const profiles = getDemoProfile('tutorial');
  const profile = profiles['douyin'];
  const score = computePersonaScore(profile);

  it('is always present in signal vector', () => {
    const vector = collectSignals(profile, score);
    const dc = vector.signals.find((s) => s.id === 'dataCompleteness');
    expect(dc).toBeDefined();
    expect(dc!.category).toBe('content');
  });

  it('has confidence = 1.0 (meta-signal)', () => {
    const vector = collectSignals(profile, score);
    const dc = vector.signals.find((s) => s.id === 'dataCompleteness');
    expect(dc!.confidence).toBe(1.0);
  });

  it('rawValue is between 0 and 1', () => {
    const vector = collectSignals(profile, score);
    const dc = vector.signals.find((s) => s.id === 'dataCompleteness');
    expect(dc!.rawValue).toBeGreaterThanOrEqual(0);
    expect(dc!.rawValue).toBeLessThanOrEqual(1);
  });

  it('returns 0 rawValue for profile with no posts', () => {
    const emptyProfile = {
      ...profile,
      posts: [],
      profile: { ...profile.profile, followers: 0, nickname: '' },
    };
    const emptyScore = computePersonaScore(emptyProfile);
    const vector = collectSignals(emptyProfile, emptyScore);
    const dc = vector.signals.find((s) => s.id === 'dataCompleteness');
    expect(dc).toBeDefined();
    expect(dc!.rawValue).toBe(0);
  });

  it('increases rawValue when optional fields are populated', () => {
    // Base profile without optional fields
    const baseProfile = {
      ...profile,
      history: undefined,
      fanPortrait: undefined,
    };
    const baseScore = computePersonaScore(baseProfile);
    const baseVector = collectSignals(baseProfile, baseScore);
    const baseDc = baseVector.signals.find((s) => s.id === 'dataCompleteness');

    // Profile with history added
    const enrichedProfile = {
      ...profile,
      history: [{ fetchedAt: '2026-01-01', profile: { followers: 100, likesTotal: 500, videosCount: 10 } }],
      fanPortrait: { gender: { male: 60, female: 40 } },
    };
    const enrichedScore = computePersonaScore(enrichedProfile);
    const enrichedVector = collectSignals(enrichedProfile, enrichedScore);
    const enrichedDc = enrichedVector.signals.find((s) => s.id === 'dataCompleteness');

    expect(enrichedDc!.rawValue).toBeGreaterThan(baseDc!.rawValue);
  });
});
