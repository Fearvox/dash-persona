import { describe, it, expect } from 'vitest';
import { runAllEngines } from '../index';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

describe('runAllEngines', () => {
  it('returns signalVectors keyed by platform', async () => {
    const profiles = getDemoProfile('tutorial');
    const result = await runAllEngines(profiles);

    expect(result.signalVectors).toBeDefined();
    expect(typeof result.signalVectors).toBe('object');

    // Should have one entry per platform
    const platforms = Object.keys(profiles);
    for (const platform of platforms) {
      expect(result.signalVectors[platform]).toBeDefined();
      expect(result.signalVectors[platform].platform).toBe(platform);
      expect(Array.isArray(result.signalVectors[platform].signals)).toBe(true);
      expect(result.signalVectors[platform].signals.length).toBeGreaterThan(0);
    }
  });

  it('signalVectors include dataCompleteness signal for each platform', async () => {
    const profiles = getDemoProfile('tutorial');
    const result = await runAllEngines(profiles);

    for (const [platform, vector] of Object.entries(result.signalVectors)) {
      const dc = vector.signals.find((s) => s.id === 'dataCompleteness');
      expect(dc).toBeDefined();
      expect(dc!.category).toBe('content');
      expect(dc!.confidence).toBe(1.0);
    }
  });

  it('still returns all existing result fields', async () => {
    const profiles = getDemoProfile('tutorial');
    const result = await runAllEngines(profiles);

    expect(result.personaScores).toBeDefined();
    expect(result.explanations).toBeDefined();
    expect(result.comparison).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.benchmarkResult).toBeDefined();
    expect(result.nicheResult).toBeDefined();
    expect(result.allPosts).toBeDefined();
    expect(result.bestPlatform).toBeDefined();
    expect(result.signalVectors).toBeDefined();
  });
});
