import { describe, it, expect } from 'vitest';
import { generateExperimentIdeas } from '../idea-generator';
import type { ExperimentIdea } from '../idea-generator';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import { generateDemoTree } from '../persona-tree';
import type { CreatorProfile, Post } from '@/lib/schema/creator-data';
import type { PersonaTree } from '@/lib/schema/persona-tree';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal profile with the given posts. */
function makeProfile(posts: Post[], platform = 'douyin'): CreatorProfile {
  return {
    platform,
    profileUrl: `https://${platform}.example.com/@test`,
    fetchedAt: '2026-01-01T00:00:00Z',
    source: 'demo',
    profile: {
      nickname: 'Test',
      uniqueId: 'test',
      followers: 1000,
      likesTotal: 5000,
      videosCount: posts.length,
    },
    posts,
  };
}

function makePost(overrides: Partial<Post> & { postId: string }): Post {
  return {
    desc: 'Test post',
    views: 1000,
    likes: 100,
    comments: 10,
    shares: 5,
    saves: 3,
    publishedAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateExperimentIdeas', () => {
  it('generates 1-5 ideas from demo data', () => {
    const profiles = getDemoProfile('tutorial');
    const ideas = generateExperimentIdeas(profiles);

    expect(ideas.length).toBeGreaterThanOrEqual(1);
    expect(ideas.length).toBeLessThanOrEqual(5);
  });

  it('each idea has non-empty title, hypothesis, and rationale', () => {
    const profiles = getDemoProfile('tutorial');
    const ideas = generateExperimentIdeas(profiles);

    for (const idea of ideas) {
      expect(idea.title.length).toBeGreaterThan(0);
      expect(idea.hypothesis.length).toBeGreaterThan(0);
      expect(idea.rationale.length).toBeGreaterThan(0);
      expect(idea.id.length).toBeGreaterThan(0);
      expect(idea.series.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(idea.potentialImpact);
      expect(idea.basedOn.length).toBeGreaterThan(0);
    }
  });

  it('ideas are sorted by potentialImpact (high > medium > low)', () => {
    const profiles = getDemoProfile('tutorial');
    const ideas = generateExperimentIdeas(profiles);

    const impactOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    for (let i = 1; i < ideas.length; i++) {
      expect(impactOrder[ideas[i].potentialImpact]).toBeGreaterThanOrEqual(
        impactOrder[ideas[i - 1].potentialImpact],
      );
    }
  });

  it('no duplicate ideas when existingTree covers the same series', () => {
    const profiles = getDemoProfile('tutorial');

    // First run: generate ideas without a tree
    const ideasWithoutTree = generateExperimentIdeas(profiles);
    expect(ideasWithoutTree.length).toBeGreaterThan(0);

    // Pick the first idea and build a covering tree for it specifically.
    // The treeCovers() function checks (series match) AND (contentHint in title).
    // Each rule's contentHint is embedded in the idea id after the rule prefix:
    //   idea-content-gap-{category}   → hint = category, series = category
    //   idea-cross-platform-{category} → hint = category, series = "cross-platform"
    //   idea-rhythm-anomaly           → hint = "rhythm", series = "scheduling"
    //   idea-persona-drift            → hint = "refocus", series = "content-identity"
    //   idea-viral-pattern-{category} → hint = category, series = "viral-replication"
    const firstIdea = ideasWithoutTree[0];

    // Extract the content hint that treeCovers will look for in node titles
    let contentHint = firstIdea.series; // default: series name itself
    if (firstIdea.id.startsWith('idea-content-gap-')) {
      contentHint = firstIdea.id.replace('idea-content-gap-', '');
    } else if (firstIdea.id.startsWith('idea-cross-platform-')) {
      contentHint = firstIdea.id.replace('idea-cross-platform-', '');
    } else if (firstIdea.id === 'idea-rhythm-anomaly') {
      contentHint = 'rhythm';
    } else if (firstIdea.id === 'idea-persona-drift') {
      contentHint = 'refocus';
    } else if (firstIdea.id.startsWith('idea-viral-pattern-')) {
      contentHint = firstIdea.id.replace('idea-viral-pattern-', '');
    }

    const coveringTree: PersonaTree = {
      nodes: [
        {
          id: 'PE-COVER',
          parentId: null,
          title: `Existing experiment for ${contentHint}`,
          series: firstIdea.series,
          status: 'running',
          outcome: 'branch',
          hypothesis: 'Already exists',
          startedAt: '2026-01-01T00:00:00Z',
          variants: [],
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    // Second run: with existing tree covering the first idea
    const ideasWithTree = generateExperimentIdeas(profiles, coveringTree);

    // The first idea should not appear since the tree already covers it
    const matchingIdea = ideasWithTree.find((i) => i.id === firstIdea.id);
    expect(matchingIdea).toBeUndefined();
  });

  it('cold start (< 5 posts) returns empty array', () => {
    const fewPosts = [
      makePost({ postId: 'p1', desc: 'Tutorial how to learn coding #教程' }),
      makePost({ postId: 'p2', desc: 'Daily vlog #日常' }),
      makePost({ postId: 'p3', desc: 'Another post #test' }),
    ];
    const profile = makeProfile(fewPosts);
    const ideas = generateExperimentIdeas({ douyin: profile });
    expect(ideas).toEqual([]);
  });

  it('deterministic: same input produces same output', () => {
    const profiles = getDemoProfile('entertainment');

    const run1 = generateExperimentIdeas(profiles);
    const run2 = generateExperimentIdeas(profiles);

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].id).toBe(run2[i].id);
      expect(run1[i].title).toBe(run2[i].title);
      expect(run1[i].hypothesis).toBe(run2[i].hypothesis);
      expect(run1[i].potentialImpact).toBe(run2[i].potentialImpact);
    }
  });

  it('generates ideas for lifestyle persona as well', () => {
    const profiles = getDemoProfile('lifestyle');
    const ideas = generateExperimentIdeas(profiles);
    expect(ideas.length).toBeGreaterThanOrEqual(1);
  });

  it('each idea has a unique id', () => {
    const profiles = getDemoProfile('tutorial');
    const ideas = generateExperimentIdeas(profiles);
    const ids = ideas.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
