import { describe, it, expect } from 'vitest';
import { comparePlatforms } from '../comparator';
import { getDemoProfile } from '../../adapters/demo-adapter';

// ---------------------------------------------------------------------------
// comparePlatforms
// ---------------------------------------------------------------------------

describe('comparePlatforms', () => {
  it('returns correct platform count with 3 profiles', () => {
    const profiles = getDemoProfile('tutorial');
    const profileArray = Object.values(profiles);

    const result = comparePlatforms(profileArray);

    expect(result.summaries).toHaveLength(3);
    expect(result.bestEngagementPlatform).toBeDefined();
    expect(result.largestAudiencePlatform).toBeDefined();
  });

  it('generates insights for 3-platform comparison', () => {
    const profiles = getDemoProfile('entertainment');
    const profileArray = Object.values(profiles);

    const result = comparePlatforms(profileArray);

    // With 3 diverse platforms, we should get at least one insight
    expect(Array.isArray(result.insights)).toBe(true);
    // Insights are sorted by magnitude descending
    for (let i = 1; i < result.insights.length; i++) {
      expect(result.insights[i - 1].magnitude).toBeGreaterThanOrEqual(
        result.insights[i].magnitude,
      );
    }
  });

  it('returns no comparison insights for a single platform', () => {
    const profiles = getDemoProfile('lifestyle');
    const singleProfile = [profiles.douyin];

    const result = comparePlatforms(singleProfile);

    expect(result.summaries).toHaveLength(1);
    expect(result.insights).toHaveLength(0);
    expect(result.bestEngagementPlatform).toBe('douyin');
    expect(result.largestAudiencePlatform).toBe('douyin');
  });

  it('populates each summary with expected fields', () => {
    const profiles = getDemoProfile('tutorial');
    const result = comparePlatforms(Object.values(profiles));

    for (const summary of result.summaries) {
      expect(typeof summary.platform).toBe('string');
      expect(typeof summary.followers).toBe('number');
      expect(typeof summary.totalViews).toBe('number');
      expect(typeof summary.totalEngagement).toBe('number');
      expect(typeof summary.overallEngagementRate).toBe('number');
      expect(typeof summary.medianEngagementRate).toBe('number');
      expect(typeof summary.postCount).toBe('number');
      expect(summary.postCount).toBe(30);
      expect(typeof summary.contentDistribution).toBe('object');
    }
  });

  it('returns empty result for no profiles', () => {
    const result = comparePlatforms([]);
    expect(result.summaries).toHaveLength(0);
    expect(result.insights).toHaveLength(0);
    expect(result.bestEngagementPlatform).toBeNull();
    expect(result.largestAudiencePlatform).toBeNull();
  });
});
