/**
 * Video content structure analyzer.
 *
 * Opens a video post page via CDP proxy, seeks to evenly-spaced timestamps,
 * and captures a screenshot at each position. Screenshots are persisted via
 * tmp-manager for downstream content analysis.
 *
 * Supports XiaoHongShu (XHS) and TikTok posts. Falls back to a single
 * page screenshot when no <video> element is found (image posts).
 *
 * @module collectors/video-analyzer
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { cdpNew, cdpEval, cdpClose, cdpScreenshot, sleep } from './cdp-client';
import { saveScreenshot } from './tmp-manager';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default number of evenly-spaced segments to capture per video. */
const DEFAULT_SEGMENT_COUNT = 8;

/** Absolute maximum segments regardless of caller request. */
const MAX_SEGMENT_COUNT = 10;

/** Minimum segments regardless of caller request. */
const MIN_SEGMENT_COUNT = 1;

/** Seconds a video must be shorter than to cap segments at 3. */
const SHORT_VIDEO_THRESHOLD_S = 3;

/** Maximum segments captured for very short videos. */
const SHORT_VIDEO_MAX_SEGMENTS = 3;

/** Milliseconds to wait after navigation before querying the video element. */
const INITIAL_LOAD_WAIT_MS = 5_000;

/** Milliseconds to wait for a retry when duration is missing on first probe. */
const RETRY_LOAD_WAIT_MS = 3_000;

/** Milliseconds to wait after seeking before taking a screenshot. */
const SEEK_SETTLE_MS = 500;

/** Milliseconds to wait between videos in a batch. */
const DEFAULT_DELAY_BETWEEN_MS = 3_000;

/** Default maximum videos to process in a batch. */
const DEFAULT_MAX_VIDEOS = 5;

// ---------------------------------------------------------------------------
// JavaScript snippets evaluated inside the page
// ---------------------------------------------------------------------------

/** Returns a JSON string with video element state, or { error } when absent. */
const VIDEO_INFO_JS = `
(function() {
  var video = document.querySelector('video');
  if (!video) return JSON.stringify({ error: 'no video element' });
  return JSON.stringify({
    duration: video.duration || 0,
    currentTime: video.currentTime,
    paused: video.paused,
    readyState: video.readyState,
  });
})()
`.trim();

/** Pauses the video (best-effort — silently ignored if it fails). */
const PAUSE_JS = `document.querySelector('video') && document.querySelector('video').pause()`;

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface VideoSegment {
  /** Zero-based sequential index of this segment. */
  index: number;
  /** Position in the video expressed as whole seconds. */
  timestamp: number;
  /** Position as a fraction of total duration, in range [0.0, 1.0]. */
  relativePosition: number;
  /** File ID returned by tmp-manager (used to retrieve the file later). */
  screenshotId: string;
  /** Absolute filesystem path to the saved PNG. */
  screenshotPath: string;
}

export interface VideoAnalysis {
  platform: 'xhs' | 'tiktok';
  postId: string;
  postUrl: string;
  /** Total video duration in seconds. 0 when no video was found. */
  duration: number;
  segmentCount: number;
  segments: VideoSegment[];
  /** ISO-8601 timestamp marking when analysis completed. */
  analyzedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Shape returned by VIDEO_INFO_JS when a video element exists. */
interface VideoInfo {
  duration: number;
  currentTime: number;
  paused: boolean;
  readyState: number;
}

/** Shape returned by VIDEO_INFO_JS when no video element is present. */
interface VideoInfoError {
  error: string;
}

type VideoInfoResult = VideoInfo | VideoInfoError;

function isVideoError(r: VideoInfoResult): r is VideoInfoError {
  return 'error' in r;
}

/**
 * Evaluate VIDEO_INFO_JS in the given target tab and return the parsed result.
 * Returns a VideoInfoError on any evaluation or parse failure.
 */
async function probeVideoElement(target: string): Promise<VideoInfoResult> {
  try {
    const raw = await cdpEval(target, VIDEO_INFO_JS) as string;
    if (typeof raw !== 'string') {
      return { error: `unexpected eval result type: ${typeof raw}` };
    }
    return JSON.parse(raw) as VideoInfoResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `eval failed: ${msg}` };
  }
}

/**
 * Generate a unique temporary file path for an intermediate screenshot.
 * The file lives in os.tmpdir() and is cleaned up after its contents are
 * transferred to tmp-manager.
 */
function makeTempScreenshotPath(postId: string, index: number): string {
  const name = `dash-video-${postId.replace(/[^a-zA-Z0-9_-]/g, '_')}-seg${index}-${Date.now()}.png`;
  return path.join(os.tmpdir(), name);
}

/**
 * Clamp and normalise the requested segment count for a given video duration.
 */
function resolveSegmentCount(requested: number, duration: number): number {
  // Very short videos: cap at SHORT_VIDEO_MAX_SEGMENTS
  if (duration > 0 && duration < SHORT_VIDEO_THRESHOLD_S) {
    return SHORT_VIDEO_MAX_SEGMENTS;
  }
  return Math.min(MAX_SEGMENT_COUNT, Math.max(MIN_SEGMENT_COUNT, requested));
}

/**
 * Build an array of evenly-spaced timestamps across [0, duration).
 *
 * With N segments the timestamps are: 0, d/N, 2d/N, ..., (N-1)*d/N.
 * This keeps the last capture meaningfully before the very end of the video.
 */
function buildTimestamps(duration: number, segmentCount: number): number[] {
  const timestamps: number[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const t = (duration * i) / segmentCount;
    timestamps.push(Math.round(t * 10) / 10); // round to 1 decimal place
  }
  return timestamps;
}

/**
 * Take a screenshot of the current page state, save it via tmp-manager, and
 * return the resulting VideoSegment record.
 *
 * Returns null when the screenshot step fails — callers skip the segment.
 */
async function captureSegment(
  target: string,
  index: number,
  timestamp: number,
  duration: number,
  postId: string,
  platform: 'xhs' | 'tiktok',
): Promise<VideoSegment | null> {
  const tmpPath = makeTempScreenshotPath(postId, index);

  try {
    await cdpScreenshot(target, tmpPath);

    const buffer = fs.readFileSync(tmpPath);

    const label = `${postId}-seg${index}`;
    const meta = saveScreenshot(buffer, { platform, label });

    const relativePosition = duration > 0 ? timestamp / duration : 0;

    return {
      index,
      timestamp,
      relativePosition,
      screenshotId: meta.id,
      screenshotPath: path.join(
        // tmp-manager stores relative paths under TMP_ROOT; reconstruct absolute
        os.tmpdir(),
        'dash-persona',
        meta.path,
      ),
    };
  } catch {
    // Screenshot or save failed — caller will skip this segment
    return null;
  } finally {
    // Remove intermediate temp file regardless of outcome
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Already gone or never created — ignore
    }
  }
}

/**
 * Capture a single fallback screenshot (no seek) and return it as a
 * VideoAnalysis with one segment at timestamp 0.
 */
async function captureFallback(
  target: string,
  postUrl: string,
  platform: 'xhs' | 'tiktok',
  postId: string,
): Promise<VideoAnalysis> {
  const segment = await captureSegment(target, 0, 0, 0, postId, platform);

  const segments: VideoSegment[] = segment !== null ? [segment] : [];

  return {
    platform,
    postId,
    postUrl,
    duration: 0,
    segmentCount: segments.length,
    segments,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a single video post: open the page, capture N evenly-spaced
 * screenshots by seeking to different timestamps, and return a VideoAnalysis.
 *
 * When the post has no video element (image post, or video fails to load)
 * a single page screenshot is taken as a fallback and returned in a
 * VideoAnalysis with duration 0.
 */
export async function analyzeVideo(
  postUrl: string,
  platform: 'xhs' | 'tiktok',
  postId: string,
  options?: {
    /** Number of segments to capture (clamped to 1–10, default 8). */
    segmentCount?: number;
  },
): Promise<VideoAnalysis> {
  const requestedSegments = options?.segmentCount ?? DEFAULT_SEGMENT_COUNT;

  const target = await cdpNew(postUrl);

  try {
    // Allow the page and video player to initialise
    await sleep(INITIAL_LOAD_WAIT_MS);

    // Probe the video element
    let info = await probeVideoElement(target);

    // If video exists but duration is missing, give it more time to buffer
    if (!isVideoError(info) && (info.duration === 0 || !Number.isFinite(info.duration))) {
      await sleep(RETRY_LOAD_WAIT_MS);
      info = await probeVideoElement(target);
    }

    // No video element found — image post or load failure → single screenshot
    if (isVideoError(info)) {
      return await captureFallback(target, postUrl, platform, postId);
    }

    const duration = Number.isFinite(info.duration) && info.duration > 0
      ? info.duration
      : 0;

    // Duration still unavailable after retry — take fallback screenshot
    if (duration === 0) {
      return await captureFallback(target, postUrl, platform, postId);
    }

    // Pause the video so seeks produce stable frames
    try {
      await cdpEval(target, PAUSE_JS);
    } catch {
      // If pause fails, continue anyway — screenshots may have motion blur
    }

    const segmentCount = resolveSegmentCount(requestedSegments, duration);
    const timestamps = buildTimestamps(duration, segmentCount);
    const segments: VideoSegment[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];

      // Seek to the desired timestamp
      try {
        await cdpEval(
          target,
          `document.querySelector('video').currentTime = ${ts}`,
        );
      } catch {
        // Seek failed — skip this segment rather than aborting the whole run
        continue;
      }

      // Wait for the frame to render after seeking
      await sleep(SEEK_SETTLE_MS);

      const segment = await captureSegment(target, i, ts, duration, postId, platform);
      if (segment !== null) {
        segments.push(segment);
      }
    }

    return {
      platform,
      postId,
      postUrl,
      duration,
      segmentCount: segments.length,
      segments,
      analyzedAt: new Date().toISOString(),
    };
  } finally {
    // Always close the tab, even on error
    await cdpClose(target).catch(() => { /* best-effort */ });
  }
}

/**
 * Analyze multiple video posts in sequence.
 *
 * A configurable delay is inserted between each video to avoid triggering
 * platform rate limits. Processing stops at `maxVideos` entries regardless
 * of how many are supplied.
 *
 * Failed individual analyses are silently skipped — the returned array will
 * be shorter than the input slice when errors occur.
 */
export async function analyzeVideoBatch(
  posts: Array<{ url: string; platform: 'xhs' | 'tiktok'; postId: string }>,
  options?: {
    /** Segments per video (default 8). */
    segmentCount?: number;
    /** Stop after this many videos (default 5). */
    maxVideos?: number;
    /** Milliseconds to pause between videos (default 3000). */
    delayBetweenMs?: number;
  },
): Promise<VideoAnalysis[]> {
  const maxVideos = options?.maxVideos ?? DEFAULT_MAX_VIDEOS;
  const delayBetweenMs = options?.delayBetweenMs ?? DEFAULT_DELAY_BETWEEN_MS;
  const segmentCount = options?.segmentCount;

  const targets = posts.slice(0, maxVideos);
  const results: VideoAnalysis[] = [];

  for (let i = 0; i < targets.length; i++) {
    const { url, platform, postId } = targets[i];

    try {
      const analysis = await analyzeVideo(url, platform, postId, { segmentCount });
      results.push(analysis);
    } catch {
      // Individual video failure — skip and continue with the next
    }

    // Insert delay between videos (not after the very last one)
    if (i < targets.length - 1) {
      await sleep(delayBetweenMs);
    }
  }

  return results;
}
