import { describe, it, expect } from 'vitest';
import { detectNiche } from '../niche-detect';
import { NICHE_BENCHMARKS } from '../benchmark-data';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { CreatorProfile } from '@/lib/schema/creator-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the Douyin profile for a given demo persona type. */
function getDouyinProfile(type: 'tutorial' | 'entertainment' | 'lifestyle'): CreatorProfile {
  return getDemoProfile(type)['douyin'];
}

// ---------------------------------------------------------------------------
// detectNiche — demo profiles
// ---------------------------------------------------------------------------

describe('detectNiche', () => {
  it('detects "tutorial" niche for the tutorial persona', () => {
    const profile = getDouyinProfile('tutorial');
    const result = detectNiche(profile);
    expect(result.niche).toBe('tutorial');
  });

  it('detects "entertainment" niche for the entertainment persona', () => {
    const profile = getDouyinProfile('entertainment');
    const result = detectNiche(profile);
    expect(result.niche).toBe('entertainment');
  });

  it('returns a known niche for the lifestyle persona', () => {
    const profile = getDouyinProfile('lifestyle');
    const result = detectNiche(profile);
    // Lifestyle posts contain a mix — accept any valid niche
    expect(result.niche).toBeTruthy();
    expect(result.label).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns "lifestyle" with confidence 0 for a profile with no posts', () => {
    const profile = getDouyinProfile('tutorial');
    const empty: CreatorProfile = { ...profile, posts: [] };
    const result = detectNiche(empty);
    expect(result.niche).toBe('lifestyle');
    expect(result.confidence).toBe(0);
  });

  it('uses pre-computed contentDistribution when provided', () => {
    const profile = getDouyinProfile('lifestyle');
    const dist = { tutorial: 60, tech: 25, daily: 15 };
    const result = detectNiche(profile, dist);
    expect(result.niche).toBe('tutorial');
  });

  it('confidence is between 0 and 1', () => {
    const profile = getDouyinProfile('entertainment');
    const result = detectNiche(profile);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns a label matching NICHE_BENCHMARKS for the detected niche', () => {
    const profile = getDouyinProfile('tutorial');
    const result = detectNiche(profile);
    expect(result.label).toBe(NICHE_BENCHMARKS[result.niche].label);
  });
});
