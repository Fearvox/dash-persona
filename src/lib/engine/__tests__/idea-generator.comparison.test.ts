import { describe, it, expect } from 'vitest';
import { generateExperimentIdeas } from '../idea-generator';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';

describe('idea-generator comparison: before vs after upgrade', () => {
  const profiles = getDemoProfile('tutorial');

  it('returns valid ExperimentIdea array', () => {
    const ideas = generateExperimentIdeas(profiles);
    expect(Array.isArray(ideas)).toBe(true);
  });

  it('idea fields are valid', () => {
    const ideas = generateExperimentIdeas(profiles);
    for (const idea of ideas) {
      expect(idea.id).toBeTruthy();
      expect(idea.title).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(idea.potentialImpact);
    }
  });

  it('suppresses ideas for very sparse data', () => {
    const sparse: Record<string, any> = {};
    for (const [k, v] of Object.entries(profiles)) {
      sparse[k] = { ...v, posts: v.posts.slice(0, 1) };
    }
    const ideas = generateExperimentIdeas(sparse);
    expect(ideas).toHaveLength(0);
  });

  it('max 5 ideas', () => {
    const ideas = generateExperimentIdeas(profiles);
    expect(ideas.length).toBeLessThanOrEqual(5);
  });
});
