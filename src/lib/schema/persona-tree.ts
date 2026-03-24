/**
 * Core types for the Persona Event Tree -- a simplified, deterministic
 * system for tracking content strategy experiments as a tree of decisions.
 *
 * Each node represents one experiment; nodes form a tree via parentId.
 * Scoring is computed deterministically from post metrics.
 *
 * @module schema/persona-tree
 */

// ---------------------------------------------------------------------------
// Node scoring
// ---------------------------------------------------------------------------

/** Computed scores for a tree node (deterministic, from post metrics). */
export interface NodeScoring {
  /** 0-100, weighted engagement rate. */
  engagementScore: number;
  /** 0-100, based on saves/shares ratio. */
  retentionScore: number;
  /** 0-100, follower change during experiment. */
  growthScore: number;
  /** 0-100, weighted combination. */
  compositeScore: number;
  /** Above adaptive median? */
  passesThreshold: boolean;
}

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

/** A variant within a persona tree node experiment. */
export interface PersonaVariant {
  /** e.g. "PE-001-A" */
  id: string;
  /** "Variant A", "Variant B" */
  label: string;
  /** Description of this variant's approach. */
  description: string;
  /** References to Post.postId */
  postIds: string[];
}

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------

/** A node in the persona event tree -- represents one content strategy experiment. */
export interface PersonaTreeNode {
  /** e.g. "PE-001" */
  id: string;
  /** null = root node; forms tree hierarchy. */
  parentId: string | null;
  /** Experiment name. */
  title: string;
  /** Group/category (e.g. "hook-style", "content-mix"). */
  series: string;
  /** Current lifecycle status. */
  status: 'planned' | 'running' | 'adopted' | 'discarded';
  /** Outcome classification. */
  outcome: 'mainline' | 'branch' | 'boundary';
  /** What this experiment tests. */
  hypothesis: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 decision timestamp (null if undecided). */
  decidedAt?: string | null;

  /** Posts associated with this experiment, grouped by variant. */
  variants: PersonaVariant[];

  /** Computed scores (deterministic, from post metrics). */
  scoring?: NodeScoring;

  /** Human-annotated decision rationale. */
  decision?: {
    verdict: string;
    reason: string;
    mergedBack?: string;
    rejected?: string;
  };
}

// ---------------------------------------------------------------------------
// Tree container
// ---------------------------------------------------------------------------

/** Top-level persona tree structure. */
export interface PersonaTree {
  nodes: PersonaTreeNode[];
  createdAt: string;
  updatedAt: string;
}
