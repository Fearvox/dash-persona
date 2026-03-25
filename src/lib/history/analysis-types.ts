/**
 * Types for analysis result snapshots and delta computation.
 *
 * AnalysisSnapshot captures a complete analysis result at a point in time.
 * AnalysisDelta captures the change between two consecutive analyses.
 *
 * @module history/analysis-types
 */

import type { PersonaScore } from '../engine/persona';
import type { NicheDetectionResult } from '../engine/niche-detect';

// ---------------------------------------------------------------------------
// AnalysisSnapshot — stored in IndexedDB
// ---------------------------------------------------------------------------

/**
 * A complete analysis result captured at a point in time.
 * Stored via HistoryStore.saveAnalysisSnapshot().
 */
export interface AnalysisSnapshot {
  /** ISO-8601 timestamp when this analysis was performed. */
  timestamp: string;

  /** Platform this analysis applies to. */
  platform: string;

  /** Overall persona score (0-100). */
  overallScore: number;

  /** Engagement rate (0-1). */
  engagementRate: number;

  /** Follower count at time of analysis. */
  followers: number;

  /** Total likes at time of analysis. */
  likesTotal: number;

  /** Number of posts analysed. */
  postsAnalysed: number;

  /** Growth momentum label. */
  momentum: string;

  /** Consistency score (0-100). */
  consistencyScore: number;

  /** Rhythm consistency score (0-100). */
  rhythmScore: number;

  /** Detected niche label. */
  nicheLabel?: string;

  /** Niche detection confidence (0-1). */
  nicheConfidence?: number;
}

// ---------------------------------------------------------------------------
// AnalysisDelta — computed, not stored
// ---------------------------------------------------------------------------

/**
 * The delta between the current analysis and the previous one.
 * Computed by compareWithLast(), not stored in IndexedDB.
 */
export interface AnalysisDelta {
  /** Whether there is a previous analysis to compare against. */
  hasPrevious: boolean;

  /** Time of the previous analysis (ISO-8601). */
  previousTimestamp?: string;

  /** Change in overall score. */
  scoreChange: number;

  /** Change in followers. */
  followersDelta: number;

  /** Change in engagement rate (percentage points). */
  engagementDelta: number;

  /** Change in likes total. */
  likesDelta: number;

  /** Change in posts analysed. */
  postsDelta: number;

  /** Change in consistency score. */
  consistencyDelta: number;

  /** Change in rhythm score. */
  rhythmDelta: number;

  /** Previous momentum label for comparison. */
  previousMomentum?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract an AnalysisSnapshot from engine outputs.
 */
export function extractAnalysisSnapshot(
  platform: string,
  overallScore: number,
  score: PersonaScore,
  nicheResult?: NicheDetectionResult,
): AnalysisSnapshot {
  return {
    timestamp: new Date().toISOString(),
    platform,
    overallScore,
    engagementRate: score.engagement.overallRate,
    followers: 0, // filled by caller from profile
    likesTotal: 0, // filled by caller from profile
    postsAnalysed: score.postsAnalysed,
    momentum: score.growthHealth.momentum,
    consistencyScore: score.consistency.score,
    rhythmScore: score.rhythm.consistencyScore,
    nicheLabel: nicheResult?.label,
    nicheConfidence: nicheResult?.confidence,
  };
}

/**
 * Compute the delta between the current analysis and the last stored one.
 */
export function computeAnalysisDelta(
  current: AnalysisSnapshot,
  previous: AnalysisSnapshot | null,
): AnalysisDelta {
  if (!previous) {
    return {
      hasPrevious: false,
      scoreChange: 0,
      followersDelta: 0,
      engagementDelta: 0,
      likesDelta: 0,
      postsDelta: 0,
      consistencyDelta: 0,
      rhythmDelta: 0,
    };
  }

  return {
    hasPrevious: true,
    previousTimestamp: previous.timestamp,
    scoreChange: current.overallScore - previous.overallScore,
    followersDelta: current.followers - previous.followers,
    engagementDelta: current.engagementRate - previous.engagementRate,
    likesDelta: current.likesTotal - previous.likesTotal,
    postsDelta: current.postsAnalysed - previous.postsAnalysed,
    consistencyDelta: current.consistencyScore - previous.consistencyScore,
    rhythmDelta: current.rhythmScore - previous.rhythmScore,
    previousMomentum: previous.momentum,
  };
}
