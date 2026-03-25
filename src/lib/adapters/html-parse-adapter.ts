import type { CreatorProfile, Post, Platform } from '../schema/creator-data';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

type SupportedHTMLPlatform = 'tiktok' | 'xhs';

/** Detect platform from URL hostname. */
export function detectPlatformFromUrl(url: string): SupportedHTMLPlatform | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com') || host.includes('xhs.cn')) return 'xhs';
    return null;
  } catch {
    return null;
  }
}

/** Detect platform from HTML content features. */
export function detectPlatformFromHtml(html: string): SupportedHTMLPlatform | null {
  // TikTok: __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag
  if (/__UNIVERSAL_DATA_FOR_REHYDRATION__/i.test(html)) return 'tiktok';
  // XHS: 小红书 specific markers
  if (/xiaohongshu|小红书|xhscdn\.com|__INITIAL_STATE__.*noteDetail/i.test(html)) return 'xhs';
  return null;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

/**
 * Parse public profile pages from TikTok and Red Note (小红书/XHS) by
 * extracting data from embedded script tags.
 *
 * EXPERIMENTAL: Best-effort. Platforms may block requests via captcha,
 * geo-restrictions, or rate limiting.
 */
export class HTMLParseAdapter implements DataAdapter {
  name = 'html_parse';
  description = 'Fetch and parse public TikTok / XHS profile pages (experimental)';
  experimental = true;

  async collect(url: string): Promise<CreatorProfile | null> {
    const platform = detectPlatformFromUrl(url);
    if (!platform) return null;

    // This adapter is designed to be called from an API route (server-side only)
    throw new Error(
      'HTMLParseAdapter.collect() must be called server-side via /api/collect',
    );
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function extractHashtags(desc: string): string[] {
  // Match both # and Chinese # hashtags
  const matches = desc.match(/[#＃][^\s#＃]+/g);
  return matches ? matches.map((t) => t.slice(1)) : [];
}

// ---------------------------------------------------------------------------
// Unified parse entry point
// ---------------------------------------------------------------------------

/**
 * Parse an HTML string into a CreatorProfile, auto-detecting the platform.
 * Falls back to URL-based detection if HTML detection is inconclusive.
 */
export async function parseProfileHtml(
  html: string,
  sourceUrl: string,
): Promise<CreatorProfile> {
  const platform = detectPlatformFromHtml(html) ?? detectPlatformFromUrl(sourceUrl);
  switch (platform) {
    case 'tiktok':
      return extractFromTikTokHtml(html, sourceUrl);
    case 'xhs':
      return extractFromXhsHtml(html, sourceUrl);
    default:
      throw new Error(`Unsupported platform for HTML parsing: ${sourceUrl}`);
  }
}

// ---------------------------------------------------------------------------
// TikTok parser
// ---------------------------------------------------------------------------

/** Server-side: fetch and parse a TikTok profile URL. */
export async function parseTikTokProfile(
  url: string,
): Promise<CreatorProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();
    return extractFromTikTokHtml(html, url);
  } finally {
    clearTimeout(timeout);
  }
}

export function extractFromTikTokHtml(
  html: string,
  sourceUrl: string,
): CreatorProfile {
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]) {
    throw new Error('Could not find TikTok data payload in page HTML');
  }

  const payload = JSON.parse(match[1]);
  const userInfo =
    payload?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;
  if (!userInfo) {
    throw new Error('Could not extract user info from TikTok payload');
  }

  const user = userInfo.user ?? {};
  const stats = userInfo.stats ?? {};
  const itemList = Array.isArray(userInfo.itemList) ? userInfo.itemList : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: Post[] = itemList.slice(0, 30).map((item: any) => ({
    postId: String(item.id || item.itemId || ''),
    desc: String(item.desc || '').slice(0, 300),
    publishedAt: item.createTime
      ? new Date(item.createTime * 1000).toISOString()
      : undefined,
    views: num(item.stats?.playCount),
    likes: num(item.stats?.diggCount),
    comments: num(item.stats?.commentCount),
    shares: num(item.stats?.shareCount),
    saves: num(item.stats?.collectCount),
    tags: extractHashtags(String(item.desc || '')),
  }));

  return {
    platform: 'tiktok',
    profileUrl: sourceUrl,
    fetchedAt: new Date().toISOString(),
    source: 'html_parse',
    profile: {
      nickname: user.nickname || '',
      uniqueId: user.uniqueId || '',
      avatarUrl: user.avatarLarger || user.avatarMedium || undefined,
      followers: num(stats.followerCount),
      likesTotal: num(stats.heartCount),
      videosCount: num(stats.videoCount),
      bio: user.signature || undefined,
    },
    posts,
  };
}

// ---------------------------------------------------------------------------
// XHS (小红书 / Red Note) parser
// ---------------------------------------------------------------------------

/** Server-side: fetch and parse an XHS profile URL. */
export async function parseXhsProfile(
  url: string,
): Promise<CreatorProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();
    return extractFromXhsHtml(html, url);
  } finally {
    clearTimeout(timeout);
  }
}

export function extractFromXhsHtml(
  html: string,
  sourceUrl: string,
): CreatorProfile {
  // XHS embeds user data in window.__INITIAL_STATE__ = {...}
  // Extract the assignment, then find the balanced JSON object
  const stateIdx = html.indexOf('__INITIAL_STATE__');
  if (stateIdx === -1) {
    throw new Error('Could not find XHS data payload in page HTML');
  }
  const eqIdx = html.indexOf('=', stateIdx);
  if (eqIdx === -1) {
    throw new Error('Could not find XHS data payload in page HTML');
  }
  // Find the opening brace
  const braceStart = html.indexOf('{', eqIdx);
  if (braceStart === -1) {
    throw new Error('Could not find XHS data payload in page HTML');
  }
  // Find balanced closing brace
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }
  if (braceEnd === -1) {
    throw new Error('Could not find XHS data payload in page HTML');
  }
  const rawJson = html.slice(braceStart, braceEnd + 1);

  // XHS sometimes uses `undefined` as a value — replace with null for valid JSON
  const sanitized = rawJson.replace(/\bundefined\b/g, 'null');
  const payload = JSON.parse(sanitized);

  // XHS user profile data structure
  const userPage = payload?.user?.userPageData;
  const basicInfo = userPage?.basicInfo ?? {};
  const interactions = userPage?.interactions ?? [];
  const noteList = payload?.user?.notes ?? [];

  // Extract interaction counts from XHS's array-based format
  const getInteraction = (type: string): number => {
    if (!Array.isArray(interactions)) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = interactions.find((i: any) => i.type === type || i.name === type);
    return num(item?.count ?? item?.value ?? 0);
  };

  const followers = getInteraction('fans') || num(basicInfo.fans);
  const likesTotal = getInteraction('liked') || num(basicInfo.liked);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: Post[] = (Array.isArray(noteList) ? noteList : []).slice(0, 30).map((note: any) => ({
    postId: String(note.id || note.noteId || ''),
    desc: String(note.title || note.displayTitle || note.desc || '').slice(0, 300),
    publishedAt: note.time
      ? new Date(typeof note.time === 'number' && note.time < 1e12 ? note.time * 1000 : note.time).toISOString()
      : undefined,
    views: num(note.viewCount ?? note.stats?.viewCount ?? note.interactInfo?.viewCount),
    likes: num(note.likedCount ?? note.stats?.likedCount ?? note.interactInfo?.likedCount),
    comments: num(note.commentCount ?? note.stats?.commentCount ?? note.interactInfo?.commentCount),
    shares: num(note.shareCount ?? note.stats?.shareCount ?? note.interactInfo?.shareCount),
    saves: num(note.collectedCount ?? note.stats?.collectedCount ?? note.interactInfo?.collectedCount),
    tags: extractHashtags(String(note.title || note.desc || '')),
  }));

  return {
    platform: 'xhs' as Platform,
    profileUrl: sourceUrl,
    fetchedAt: new Date().toISOString(),
    source: 'html_parse',
    profile: {
      nickname: basicInfo.nickname || basicInfo.name || '',
      uniqueId: basicInfo.redId || basicInfo.userId || '',
      avatarUrl: basicInfo.imagePre || basicInfo.image || undefined,
      followers,
      likesTotal,
      videosCount: num(basicInfo.notes || noteList.length),
      bio: basicInfo.desc || basicInfo.description || undefined,
    },
    posts,
  };
}

// ---------------------------------------------------------------------------
// Legacy URL helpers (kept for backward compatibility)
// ---------------------------------------------------------------------------

export function isTikTokUrl(url: string): boolean {
  return detectPlatformFromUrl(url) === 'tiktok';
}

export function isXhsUrl(url: string): boolean {
  return detectPlatformFromUrl(url) === 'xhs';
}
