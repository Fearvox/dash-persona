import { describe, it, expect } from 'vitest';
import {
  explainPersonaScore,
  explainGrowthDelta,
  explainNodeScoring,
} from '../explain';
import { computePersonaScore } from '../persona';
import { computeGrowthDelta } from '../growth';
import { scoreNode } from '../persona-tree';
import { getDemoProfile } from '../../adapters/demo-adapter';
import type { Post } from '../../schema/creator-data';
import type { PersonaTreeNode } from '../../schema/persona-tree';
import type { GrowthDelta, MetricDelta } from '../growth';
import type { NodeScoring } from '../../schema/persona-tree';

// ---------------------------------------------------------------------------
// Helper: create a minimal post
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<Post> & { desc: string }): Post {
  return {
    postId: `test_${Math.random().toString(36).slice(2, 8)}`,
    views: 10_000,
    likes: 500,
    comments: 50,
    shares: 20,
    saves: 30,
    publishedAt: new Date(
      Date.now() - Math.random() * 30 * 86_400_000,
    ).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// explainPersonaScore
// ---------------------------------------------------------------------------

describe('explainPersonaScore', () => {
  it('returns explanations for all 6 dimensions', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = Object.values(profiles)[0];
    const score = computePersonaScore(profile);
    const explanations = explainPersonaScore(score, profile.posts);

    const expectedKeys = [
      'contentMix',
      'engagementProfile',
      'rhythm',
      'personaConsistency',
      'growthHealth',
      'viralPotential',
    ];

    for (const key of expectedKeys) {
      expect(explanations).toHaveProperty(key);
    }
    expect(Object.keys(explanations)).toHaveLength(6);
  });

  it('each explanation has a valid formula string', () => {
    const profiles = getDemoProfile('entertainment');
    const profile = Object.values(profiles)[0];
    const score = computePersonaScore(profile);
    const explanations = explainPersonaScore(score, profile.posts);

    for (const [, exp] of Object.entries(explanations)) {
      expect(typeof exp.formula).toBe('string');
      expect(exp.formula.length).toBeGreaterThan(0);
    }
  });

  it('each explanation has non-empty factors', () => {
    const profiles = getDemoProfile('lifestyle');
    const profile = Object.values(profiles)[0];
    const score = computePersonaScore(profile);
    const explanations = explainPersonaScore(score, profile.posts);

    for (const [, exp] of Object.entries(explanations)) {
      expect(exp.factors.length).toBeGreaterThan(0);
      for (const factor of exp.factors) {
        expect(typeof factor.name).toBe('string');
        expect(factor.name.length).toBeGreaterThan(0);
        expect(typeof factor.value).toBe('number');
        expect(typeof factor.weight).toBe('number');
        expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
        expect(Array.isArray(factor.topPostIds)).toBe(true);
      }
    }
  });

  it('each explanation has a non-empty summary', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = Object.values(profiles)[0];
    const score = computePersonaScore(profile);
    const explanations = explainPersonaScore(score, profile.posts);

    for (const [, exp] of Object.entries(explanations)) {
      expect(typeof exp.summary).toBe('string');
      expect(exp.summary.length).toBeGreaterThan(0);
    }
  });

  it('score values match the persona score dimensions', () => {
    const profiles = getDemoProfile('tutorial');
    const profile = Object.values(profiles)[0];
    const score = computePersonaScore(profile);
    const explanations = explainPersonaScore(score, profile.posts);

    // Content mix score = min(categories * 10, 100)
    const catCount = Object.keys(score.contentDistribution).length;
    expect(explanations.contentMix.score).toBe(
      Math.min(catCount * 10, 100),
    );

    // Rhythm score = consistencyScore
    expect(explanations.rhythm.score).toBe(score.rhythm.consistencyScore);

    // Consistency score matches
    expect(explanations.personaConsistency.score).toBe(
      score.consistency.score,
    );
  });

  it('handles insufficient_data persona score gracefully', () => {
    const emptyProfile = {
      platform: 'test' as const,
      profileUrl: 'https://example.com',
      fetchedAt: new Date().toISOString(),
      source: 'demo' as const,
      profile: {
        nickname: 'test',
        uniqueId: 'test',
        followers: 0,
        likesTotal: 0,
        videosCount: 0,
      },
      posts: [],
    };

    const score = computePersonaScore(emptyProfile);
    const explanations = explainPersonaScore(score, []);

    expect(Object.keys(explanations)).toHaveLength(6);
    for (const [, exp] of Object.entries(explanations)) {
      expect(typeof exp.formula).toBe('string');
      expect(typeof exp.summary).toBe('string');
      expect(typeof exp.score).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// explainGrowthDelta
// ---------------------------------------------------------------------------

describe('explainGrowthDelta', () => {
  function makeDelta(
    current: number,
    baseline: number,
  ): MetricDelta {
    const delta = current - baseline;
    const pct = baseline > 0 ? (delta / baseline) * 100 : 0;
    return { current, baseline, delta, pct };
  }

  it('handles positive deltas', () => {
    const delta: GrowthDelta = {
      followers: makeDelta(11000, 10000),
      likesTotal: makeDelta(55000, 50000),
      videosCount: makeDelta(22, 20),
      totalViews: makeDelta(110000, 100000),
      baselineAt: '2026-03-20T00:00:00Z',
      latestAt: '2026-03-24T00:00:00Z',
    };

    const exp = explainGrowthDelta(delta);

    expect(exp.score).toBeGreaterThan(0);
    expect(exp.formula.length).toBeGreaterThan(0);
    expect(exp.factors).toHaveLength(3);
    expect(exp.factors[0].impact).toBe('positive');
    expect(exp.summary).toContain('+1000');
  });

  it('handles negative deltas', () => {
    const delta: GrowthDelta = {
      followers: makeDelta(9000, 10000),
      likesTotal: makeDelta(48000, 50000),
      videosCount: makeDelta(20, 20),
      totalViews: makeDelta(90000, 100000),
      baselineAt: '2026-03-20T00:00:00Z',
      latestAt: '2026-03-24T00:00:00Z',
    };

    const exp = explainGrowthDelta(delta);

    expect(exp.factors[0].impact).toBe('negative');
    expect(exp.summary).toContain('-1000');
  });

  it('handles zero deltas', () => {
    const delta: GrowthDelta = {
      followers: makeDelta(10000, 10000),
      likesTotal: makeDelta(50000, 50000),
      videosCount: makeDelta(20, 20),
      totalViews: makeDelta(100000, 100000),
      baselineAt: '2026-03-20T00:00:00Z',
      latestAt: '2026-03-24T00:00:00Z',
    };

    const exp = explainGrowthDelta(delta);

    expect(exp.factors[0].impact).toBe('neutral');
    expect(exp.factors[0].value).toBe(0);
  });

  it('returns 3 factors for followers, likes, and views', () => {
    const delta: GrowthDelta = {
      followers: makeDelta(15000, 10000),
      likesTotal: makeDelta(60000, 50000),
      videosCount: makeDelta(25, 20),
      totalViews: makeDelta(150000, 100000),
      baselineAt: '2026-03-20T00:00:00Z',
      latestAt: '2026-03-24T00:00:00Z',
    };

    const exp = explainGrowthDelta(delta);

    const factorNames = exp.factors.map((f) => f.name);
    expect(factorNames).toContain('Followers');
    expect(factorNames).toContain('Likes');
    expect(factorNames).toContain('Views');
  });
});

// ---------------------------------------------------------------------------
// explainNodeScoring
// ---------------------------------------------------------------------------

describe('explainNodeScoring', () => {
  it('returns valid composite explanation', () => {
    const posts: Post[] = [
      makePost({
        postId: 'node-p1',
        desc: 'tutorial on React hooks #教程',
        views: 20000,
        likes: 1200,
        comments: 80,
        shares: 40,
        saves: 100,
      }),
      makePost({
        postId: 'node-p2',
        desc: 'CSS grid tutorial #教学',
        views: 15000,
        likes: 900,
        comments: 60,
        shares: 30,
        saves: 80,
      }),
    ];

    const node: PersonaTreeNode = {
      id: 'PE-TEST',
      parentId: null,
      title: 'Test Node',
      series: 'content-mix',
      status: 'running',
      outcome: 'branch',
      hypothesis: 'Testing explanation',
      startedAt: new Date().toISOString(),
      variants: [
        {
          id: 'PE-TEST-A',
          label: 'Variant A',
          description: 'Test variant',
          postIds: ['node-p1', 'node-p2'],
        },
      ],
    };

    const scoring = scoreNode(node, posts);
    const exp = explainNodeScoring(scoring, posts);

    expect(exp.score).toBe(scoring.compositeScore);
    expect(exp.factors).toHaveLength(3);
    expect(exp.formula).toContain('engagement');
    expect(exp.formula).toContain('retention');
    expect(exp.formula).toContain('growth');
    expect(exp.summary.length).toBeGreaterThan(0);
  });

  it('factor weights sum to 1.0', () => {
    const scoring: NodeScoring = {
      engagementScore: 70,
      retentionScore: 50,
      growthScore: 50,
      compositeScore: 58,
      passesThreshold: true,
    };

    const exp = explainNodeScoring(scoring, []);
    const totalWeight = exp.factors.reduce((s, f) => s + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('factor names include Engagement, Retention, and Growth', () => {
    const scoring: NodeScoring = {
      engagementScore: 60,
      retentionScore: 40,
      growthScore: 50,
      compositeScore: 50,
      passesThreshold: true,
    };

    const exp = explainNodeScoring(scoring, []);
    const names = exp.factors.map((f) => f.name);
    expect(names).toContain('Engagement');
    expect(names).toContain('Retention');
    expect(names).toContain('Growth');
  });

  it('summary reflects threshold status', () => {
    const passing: NodeScoring = {
      engagementScore: 80,
      retentionScore: 60,
      growthScore: 50,
      compositeScore: 65,
      passesThreshold: true,
    };

    const failing: NodeScoring = {
      engagementScore: 20,
      retentionScore: 10,
      growthScore: 50,
      compositeScore: 24,
      passesThreshold: false,
    };

    const expPassing = explainNodeScoring(passing, []);
    const expFailing = explainNodeScoring(failing, []);

    expect(expPassing.summary).toContain('Passes');
    expect(expFailing.summary).toContain('Below');
  });
});
