import { describe, it, expect } from 'vitest';
import { comparePlatforms } from '../comparator';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

describe('comparator comparison: before vs after upgrade', () => {
  const profileMap = getDemoProfile('tutorial');
  const profiles = Object.values(profileMap);

  it('still returns valid CrossPlatformComparison structure', () => {
    const result = comparePlatforms(profiles);
    expect(result.summaries).toHaveLength(3);
    expect(result.bestEngagementPlatform).toBeTruthy();
    expect(result.largestAudiencePlatform).toBeTruthy();
  });

  it('insight types remain valid', () => {
    const result = comparePlatforms(profiles);
    const validTypes = ['engagement_gap', 'audience_size', 'best_content', 'content_distribution'];
    for (const insight of result.insights) {
      expect(validTypes).toContain(insight.type);
    }
  });

  it('single platform produces no insights', () => {
    const singleResult = comparePlatforms([profiles[0]]);
    expect(singleResult.insights).toHaveLength(0);
  });

  it('sparse data: no crashes with 3-post profiles', () => {
    const sparse = profiles.map((p) => ({ ...p, posts: p.posts.slice(0, 3) }));
    const result = comparePlatforms(sparse);
    expect(result.summaries.length).toBeGreaterThan(0);
  });
});
