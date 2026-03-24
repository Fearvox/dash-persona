import type { CreatorProfile, Post } from '../schema/creator-data';
import type { DataAdapter } from './types';

/**
 * Parse a TikTok profile URL by fetching the public HTML page server-side
 * and extracting data from the __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag.
 *
 * EXPERIMENTAL: This adapter is best-effort. TikTok may block requests
 * via captcha, geo-restrictions, or rate limiting.
 */
export class HTMLParseAdapter implements DataAdapter {
  name = 'html_parse';
  description = 'Fetch and parse public TikTok profile pages (experimental)';
  experimental = true;

  async collect(url: string): Promise<CreatorProfile | null> {
    // Validate URL is TikTok
    if (!isTikTokUrl(url)) return null;

    // This adapter is designed to be called from an API route (server-side only)
    // It calls the /api/collect endpoint which does the actual fetching
    throw new Error(
      'HTMLParseAdapter.collect() must be called server-side via /api/collect',
    );
  }
}

// The actual parsing logic (server-side only, used by the API route)
export async function parseTikTokProfile(
  url: string,
): Promise<CreatorProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

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

function extractFromTikTokHtml(
  html: string,
  sourceUrl: string,
): CreatorProfile {
  // Extract __UNIVERSAL_DATA_FOR_REHYDRATION__ payload
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

  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

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

function extractHashtags(desc: string): string[] {
  const matches = desc.match(/#[^\s#]+/g);
  return matches ? matches.map((t) => t.slice(1)) : [];
}

export function isTikTokUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('tiktok.com');
  } catch {
    return false;
  }
}
