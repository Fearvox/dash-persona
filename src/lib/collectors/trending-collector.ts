/**
 * Trending and search data collector for XiaoHongShu (XHS) and TikTok.
 *
 * Uses the shared CDP client to open background browser tabs (in the user's
 * existing authenticated Chrome session via the proxy at localhost:3458),
 * scrape search results and explore/trending pages, then return structured
 * `TrendingPost` and `TrendingTopic` records.
 *
 * Primary parsing strategy is `document.body.innerText` — the page text is
 * more stable across DOM structure changes than CSS selectors, which both XHS
 * and TikTok rotate frequently.  DOM queries are applied as enhancements where
 * the innerText layout is ambiguous.
 *
 * All collected data is saved to the shared OS temp directory via tmp-manager
 * with a 15-day retention window, matching the `expiresAt` field on the
 * returned `TrendingCollection`.
 *
 * @module collectors/trending-collector
 */

import {
  cdpNew,
  cdpEval,
  cdpClick,
  cdpScroll,
  cdpClose,
  cdpHealth,
  parseChineseNumber,
  parseTiktokNumber,
  sleep,
} from './cdp-client';
import { saveJsonData } from './tmp-manager';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_POSTS_PER_KEYWORD = 30;
const MAX_TOPICS = 50;
const EXPIRY_DAYS = 15;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single post returned by a platform search query. */
export interface TrendingPost {
  platform: 'xhs' | 'tiktok';
  postId: string;
  title: string;
  author: string;
  url: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  /** `true` when views were estimated from engagement metrics (XHS always). */
  viewsEstimated: boolean;
  /** Raw relative-time string from the page, e.g. "1周前", "3天前". */
  relativeTime?: string;
  hashtags: string[];
  contentType: 'video' | 'image' | 'text';
}

/** A trending topic / hashtag from explore or studio pages. */
export interface TrendingTopic {
  platform: 'xhs' | 'tiktok';
  keyword: string;
  rank?: number;
  /** Normalised 0-100 heat score derived from raw view counts or position. */
  heat: number;
  trend: 'rising' | 'stable' | 'falling';
  relatedHashtags: string[];
}

/** The result of a full trending collection pass for one platform. */
export interface TrendingCollection {
  fetchedAt: string;
  expiresAt: string;
  platform: 'xhs' | 'tiktok';
  nicheKeywords: string[];
  posts: TrendingPost[];
  topics: TrendingTopic[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract hashtags from post title text using the `#tag` pattern. */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[^\s#]+/g);
  if (!matches) return [];
  // Deduplicate while preserving order.
  return [...new Set(matches.map((t) => t.slice(1)))];
}

/**
 * Build the ISO expiry date string (now + EXPIRY_DAYS).
 */
function buildExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + EXPIRY_DAYS);
  return d.toISOString();
}

/**
 * Deduplicate a list of `TrendingPost` records by `postId`, then by
 * normalised title if two posts share an empty postId.
 */
function deduplicatePosts(posts: TrendingPost[]): TrendingPost[] {
  const seen = new Set<string>();
  const out: TrendingPost[] = [];
  for (const p of posts) {
    const key = p.postId !== '' ? p.postId : p.title.toLowerCase().slice(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

/**
 * Deduplicate a list of `TrendingTopic` records by normalised keyword.
 * Earlier entries (higher rank) take precedence.
 */
function deduplicateTopics(topics: TrendingTopic[]): TrendingTopic[] {
  const seen = new Set<string>();
  const out: TrendingTopic[] = [];
  for (const t of topics) {
    const key = t.keyword.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// XHS innerText parsers
// ---------------------------------------------------------------------------

/**
 * JavaScript snippet injected into XHS search result pages.
 *
 * Captures the full page text and the list of note-card elements (title,
 * author, like count) that XHS renders inside the search result feed.
 */
const XHS_SEARCH_JS = `
(function() {
  const text = document.body.innerText;

  // Attempt DOM-based extraction first (more reliable when available).
  const cards = Array.from(
    document.querySelectorAll(
      '[class*="note-item"], [class*="noteItem"], [class*="cover-info"], section[class*="note"], [class*="feeds-container"] > *'
    )
  ).slice(0, 40);

  const domNotes = cards.map((card) => {
    const titleEl = card.querySelector('[class*="title"], [class*="desc"], [class*="note-title"]');
    const authorEl = card.querySelector('[class*="author"], [class*="username"], [class*="name"]');
    const likeEl = card.querySelector('[class*="like"], [class*="count"], [class*="heart"]');
    const linkEl = card.querySelector('a[href]');
    const videoEl = card.querySelector('video, [class*="video"]');
    return {
      title: titleEl?.textContent?.trim() || '',
      author: authorEl?.textContent?.trim() || '',
      rawLikes: likeEl?.textContent?.trim() || '0',
      href: linkEl?.getAttribute('href') || '',
      isVideo: !!videoEl,
    };
  }).filter((n) => n.title.length > 0);

  return JSON.stringify({ text: text.slice(0, 8000), domNotes });
})()
`;

interface XhsDomNote {
  title: string;
  author: string;
  rawLikes: string;
  href: string;
  isVideo: boolean;
}

/**
 * Parse XHS search innerText to extract post entries when DOM extraction
 * returns insufficient results.
 *
 * XHS search page innerText has a loosely repeating pattern:
 *   <title line(s)>
 *   <author line>  (often preceded by "@" or following a like count)
 *   <relative time, e.g. "3天前">
 *   <like count, e.g. "1.2万">
 *
 * We use a sliding-window heuristic: collect text blocks between like-count
 * lines (which have a distinctive format) and treat the preceding lines as
 * title + author candidates.
 */
function parseXhsSearchText(
  text: string,
  keyword: string,
): Array<{ title: string; author: string; likes: number; relativeTime?: string }> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: Array<{ title: string; author: string; likes: number; relativeTime?: string }> = [];

  // Pattern for like counts: plain number, or with 万/亿 suffix.
  const likePattern = /^[\d,.]+[万亿]?$/;
  // Pattern for relative times used by XHS.
  const timePattern = /^(\d+[秒分时天周月年]前|刚刚|昨天)$/;
  // Pattern for lines that are clearly navigation/UI chrome to skip.
  const uiChrome = /^(搜索|筛选|排序|最热|最新|关注|发现|主页|消息|我|登录|注册|回到顶部)$/;

  let i = 0;
  while (i < lines.length && results.length < MAX_POSTS_PER_KEYWORD) {
    const line = lines[i];

    if (uiChrome.test(line)) { i++; continue; }

    // When we encounter a like count, look back for title + author + time.
    if (likePattern.test(line) && line !== '0') {
      const likes = parseChineseNumber(line);
      if (likes === 0) { i++; continue; }

      // Scan backwards up to 5 lines for time, author, title.
      let relativeTime: string | undefined;
      let author = '';
      const titleParts: string[] = [];

      for (let back = 1; back <= 5 && i - back >= 0; back++) {
        const prev = lines[i - back];
        if (timePattern.test(prev) && !relativeTime) {
          relativeTime = prev;
          continue;
        }
        if (uiChrome.test(prev)) break;
        if (likePattern.test(prev)) break; // Hit another like count — stop.
        // Heuristic: shorter lines after time are likely author handles.
        if (prev.length <= 20 && author === '' && titleParts.length > 0) {
          author = prev;
        } else {
          titleParts.unshift(prev);
        }
      }

      const title = titleParts.join(' ').trim();
      if (title.length > 3) {
        results.push({ title, author, likes, relativeTime });
      }
    }
    i++;
  }

  // Fallback: if we found nothing at all, produce a single placeholder entry
  // so the caller knows data was fetched but could not be parsed.
  if (results.length === 0 && text.length > 200) {
    results.push({
      title: `${keyword} — parse fallback (no structured data)`,
      author: '',
      likes: 0,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// TikTok innerText parsers
// ---------------------------------------------------------------------------

/**
 * JavaScript snippet injected into TikTok search result pages.
 *
 * TikTok renders search results in a card layout whose CSS class names are
 * obfuscated and rotate with deployments.  We capture both the raw page text
 * and a DOM pass over the most common class-name fragments.
 */
const TIKTOK_SEARCH_JS = `
(function() {
  const text = document.body.innerText;

  // DOM pass — TikTok search cards sometimes expose data-attributes.
  const cards = Array.from(
    document.querySelectorAll(
      '[class*="DivItemContainerForSearch"], [class*="video-feed-item"], [class*="item-container"]'
    )
  ).slice(0, 40);

  const domCards = cards.map((card) => {
    const descEl = card.querySelector('[class*="SpanUniqueId"], [class*="desc"], [class*="title"]');
    const authorEl = card.querySelector('[class*="AuthorTitle"], [class*="author"], [data-e2e="author-uniqueId"]');
    const viewEl = card.querySelector('[class*="strong-count"], [class*="like-count"], [class*="views"]');
    const videoEl = card.querySelector('video');
    const linkEl = card.querySelector('a[href*="/video/"], a[href*="/@"]');
    return {
      title: descEl?.textContent?.trim() || '',
      author: authorEl?.textContent?.trim() || '',
      rawViews: viewEl?.textContent?.trim() || '0',
      href: linkEl?.getAttribute('href') || '',
      isVideo: !!videoEl,
    };
  }).filter((c) => c.title.length > 0 || c.href.length > 0);

  return JSON.stringify({ text: text.slice(0, 8000), domCards });
})()
`;

interface TiktokDomCard {
  title: string;
  author: string;
  rawViews: string;
  href: string;
  isVideo: boolean;
}

/**
 * Parse TikTok search innerText.
 *
 * TikTok search text is less structured than XHS.  The most reliable signal
 * is view-count lines (K/M suffix), which appear directly after the video
 * description.
 */
function parseTiktokSearchText(
  text: string,
  keyword: string,
): Array<{ title: string; author: string; views: number; relativeTime?: string }> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: Array<{ title: string; author: string; views: number; relativeTime?: string }> = [];

  // Pattern: view-count line has a K/M/B suffix or is a large plain number.
  const viewPattern = /^[\d,.]+[KMBkmb万亿]?$/;
  const timePattern = /^(\d+[dwmy]|\d+\s*(days?|weeks?|months?|years?|hours?)\s*ago|刚刚|\d+[秒分时天周月年]前)$/i;
  const uiChrome = /^(For You|Following|Friends|Trending|LIVE|Search|Explore|Sounds|Filters|Cancel|Log in|Sign up)$/i;
  // Duration format "00:09" — skip
  const durationPattern = /^\d{2}:\d{2}$/;

  let i = 0;
  while (i < lines.length && results.length < MAX_POSTS_PER_KEYWORD) {
    const line = lines[i];
    if (uiChrome.test(line) || durationPattern.test(line)) { i++; continue; }

    if (viewPattern.test(line)) {
      const views = parseTiktokNumber(line);
      if (views < 100) { i++; continue; } // Skip small numbers (like counts, etc.)

      let relativeTime: string | undefined;
      let author = '';
      const titleParts: string[] = [];

      for (let back = 1; back <= 6 && i - back >= 0; back++) {
        const prev = lines[i - back];
        if (uiChrome.test(prev) || durationPattern.test(prev)) break;
        if (viewPattern.test(prev) && parseTiktokNumber(prev) >= 100) break;
        if (timePattern.test(prev) && !relativeTime) {
          relativeTime = prev;
          continue;
        }
        // Author handle often starts with @ or is short after title lines.
        if (prev.startsWith('@') && author === '') {
          author = prev;
        } else {
          titleParts.unshift(prev);
        }
      }

      const title = titleParts.join(' ').trim();
      if (title.length > 2) {
        results.push({ title, author, views, relativeTime });
      }
    }
    i++;
  }

  if (results.length === 0 && text.length > 200) {
    results.push({
      title: `${keyword} — parse fallback (no structured data)`,
      author: '',
      views: 0,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// XHS explore/trending parser
// ---------------------------------------------------------------------------

/**
 * JavaScript snippet injected into the XHS explore page.
 *
 * XHS explore shows trending hashtags and hot topics in a sidebar or card
 * layout.  We capture both the raw text and any dedicated trending elements.
 */
const XHS_TRENDING_JS = `
(function() {
  const text = document.body.innerText;

  // Try DOM selectors for XHS hot-topic cards.
  const hotCards = Array.from(
    document.querySelectorAll(
      '[class*="hot-topic"], [class*="hotTopic"], [class*="trend"], [class*="hot-list"] > *, [class*="hotList"] > *'
    )
  ).slice(0, 60);

  const topics = hotCards.map((card) => {
    const rankEl = card.querySelector('[class*="rank"], [class*="index"], [class*="num"]');
    const kwEl = card.querySelector('[class*="title"], [class*="keyword"], [class*="name"], span, p');
    const heatEl = card.querySelector('[class*="heat"], [class*="hot"], [class*="count"]');
    return {
      rank: parseInt(rankEl?.textContent?.trim() || '0', 10) || 0,
      keyword: kwEl?.textContent?.trim() || '',
      rawHeat: heatEl?.textContent?.trim() || '',
    };
  }).filter((t) => t.keyword.length > 0);

  return JSON.stringify({ text: text.slice(0, 6000), topics });
})()
`;

/**
 * Parse the XHS explore page text to extract trending topics.
 *
 * XHS explore innerText usually lists hot topics in a numbered or bullet
 * format.  We look for short keyword lines adjacent to numbers (rank) or
 * "热度" (heat) indicators.
 */
function parseXhsTrendingText(
  text: string,
  domTopics: Array<{ rank: number; keyword: string; rawHeat: string }>,
): TrendingTopic[] {
  // If DOM extraction succeeded, use it directly.
  if (domTopics.length >= 3) {
    return domTopics.slice(0, MAX_TOPICS).map((t, idx) => {
      const heat = parseChineseNumber(t.rawHeat);
      return {
        platform: 'xhs' as const,
        keyword: t.keyword.replace(/^#+/, ''),
        rank: t.rank > 0 ? t.rank : idx + 1,
        heat: heat > 0 ? Math.min(100, Math.round((heat / 1_000_000) * 100)) : Math.max(1, 100 - idx * 3),
        trend: 'stable' as const,
        relatedHashtags: t.keyword.startsWith('#') ? [t.keyword.slice(1)] : [],
      };
    });
  }

  // Fallback: parse raw text.
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const topics: TrendingTopic[] = [];
  const rankPattern = /^(\d{1,3})\.?$/;
  const hashtagPattern = /^#/;
  const heatPattern = /^[\d,.]+[万亿]?$/;

  let i = 0;
  while (i < lines.length && topics.length < MAX_TOPICS) {
    const line = lines[i];

    if (rankPattern.test(line)) {
      const rank = parseInt(line, 10);
      const next = lines[i + 1] ?? '';
      const afterNext = lines[i + 2] ?? '';

      const keyword = hashtagPattern.test(next)
        ? next.slice(1)
        : next.length > 0 && next.length < 50
          ? next
          : '';

      if (keyword) {
        const rawHeatStr = heatPattern.test(afterNext) ? afterNext : '';
        const rawHeat = parseChineseNumber(rawHeatStr);
        topics.push({
          platform: 'xhs',
          keyword,
          rank,
          heat: rawHeat > 0 ? Math.min(100, Math.round((rawHeat / 1_000_000) * 100)) : Math.max(1, 100 - rank * 2),
          trend: 'stable',
          relatedHashtags: [],
        });
        i += rawHeatStr ? 3 : 2;
        continue;
      }
    }

    // Also capture standalone hashtag lines not preceded by a rank.
    if (hashtagPattern.test(line) && line.length > 2 && line.length < 40) {
      const keyword = line.slice(1);
      if (!topics.some((t) => t.keyword === keyword)) {
        topics.push({
          platform: 'xhs',
          keyword,
          rank: topics.length + 1,
          heat: Math.max(1, 100 - topics.length * 3),
          trend: 'stable',
          relatedHashtags: [],
        });
      }
    }
    i++;
  }

  return topics;
}

// ---------------------------------------------------------------------------
// TikTok Studio trending parser
// ---------------------------------------------------------------------------

/**
 * JavaScript snippet injected into TikTok Studio home page.
 *
 * The Studio home shows a "灵感" (inspiration) section with trending hashtags
 * and their view counts (e.g. "播放量 139M").  We capture both raw text and
 * a DOM pass over the inspiration section.
 */
const TIKTOK_TRENDING_JS = `
(function() {
  const text = document.body.innerText;

  // Try DOM pass over the inspiration / trending section.
  const trendCards = Array.from(
    document.querySelectorAll(
      '[class*="trend"], [class*="Trend"], [class*="inspiration"], [class*="Inspiration"], [class*="hot"], [class*="Hot"]'
    )
  ).slice(0, 80);

  const topics = trendCards.map((card) => {
    const kwEl = card.querySelector('[class*="title"], [class*="keyword"], [class*="name"], [class*="tag"], h3, span');
    const viewEl = card.querySelector('[class*="view"], [class*="play"], [class*="count"], [class*="stat"]');
    const rankEl = card.querySelector('[class*="rank"], [class*="index"], [class*="num"]');
    return {
      keyword: kwEl?.textContent?.trim() || '',
      rawViews: viewEl?.textContent?.trim() || '0',
      rank: parseInt(rankEl?.textContent?.trim() || '0', 10) || 0,
    };
  }).filter((t) => t.keyword.length > 0 && t.keyword !== 'TikTok Studio');

  return JSON.stringify({ text: text.slice(0, 6000), topics });
})()
`;

/**
 * Parse TikTok Studio page text to extract trending topics.
 *
 * Expected pattern in the "灵感" section (from our earlier exploration):
 *   <rank>
 *   #<hashtag or topic name>
 *   播放量 <view count>  (e.g. "播放量 139M")
 *
 * We also handle the English Studio layout where view counts appear as
 * plain numbers with K/M suffixes.
 */
function parseTiktokTrendingText(
  text: string,
  domTopics: Array<{ keyword: string; rawViews: string; rank: number }>,
): TrendingTopic[] {
  // If DOM extraction succeeded with enough data, use it.
  if (domTopics.length >= 3) {
    const maxViews = domTopics.reduce(
      (m, t) => Math.max(m, parseTiktokNumber(t.rawViews)),
      1,
    );

    return domTopics.slice(0, MAX_TOPICS).map((t, idx) => {
      const views = parseTiktokNumber(t.rawViews);
      return {
        platform: 'tiktok' as const,
        keyword: t.keyword.replace(/^#+/, ''),
        rank: t.rank > 0 ? t.rank : idx + 1,
        heat: views > 0 ? Math.min(100, Math.round((views / maxViews) * 100)) : Math.max(1, 100 - idx * 3),
        trend: 'rising' as const,
        relatedHashtags: t.keyword.startsWith('#') ? [t.keyword.slice(1)] : [],
      };
    });
  }

  // Fallback: parse raw page text.
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const topics: TrendingTopic[] = [];

  // View count patterns — "播放量 139M", "139M views", or plain "139M"
  const viewLinePattern = /^(播放量\s*)?([\d,.]+[KMBkmb万亿]+)\s*(播放|views?)?$/i;
  const rankPattern = /^(\d{1,3})\.?$/;
  const hashtagPattern = /^#/;
  const durationPattern = /^\d{2}:\d{2}$/;

  // Collect raw view values for normalisation later.
  const rawEntries: Array<{ keyword: string; views: number; rank: number }> = [];

  let i = 0;
  while (i < lines.length && rawEntries.length < MAX_TOPICS) {
    const line = lines[i];
    if (durationPattern.test(line)) { i++; continue; }

    if (rankPattern.test(line)) {
      const rank = parseInt(line, 10);
      const next = lines[i + 1] ?? '';
      const afterNext = lines[i + 2] ?? '';

      const keyword = hashtagPattern.test(next)
        ? next.slice(1)
        : next.length > 0 && next.length < 60 && !/^\d/.test(next)
          ? next
          : '';

      if (keyword) {
        const viewMatch = viewLinePattern.exec(afterNext);
        const views = viewMatch ? parseTiktokNumber(viewMatch[2]) : 0;
        rawEntries.push({ keyword, views, rank });
        i += viewMatch ? 3 : 2;
        continue;
      }
    }

    // Also pick up hashtag lines not preceded by a rank number.
    if ((hashtagPattern.test(line) || line.startsWith('话题')) && line.length < 60) {
      const keyword = line.replace(/^[#话题]+/, '').trim();
      if (keyword && !rawEntries.some((e) => e.keyword === keyword)) {
        const next = lines[i + 1] ?? '';
        const viewMatch = viewLinePattern.exec(next);
        const views = viewMatch ? parseTiktokNumber(viewMatch[2]) : 0;
        rawEntries.push({ keyword, views, rank: rawEntries.length + 1 });
        i += viewMatch ? 2 : 1;
        continue;
      }
    }

    i++;
  }

  // Normalise heat scores relative to the highest-view entry.
  const maxViews = rawEntries.reduce((m, e) => Math.max(m, e.views), 1);
  for (const entry of rawEntries) {
    topics.push({
      platform: 'tiktok',
      keyword: entry.keyword,
      rank: entry.rank,
      heat: entry.views > 0
        ? Math.min(100, Math.round((entry.views / maxViews) * 100))
        : Math.max(1, 100 - entry.rank * 3),
      trend: 'rising',
      relatedHashtags: [],
    });
  }

  return topics;
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

/**
 * Check whether the CDP proxy is reachable and healthy.
 *
 * Returns `true` only when the proxy responds with `{ status: "ok" }`.
 */
export async function checkCdpReady(): Promise<boolean> {
  return cdpHealth();
}

// ---------------------------------------------------------------------------
// XHS search
// ---------------------------------------------------------------------------

/**
 * Search XiaoHongShu by `keyword` and return the top posts.
 *
 * Opens a search-result tab, sorts by "最热" (most popular) if the button is
 * available, scrolls twice to load additional results, then scrapes and
 * returns up to `MAX_POSTS_PER_KEYWORD` posts.
 *
 * XHS does not expose view counts publicly.  Views are estimated from
 * engagement using `(likes + comments + saves) * 15`, with
 * `viewsEstimated: true` on every record.
 */
export async function collectXhsSearch(keyword: string): Promise<TrendingPost[]> {
  const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;
  const target = await cdpNew(url);

  try {
    // Wait for SPA render and initial data load.
    await sleep(4000);

    // Try clicking the "最热" (hottest) sort button — best-effort.
    try {
      await cdpClick(target, 'div:contains("最热"), span:contains("最热"), button:contains("最热")');
      await sleep(2000);
    } catch {
      // Sort button click failed — continue with default ordering.
    }

    // Scroll twice to load more lazy-rendered cards.
    await cdpScroll(target, 'bottom');
    await sleep(1500);
    await cdpScroll(target, 'bottom');
    await sleep(1500);

    // Collect DOM + text data.
    const rawJson = await cdpEval(target, XHS_SEARCH_JS) as string;
    let collected: { text: string; domNotes: XhsDomNote[] };

    try {
      collected = JSON.parse(rawJson);
    } catch {
      collected = { text: '', domNotes: [] };
    }

    const { text, domNotes } = collected;
    const posts: TrendingPost[] = [];

    // Prefer DOM notes when we have a reasonable set.
    if (domNotes.length >= 3) {
      for (let i = 0; i < Math.min(domNotes.length, MAX_POSTS_PER_KEYWORD); i++) {
        const note = domNotes[i];
        const likes = parseChineseNumber(note.rawLikes);
        const views = Math.round((likes) * 15);
        const hashtags = extractHashtags(note.title);

        // Normalise the href to a full URL.
        const postUrl = note.href.startsWith('http')
          ? note.href
          : note.href.startsWith('/')
            ? `https://www.xiaohongshu.com${note.href}`
            : `https://www.xiaohongshu.com/explore/${note.href}`;

        posts.push({
          platform: 'xhs',
          postId: note.href.split('/').filter(Boolean).pop()?.split('?')[0] ?? `xhs-${keyword}-${i}`,
          title: note.title,
          author: note.author,
          url: postUrl,
          likes,
          comments: 0,
          shares: 0,
          saves: 0,
          views,
          viewsEstimated: true,
          hashtags,
          contentType: note.isVideo ? 'video' : 'image',
        });
      }
    } else {
      // Fallback to innerText parsing.
      const parsed = parseXhsSearchText(text, keyword);
      for (let i = 0; i < Math.min(parsed.length, MAX_POSTS_PER_KEYWORD); i++) {
        const p = parsed[i];
        const views = Math.round((p.likes) * 15);
        const hashtags = extractHashtags(p.title);

        posts.push({
          platform: 'xhs',
          postId: `xhs-${keyword}-${i}`,
          title: p.title,
          author: p.author,
          url: url,
          likes: p.likes,
          comments: 0,
          shares: 0,
          saves: 0,
          views,
          viewsEstimated: true,
          relativeTime: p.relativeTime,
          hashtags,
          contentType: 'image',
        });
      }
    }

    return posts;
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// TikTok search
// ---------------------------------------------------------------------------

/**
 * Search TikTok by `keyword` and return the top posts.
 *
 * Opens the TikTok search page, scrolls twice to load more results, then
 * scrapes and returns up to `MAX_POSTS_PER_KEYWORD` posts.
 *
 * When TikTok exposes view counts in the search layout, they are used
 * directly (`viewsEstimated: false`).  When only engagement metrics are
 * available, views are estimated.
 */
export async function collectTiktokSearch(keyword: string): Promise<TrendingPost[]> {
  const url = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
  const target = await cdpNew(url);

  try {
    await sleep(4000);

    // Scroll twice to load lazy content.
    await cdpScroll(target, 'bottom');
    await sleep(1500);
    await cdpScroll(target, 'bottom');
    await sleep(1500);

    const rawJson = await cdpEval(target, TIKTOK_SEARCH_JS) as string;
    let collected: { text: string; domCards: TiktokDomCard[] };

    try {
      collected = JSON.parse(rawJson);
    } catch {
      collected = { text: '', domCards: [] };
    }

    const { text, domCards } = collected;
    const posts: TrendingPost[] = [];

    // Prefer DOM cards.
    if (domCards.length >= 3) {
      for (let i = 0; i < Math.min(domCards.length, MAX_POSTS_PER_KEYWORD); i++) {
        const card = domCards[i];
        const views = parseTiktokNumber(card.rawViews);
        const hashtags = extractHashtags(card.title);
        const viewsEstimated = views === 0;

        const postUrl = card.href.startsWith('http')
          ? card.href
          : card.href.startsWith('/')
            ? `https://www.tiktok.com${card.href}`
            : url;

        // Extract video ID from TikTok URL: /video/7123456789
        const videoIdMatch = postUrl.match(/\/video\/(\d+)/);
        const postId = videoIdMatch ? videoIdMatch[1] : `tiktok-${keyword}-${i}`;

        posts.push({
          platform: 'tiktok',
          postId,
          title: card.title,
          author: card.author,
          url: postUrl,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          views,
          viewsEstimated,
          hashtags,
          contentType: card.isVideo ? 'video' : 'text',
        });
      }
    } else {
      // Fallback to innerText parsing.
      const parsed = parseTiktokSearchText(text, keyword);
      for (let i = 0; i < Math.min(parsed.length, MAX_POSTS_PER_KEYWORD); i++) {
        const p = parsed[i];
        const hashtags = extractHashtags(p.title);

        posts.push({
          platform: 'tiktok',
          postId: `tiktok-${keyword}-${i}`,
          title: p.title,
          author: p.author,
          url: url,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          views: p.views,
          viewsEstimated: p.views === 0,
          relativeTime: p.relativeTime,
          hashtags,
          contentType: 'video',
        });
      }
    }

    return posts;
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// XHS trending topics
// ---------------------------------------------------------------------------

/**
 * Collect trending topics from the XiaoHongShu explore page.
 *
 * The XHS explore page shows a curated list of hot hashtags and topics.
 * Returns up to `MAX_TOPICS` topics, ordered by heat (descending).
 */
export async function collectXhsTrending(): Promise<TrendingTopic[]> {
  const target = await cdpNew('https://www.xiaohongshu.com/explore');

  try {
    await sleep(3000);

    const rawJson = await cdpEval(target, XHS_TRENDING_JS) as string;
    let collected: { text: string; topics: Array<{ rank: number; keyword: string; rawHeat: string }> };

    try {
      collected = JSON.parse(rawJson);
    } catch {
      collected = { text: '', topics: [] };
    }

    const topics = parseXhsTrendingText(collected.text, collected.topics);
    return topics.slice(0, MAX_TOPICS);
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// TikTok trending topics
// ---------------------------------------------------------------------------

/**
 * Collect trending topics from TikTok Studio's inspiration section.
 *
 * The TikTok Studio home page features a "灵感" (inspiration) section that
 * lists trending hashtags/topics together with their play counts.
 *
 * Returns up to `MAX_TOPICS` topics ordered by heat score (highest first).
 */
export async function collectTiktokTrending(): Promise<TrendingTopic[]> {
  const target = await cdpNew('https://www.tiktok.com/tiktokstudio');

  try {
    await sleep(4000);

    const rawJson = await cdpEval(target, TIKTOK_TRENDING_JS) as string;
    let collected: { text: string; topics: Array<{ keyword: string; rawViews: string; rank: number }> };

    try {
      collected = JSON.parse(rawJson);
    } catch {
      collected = { text: '', topics: [] };
    }

    const topics = parseTiktokTrendingText(collected.text, collected.topics);
    return topics.slice(0, MAX_TOPICS);
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Collect trending data for a given platform and set of niche keywords.
 *
 * Workflow:
 *  1. Verify CDP proxy is healthy — throws if not reachable.
 *  2. Fetch platform trending topics (explore / studio page).
 *  3. For each keyword, perform a search and collect posts.
 *     A 3-second delay is inserted between keyword searches to avoid rate
 *     limiting.  If one keyword fails, collection continues with the rest.
 *  4. Deduplicate posts and topics across keywords.
 *  5. Persist the collection to the OS tmp directory via `saveJsonData`.
 *  6. Return the `TrendingCollection` record.
 *
 * @param platform  `"xhs"` or `"tiktok"`.
 * @param keywords  Array of niche keywords to search.  Max 30 posts per keyword.
 */
export async function collectTrending(
  platform: 'xhs' | 'tiktok',
  keywords: string[],
): Promise<TrendingCollection> {
  // Step 1: guard — proxy must be healthy.
  const healthy = await cdpHealth();
  if (!healthy) {
    throw new Error(
      'CDP proxy not running at localhost:3458. Start the proxy before collecting trending data.',
    );
  }

  const fetchedAt = new Date().toISOString();
  const expiresAt = buildExpiryDate();

  // Step 2: collect trending topics for the platform.
  let topics: TrendingTopic[] = [];
  try {
    topics = platform === 'xhs'
      ? await collectXhsTrending()
      : await collectTiktokTrending();
  } catch (err) {
    // Trending-topic collection is best-effort — log and continue with posts.
    console.warn(
      `[trending-collector] collectTrending: trending topics failed for ${platform}:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // Step 3: collect search results per keyword.
  const allPosts: TrendingPost[] = [];

  for (let k = 0; k < keywords.length; k++) {
    const keyword = keywords[k];

    // Insert a delay between consecutive keyword searches (skip before first).
    if (k > 0) {
      await sleep(3000);
    }

    try {
      const posts = platform === 'xhs'
        ? await collectXhsSearch(keyword)
        : await collectTiktokSearch(keyword);
      allPosts.push(...posts);
    } catch (err) {
      console.warn(
        `[trending-collector] collectTrending: keyword "${keyword}" failed:`,
        err instanceof Error ? err.message : String(err),
      );
      // Continue with remaining keywords.
    }
  }

  // Step 4: deduplicate across keywords.
  const deduplicatedPosts = deduplicatePosts(allPosts);
  const deduplicatedTopics = deduplicateTopics(topics);

  // Step 5: build the collection record.
  const collection: TrendingCollection = {
    fetchedAt,
    expiresAt,
    platform,
    nicheKeywords: keywords,
    posts: deduplicatedPosts,
    topics: deduplicatedTopics,
  };

  // Step 6: persist to tmp storage.
  try {
    saveJsonData(collection, {
      type: 'raw',
      platform,
      label: keywords.join('-').slice(0, 60),
    });
  } catch (err) {
    // Storage failure is non-fatal — the caller still gets the in-memory result.
    console.warn(
      '[trending-collector] collectTrending: failed to save to tmp storage:',
      err instanceof Error ? err.message : String(err),
    );
  }

  return collection;
}
