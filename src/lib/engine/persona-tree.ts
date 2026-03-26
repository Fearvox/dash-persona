/**
 * Persona Event Tree engine -- builds and scores a deterministic tree of
 * content strategy experiments from a {@link CreatorProfile}.
 *
 * All functions are pure and side-effect-free.
 *
 * @module engine/persona-tree
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import type {
  PersonaTreeNode,
  PersonaVariant,
  NodeScoring,
  PersonaTree,
} from '../schema/persona-tree';
import { classifyContent } from './persona';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// TreeView (hierarchical representation)
// ---------------------------------------------------------------------------

/** A tree node enriched with its resolved children. */
export interface TreeViewNode {
  node: PersonaTreeNode;
  children: TreeViewNode[];
}

/** Hierarchical tree built from flat node list. */
export interface TreeView {
  roots: TreeViewNode[];
}

// ---------------------------------------------------------------------------
// buildTreeStructure
// ---------------------------------------------------------------------------

/**
 * Build a hierarchical tree from a flat list of nodes.
 *
 * Nodes with `parentId === null` become roots. Children are sorted by
 * `startedAt` ascending.
 */
export function buildTreeStructure(nodes: PersonaTreeNode[]): TreeView {
  const nodeMap = new Map<string, TreeViewNode>();

  // Create TreeViewNode wrappers
  for (const node of nodes) {
    nodeMap.set(node.id, { node, children: [] });
  }

  const roots: TreeViewNode[] = [];

  for (const node of nodes) {
    const tvn = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      roots.push(tvn);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(tvn);
      } else {
        // Orphan node -- treat as root
        roots.push(tvn);
      }
    }
  }

  // Sort children by startedAt
  function sortChildren(tvn: TreeViewNode) {
    tvn.children.sort(
      (a, b) =>
        new Date(a.node.startedAt).getTime() -
        new Date(b.node.startedAt).getTime(),
    );
    for (const child of tvn.children) {
      sortChildren(child);
    }
  }

  for (const root of roots) {
    sortChildren(root);
  }

  roots.sort(
    (a, b) =>
      new Date(a.node.startedAt).getTime() -
      new Date(b.node.startedAt).getTime(),
  );

  return { roots };
}

// ---------------------------------------------------------------------------
// scoreNode
// ---------------------------------------------------------------------------

/**
 * Score a node based on its variant posts' actual metrics.
 *
 * - engagementScore = weighted (likes+comments+shares+saves)/views * 100, capped at 100
 * - retentionScore  = saves/(likes+1) ratio * 100, capped at 100
 * - growthScore     = stub at 50 (requires history data)
 * - compositeScore  = 40% engagement + 35% retention + 25% growth
 * - passesThreshold = compositeScore >= 50 (adjusted later by median)
 */
export function scoreNode(
  node: PersonaTreeNode,
  posts: Post[],
): NodeScoring {
  // Collect all post IDs from all variants
  const postIdSet = new Set<string>();
  for (const variant of node.variants) {
    for (const pid of variant.postIds) {
      postIdSet.add(pid);
    }
  }

  // Find matching posts
  const matchedPosts = posts.filter((p) => postIdSet.has(p.postId));

  if (matchedPosts.length === 0) {
    return {
      engagementScore: 0,
      retentionScore: 0,
      growthScore: 50,
      compositeScore: 12.5, // 0*0.4 + 0*0.35 + 50*0.25
      passesThreshold: false,
    };
  }

  // Engagement: weighted (likes+comments+shares+saves) / views
  let totalEngagement = 0;
  let totalViews = 0;
  let totalSaves = 0;
  let totalLikes = 0;

  for (const post of matchedPosts) {
    totalEngagement += post.likes + post.comments + post.shares + post.saves;
    totalViews += post.views;
    totalSaves += post.saves;
    totalLikes += post.likes;
  }

  const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;
  // Scale: 10% engagement rate = score 100
  const engagementScore = Math.min(Math.round(engagementRate * 1000), 100);

  // Retention: saves/(likes+1) ratio
  const retentionRatio = totalSaves / (totalLikes + 1);
  const retentionScore = Math.min(Math.round(retentionRatio * 100), 100);

  // Growth: stub
  const growthScore = 50;

  // Composite: 40% engagement + 35% retention + 25% growth
  const compositeScore = Math.round(
    engagementScore * 0.4 +
      retentionScore * 0.35 +
      growthScore * 0.25,
  );

  return {
    engagementScore,
    retentionScore,
    growthScore,
    compositeScore,
    passesThreshold: compositeScore >= 50, // adjusted later by median
  };
}

// ---------------------------------------------------------------------------
// generateDemoTree
// ---------------------------------------------------------------------------

/**
 * Auto-generate a demo persona tree from a CreatorProfile's posts.
 *
 * Fully deterministic: same input = same tree.
 *
 * Strategy:
 * 1. Classify all posts by content category.
 * 2. Group posts by their contentType.
 * 3. Root node = "Baseline Strategy" (mainline, adopted) using all posts.
 * 4. Top 2-3 content categories become branch experiments.
 * 5. The weakest category becomes a boundary/discarded experiment.
 * 6. Score every node from actual post metrics.
 */
export function generateDemoTree(profile: CreatorProfile): PersonaTree {
  const posts = [...profile.posts];
  const now = new Date().toISOString();

  // Classify content (mutates posts with contentType)
  classifyContent(posts);

  // Group posts by contentType
  const categoryPosts = new Map<string, Post[]>();
  for (const post of posts) {
    const cat = post.contentType ?? 'uncategorised';
    const list = categoryPosts.get(cat) ?? [];
    list.push(post);
    categoryPosts.set(cat, list);
  }

  // Sort categories by post count descending (deterministic)
  const sortedCategories = [...categoryPosts.entries()]
    .filter(([cat]) => cat !== 'uncategorised')
    .sort((a, b) => {
      const countDiff = b[1].length - a[1].length;
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]); // alphabetical tiebreak
    });

  // Determine earliest and latest post dates
  const datedPosts = posts
    .filter((p) => p.publishedAt)
    .sort(
      (a, b) =>
        new Date(a.publishedAt!).getTime() -
        new Date(b.publishedAt!).getTime(),
    );

  const earliestDate =
    datedPosts.length > 0
      ? datedPosts[0].publishedAt!
      : now;
  const latestDate =
    datedPosts.length > 0
      ? datedPosts[datedPosts.length - 1].publishedAt!
      : now;

  // Helper: create a date between earliest and latest
  function interpolateDate(fraction: number): string {
    const start = new Date(earliestDate).getTime();
    const end = new Date(latestDate).getTime();
    return new Date(start + (end - start) * fraction).toISOString();
  }

  const nodes: PersonaTreeNode[] = [];

  // --- Root node: Baseline Strategy ---
  const rootNode: PersonaTreeNode = {
    id: 'PE-001',
    parentId: null,
    title: t('engine.tree.baselineStrategy'),
    series: 'content-mix',
    status: 'adopted',
    outcome: 'mainline',
    hypothesis: t('engine.tree.baselineHypothesis'),
    startedAt: earliestDate,
    decidedAt: interpolateDate(0.3),
    variants: [
      {
        id: 'PE-001-A',
        label: t('engine.tree.variantA'),
        description: t('engine.tree.originalMixDesc'),
        postIds: posts.slice(0, Math.min(10, posts.length)).map((p) => p.postId),
      },
    ],
    decision: {
      verdict: t('engine.tree.adoptedBaseline'),
      reason: t('engine.tree.adoptedBaselineReason'),
    },
  };
  nodes.push(rootNode);

  // --- Branch experiments from top categories ---
  const branchCount = Math.min(sortedCategories.length, 3);
  const seriesNames = ['hook-style', 'content-depth', 'format-mix'];

  for (let i = 0; i < branchCount; i++) {
    const [category, catPosts] = sortedCategories[i];
    const nodeId = `PE-${String(i + 2).padStart(3, '0')}`;
    const isLast = i === branchCount - 1 && sortedCategories.length > branchCount;

    // Split posts into two variants (deterministic: even/odd index)
    const variantAPosts = catPosts.filter((_, idx) => idx % 2 === 0);
    const variantBPosts = catPosts.filter((_, idx) => idx % 2 === 1);

    const isAdopted = i === 0; // Best category gets adopted
    const isRunning = i === 1 && branchCount >= 2;

    const catLabel = t('engine.category.' + category);
    const branchNode: PersonaTreeNode = {
      id: nodeId,
      parentId: 'PE-001',
      title: t('engine.tree.focusExperiment', { category: catLabel }),
      series: seriesNames[i] ?? 'content-mix',
      status: isAdopted ? 'adopted' : isRunning ? 'running' : 'planned',
      outcome: 'branch',
      hypothesis: t('engine.tree.focusHypothesis', { category: catLabel }),
      startedAt: interpolateDate(0.2 + i * 0.2),
      decidedAt: isAdopted ? interpolateDate(0.7 + i * 0.1) : null,
      variants: [
        {
          id: `${nodeId}-A`,
          label: t('engine.tree.variantA'),
          description: t('engine.tree.highFrequencyDesc', { category: catLabel }),
          postIds: variantAPosts.map((p) => p.postId),
        },
        ...(variantBPosts.length > 0
          ? [
              {
                id: `${nodeId}-B`,
                label: t('engine.tree.variantB'),
                description: t('engine.tree.mixedDesc', { category: catLabel }),
                postIds: variantBPosts.map((p) => p.postId),
              },
            ]
          : []),
      ],
      ...(isAdopted
        ? {
            decision: {
              verdict: t('engine.tree.adopted'),
              reason: t('engine.tree.adoptedReason', { category: catLabel }),
              mergedBack: 'PE-001',
            },
          }
        : {}),
    };
    nodes.push(branchNode);
  }

  // --- Boundary / discarded experiment from weakest category ---
  if (sortedCategories.length > branchCount) {
    const [weakCategory, weakPosts] =
      sortedCategories[sortedCategories.length - 1];
    const boundaryId = `PE-${String(branchCount + 2).padStart(3, '0')}`;

    const weakCatLabel = t('engine.category.' + weakCategory);
    const boundaryNode: PersonaTreeNode = {
      id: boundaryId,
      parentId: 'PE-001',
      title: t('engine.tree.pivotTest', { category: weakCatLabel }),
      series: 'content-mix',
      status: 'discarded',
      outcome: 'boundary',
      hypothesis: t('engine.tree.pivotHypothesis', { category: weakCatLabel }),
      startedAt: interpolateDate(0.4),
      decidedAt: interpolateDate(0.8),
      variants: [
        {
          id: `${boundaryId}-A`,
          label: t('engine.tree.variantA'),
          description: t('engine.tree.pureDesc', { category: weakCatLabel }),
          postIds: weakPosts.map((p) => p.postId),
        },
      ],
      decision: {
        verdict: t('engine.tree.discarded'),
        reason: t('engine.tree.discardedReason', { category: weakCatLabel }),
        rejected: t('engine.tree.discardedDetail'),
      },
    };
    nodes.push(boundaryNode);
  }

  // --- Score all nodes ---
  const allScores: number[] = [];
  for (const node of nodes) {
    node.scoring = scoreNode(node, posts);
    allScores.push(node.scoring.compositeScore);
  }

  // Adaptive threshold: median of all composite scores, minimum 50
  allScores.sort((a, b) => a - b);
  const median =
    allScores.length % 2 === 0
      ? (allScores[allScores.length / 2 - 1] +
          allScores[allScores.length / 2]) /
        2
      : allScores[Math.floor(allScores.length / 2)];
  const threshold = Math.max(median, 50);

  for (const node of nodes) {
    if (node.scoring) {
      node.scoring.passesThreshold = node.scoring.compositeScore >= threshold;
    }
  }

  return {
    nodes,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// getTreeLanes
// ---------------------------------------------------------------------------

/**
 * Partition tree nodes into three lanes for visualization.
 *
 * - mainline:   outcome === 'mainline'
 * - branches:   outcome === 'branch'
 * - boundaries: outcome === 'boundary'
 *
 * Each lane is sorted by startedAt ascending.
 */
export function getTreeLanes(tree: PersonaTree): {
  mainline: PersonaTreeNode[];
  branches: PersonaTreeNode[];
  boundaries: PersonaTreeNode[];
} {
  const mainline: PersonaTreeNode[] = [];
  const branches: PersonaTreeNode[] = [];
  const boundaries: PersonaTreeNode[] = [];

  for (const node of tree.nodes) {
    switch (node.outcome) {
      case 'mainline':
        mainline.push(node);
        break;
      case 'branch':
        branches.push(node);
        break;
      case 'boundary':
        boundaries.push(node);
        break;
    }
  }

  const byDate = (a: PersonaTreeNode, b: PersonaTreeNode) =>
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();

  mainline.sort(byDate);
  branches.sort(byDate);
  boundaries.sort(byDate);

  return { mainline, branches, boundaries };
}

// ---------------------------------------------------------------------------
// detectConflicts
// ---------------------------------------------------------------------------

/**
 * Check if a human decision conflicts with the metric verdict.
 *
 * A conflict exists when:
 * - Node is 'adopted' but scoring.passesThreshold is false, OR
 * - Node is 'discarded' but scoring.passesThreshold is true
 */
export function detectConflicts(node: PersonaTreeNode): boolean {
  if (!node.scoring || !node.decision) return false;

  const isAdopted = node.status === 'adopted';
  const isDiscarded = node.status === 'discarded';
  const passes = node.scoring.passesThreshold;

  return (isAdopted && !passes) || (isDiscarded && passes);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
