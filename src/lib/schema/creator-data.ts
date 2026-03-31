/**
 * Core data types for the DashPersona creator intelligence engine.
 *
 * CreatorProfile is the universal input format consumed by all adapters
 * and analysis engines. It is platform-agnostic: adapters for Douyin,
 * TikTok, XHS (or any future platform) normalise raw data into this
 * shape before any analysis begins.
 *
 * @module schema/creator-data
 */

// ---------------------------------------------------------------------------
// Enums / branded unions
// ---------------------------------------------------------------------------

/** Supported first-class platforms. The `string & {}` widening allows future
 *  platforms without requiring a schema change. */
export type Platform = 'douyin' | 'tiktok' | 'xhs' | (string & {});

/** How the data was ingested. 'collector' = Electron Collector desktop app. */
export type DataSource = 'demo' | 'html_parse' | 'manual_import' | 'extension' | 'browser' | 'cdp' | 'collector';

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

/** A single published content item (video, note, reel, etc.). */
export interface Post {
  /** Platform-native content identifier. */
  postId: string;

  /** Post caption / description text. */
  desc: string;

  /** ISO-8601 publication timestamp (may be absent for scraped data). */
  publishedAt?: string;

  /** Total view count. */
  views: number;

  /** Total like count. */
  likes: number;

  /** Total comment count. */
  comments: number;

  /** Total share count. */
  shares: number;

  /** Total save / bookmark count. */
  saves: number;

  // --- Platform-specific content quality signals (Douyin / TikTok) ---

  /**
   * 5-second completion rate (0-1). Fraction of viewers who watched >= 5s.
   * Primary ranking signal on Douyin — weighted higher than likes.
   * @platform douyin, tiktok
   */
  completionRate?: number;

  /**
   * 2-second bounce rate (0-1). Fraction of viewers who left within 2s.
   * Inverse quality signal — high bounce = low content quality.
   * @platform douyin
   */
  bounceRate?: number;

  /**
   * Average watch duration in seconds.
   * Direct measure of content holding power.
   * @platform douyin, tiktok, youtube
   */
  avgWatchDuration?: number;

  /** Hashtags extracted from the post description. */
  tags?: string[];

  /**
   * Content category label assigned by the PersonaScoreEngine.
   * Not present on raw input data -- filled during analysis.
   */
  contentType?: string;
}

// ---------------------------------------------------------------------------
// ProfileInfo
// ---------------------------------------------------------------------------

/** Public profile metadata for a creator account. */
export interface ProfileInfo {
  /** Display name on the platform. */
  nickname: string;

  /** Unique handle / account ID (e.g. @username). */
  uniqueId: string;

  /** Avatar image URL. */
  avatarUrl?: string;

  /** Current follower count. */
  followers: number;

  /** Cumulative "liked" count across all content. */
  likesTotal: number;

  /** Number of published videos / notes. */
  videosCount: number;

  /** Creator bio / self-description. */
  bio?: string;
}

// ---------------------------------------------------------------------------
// HistorySnapshot
// ---------------------------------------------------------------------------

/**
 * A lightweight point-in-time snapshot used for growth calculations.
 * Stored in `CreatorProfile.history` as an ordered time-series.
 */
export interface HistorySnapshot {
  /** ISO-8601 timestamp when this snapshot was captured. */
  fetchedAt: string;

  /** Metric values at the time of capture. */
  profile: {
    followers: number;
    likesTotal: number;
    videosCount: number;
  };
}

// ---------------------------------------------------------------------------
// FanPortrait
// ---------------------------------------------------------------------------

/** Audience demographic breakdown from platform analytics. */
export interface FanPortrait {
  gender?: { male: number; female: number };
  interests?: { name: string; percentage: number }[];
  provinces?: { name: string; percentage: number }[];
  ageGroups?: { range: string; percentage: number }[];
  devices?: { name: string; percentage: number }[];
  activityLevels?: { level: string; percentage: number }[];
}

// ---------------------------------------------------------------------------
// CreatorProfile
// ---------------------------------------------------------------------------

/**
 * The canonical data structure representing a single creator account on a
 * single platform. All analysis engines accept this type as their primary
 * input.
 */
export interface CreatorProfile {
  /** Which platform this data originates from. */
  platform: Platform;

  /** Canonical URL to the creator's profile page. */
  profileUrl: string;

  /** ISO-8601 timestamp of the most recent data fetch. */
  fetchedAt: string;

  /** How the data was ingested. */
  source: DataSource;

  /** Current public profile information. */
  profile: ProfileInfo;

  /** Most-recent content items (newest first by convention). */
  posts: Post[];

  /**
   * Optional chronological snapshots for growth / trend analysis.
   * Oldest first by convention.
   */
  history?: HistorySnapshot[];

  /** Optional audience demographic data from platform analytics. */
  fanPortrait?: FanPortrait;
}

// ---------------------------------------------------------------------------
// BenchmarkProfile
// ---------------------------------------------------------------------------

/**
 * A CreatorProfile tagged with `role: 'benchmark'` for use in comparative
 * analysis against a user's own profile.
 */
export type BenchmarkProfile = CreatorProfile & { role: 'benchmark' };
