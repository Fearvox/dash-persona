/**
 * CDP proxy adapter — collects creator data from Douyin, TikTok, and XHS via a
 * locally-running Chrome DevTools Protocol proxy at localhost:3458.
 *
 * The proxy exposes a simple HTTP API that opens background tabs, evaluates
 * JavaScript, and closes tabs — all in the user's existing Chrome session
 * (with real login cookies). This adapter requires the proxy to be running
 * before `collect()` is called.
 *
 * @module adapters/cdp-adapter
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_BASE = 'http://127.0.0.1:3458';
const REQUEST_TIMEOUT_MS = 15_000;
const COLLECT_TIMEOUT_MS = 150_000;
const MAX_POSTS = 50;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type CDPAdapterErrorCode =
  | 'PROXY_NOT_RUNNING'
  | 'NOT_LOGGED_IN'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'NAVIGATION_FAILED';

export class CDPAdapterError extends Error {
  readonly code: CDPAdapterErrorCode;

  constructor(code: CDPAdapterErrorCode, message: string) {
    super(message);
    this.name = 'CDPAdapterError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// CDP proxy HTTP helpers
// ---------------------------------------------------------------------------

async function cdpFetch(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${CDP_BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
      throw new CDPAdapterError(
        'PROXY_NOT_RUNNING',
        'CDP proxy is not running at localhost:3458. Start the proxy before collecting.',
      );
    }
    throw new CDPAdapterError('PROXY_NOT_RUNNING', `CDP proxy unreachable: ${msg}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new CDPAdapterError(
      'NAVIGATION_FAILED',
      `CDP proxy returned HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  try {
    return await res.json();
  } catch {
    throw new CDPAdapterError('PARSE_ERROR', `CDP proxy response was not valid JSON at ${path}`);
  }
}

async function cdpHealth(): Promise<boolean> {
  try {
    const data = await cdpFetch('/health') as { status?: string; connected?: boolean };
    return data.status === 'ok';
  } catch {
    return false;
  }
}

async function cdpNew(url: string): Promise<string> {
  const data = await cdpFetch(`/new?url=${encodeURIComponent(url)}`) as { targetId?: string };
  if (!data.targetId) {
    throw new CDPAdapterError('NAVIGATION_FAILED', `CDP /new did not return targetId for URL: ${url}`);
  }
  return data.targetId;
}

async function cdpEval(target: string, js: string): Promise<unknown> {
  const data = await cdpFetch(`/eval?target=${encodeURIComponent(target)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: js,
  }) as { value?: unknown };
  return data.value;
}

async function cdpClick(target: string, selector: string): Promise<void> {
  await cdpFetch(`/click?target=${encodeURIComponent(target)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: selector,
  });
}

async function cdpScroll(target: string, direction: string = 'bottom'): Promise<void> {
  await cdpFetch(`/scroll?target=${encodeURIComponent(target)}&direction=${encodeURIComponent(direction)}`);
}

async function cdpClose(target: string): Promise<void> {
  await cdpFetch(`/close?target=${encodeURIComponent(target)}`);
}

async function cdpNavigate(target: string, url: string): Promise<void> {
  await cdpFetch(`/navigate?target=${encodeURIComponent(target)}&url=${encodeURIComponent(url)}`);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Parse Chinese number suffixes. "6.08万" → 60800, "1.28亿" → 128000000. */
function parseChineseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;

  if (cleaned.endsWith('亿')) {
    const n = parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 100_000_000) : 0;
  }
  if (cleaned.endsWith('万')) {
    const n = parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 10_000) : 0;
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Parse a percentage string like "16.67%" → 16.67. */
function parsePct(str: string): number {
  if (!str) return 0;
  const n = parseFloat(str.replace(/%$/, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** Parse duration strings like "6秒" → 6, "1分30秒" → 90. */
function parseDuration(str: string): number {
  if (!str) return 0;
  const minMatch = str.match(/(\d+)分/);
  const secMatch = str.match(/(\d+)秒/);
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
  if (mins === 0 && secs === 0) {
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : 0;
  }
  return mins * 60 + secs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until a JS expression returns truthy, or timeout. */
async function waitForElement(
  target: string,
  checkJs: string,
  timeoutMs: number = 20_000,
  intervalMs: number = 1500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await cdpEval(target, checkJs);
      if (result) return true;
    } catch { /* ignore */ }
    await sleep(intervalMs);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Douyin post table parser
// ---------------------------------------------------------------------------

/**
 * Column order for Douyin 投稿列表 innerText table, after the header line.
 * Each post block in innerText follows: title, date, genre?, status, then
 * the metric columns in this order.
 */
const DOUYIN_METRIC_COLS = [
  'views',         // 播放量
  '_skip1',        // 完播率 (sometimes '-')
  '_skip2',        // 5s完播率
  'coverClickRate',// 封面点击率
  '_skip3',        // 2s跳出率
  'avgWatchDuration',// 平均播放时长
  'likes',         // 点赞量
  'shares',        // 分享量
  'comments',      // 评论量
  'saves',         // 收藏量
  'profileViews',  // 主页访问量
  'followerDelta', // 粉丝增量
] as const;

interface DouyinRawPost {
  title: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgWatchDuration: number;
  coverClickRate: number;
  followerDelta: number;
  profileViews: number;
}

/**
 * Parse the Douyin 投稿列表 page innerText into structured post data.
 *
 * Actual DOM innerText structure per post:
 *   [title line]
 *   [date: "2026-03-24 23:24"]
 *   [genre: "图文" or "1min视频"]
 *   [tab-only line]
 *   [status: "通过"]
 *   ["\tNNNN\t-\t-\t12.5%\t44.26%\t6秒\t894\t60\t18\t30\t0\t36\t"]  ← METRIC LINE
 *   ["分析详情"]
 *
 * Strategy: find each metric line (has many tabs + numbers), then look backwards
 * for the date and title. This is robust against SPA layout changes.
 */
function parseDouyinPostTable(pageText: string): DouyinRawPost[] {
  const lines = pageText.split('\n');
  const posts: DouyinRawPost[] = [];
  const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}/;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // A metric line: starts with tab, contains many tab-separated values
    if (!raw.includes('\t')) continue;
    const parts = raw.split('\t').map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length < 8) continue;

    // Check that most parts are numeric/percentage/duration/dash
    const numericCount = parts.filter((p) =>
      /^[\d,.]+[万亿]?%?$/.test(p) || /^\d+秒$/.test(p) || /^\d+分\d+秒$/.test(p) || p === '-',
    ).length;
    if (numericCount < 6) continue; // need at least 6 metric-like values

    // Found a metric line — look backwards for date and title
    let dateStr = '';
    let title = '';

    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      if (datePattern.test(prev) && !dateStr) {
        dateStr = prev;
        continue;
      }
      // Title: longer line, not a date, not a short status/genre word
      if (
        dateStr && prev.length > 3 &&
        !datePattern.test(prev) &&
        prev !== '通过' && prev !== '待审核' && prev !== '私密' &&
        prev !== '图文' && prev !== '分析详情' &&
        !prev.startsWith('\t')
      ) {
        title = prev;
        break;
      }
    }

    if (!dateStr || !title) continue;

    // Parse metric values: column order is
    // views, 完播率, 5s完播率, 封面点击率, 2s跳出率, 平均播放时长, 点赞, 分享, 评论, 收藏, 主页访问, 粉丝增量
    const get = (idx: number): string => parts[idx] ?? '-';
    posts.push({
      title,
      date: dateStr,
      views: parseChineseNumber(get(0)),
      coverClickRate: parsePct(get(3)),
      avgWatchDuration: parseDuration(get(5)),
      likes: parseChineseNumber(get(6)),
      shares: parseChineseNumber(get(7)),
      comments: parseChineseNumber(get(8)),
      saves: parseChineseNumber(get(9)),
      profileViews: parseChineseNumber(get(10)),
      followerDelta: parseChineseNumber(get(11)),
    });
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Douyin profile extractor
// ---------------------------------------------------------------------------

interface DouyinProfileRaw {
  nickname: string;
  douyinId: string;
  followers: number;
  likesTotal: number;
}

const DOUYIN_HOME_JS = `
(function() {
  const text = document.body.innerText;
  const idMatch = text.match(/抖音号[：:]\\s*(\\S+)/);
  const fansMatch = text.match(/粉丝\\s*([\\d,.万亿]+)/);
  const likesMatch = text.match(/获赞\\s*([\\d,.万亿]+)/);
  const titleEl = document.querySelector('h1, .creator-name, [class*="nickname"]');
  const titleFromMeta = document.querySelector('meta[property="og:title"]')?.content || '';
  const nickname = titleEl?.textContent?.trim() || titleFromMeta.split('-')[0].trim() || '';
  return JSON.stringify({
    nickname,
    douyinId: idMatch ? idMatch[1] : '',
    rawFans: fansMatch ? fansMatch[1] : '0',
    rawLikes: likesMatch ? likesMatch[1] : '0',
    url: window.location.href,
  });
})()
`;

// ---------------------------------------------------------------------------
// Douyin collection
// ---------------------------------------------------------------------------

async function collectDouyin(): Promise<CreatorProfile> {
  // Open creator home — will redirect to /creator-micro/home after login check
  const target = await cdpNew('https://creator.douyin.com');

  try {
    // Wait for SPA render — creator center is slow, poll for page content
    await waitForElement(
      target,
      `document.body.innerText.includes('粉丝') || window.location.href.includes('login')`,
      20_000,
    );

    // Check if we landed on the home page (login redirect guard)
    const currentUrl = await cdpEval(target, 'window.location.href') as string;
    if (typeof currentUrl === 'string' && currentUrl.includes('login')) {
      throw new CDPAdapterError(
        'NOT_LOGGED_IN',
        'Douyin requires login. Please log in to creator.douyin.com in Chrome first.',
      );
    }

    // Extract profile info from home page
    const profileJson = await cdpEval(target, DOUYIN_HOME_JS) as string;
    let profileRaw: { nickname: string; douyinId: string; rawFans: string; rawLikes: string };
    try {
      profileRaw = JSON.parse(profileJson);
    } catch {
      throw new CDPAdapterError('PARSE_ERROR', 'Failed to parse Douyin home page profile data');
    }

    const profile: DouyinProfileRaw = {
      nickname: profileRaw.nickname || 'Douyin Creator',
      douyinId: profileRaw.douyinId || '',
      followers: parseChineseNumber(profileRaw.rawFans),
      likesTotal: parseChineseNumber(profileRaw.rawLikes),
    };

    // Navigate to 投稿列表: direct URL → generous sleep → click tabs → wait for data
    // Douyin SPA is slow — use fixed sleeps between clicks, then smart-wait for final result
    try {
      await cdpNavigate(target, 'https://creator.douyin.com/creator-micro/data-center/content');
      await sleep(8000); // Douyin SPA needs time to fully render + bind event handlers

      // Page defaults to 直播 tab — click "投稿作品" first
      await cdpEval(target, `
        (() => {
          const el = Array.from(document.querySelectorAll('div'))
            .find(e => e.textContent.trim() === '投稿作品' && e.offsetParent !== null);
          if (el) el.click();
        })()
      `);
      await sleep(5000); // Wait for sub-tabs and content to render

      // Click "投稿列表" sub-tab
      await cdpEval(target, `
        (() => {
          const el = Array.from(document.querySelectorAll('div,span'))
            .find(e => e.textContent.trim() === '投稿列表' && e.offsetParent !== null);
          if (el) el.click();
        })()
      `);

      // Smart-wait for the actual post table to appear (this is the real signal)
      const tableLoaded = await waitForElement(
        target,
        `(document.body.innerText.match(/分析详情/g) || []).length > 0`,
        25_000,
      );

      // If table didn't load with default date, try selecting "全部" date range
      if (!tableLoaded) {
        // Click the date range area (contains "~" between two dates, or "发布时间")
        await cdpEval(target, `
          (() => {
            const btns = Array.from(document.querySelectorAll('span,div,button'));
            const dateTrigger = btns.find(e => {
              const t = e.textContent.trim();
              return (t === '~' || t.includes('发布时间') || /\\d{4}[-/]\\d{2}/.test(t))
                && e.offsetParent !== null && e.offsetWidth < 300;
            });
            if (dateTrigger) dateTrigger.click();
          })()
        `);
        await sleep(2000);

        // Click "全部" in the quick-select
        await cdpEval(target, `
          (() => {
            const el = Array.from(document.querySelectorAll('span,div,a,button'))
              .find(e => e.textContent.trim() === '全部' && e.offsetParent !== null);
            if (el) el.click();
          })()
        `);

        // Wait for data to load after date change
        await waitForElement(
          target,
          `(document.body.innerText.match(/分析详情/g) || []).length > 0`,
          20_000,
        );
      }
    } catch {
      // Navigation failed — return what we have (profile-only, no posts)
    }

    // Scroll to load more posts (lazy-loaded entries)
    await cdpScroll(target, 'bottom');
    await sleep(2000);
    await cdpScroll(target, 'bottom');
    await sleep(1500);

    // Extract full page text for post table parsing
    const pageText = await cdpEval(
      target,
      'document.body.innerText',
    ) as string;

    const rawPosts = typeof pageText === 'string' ? parseDouyinPostTable(pageText) : [];

    const posts: Post[] = rawPosts.slice(0, MAX_POSTS).map((p, i) => ({
      postId: `douyin-${i + 1}`,
      desc: p.title,
      publishedAt: p.date,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      avgWatchDuration: p.avgWatchDuration || undefined,
      coverClickRate: p.coverClickRate || undefined,
    } as Post & { coverClickRate?: number }));

    return {
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      fetchedAt: new Date().toISOString(),
      source: 'cdp',
      profile: {
        nickname: profile.nickname,
        uniqueId: profile.douyinId || 'unknown',
        followers: profile.followers,
        likesTotal: profile.likesTotal,
        videosCount: posts.length,
      },
      posts,
    };
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// XHS profile extractor
// ---------------------------------------------------------------------------

const XHS_PROFILE_JS = `
(function() {
  const text = document.body.innerText;
  // Nickname: try dedicated selector, fall back to title
  const nameEl = document.querySelector(
    '.user-name, [class*="username"], [class*="nickname"], h1'
  );
  const nickname = nameEl?.textContent?.trim()
    || document.title.split('的主页')[0].trim()
    || '';

  // Metrics from page text using common XHS patterns
  const fansMatch = text.match(/关注了?(\\s*[\\d,.万亿]+)[\\s\\S]*?粉丝/);
  const fansMatch2 = text.match(/粉丝[\\s：:]*([\\d,.万亿]+)/);
  const likesMatch = text.match(/获赞与收藏[\\s：:]*([\\d,.万亿]+)/);
  const likesMatch2 = text.match(/获赞[\\s：:]*([\\d,.万亿]+)/);

  // Note list items — XHS has consistent card structure
  const noteCards = Array.from(
    document.querySelectorAll(
      '[class*="note-item"], [class*="noteItem"], [class*="feeds-container"] > *, section[class*="note"]'
    )
  ).slice(0, 50);

  const notes = noteCards.map((card) => {
    const titleEl = card.querySelector('[class*="title"], [class*="desc"], span, p');
    const likeEl = card.querySelector('[class*="like"], [class*="count"]');
    return {
      title: titleEl?.textContent?.trim() || '',
      likes: parseInt((likeEl?.textContent || '0').replace(/[^\\d]/g, ''), 10) || 0,
    };
  }).filter((n) => n.title.length > 0);

  return JSON.stringify({
    nickname,
    rawFans: (fansMatch2 || fansMatch) ? ((fansMatch2 || fansMatch) || [])[1] || '0' : '0',
    rawLikes: (likesMatch || likesMatch2) ? ((likesMatch || likesMatch2) || [])[1] || '0' : '0',
    notes,
    pageText: text.slice(0, 3000),
  });
})()
`;

// ---------------------------------------------------------------------------
// XHS collection
// ---------------------------------------------------------------------------

async function collectXhs(profileUrl: string): Promise<CreatorProfile> {
  const target = await cdpNew(profileUrl);

  try {
    // Wait for page load and potential redirect
    await sleep(4000);

    const currentUrl = await cdpEval(target, 'window.location.href') as string;
    if (typeof currentUrl === 'string' && (currentUrl.includes('login') || currentUrl.includes('signin'))) {
      throw new CDPAdapterError(
        'NOT_LOGGED_IN',
        'XiaoHongShu requires login. Please log in to xiaohongshu.com in Chrome first.',
      );
    }

    // Scroll to trigger lazy-loaded note cards
    await cdpScroll(target, 'bottom');
    await sleep(2000);
    await cdpScroll(target, 'bottom');
    await sleep(1500);

    // Extract profile and notes data
    const dataJson = await cdpEval(target, XHS_PROFILE_JS) as string;
    let data: {
      nickname: string;
      rawFans: string;
      rawLikes: string;
      notes: Array<{ title: string; likes: number }>;
      pageText: string;
    };

    try {
      data = JSON.parse(dataJson);
    } catch {
      throw new CDPAdapterError('PARSE_ERROR', 'Failed to parse XHS profile data from page');
    }

    const followers = parseChineseNumber(data.rawFans);
    const likesTotal = parseChineseNumber(data.rawLikes);

    // Build posts from note cards
    // XHS does not expose view counts publicly — estimate from engagement
    const posts: Post[] = data.notes.slice(0, MAX_POSTS).map((note, i) => {
      const estimatedViews = Math.round((note.likes) * 15);
      return {
        postId: `xhs-${i + 1}`,
        desc: note.title,
        views: estimatedViews,
        likes: note.likes,
        comments: 0,
        shares: 0,
        saves: 0,
      };
    });

    // Derive profileUrl: prefer XHS canonical format if we got redirected
    const resolvedUrl =
      typeof currentUrl === 'string' && currentUrl.includes('xiaohongshu.com')
        ? currentUrl
        : profileUrl;

    return {
      platform: 'xhs',
      profileUrl: resolvedUrl,
      fetchedAt: new Date().toISOString(),
      source: 'cdp',
      profile: {
        nickname: data.nickname || 'XHS Creator',
        uniqueId: resolvedUrl.split('/').pop()?.split('?')[0] || 'unknown',
        followers,
        likesTotal,
        videosCount: posts.length,
      },
      posts,
    };
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// XHS Creator Center collection
// ---------------------------------------------------------------------------

/**
 * Collect XHS data from the creator center (requires login to creator.xiaohongshu.com).
 * Extracts real view counts, engagement metrics, and per-note data from the authenticated
 * creator dashboard — far more accurate than the public profile estimate.
 */
async function collectXhsCreatorCenter(): Promise<CreatorProfile> {
  const target = await cdpNew('https://creator.xiaohongshu.com/statistics/account/v2');

  try {
    // Wait for account analytics page to load
    const loaded = await waitForElement(target, `document.body.innerText.includes('账号诊断')`, 20_000);
    if (!loaded) {
      // Check if redirected to login
      const currentUrl = await cdpEval(target, 'window.location.href') as string;
      if (typeof currentUrl === 'string' && (currentUrl.includes('login') || currentUrl.includes('signin'))) {
        throw new CDPAdapterError(
          'NOT_LOGGED_IN',
          'XHS Creator Center requires login. Please log in to creator.xiaohongshu.com in Chrome first.',
        );
      }
      throw new CDPAdapterError('TIMEOUT', 'XHS Creator Center statistics page did not load (账号诊断 not found)');
    }

    // Extract account-level diagnostics from innerText
    const diagJson = await cdpEval(target, `
      (function() {
        const text = document.body.innerText;

        // 账号诊断 block: "观看数为 5283", "涨粉数为 108", "主页访客数为 592"
        const viewsMatch = text.match(/观看数为\\s*([\\d,.万亿]+)/);
        const followerDeltaMatch = text.match(/涨粉数为\\s*([\\d,.万亿]+)/);
        const profileVisitsMatch = text.match(/主页访客数为\\s*([\\d,.万亿]+)/);

        // 观看数据 tab (default view): 曝光数, 观看数, 封面点击率, 平均观看时长, 完播率
        const impressionsMatch = text.match(/曝光数[\\s\\n]*([\\d,.万亿]+)/);
        const watchCountMatch = text.match(/观看数[\\s\\n]*([\\d,.万亿]+)/);
        const coverClickMatch = text.match(/封面点击率[\\s\\n]*([\\d.]+%)/);
        const avgWatchMatch = text.match(/平均观看时长[\\s\\n]*([\\d]+秒|[\\d]+分[\\d]+秒)/);
        const completionMatch = text.match(/完播率[\\s\\n]*([\\d.]+%)/);

        // Sidebar username
        const usernameEl = document.querySelector('[class*="username"], [class*="nickname"], [class*="user-name"]');
        const username = usernameEl?.textContent?.trim() || '';

        return JSON.stringify({
          username,
          rawViews: viewsMatch ? viewsMatch[1] : (watchCountMatch ? watchCountMatch[1] : '0'),
          rawFollowerDelta: followerDeltaMatch ? followerDeltaMatch[1] : '0',
          rawProfileVisits: profileVisitsMatch ? profileVisitsMatch[1] : '0',
          rawImpressions: impressionsMatch ? impressionsMatch[1] : '0',
          rawCoverClickRate: coverClickMatch ? coverClickMatch[1] : '0%',
          rawAvgWatch: avgWatchMatch ? avgWatchMatch[1] : '0秒',
          rawCompletion: completionMatch ? completionMatch[1] : '0%',
        });
      })()
    `) as string;

    let diagData: {
      username: string;
      rawViews: string;
      rawFollowerDelta: string;
      rawProfileVisits: string;
      rawImpressions: string;
      rawCoverClickRate: string;
      rawAvgWatch: string;
      rawCompletion: string;
    };
    try {
      diagData = JSON.parse(diagJson);
    } catch {
      throw new CDPAdapterError('PARSE_ERROR', 'Failed to parse XHS Creator Center diagnostics data');
    }

    // Click 互动数据 tab to get likes/comments/saves/shares
    await cdpEval(target, `
      (function() {
        const els = Array.from(document.querySelectorAll('span, div, button, a'));
        const tab = els.find(e => e.textContent.trim() === '互动数据' && e.offsetParent !== null);
        if (tab) tab.click();
      })()
    `);
    await sleep(2000);

    const engJson = await cdpEval(target, `
      (function() {
        const text = document.body.innerText;
        const likesMatch = text.match(/点赞数[\\s\\n]*([\\d,.万亿]+)/);
        const commentsMatch = text.match(/评论数[\\s\\n]*([\\d,.万亿]+)/);
        const savesMatch = text.match(/收藏数[\\s\\n]*([\\d,.万亿]+)/);
        const sharesMatch = text.match(/分享数[\\s\\n]*([\\d,.万亿]+)/);
        return JSON.stringify({
          rawLikes: likesMatch ? likesMatch[1] : '0',
          rawComments: commentsMatch ? commentsMatch[1] : '0',
          rawSaves: savesMatch ? savesMatch[1] : '0',
          rawShares: sharesMatch ? sharesMatch[1] : '0',
        });
      })()
    `) as string;

    let engData: { rawLikes: string; rawComments: string; rawSaves: string; rawShares: string };
    try {
      engData = JSON.parse(engJson);
    } catch {
      engData = { rawLikes: '0', rawComments: '0', rawSaves: '0', rawShares: '0' };
    }

    const totalLikes = parseChineseNumber(engData.rawLikes);

    // Navigate to note manager for per-note data
    await cdpNavigate(target, 'https://creator.xiaohongshu.com/new/note-manager');
    await waitForElement(target, `document.body.innerText.includes('全部笔记')`, 20_000);

    // Scroll to load more notes
    await cdpScroll(target, 'bottom');
    await sleep(2000);

    // Extract per-note data from innerText
    // Format per note:
    //   [title]
    //   发布于 2026年03月15日 18:49
    //   [views]
    //   [comments]
    //   [likes]
    //   [saves]
    //   [shares]
    //   权限设置
    const notesJson = await cdpEval(target, `
      (function() {
        const text = document.body.innerText;
        const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
        const datePattern = /^发布于\\s*(\\d{4}年\\d{2}月\\d{2}日(?:\\s+\\d{2}:\\d{2})?)/;
        const numPattern = /^[\\d,]+$/;
        const posts = [];

        for (let i = 0; i < lines.length; i++) {
          const dateMatch = lines[i].match(datePattern);
          if (!dateMatch) continue;

          // Look backwards for title (non-empty line before the date)
          let title = '';
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const prev = lines[j].trim();
            if (prev && prev.length > 2 && !datePattern.test(prev) && !/^(权限设置|全部笔记|笔记管理)$/.test(prev)) {
              title = prev;
              break;
            }
          }

          // Collect up to 5 numbers after date line
          const nums = [];
          let j = i + 1;
          while (j < lines.length && nums.length < 5) {
            const line = lines[j].trim();
            if (/^[\\d,]+$/.test(line)) {
              nums.push(parseInt(line.replace(/,/g, ''), 10));
            } else if (/^[\\d.]+[万亿]$/.test(line)) {
              // parseChineseNumber equivalent inline
              const cn = line.endsWith('亿')
                ? Math.round(parseFloat(line) * 100000000)
                : Math.round(parseFloat(line) * 10000);
              nums.push(cn);
            } else if (line === '权限设置' || line === '删除' || datePattern.test(line)) {
              break;
            }
            j++;
          }

          if (nums.length >= 1) {
            posts.push({
              title: title || '未命名笔记',
              date: dateMatch[1],
              views: nums[0] ?? 0,
              comments: nums[1] ?? 0,
              likes: nums[2] ?? 0,
              saves: nums[3] ?? 0,
              shares: nums[4] ?? 0,
            });
          }
        }
        return JSON.stringify(posts);
      })()
    `) as string;

    let rawNotes: Array<{
      title: string;
      date: string;
      views: number;
      comments: number;
      likes: number;
      saves: number;
      shares: number;
    }> = [];
    try {
      rawNotes = JSON.parse(notesJson);
    } catch {
      rawNotes = [];
    }

    const posts: Post[] = rawNotes.slice(0, MAX_POSTS).map((note, i) => ({
      postId: `xhs-cc-${i + 1}`,
      desc: note.title,
      publishedAt: note.date,
      views: note.views,
      comments: note.comments,
      likes: note.likes,
      saves: note.saves,
      shares: note.shares,
    }));

    // Derive follower count: use profile visits as a proxy if followers not found,
    // but the diagnostics block gives us followerDelta — we don't have total followers
    // from creator center alone; leave it as 0 if not extractable.
    const profileVisits = parseChineseNumber(diagData.rawProfileVisits);
    const username = diagData.username || 'XHS Creator';

    return {
      platform: 'xhs',
      profileUrl: 'https://creator.xiaohongshu.com',
      fetchedAt: new Date().toISOString(),
      source: 'cdp',
      profile: {
        nickname: username,
        uniqueId: username,
        followers: profileVisits, // best proxy available from creator center
        likesTotal: totalLikes,
        videosCount: posts.length,
      },
      posts,
    };
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// TikTok collection
// ---------------------------------------------------------------------------

const TIKTOK_HOME_JS = `
(function() {
  const text = document.body.innerText;
  const nameMatch = text.match(/^[\\s\\S]*?返回 TikTok\\n([^\\n]+)\\n/);
  const nickname = nameMatch ? nameMatch[1].trim() : '';
  const bioMatch = text.match(new RegExp(nickname.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '\\n([^\\n]+)'));
  const bio = bioMatch ? bioMatch[1].trim() : '';

  const likesMatch = text.match(/赞\\n([\\d,.KMB万亿]+)/);
  const fansMatch = text.match(/粉丝\\n([\\d,.KMB万亿]+)/);
  const followMatch = text.match(/已关注\\n([\\d,.KMB万亿]+)/);

  // Recent posts from "最近的发布内容" section
  const recentSection = text.split('最近的发布内容')[1] || '';
  const recentLines = recentSection.split('最新评论')[0] || recentSection;

  return JSON.stringify({
    nickname,
    bio,
    rawLikes: likesMatch ? likesMatch[1] : '0',
    rawFans: fansMatch ? fansMatch[1] : '0',
    rawFollowing: followMatch ? followMatch[1] : '0',
    recentText: recentLines.slice(0, 2000),
  });
})()
`;

const TIKTOK_CONTENT_JS = `
(function() {
  const text = document.body.innerText;
  // Content tab has a table: rank, title, 7-day views, total views, time, action
  const contentSection = text.split('操作')[1] || '';
  const lines = contentSection.split('\\n').map(l => l.trim()).filter(l => l.length > 0);

  const posts = [];
  let i = 0;
  while (i < lines.length && posts.length < 50) {
    // Pattern: rank number, then duration? (00:09), title, 7d-views, total-views, time, 查看数据
    const rankMatch = lines[i].match(/^(\\d+)$/);
    if (rankMatch) {
      let j = i + 1;
      let duration = '';
      let title = '';
      let views7d = '0';
      let viewsTotal = '0';
      let timeStr = '';

      // Check if next line is a duration (00:09)
      if (j < lines.length && /^\\d{2}:\\d{2}$/.test(lines[j])) {
        duration = lines[j];
        j++;
      }
      // Title line(s) — collect until we hit a number
      while (j < lines.length && !/^[\\d,.KMB万亿]+$/.test(lines[j]) && lines[j] !== '查看数据') {
        title += (title ? ' ' : '') + lines[j];
        j++;
      }
      // 7-day views
      if (j < lines.length) { views7d = lines[j]; j++; }
      // Total views
      if (j < lines.length) { viewsTotal = lines[j]; j++; }
      // Relative time
      if (j < lines.length && lines[j] !== '查看数据') { timeStr = lines[j]; j++; }
      // Skip "查看数据"
      if (j < lines.length && lines[j] === '查看数据') j++;

      if (title) {
        posts.push({ title, views7d, viewsTotal, timeStr });
      }
      i = j;
    } else {
      i++;
    }
  }
  return JSON.stringify(posts);
})()
`;

/** Parse TikTok K/M/B suffixes. "21K" → 21000, "1.5K" → 1500 */
function parseTiktokNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  const upper = cleaned.toUpperCase();
  if (upper.endsWith('B')) return Math.round(parseFloat(upper.slice(0, -1)) * 1_000_000_000);
  if (upper.endsWith('M')) return Math.round(parseFloat(upper.slice(0, -1)) * 1_000_000);
  if (upper.endsWith('K')) return Math.round(parseFloat(upper.slice(0, -1)) * 1_000);
  // Also handle Chinese suffixes
  return parseChineseNumber(cleaned);
}

/** Convert relative time like "1周前", "1个月前", "1年前" to approximate ISO date */
function relativeTimeToDate(timeStr: string): string | undefined {
  if (!timeStr) return undefined;
  const now = Date.now();
  const weekMatch = timeStr.match(/(\d+)\s*周前/);
  const monthMatch = timeStr.match(/(\d+)\s*个月前/);
  const yearMatch = timeStr.match(/(\d+)\s*年前/);
  const dayMatch = timeStr.match(/(\d+)\s*天前/);
  const hourMatch = timeStr.match(/(\d+)\s*小时前/);

  let ms = 0;
  if (hourMatch) ms = parseInt(hourMatch[1], 10) * 3600_000;
  else if (dayMatch) ms = parseInt(dayMatch[1], 10) * 86400_000;
  else if (weekMatch) ms = parseInt(weekMatch[1], 10) * 7 * 86400_000;
  else if (monthMatch) ms = parseInt(monthMatch[1], 10) * 30 * 86400_000;
  else if (yearMatch) ms = parseInt(yearMatch[1], 10) * 365 * 86400_000;
  else return undefined;

  return new Date(now - ms).toISOString();
}

async function collectTiktok(): Promise<CreatorProfile> {
  // Open TikTok Studio home for profile info
  const target = await cdpNew('https://www.tiktok.com/tiktokstudio');

  try {
    await waitForElement(target, `document.body.innerText.includes('粉丝') || window.location.href.includes('login')`, 20_000);

    const currentUrl = await cdpEval(target, 'window.location.href') as string;
    if (typeof currentUrl === 'string' && currentUrl.includes('login')) {
      throw new CDPAdapterError(
        'NOT_LOGGED_IN',
        'TikTok requires login. Please log in to tiktok.com in Chrome first.',
      );
    }

    // Extract profile from TikTok Studio home
    const profileJson = await cdpEval(target, TIKTOK_HOME_JS) as string;
    let profileData: {
      nickname: string;
      bio: string;
      rawLikes: string;
      rawFans: string;
      rawFollowing: string;
      recentText: string;
    };

    try {
      profileData = JSON.parse(profileJson);
    } catch {
      throw new CDPAdapterError('PARSE_ERROR', 'Failed to parse TikTok Studio home page data');
    }

    const followers = parseTiktokNumber(profileData.rawFans);
    const likesTotal = parseTiktokNumber(profileData.rawLikes);
    const nickname = profileData.nickname || 'TikTok Creator';

    // Parse recent posts from home page (have likes data)
    const recentPosts: Array<{ title: string; date: string; views: number; likes: number }> = [];
    {
      const lines = profileData.recentText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      let i = 0;
      while (i < lines.length) {
        // Skip duration lines like "00:07"
        if (/^\d{2}:\d{2}$/.test(lines[i])) { i++; continue; }
        // Title line followed by date, then views, then likes
        const dateMatch = lines[i + 1]?.match(/(\d{1,2}月\d{1,2}日\s+\d{1,2}:\d{2})/);
        if (dateMatch && i + 3 < lines.length) {
          recentPosts.push({
            title: lines[i],
            date: dateMatch[1],
            views: parseTiktokNumber(lines[i + 2]),
            likes: parseTiktokNumber(lines[i + 3]),
          });
          i += 4;
        } else {
          i++;
        }
      }
    }

    // Navigate to content analytics for full post list
    await cdpNavigate(target, 'https://www.tiktok.com/tiktokstudio/analytics/content');
    await waitForElement(target, `document.body.innerText.includes('总播放量') || document.body.innerText.includes('查看数据')`, 20_000);

    const contentJson = await cdpEval(target, TIKTOK_CONTENT_JS) as string;
    let contentPosts: Array<{ title: string; views7d: string; viewsTotal: string; timeStr: string }> = [];

    try {
      contentPosts = JSON.parse(contentJson);
    } catch {
      // If content tab parsing fails, use home page recent posts only
    }

    // Build final posts: prefer content tab data, enrich with home page likes
    const posts: Post[] = contentPosts.length > 0
      ? contentPosts.slice(0, MAX_POSTS).map((cp, i) => {
          const views = parseTiktokNumber(cp.viewsTotal);
          // Try to match with recent posts by title for likes data
          const match = recentPosts.find((rp) => cp.title.includes(rp.title) || rp.title.includes(cp.title));
          const likes = match?.likes ?? Math.round(views * 0.08); // Estimate ~8% engagement
          return {
            postId: `tiktok-${i + 1}`,
            desc: cp.title,
            publishedAt: relativeTimeToDate(cp.timeStr),
            views,
            likes,
            comments: 0, // Not available in TikTok Studio list view
            shares: 0,
            saves: 0,
          };
        })
      : recentPosts.slice(0, MAX_POSTS).map((rp, i) => ({
          postId: `tiktok-${i + 1}`,
          desc: rp.title,
          views: rp.views,
          likes: rp.likes,
          comments: 0,
          shares: 0,
          saves: 0,
        }));

    return {
      platform: 'tiktok',
      profileUrl: 'https://www.tiktok.com/tiktokstudio',
      fetchedAt: new Date().toISOString(),
      source: 'cdp',
      profile: {
        nickname,
        uniqueId: nickname,
        followers,
        likesTotal,
        videosCount: posts.length,
        bio: profileData.bio || undefined,
      },
      posts,
    };
  } finally {
    await cdpClose(target).catch(() => { /* best-effort close */ });
  }
}

// ---------------------------------------------------------------------------
// CDPAdapter class
// ---------------------------------------------------------------------------

/**
 * Data adapter that collects creator profiles via a locally-running CDP proxy.
 *
 * The proxy must be started separately on port 3458 and must have Chrome
 * open with the user's authenticated sessions for the target platforms.
 *
 * Input format: JSON string `{ platform: 'douyin' | 'tiktok' | 'xhs', input?: string }`
 * - For 'douyin', `input` is optional (collects the logged-in account from creator center)
 * - For 'tiktok', `input` is optional (collects the logged-in account from TikTok Studio)
 * - For 'xhs', `input` is the profile URL (e.g. https://www.xiaohongshu.com/user/profile/xxx)
 */
export class CDPAdapter implements DataAdapter {
  readonly name = 'cdp';
  readonly description = 'Collect creator data via CDP proxy (requires local proxy at localhost:3458)';
  readonly experimental = true;

  async collect(input: string): Promise<CreatorProfile | null> {
    let params: { platform: 'douyin' | 'tiktok' | 'xhs'; input?: string };
    try {
      params = JSON.parse(input);
    } catch {
      throw new CDPAdapterError('PARSE_ERROR', 'CDPAdapter input must be JSON: { platform, input? }');
    }

    const healthy = await cdpHealth();
    if (!healthy) {
      throw new CDPAdapterError(
        'PROXY_NOT_RUNNING',
        'CDP proxy is not running at localhost:3458. Start the proxy before collecting.',
      );
    }

    const { platform, input: platformInput } = params;

    const task = async (): Promise<CreatorProfile> => {
      switch (platform) {
        case 'douyin':
          return collectDouyin();
        case 'tiktok':
          return collectTiktok();
        case 'xhs': {
          // Try creator center first (logged-in account, real data)
          try {
            return await collectXhsCreatorCenter();
          } catch {
            // Fall back to public profile if creator center fails
            if (!platformInput) {
              throw new CDPAdapterError('PARSE_ERROR', 'XHS collection failed. Provide a profile URL or log in to creator.xiaohongshu.com');
            }
            return collectXhs(platformInput);
          }
        }
        default:
          throw new CDPAdapterError(
            'PARSE_ERROR',
            `Unsupported platform "${platform as string}". Supported: douyin, tiktok, xhs`,
          );
      }
    };

    // Wrap with a 90-second overall timeout
    return new Promise<CreatorProfile>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CDPAdapterError('TIMEOUT', `CDP collection timed out after ${COLLECT_TIMEOUT_MS / 1000}s`));
      }, COLLECT_TIMEOUT_MS);

      task().then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}
