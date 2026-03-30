/**
 * Benchmark dataset — synthetic creator profiles for niche-level comparisons.
 *
 * Provides 10 content niches with realistic average metrics and a deterministic
 * generator that produces synthetic BenchmarkProfile instances from those
 * averages. All output is seeded: the same niche + count always produces the
 * same profiles.
 *
 * @module engine/benchmark-data
 */

import type { BenchmarkProfile, Post, Platform } from '../schema/creator-data';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Seeded PRNG (copied from demo-adapter.ts — simple 32-bit xorshift)
// ---------------------------------------------------------------------------

function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let state = seed | 1; // avoid 0 state
  return {
    /** Returns a float in [0, 1). */
    next(): number {
      state ^= state << 13;
      state ^= state >> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    },
    /** Returns an integer in [min, max]. */
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
  };
}

// ---------------------------------------------------------------------------
// Niche definitions
// ---------------------------------------------------------------------------

export const BENCHMARK_NICHES = [
  'tutorial',
  'entertainment',
  'food',
  'fitness',
  'beauty',
  'tech',
  'travel',
  'fashion',
  'lifestyle',
  'gaming',
] as const;

export type BenchmarkNiche = (typeof BENCHMARK_NICHES)[number];

export interface NicheBenchmark {
  niche: BenchmarkNiche;
  /** Human-readable label, e.g. "Tech & Gadgets". */
  label: string;
  avgFollowers: number;
  /** 0-1 scale. */
  avgEngagementRate: number;
  avgPostsPerWeek: number;
  avgLikesTotal: number;
  avgVideosCount: number;
}

// ---------------------------------------------------------------------------
// Hardcoded realistic averages per niche
// ---------------------------------------------------------------------------

export const NICHE_BENCHMARKS: Record<BenchmarkNiche, NicheBenchmark> = {
  tutorial: {
    niche: 'tutorial',
    label: t('engine.niche.tutorial'),
    avgFollowers: 180_000,
    avgEngagementRate: 0.045,
    avgPostsPerWeek: 3.5,
    avgLikesTotal: 850_000,
    avgVideosCount: 120,
  },
  entertainment: {
    niche: 'entertainment',
    label: t('engine.niche.entertainment'),
    avgFollowers: 650_000,
    avgEngagementRate: 0.065,
    avgPostsPerWeek: 5,
    avgLikesTotal: 3_200_000,
    avgVideosCount: 200,
  },
  food: {
    niche: 'food',
    label: t('engine.niche.food'),
    avgFollowers: 280_000,
    avgEngagementRate: 0.055,
    avgPostsPerWeek: 4,
    avgLikesTotal: 1_200_000,
    avgVideosCount: 150,
  },
  fitness: {
    niche: 'fitness',
    label: t('engine.niche.fitness'),
    avgFollowers: 220_000,
    avgEngagementRate: 0.05,
    avgPostsPerWeek: 4.5,
    avgLikesTotal: 900_000,
    avgVideosCount: 160,
  },
  beauty: {
    niche: 'beauty',
    label: t('engine.niche.beauty'),
    avgFollowers: 350_000,
    avgEngagementRate: 0.06,
    avgPostsPerWeek: 3.5,
    avgLikesTotal: 1_800_000,
    avgVideosCount: 140,
  },
  tech: {
    niche: 'tech',
    label: t('engine.niche.tech'),
    avgFollowers: 200_000,
    avgEngagementRate: 0.04,
    avgPostsPerWeek: 3,
    avgLikesTotal: 750_000,
    avgVideosCount: 100,
  },
  travel: {
    niche: 'travel',
    label: t('engine.niche.travel'),
    avgFollowers: 310_000,
    avgEngagementRate: 0.058,
    avgPostsPerWeek: 2.5,
    avgLikesTotal: 1_500_000,
    avgVideosCount: 90,
  },
  fashion: {
    niche: 'fashion',
    label: t('engine.niche.fashion'),
    avgFollowers: 400_000,
    avgEngagementRate: 0.055,
    avgPostsPerWeek: 4,
    avgLikesTotal: 2_000_000,
    avgVideosCount: 130,
  },
  lifestyle: {
    niche: 'lifestyle',
    label: t('engine.niche.lifestyle'),
    avgFollowers: 250_000,
    avgEngagementRate: 0.05,
    avgPostsPerWeek: 3.5,
    avgLikesTotal: 1_000_000,
    avgVideosCount: 110,
  },
  gaming: {
    niche: 'gaming',
    label: t('engine.niche.gaming'),
    avgFollowers: 380_000,
    avgEngagementRate: 0.07,
    avgPostsPerWeek: 5.5,
    avgLikesTotal: 2_500_000,
    avgVideosCount: 250,
  },
};

// ---------------------------------------------------------------------------
// Profile generator
// ---------------------------------------------------------------------------

/**
 * Generate synthetic BenchmarkProfile instances for a given niche.
 * Deterministic: the same niche + count always produces the same output.
 */
export function generateBenchmarkProfiles(
  niche: BenchmarkNiche,
  count = 20,
): BenchmarkProfile[] {
  const avg = NICHE_BENCHMARKS[niche];
  if (!avg) return [];

  const rng = createRng(hashSeed(`benchmark-${niche}-${count}`));

  // Use a deterministic timestamp so that identical inputs always produce
  // identical output (previously used Date.now() which broke determinism).
  const deterministicDate = '2025-01-01T00:00:00.000Z';

  const profiles: BenchmarkProfile[] = [];

  for (let i = 0; i < count; i++) {
    const variance = 0.3; // ±30% from average

    const followers = Math.round(
      avg.avgFollowers * (1 + (rng.next() - 0.5) * 2 * variance),
    );
    const engRate =
      avg.avgEngagementRate * (1 + (rng.next() - 0.5) * 2 * variance);
    const postCount = rng.int(15, 25);
    const likesTotal = Math.round(
      avg.avgLikesTotal * (1 + (rng.next() - 0.5) * 2 * variance),
    );
    const videosCount = Math.round(
      avg.avgVideosCount * (1 + (rng.next() - 0.5) * 2 * variance),
    );

    // Generate posts
    const posts: Post[] = [];
    for (let j = 0; j < postCount; j++) {
      const views = rng.int(5_000, 500_000);
      const engagement = Math.round(views * engRate * (1 + (rng.next() - 0.5)));
      const likes = Math.round(engagement * 0.6);
      const comments = Math.round(engagement * 0.15);
      const shares = Math.round(engagement * 0.15);
      const saves = Math.round(engagement * 0.1);

      posts.push({
        postId: `bench-${niche}-${i}-${j}`,
        desc: `${niche} benchmark post ${j}`,
        views,
        likes: Math.max(0, likes),
        comments: Math.max(0, comments),
        shares: Math.max(0, shares),
        saves: Math.max(0, saves),
        contentType: niche,
      });
    }

    profiles.push({
      role: 'benchmark',
      platform: 'douyin' as Platform,
      profileUrl: `https://benchmark.example/${niche}/${i}`,
      fetchedAt: deterministicDate,
      source: 'demo',
      profile: {
        nickname: `${avg.label} Creator ${i + 1}`,
        uniqueId: `bench-${niche}-${i}`,
        followers,
        likesTotal,
        videosCount,
      },
      posts,
    } as BenchmarkProfile);
  }

  return profiles;
}
