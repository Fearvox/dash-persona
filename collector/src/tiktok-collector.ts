/**
 * TikTok creator collection engine.
 *
 * Collects public TikTok creator profiles via Playwright network interception.
 * Uses passive response observation (page.on('response')) — does NOT use
 * page.route() which would interfere with TikTok's request sequencing.
 *
 * Anti-fingerprint measures are applied at the BrowserContext level in
 * BrowserManager.init(). This module adds navigation jitter on top.
 *
 * @module collector/tiktok-collector
 */

import { join } from 'path';
import type { Page, Response as PwResponse } from 'playwright';
import { BrowserManager } from './browser';
import { atomicWriteJSON, getDataDir, ensureDataDir } from './storage';
import {
  snapshotFilename,
  SNAPSHOT_SCHEMA_VERSION,
  type CreatorProfile,
  type CreatorSnapshot,
  type Post,
} from './snapshot-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIKTOK_BASE = 'https://www.tiktok.com';

/** DOM selectors that indicate a CAPTCHA overlay is visible. */
export const CAPTCHA_SELECTORS = [
  '#captcha-verify-image',
  'div[class*="captcha_verify"]',
  'div[class*="secsdk-captcha"]',
  'iframe[src*="captcha"]',
  '#secsdk-captcha-drag-wrapper',
];

/** CAPTCHA timeout: 5 min for manual, indefinite for scheduled (Review #8). */
const CAPTCHA_TIMEOUT_MANUAL_MS = 300_000;
const CAPTCHA_TIMEOUT_SCHEDULED_MS = 0; // 0 = no timeout (wait indefinitely)

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const TIKTOK_ERROR_CODES = {
  RATE_LIMITED: 'TIKTOK_RATE_LIMITED',
  PROFILE_NOT_FOUND: 'TIKTOK_PROFILE_NOT_FOUND',
  NETWORK_ERROR: 'TIKTOK_NETWORK_ERROR',
  BROWSER_NOT_READY: 'BROWSER_NOT_READY',
  CAPTCHA_DETECTED: 'TIKTOK_CAPTCHA_DETECTED',
  CAPTCHA_TIMEOUT: 'CAPTCHA_TIMEOUT',
} as const;

export interface TikTokCollectionError {
  code: string;
  message: string;
  remediation: string;
}

export function classifyTikTokError(err: unknown): TikTokCollectionError {
  const message = err instanceof Error ? err.message : String(err);

  if (/429|rate.?limit/i.test(message)) {
    return {
      code: TIKTOK_ERROR_CODES.RATE_LIMITED,
      message: 'API returned HTTP 429 after 3 retries',
      remediation: 'Wait 10-15 minutes before retrying this creator.',
    };
  }
  if (/404|not found|empty user/i.test(message)) {
    return {
      code: TIKTOK_ERROR_CODES.PROFILE_NOT_FOUND,
      message: 'Profile page returned 404 or empty user data',
      remediation: 'Check that the creator URL is correct and the account is public.',
    };
  }
  if (/captcha.timeout/i.test(message)) {
    return {
      code: TIKTOK_ERROR_CODES.CAPTCHA_TIMEOUT,
      message: 'CAPTCHA was not solved within 5 minutes',
      remediation: 'Solve the CAPTCHA in the browser window and try again.',
    };
  }
  if (/network|ECONNREFUSED|ENOTFOUND|no response/i.test(message)) {
    return {
      code: TIKTOK_ERROR_CODES.NETWORK_ERROR,
      message: 'Network request failed (no response received)',
      remediation:
        'Check your internet connection. If the issue persists, try restarting the Collector.',
    };
  }
  if (/not initialized|not ready/i.test(message)) {
    return {
      code: TIKTOK_ERROR_CODES.BROWSER_NOT_READY,
      message: 'Browser context is not initialized',
      remediation:
        'Restart DashPersona Collector. If the issue continues, check the log at ~/.dashpersona/collector.log.',
    };
  }
  return {
    code: 'TIKTOK_UNKNOWN_ERROR',
    message,
    remediation: 'An unexpected error occurred. Please file a GitHub issue with the error message.',
  };
}

// ---------------------------------------------------------------------------
// Jitter helper (D-02: 1.5-3.5s navigation jitter between actions)
// ---------------------------------------------------------------------------

function jitter(minMs = 1500, maxMs = 3500): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, minMs + Math.random() * (maxMs - minMs))
  );
}

// ---------------------------------------------------------------------------
// Raw API response types (TikTok internal)
// ---------------------------------------------------------------------------

interface TikTokUserDetail {
  userInfo?: {
    user?: {
      id?: string;
      uniqueId?: string;
      nickname?: string;
      avatarLarger?: string;
      signature?: string;
      verified?: boolean;
      secUid?: string;
    };
    stats?: {
      followingCount?: number;
      followerCount?: number;
      heartCount?: number;
      videoCount?: number;
      diggCount?: number;
    };
  };
  statusCode?: number;
}

interface TikTokPostItem {
  id?: string;
  desc?: string;
  createTime?: number;
  stats?: {
    diggCount?: number;
    shareCount?: number;
    commentCount?: number;
    playCount?: number;
    collectCount?: number;
  };
  textExtra?: Array<{ hashtagName?: string; type?: number }>;
  video?: { duration?: number };
}

interface TikTokPostListResponse {
  itemList?: TikTokPostItem[];
  cursor?: string;
  hasMore?: boolean;
  statusCode?: number;
}

// ---------------------------------------------------------------------------
// API response validation (Review #7: guard against TikTok schema changes)
// ---------------------------------------------------------------------------

/**
 * Validate that the intercepted user detail JSON has the expected shape.
 * Returns true if the response contains usable profile data.
 * Logs a warning and returns false if the schema is unrecognized.
 */
function isValidUserDetail(body: unknown): body is TikTokUserDetail {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.userInfo !== 'object' || obj.userInfo === null) {
    console.warn('[tiktok] User detail response missing userInfo — TikTok API schema may have changed');
    return false;
  }
  const userInfo = obj.userInfo as Record<string, unknown>;
  if (typeof userInfo.user !== 'object' || userInfo.user === null) {
    console.warn('[tiktok] User detail response missing userInfo.user — TikTok API schema may have changed');
    return false;
  }
  return true;
}

/**
 * Validate that the intercepted post list JSON has the expected shape.
 */
function isValidPostList(body: unknown): body is TikTokPostListResponse {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.itemList)) {
    console.warn('[tiktok] Post list response missing itemList array — TikTok API schema may have changed');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// CAPTCHA detection
// ---------------------------------------------------------------------------

export async function detectCaptcha(page: Page): Promise<boolean> {
  for (const selector of CAPTCHA_SELECTORS) {
    const el = await page.$(selector);
    if (el) return true;
  }
  return false;
}

/**
 * Wait until CAPTCHA elements are no longer present.
 * Throws with code CAPTCHA_TIMEOUT if not resolved within timeoutMs.
 * Pass 0 for indefinite wait (used for scheduled runs).
 */
export async function waitForCaptchaResolution(
  page: Page,
  timeoutMs = CAPTCHA_TIMEOUT_MANUAL_MS,
): Promise<void> {
  try {
    await page.waitForFunction(
      (selectors: string[]) => !selectors.some((s) => document.querySelector(s)),
      CAPTCHA_SELECTORS,
      { timeout: timeoutMs || 0, polling: 1000 },
    );
  } catch {
    throw new Error('captcha.timeout: CAPTCHA was not solved within the timeout period');
  }
}

// ---------------------------------------------------------------------------
// Field mapping: TikTok API -> CreatorProfile
// ---------------------------------------------------------------------------

function mapTikTokPost(item: TikTokPostItem): Post {
  return {
    postId: item.id ?? '',
    desc: item.desc ?? '',
    publishedAt: item.createTime
      ? new Date(item.createTime * 1000).toISOString()
      : undefined,
    views: item.stats?.playCount ?? 0,
    likes: item.stats?.diggCount ?? 0,
    comments: item.stats?.commentCount ?? 0,
    shares: item.stats?.shareCount ?? 0,
    saves: item.stats?.collectCount ?? 0,
    tags: (item.textExtra ?? [])
      .filter((t) => t.type === 1 && t.hashtagName)
      .map((t) => t.hashtagName as string),
  };
}

function mapTikTokProfile(
  handle: string,
  detail: TikTokUserDetail,
  posts: TikTokPostItem[],
  fetchedAt: string,
): CreatorProfile {
  const user = detail.userInfo?.user ?? {};
  const stats = detail.userInfo?.stats ?? {};

  return {
    platform: 'tiktok',
    profileUrl: `https://www.tiktok.com/@${handle}`,
    fetchedAt,
    source: 'collector',
    profile: {
      nickname: user.nickname ?? handle,
      uniqueId: user.uniqueId ?? handle,
      avatarUrl: user.avatarLarger,
      followers: stats.followerCount ?? 0,
      likesTotal: stats.heartCount ?? 0,
      videosCount: stats.videoCount ?? 0,
      bio: user.signature,
    },
    posts: posts.map(mapTikTokPost),
  };
}

// ---------------------------------------------------------------------------
// Core collection flow
// ---------------------------------------------------------------------------

export interface CollectTikTokOptions {
  handle: string;
  postCount?: number;
  /** Run context: 'manual' uses 5-min CAPTCHA timeout, 'scheduled' waits indefinitely + tray alert (Review #8). */
  context?: 'manual' | 'scheduled';
  /** Callback fired when CAPTCHA is detected — caller should surface the browser. */
  onCaptchaDetected?: (handle: string) => void;
  /** Callback fired when CAPTCHA is resolved. */
  onCaptchaResolved?: (handle: string) => void;
}

export interface CollectTikTokResult {
  profile: CreatorProfile;
  snapshotFile: string;
  collectedAt: string;
}

/**
 * Collect a TikTok creator profile end-to-end.
 *
 * Flow:
 * 1. Open a new page in the existing BrowserManager context
 * 2. Register response interceptor for /api/user/detail/ and /api/post/item_list/
 * 3. Navigate to https://www.tiktok.com/@{handle} with jitter
 * 4. Scroll to trigger post list pagination until postCount is satisfied
 * 5. Detect and handle CAPTCHA — pause, notify caller, wait for resolution
 * 6. Map raw API responses to CreatorProfile
 * 7. Write snapshot atomically to ~/.dashpersona/data/
 * 8. Return result with snapshot filename and collectedAt timestamp
 */
export async function collectTikTok(
  options: CollectTikTokOptions,
): Promise<CollectTikTokResult> {
  const { handle, postCount = 20, context = 'manual', onCaptchaDetected, onCaptchaResolved } = options;
  const captchaTimeoutMs = context === 'scheduled' ? CAPTCHA_TIMEOUT_SCHEDULED_MS : CAPTCHA_TIMEOUT_MANUAL_MS;

  const browser = BrowserManager.getInstance();
  if (!browser.isReady()) {
    throw new Error('not ready: Browser context is not initialized');
  }

  const { targetId } = await browser.newPage(`${TIKTOK_BASE}/@${handle}`);
  const page = browser.getPage(targetId);
  if (!page) throw new Error('not ready: Page could not be created');

  let userDetailData: TikTokUserDetail | null = null;
  const collectedPosts: TikTokPostItem[] = [];

  // Register passive response listener BEFORE navigation fires
  // Store reference for cleanup in finally block (Review #9: prevent listener leaks)
  const responseListener = async (response: PwResponse): Promise<void> => {
    const url = response.url();
    try {
      if (
        url.includes('/api/user/detail/') &&
        url.toLowerCase().includes(handle.toLowerCase())
      ) {
        const body: unknown = await response.json();
        if (isValidUserDetail(body)) {
          userDetailData = body;
        }
      }
      if (url.includes('/api/post/item_list/')) {
        const body: unknown = await response.json();
        if (isValidPostList(body)) {
          collectedPosts.push(...body.itemList!);
        }
      }
    } catch {
      // Ignore JSON parse errors on non-JSON responses
    }
  };
  page.on('response', responseListener);

  try {
    // Navigate — page may have already started loading (opened in newPage)
    // Re-navigate to ensure response listener is registered before DOM loads
    await page.goto(`${TIKTOK_BASE}/@${handle}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await jitter(1500, 3500);

    // Check for CAPTCHA immediately after navigation
    if (await detectCaptcha(page)) {
      onCaptchaDetected?.(handle);
      await waitForCaptchaResolution(page, captchaTimeoutMs);
      onCaptchaResolved?.(handle);
    }

    // Small scroll to trigger initial post list API call
    if (collectedPosts.length === 0) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await jitter(1500, 2500);
    }

    // Scroll to paginate until postCount satisfied or no new posts load
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 20;

    while (collectedPosts.length < postCount && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      const before = collectedPosts.length;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await jitter(1500, 3500);

      // Re-check for CAPTCHA after each scroll
      if (await detectCaptcha(page)) {
        onCaptchaDetected?.(handle);
        await waitForCaptchaResolution(page, captchaTimeoutMs);
        onCaptchaResolved?.(handle);
      }

      if (collectedPosts.length === before) break; // no new posts — end of feed
      scrollAttempts++;
    }

    // Validate user detail was captured
    // Cast needed: TS control flow can't track mutations inside async callbacks
    const capturedDetail = userDetailData as TikTokUserDetail | null;
    if (!capturedDetail || !capturedDetail.userInfo?.user?.uniqueId) {
      throw new Error('404: Profile not found or returned empty user data');
    }

    const fetchedAt = new Date().toISOString();
    const profile = mapTikTokProfile(
      handle,
      capturedDetail,
      collectedPosts.slice(0, postCount),
      fetchedAt,
    );

    // Write snapshot
    await ensureDataDir();
    const collectedAt = fetchedAt;
    const snapshot: CreatorSnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      collectedAt,
      platform: 'tiktok',
      uniqueId: profile.profile.uniqueId,
      profile,
    };

    const filename = snapshotFilename('tiktok', profile.profile.uniqueId, collectedAt);
    const filePath = join(getDataDir(), filename);
    await atomicWriteJSON(filePath, snapshot);

    return { profile, snapshotFile: filename, collectedAt };
  } finally {
    // Remove response listener to prevent leaks in persistent context (Review #9)
    page.off('response', responseListener);
    // Always close the page — BrowserManager.closePage handles cleanup
    await browser.closePage(targetId);
  }
}

// ---------------------------------------------------------------------------
// Collect and save (convenience wrapper used by BatchQueue and scheduler)
// ---------------------------------------------------------------------------

export interface CollectAndSaveOptions extends CollectTikTokOptions {
  jobId?: string;
}

export interface CollectAndSaveResult {
  success: true;
  snapshotFile: string;
  collectedAt: string;
  uniqueId: string;
  durationMs: number;
}

export async function collectAndSave(
  options: CollectAndSaveOptions,
): Promise<CollectAndSaveResult> {
  const startMs = Date.now();
  const result = await collectTikTok(options);
  return {
    success: true,
    snapshotFile: result.snapshotFile,
    collectedAt: result.collectedAt,
    uniqueId: result.profile.profile.uniqueId,
    durationMs: Date.now() - startMs,
  };
}
