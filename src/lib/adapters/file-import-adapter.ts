/**
 * File-based import adapter — parses JSON, CSV, and XLSX files into
 * CreatorProfile objects. Used by the manual file upload flow as a
 * workaround for unstable browser extension collection.
 *
 * Unlike ManualImportAdapter (which accepts a single JSON string),
 * this module works with raw file content and supports multiple formats.
 *
 * @module adapters/file-import-adapter
 */

import * as XLSX from 'xlsx';
import type { CreatorProfile, FanPortrait } from '../schema/creator-data';
import { validateCreatorProfile } from '../schema/validate';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type FileImportErrorCode = 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNSUPPORTED_FORMAT';

export class FileImportError extends Error {
  readonly code: FileImportErrorCode;
  readonly fileName: string;

  constructor(code: FileImportErrorCode, fileName: string, message: string) {
    super(`[${fileName}] ${message}`);
    this.name = 'FileImportError';
    this.code = code;
    this.fileName = fileName;
  }
}

// ---------------------------------------------------------------------------
// File extension detection
// ---------------------------------------------------------------------------

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

function ensureSource(profile: CreatorProfile): CreatorProfile {
  if (!profile.source) {
    return { ...profile, source: 'manual_import' };
  }
  return profile;
}

function parseJson(content: string, fileName: string): CreatorProfile[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new FileImportError('PARSE_ERROR', fileName, `Invalid JSON: ${msg}`);
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const results: CreatorProfile[] = [];

  for (let i = 0; i < items.length; i++) {
    const label = Array.isArray(parsed) ? `item[${i}]` : 'root';
    const item = items[i];

    // Inject source before validation if missing (validation requires it)
    if (typeof item === 'object' && item !== null && !('source' in item)) {
      (item as Record<string, unknown>).source = 'manual_import';
    }

    const validation = validateCreatorProfile(item);
    if (!validation.valid) {
      throw new FileImportError(
        'VALIDATION_ERROR',
        fileName,
        `Schema validation failed at ${label}:\n  - ${validation.errors.join('\n  - ')}`,
      );
    }
    results.push(item as CreatorProfile);
  }

  return results;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Minimal CSV line parser that handles quoted fields. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Map of recognized CSV/XLSX column names → Post field names. */
const COLUMN_MAP: Record<string, string> = {
  postid: 'postId',
  post_id: 'postId',
  id: 'postId',
  desc: 'desc',
  description: 'desc',
  title: 'desc',
  '视频名称': 'desc',
  '作品名称': 'desc',
  '笔记标题': 'desc',           // XHS (Red Note)
  '首次发布时间': 'publishedAt', // XHS
  '发布时间': 'publishedAt',
  '播放量': 'views',
  '观看量': 'views',            // XHS
  '点赞量': 'likes',
  '点赞': 'likes',              // XHS
  '分享量': 'shares',
  '分享': 'shares',             // XHS
  '评论量': 'comments',
  '评论': 'comments',           // XHS
  '收藏量': 'saves',
  '收藏': 'saves',             // XHS
  '完播率': 'completionRate',
  '5s完播率': 'completionRate',
  '2s跳出率': 'bounceRate',
  '封面点击率': 'coverClickRate',
  '平均播放时长': 'avgWatchDuration',
  '人均观看时长': 'avgWatchDuration', // XHS (seconds per person)
  '粉丝增量': 'followerDelta',
  '涨粉': 'followerDelta',       // XHS
  '主页访问量': 'profileViews',
  views: 'views',
  plays: 'views',
  likes: 'likes',
  comments: 'comments',
  shares: 'shares',
  saves: 'saves',
  bookmarks: 'saves',
  publishedat: 'publishedAt',
  published_at: 'publishedAt',
  date: 'publishedAt',
  completionrate: 'completionRate',
  completion_rate: 'completionRate',
  bouncerate: 'bounceRate',
  bounce_rate: 'bounceRate',
  avgwatchduration: 'avgWatchDuration',
  avg_watch_duration: 'avgWatchDuration',
};

const NUMERIC_FIELDS = new Set([
  'views', 'likes', 'comments', 'shares', 'saves',
  'completionRate', 'bounceRate', 'avgWatchDuration',
]);

function resolveColumn(rawKey: string): string | null {
  const lower = rawKey.toLowerCase().trim();
  return COLUMN_MAP[lower] ?? COLUMN_MAP[rawKey.trim()] ?? null;
}

function parseCsv(content: string, fileName: string): CreatorProfile[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new FileImportError('VALIDATION_ERROR', fileName, 'CSV must have a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]);
  const fieldMap = headers.map((h) => resolveColumn(h));

  const posts: CreatorProfile['posts'] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, unknown> = {};

    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      if (!field) continue;
      const val = values[j] ?? '';
      if (NUMERIC_FIELDS.has(field)) {
        const cleaned = val.replace(/%$/, '');
        const num = Number(cleaned);
        row[field] = Number.isFinite(num) ? num : 0;
      } else {
        row[field] = val;
      }
    }

    if (!row.postId) row.postId = `csv-${i}`;
    if (row.desc === undefined) row.desc = '';
    if (row.views === undefined) row.views = 0;
    if (row.likes === undefined) row.likes = 0;
    if (row.comments === undefined) row.comments = 0;
    if (row.shares === undefined) row.shares = 0;
    if (row.saves === undefined) row.saves = 0;

    posts.push(row as unknown as CreatorProfile['posts'][number]);
  }

  if (posts.length === 0) {
    throw new FileImportError('VALIDATION_ERROR', fileName, 'No valid data rows found in CSV');
  }

  const profile: CreatorProfile = {
    platform: 'unknown',
    profileUrl: '',
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: `Imported from ${fileName}`,
      uniqueId: `csv-import-${Date.now()}`,
      followers: 0,
      likesTotal: posts.reduce((sum, p) => sum + p.likes, 0),
      videosCount: posts.length,
    },
    posts,
  };

  const validation = validateCreatorProfile(profile);
  if (!validation.valid) {
    throw new FileImportError(
      'VALIDATION_ERROR',
      fileName,
      `CSV data failed validation: ${validation.errors.join('; ')}`,
    );
  }

  return [profile];
}

// ---------------------------------------------------------------------------
// XLSX schema detection — Douyin (4 types) and TikTok Studio (7 types)
// ---------------------------------------------------------------------------

/**
 * Douyin export schema types:
 * A) 作品列表 — per-post full metrics (作品名称, 播放量, 点赞量, 分享量, 评论量, 收藏量...)
 * B) 投稿分析 — per-post partial metrics (视频名称, 播放量, 5s完播率, but no likes/comments)
 * C) 投稿汇总 — single-row aggregate stats (条均点击率, 条均5s完播率, 播放量中位数...)
 * D) 时间序列 — daily metrics (日期 + 播放量 or 作品点赞)
 */
type DouyinSchemaType = 'post_list' | 'post_analysis' | 'aggregate' | 'timeseries' | 'unknown';

/**
 * TikTok Studio export schema types:
 * 1) tiktok_content         — Content.xlsx (post list with English column names)
 * 2) tiktok_overview        — Overview.xlsx (daily Video Views, Likes, etc.)
 * 3) tiktok_viewers         — Viewers.xlsx (Total/New/Returning Viewers per day)
 * 4) tiktok_follower_history — FollowerHistory.xlsx (daily Followers + delta)
 * 5) tiktok_follower_gender  — FollowerGender.xlsx (Gender + Distribution)
 * 6) tiktok_follower_territory — FollowerTopTerritories.xlsx (territory + Distribution)
 * 7) tiktok_follower_activity  — FollowerActivity.xlsx (Date + Hour + Active followers)
 */
type TikTokSchemaType =
  | 'tiktok_content'
  | 'tiktok_overview'
  | 'tiktok_viewers'
  | 'tiktok_follower_history'
  | 'tiktok_follower_gender'
  | 'tiktok_follower_territory'
  | 'tiktok_follower_activity';

/** Union of all recognised XLSX export schema types across platforms. */
type ExportSchemaType = DouyinSchemaType | TikTokSchemaType | XhsSchemaType | DouyinAggregateSchemaType;

/** XHS (Red Note / 小红书) export schema types. */
type XhsSchemaType = 'xhs_notes';

/**
 * Douyin 30-day aggregate export schema types:
 * - douyin_interaction: 点赞/评论/收藏/分享 + 环比 (近30日互动数据)
 * - douyin_posting:     总发布/发布视频/发布图文 + 环比 (近30日发布数据)
 * - douyin_follower:    净涨粉/新增关注/取消关注/主页访客 + 环比 (近30日涨粉数据)
 * - douyin_view:        曝光/观看/封面点击率/平均观看时长 + 环比 (近30日观看数据)
 */
type DouyinAggregateSchemaType =
  | 'douyin_interaction'
  | 'douyin_posting'
  | 'douyin_follower'
  | 'douyin_view';

function detectExportSchema(columns: string[]): ExportSchemaType {
  const colSet = new Set(columns);

  // --- TikTok detection first (English column names — no risk of conflict) ---

  // TikTok Content.xlsx: "Video title" + "Total views"
  if (colSet.has('Video title') && colSet.has('Total views')) return 'tiktok_content';

  // TikTok Overview.xlsx: "Date" + "Video Views"
  if (colSet.has('Date') && colSet.has('Video Views')) return 'tiktok_overview';

  // TikTok Viewers.xlsx: "Total Viewers"
  if (colSet.has('Total Viewers')) return 'tiktok_viewers';

  // TikTok FollowerHistory.xlsx: "Followers" + column containing "Difference"
  if (colSet.has('Followers') && columns.some((c) => c.includes('Difference'))) {
    return 'tiktok_follower_history';
  }

  // TikTok FollowerGender.xlsx: "Gender" + "Distribution"
  if (colSet.has('Gender') && colSet.has('Distribution')) return 'tiktok_follower_gender';

  // TikTok FollowerTopTerritories.xlsx: "Top territories"
  if (colSet.has('Top territories')) return 'tiktok_follower_territory';

  // TikTok FollowerActivity.xlsx: "Hour" + "Active followers"
  if (colSet.has('Hour') && colSet.has('Active followers')) return 'tiktok_follower_activity';

  // --- XHS (小红书 / Red Note) detection ---
  // Must check BEFORE Douyin since XHS also has "点赞" etc.
  // XHS files have "笔记标题" as the first meaningful header row.
  if (colSet.has('笔记标题') && colSet.has('首次发布时间')) {
    return 'xhs_notes';
  }

  // --- Douyin detection ---

  // Type A: 作品列表 — has 作品名称 + interaction metrics
  if (colSet.has('作品名称') && (colSet.has('点赞量') || colSet.has('收藏量'))) {
    return 'post_list';
  }

  // Type C: 投稿汇总 — has 条均 (per-post average) columns
  if (columns.some((c) => c.startsWith('条均'))) {
    return 'aggregate';
  }

  // Type D: 时间序列 — has 日期 column + exactly 2 columns
  if (colSet.has('日期') && columns.length === 2) {
    return 'timeseries';
  }

  // Type B: 投稿分析 — has 视频名称 or just 播放量 with per-row data
  if (colSet.has('视频名称') || (colSet.has('播放量') && colSet.has('5s完播率'))) {
    return 'post_analysis';
  }

  // --- Douyin 30-day aggregate files (指标/数值 format) ---
  // 近30日互动数据: has 点赞 (not 点赞量) + 收藏 + 评论/分享 + 环比 columns
  if (colSet.has('指标') && colSet.has('数值') && colSet.has('点赞')) {
    return 'douyin_interaction';
  }

  // 近30日发布数据: has 总发布/发布视频/发布图文
  if (colSet.has('指标') && colSet.has('数值') && colSet.has('总发布')) {
    return 'douyin_posting';
  }

  // 近30日涨粉数据: has 净涨粉
  if (colSet.has('指标') && colSet.has('数值') && colSet.has('净涨粉')) {
    return 'douyin_follower';
  }

  // 近30日观看数据: has 曝光/观看/封面点击率
  if (colSet.has('指标') && colSet.has('数值') && colSet.has('曝光')) {
    return 'douyin_view';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Parse helpers for each Douyin schema type
// ---------------------------------------------------------------------------

/** Parse a numeric value from Douyin export — handles strings, "-", percentages */
function parseDouyinNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const str = String(val).trim();
  if (str === '-' || str === '' || str === 'null') return 0;
  const cleaned = str.replace(/%$/, '').replace(/,/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/** Type A: 作品列表 — full post data with interaction metrics */
function parsePostList(rows: Record<string, unknown>[], fileName: string): { posts: CreatorProfile['posts'] } {
  const posts = rows.map((row, i) => ({
    postId: `post-${i + 1}`,
    desc: String(row['作品名称'] ?? ''),
    publishedAt: row['发布时间'] ? String(row['发布时间']) : undefined,
    views: parseDouyinNum(row['播放量']),
    likes: parseDouyinNum(row['点赞量']),
    comments: parseDouyinNum(row['评论量']),
    shares: parseDouyinNum(row['分享量']),
    saves: parseDouyinNum(row['收藏量']),
    completionRate: parseDouyinNum(row['完播率'] ?? row['5s完播率']),
    bounceRate: parseDouyinNum(row['2s跳出率']),
    avgWatchDuration: parseDouyinNum(row['平均播放时长']),
  }));

  return { posts: posts as CreatorProfile['posts'] };
}

/** Type B: 投稿分析 — partial post data (no interaction metrics) */
function parsePostAnalysis(rows: Record<string, unknown>[]): { posts: CreatorProfile['posts'] } {
  const posts = rows.map((row, i) => ({
    postId: `analysis-${i + 1}`,
    desc: String(row['视频名称'] ?? row['作品名称'] ?? ''),
    publishedAt: row['发布时间'] ? String(row['发布时间']) : undefined,
    views: parseDouyinNum(row['播放量']),
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    completionRate: parseDouyinNum(row['5s完播率']),
    bounceRate: parseDouyinNum(row['2s跳出率']),
    avgWatchDuration: parseDouyinNum(row['平均播放时长']),
  }));

  return { posts: posts as CreatorProfile['posts'] };
}

/** Type C: 投稿汇总 — single-row aggregate stats → stored as profile-level metadata */
function parseAggregate(rows: Record<string, unknown>[]): { aggregate: Record<string, unknown> } {
  const row = rows[0];
  return {
    aggregate: {
      period: row['发布时间'] ? String(row['发布时间']) : undefined,
      genres: row['体裁'] ? String(row['体裁']) : undefined,
      verticals: row['垂类'] ? String(row['垂类']) : undefined,
      postCount: parseDouyinNum(row['周期内投稿量']),
      avgClickRate: parseDouyinNum(row['条均点击率']),
      avg5sCompletionRate: parseDouyinNum(row['条均5s完播率']),
      avg2sBounceRate: parseDouyinNum(row['条均2s跳出率']),
      avgWatchDuration: parseDouyinNum(row['条均播放时长']),
      medianViews: parseDouyinNum(row['播放量中位数']),
      avgLikes: parseDouyinNum(row['条均点赞数']),
      avgComments: parseDouyinNum(row['条均评论量']),
      avgShares: parseDouyinNum(row['条均分享量']),
    },
  };
}

/** Type D: 时间序列 — daily snapshots → HistorySnapshot[] */
function parseTimeseries(rows: Record<string, unknown>[]): { history: CreatorProfile['history'] } {
  // Detect which metric column exists (播放量, 作品点赞, etc.)
  const cols = Object.keys(rows[0] ?? {}).filter((k) => k !== '日期');
  const metricCol = cols[0];

  const history: NonNullable<CreatorProfile['history']> = rows
    .filter((row) => row['日期'])
    .map((row) => {
      const val = parseDouyinNum(row[metricCol]);
      return {
        fetchedAt: String(row['日期']),
        profile: {
          followers: metricCol === '总粉丝量' ? val : 0,
          likesTotal: metricCol === '作品点赞' ? val : 0,
          videosCount: 0,
        },
      };
    });

  return { history };
}

// ---------------------------------------------------------------------------
// TikTok Studio parsers
// ---------------------------------------------------------------------------

/** TikTok Content.xlsx — per-post metrics with English column names */
function parseTikTokContent(rows: Record<string, unknown>[], fileName: string): { posts: CreatorProfile['posts'] } {
  void fileName; // reserved for future error context
  const posts = rows.map((row, i) => {
    const link = String(row['Video link'] ?? '');
    const videoIdMatch = link.match(/video\/(\d+)/);
    return {
      postId: videoIdMatch ? videoIdMatch[1] : `tiktok-${i + 1}`,
      desc: String(row['Video title'] ?? ''),
      publishedAt: normalizeTikTokDate(row['Post time']) || undefined,
      views: parseDouyinNum(row['Total views']),
      likes: parseDouyinNum(row['Total likes']),
      comments: parseDouyinNum(row['Total comments']),
      shares: parseDouyinNum(row['Total shares']),
      saves: 0,
    };
  });
  return { posts: posts as CreatorProfile['posts'] };
}

/**
 * Batch-normalize TikTok Chinese dates like "3月25日" → ISO dates.
 *
 * TikTok exports 365 days in chronological order (oldest first) with no year.
 * We detect year boundaries by watching for month decreases (e.g. Dec→Jan).
 * Start year = current year - 1 (first entry is ~1 year ago).
 */
function normalizeTikTokDates(rawDates: unknown[]): string[] {
  const currentYear = new Date().getFullYear();
  let year = currentYear - 1;
  let prevMonth = -1;

  return rawDates.map((raw) => {
    const s = String(raw ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    const m = s.match(/(\d{1,2})月(\d{1,2})日/);
    if (!m) return '';
    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);

    // Detect year boundary: month jumped backwards significantly (Dec→Jan)
    if (prevMonth >= 10 && month <= 3) {
      year++;
    }
    prevMonth = month;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
}

/**
 * Single-date fallback for non-sequential contexts.
 *
 * Unlike the batch function (which tracks month transitions across a
 * chronological sequence), this function handles a single isolated date
 * string like "3月25日". It assumes the date refers to the current year
 * and applies a cross-year guard: if the resulting date is more than
 * 30 days in the future, it is almost certainly from the previous year.
 */
function normalizeTikTokDate(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const m = s.match(/(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';

  const now = new Date();
  let year = now.getFullYear();
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);

  const candidate = new Date(year, month - 1, day);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86_400_000);

  // Cross-year guard: if inferred date is >30 days in the future, subtract a year
  if (candidate.getTime() > thirtyDaysFromNow.getTime()) {
    year--;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** TikTok Overview.xlsx — 365 days of daily aggregate metrics */
function parseTikTokOverview(rows: Record<string, unknown>[]): { history: CreatorProfile['history'] } {
  const validRows = rows.filter((r) => r['Date']);
  const dates = normalizeTikTokDates(validRows.map((r) => r['Date']));
  const history: NonNullable<CreatorProfile['history']> = validRows
    .map((row, i) => ({
      fetchedAt: dates[i],
      profile: {
        followers: 0,
        likesTotal: parseDouyinNum(row['Likes']),
        videosCount: 0,
      },
    }))
    .filter((e) => e.fetchedAt.length > 0); // drop unparseable dates
  return { history };
}

/** TikTok FollowerHistory.xlsx — daily follower counts with delta */
function parseTikTokFollowerHistory(rows: Record<string, unknown>[]): { history: CreatorProfile['history'] } {
  const validRows = rows.filter((r) => r['Date']);
  const dates = normalizeTikTokDates(validRows.map((r) => r['Date']));
  const history: NonNullable<CreatorProfile['history']> = validRows
    .map((row, i) => ({
      fetchedAt: dates[i],
      profile: {
        followers: parseDouyinNum(row['Followers']),
        likesTotal: 0,
        videosCount: 0,
      },
    }))
    .filter((e) => e.fetchedAt.length > 0);
  return { history };
}

/** TikTok FollowerGender.xlsx — gender distribution */
function parseTikTokFollowerGender(rows: Record<string, unknown>[]): { fanPortrait: Partial<FanPortrait> } {
  let male = 0;
  let female = 0;
  for (const row of rows) {
    const gender = String(row['Gender'] ?? '').toLowerCase();
    const raw = parseDouyinNum(row['Distribution']);
    // Handle both decimal (0.77) and percentage (77) representations
    const pct = raw > 1 ? raw : raw * 100;
    if (gender === 'male') male = pct;
    if (gender === 'female') female = pct;
  }
  return { fanPortrait: { gender: { male, female } } };
}

/** TikTok FollowerTopTerritories.xlsx — top audience territories */
function parseTikTokFollowerTerritory(rows: Record<string, unknown>[]): { fanPortrait: Partial<FanPortrait> } {
  const provinces = rows
    .map((row) => ({
      name: String(row['Top territories'] ?? ''),
      percentage: Math.round(parseDouyinNum(row['Distribution']) * 100),
    }))
    .filter((p) => p.name !== '');
  return { fanPortrait: { provinces } };
}

// ---------------------------------------------------------------------------
// XHS (Red Note) parsers
// ---------------------------------------------------------------------------

/** XHS 笔记列表明细表.xlsx — post list with Chinese column names */
function parseXhsNotes(rows: Record<string, unknown>[], fileName: string): { posts: CreatorProfile['posts'] } {
  // Known XHS placeholder texts that appear as merged header rows.
  // These pass the non-empty title check but are not real posts.
  const XHS_PLACEHOLDER_PATTERNS = [
    '最多导出排序后前1000条笔记',
    '最多导出排序后前',
  ];

  // Filter to rows that have a real 笔记标题 AND are not known placeholders,
  // AND have either a valid publish time or at least one non-zero metric.
  const dataRows = rows.filter((row) => {
    const v = row['笔记标题'];
    if (v === null || v === undefined) return false;
    const title = String(v).trim();
    if (title === '') return false;

    // Reject known placeholder text
    if (XHS_PLACEHOLDER_PATTERNS.some((pat) => title.includes(pat))) return false;

    // Require a valid publish time OR at least one non-zero metric
    const rawDate = String(row['首次发布时间'] ?? '').trim();
    const hasValidDate = /\d{4}年\d{1,2}月\d{1,2}日/.test(rawDate);
    const hasMetric =
      parseDouyinNum(row['观看量']) > 0 ||
      parseDouyinNum(row['点赞']) > 0 ||
      parseDouyinNum(row['评论']) > 0 ||
      parseDouyinNum(row['分享']) > 0 ||
      parseDouyinNum(row['收藏']) > 0;

    return hasValidDate || hasMetric;
  });

  const posts = dataRows.map((row, i) => {
    // Parse XHS date format: "2026年03月25日09时49分34秒"
    const rawDate = String(row['首次发布时间'] ?? '');
    let publishedAt: string | undefined;
    const dateMatch = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时(\d{1,2})分(\d{1,2})秒?/);
    if (dateMatch) {
      publishedAt = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}T${dateMatch[4].padStart(2, '0')}:${dateMatch[5].padStart(2, '0')}:${dateMatch[6].padStart(2, '0')}Z`;
    }

    return {
      postId: `xhs-${i + 1}`,
      desc: String(row['笔记标题'] ?? ''),
      publishedAt,
      views: parseDouyinNum(row['观看量']),
      likes: parseDouyinNum(row['点赞']),
      comments: parseDouyinNum(row['评论']),
      shares: parseDouyinNum(row['分享']),
      saves: parseDouyinNum(row['收藏']),
      avgWatchDuration: parseDouyinNum(row['人均观看时长']),
    };
  });

  void fileName;
  return { posts: posts as CreatorProfile['posts'] };
}

// ---------------------------------------------------------------------------
// Douyin 30-day aggregate parsers
// ---------------------------------------------------------------------------

/** 近30日互动数据.xlsx — 点赞/评论/收藏/分享 + 环比 stats */
function parseDouyinInteraction(rows: Record<string, unknown>[]): { aggregate: Record<string, unknown> } {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row['指标'] ?? '');
    const val = parseDouyinNum(row['数值']);
    result[key] = val;
  }
  return { aggregate: result };
}

/** 近30日发布数据.xlsx — 总发布/发布视频/发布图文 + 环比 stats */
function parseDouyinPosting(rows: Record<string, unknown>[]): { aggregate: Record<string, unknown> } {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row['指标'] ?? '');
    const val = parseDouyinNum(row['数值']);
    result[key] = val;
  }
  return { aggregate: result };
}

/** 近30日涨粉数据.xlsx — 净涨粉/新增关注/取消关注/主页访客 + 环比 stats */
function parseDouyinFollower(rows: Record<string, unknown>[]): { aggregate: Record<string, unknown> } {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row['指标'] ?? '');
    const val = parseDouyinNum(row['数值']);
    result[key] = val;
  }
  return { aggregate: result };
}

/** 近30日观看数据.xlsx — 曝光/观看/封面点击率/平均观看时长 + 环比 stats */
function parseDouyinView(rows: Record<string, unknown>[]): { aggregate: Record<string, unknown> } {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row['指标'] ?? '');
    const val = parseDouyinNum(row['数值']);
    result[key] = val;
  }
  return { aggregate: result };
}

/** TikTok FollowerActivity.xlsx — active followers by hour, aggregated across all dates */
function parseTikTokFollowerActivity(rows: Record<string, unknown>[]): { fanPortrait: Partial<FanPortrait> } {
  // Accumulate counts per hour across all dates, then average
  const hourMap = new Map<number, number[]>();
  for (const row of rows) {
    const hour = parseDouyinNum(row['Hour']);
    const count = parseDouyinNum(row['Active followers']);
    if (!hourMap.has(hour)) hourMap.set(hour, []);
    hourMap.get(hour)!.push(count);
  }
  const activityLevels = Array.from(hourMap.entries())
    .map(([hour, counts]) => ({
      level: `${hour}:00`,
      percentage: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
    }))
    .sort((a, b) => parseInt(a.level, 10) - parseInt(b.level, 10));
  return { fanPortrait: { activityLevels } };
}

// ---------------------------------------------------------------------------
// XLSX parsing — schema-aware
// ---------------------------------------------------------------------------

/** Result from parsing a single XLSX file — may contain posts, history, aggregate, or fan portrait data */
export interface XlsxParseResult {
  schema: ExportSchemaType;
  fileName: string;
  posts?: CreatorProfile['posts'];
  history?: CreatorProfile['history'];
  aggregate?: Record<string, unknown>;
  fanPortrait?: Partial<FanPortrait>;
}

export function parseXlsxRaw(content: string, fileName: string): XlsxParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(content, { type: 'base64' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new FileImportError('PARSE_ERROR', fileName, `Failed to read XLSX: ${msg}`);
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new FileImportError('VALIDATION_ERROR', fileName, 'XLSX workbook has no sheets');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
  if (rows.length === 0) {
    throw new FileImportError('VALIDATION_ERROR', fileName, 'XLSX sheet has no data rows');
  }

  const columns = Object.keys(rows[0]);
  const schema = detectExportSchema(columns);

  switch (schema) {
    case 'post_list':
      return { schema, fileName, ...parsePostList(rows, fileName) };
    case 'post_analysis':
      return { schema, fileName, ...parsePostAnalysis(rows) };
    case 'aggregate':
      return { schema, fileName, ...parseAggregate(rows) };
    case 'timeseries':
      return { schema, fileName, ...parseTimeseries(rows) };
    case 'xhs_notes':
      return { schema, fileName, ...parseXhsNotes(rows, fileName) };
    case 'douyin_interaction':
      return { schema, fileName, ...parseDouyinInteraction(rows) };
    case 'douyin_posting':
      return { schema, fileName, ...parseDouyinPosting(rows) };
    case 'douyin_follower':
      return { schema, fileName, ...parseDouyinFollower(rows) };
    case 'douyin_view':
      return { schema, fileName, ...parseDouyinView(rows) };
    case 'tiktok_content':
      return { schema, fileName, ...parseTikTokContent(rows, fileName) };
    case 'tiktok_overview':
      return { schema, fileName, ...parseTikTokOverview(rows) };
    case 'tiktok_viewers':
      // Viewer counts are already captured in tiktok_overview — skip
      return { schema, fileName };
    case 'tiktok_follower_history':
      return { schema, fileName, ...parseTikTokFollowerHistory(rows) };
    case 'tiktok_follower_gender':
      return { schema, fileName, ...parseTikTokFollowerGender(rows) };
    case 'tiktok_follower_territory':
      return { schema, fileName, ...parseTikTokFollowerTerritory(rows) };
    case 'tiktok_follower_activity':
      return { schema, fileName, ...parseTikTokFollowerActivity(rows) };
    default: {
      // Fallback: treat rows as generic post data using COLUMN_MAP
      const posts = rows.map((row, i) => {
        const post: Record<string, unknown> = {};
        for (const [rawKey, rawVal] of Object.entries(row)) {
          const field = resolveColumn(rawKey);
          if (!field) continue;
          post[field] = NUMERIC_FIELDS.has(field) ? parseDouyinNum(rawVal) : String(rawVal);
        }
        if (!post.postId) post.postId = `xlsx-${i + 1}`;
        if (post.desc === undefined) post.desc = '';
        if (post.views === undefined) post.views = 0;
        if (post.likes === undefined) post.likes = 0;
        if (post.comments === undefined) post.comments = 0;
        if (post.shares === undefined) post.shares = 0;
        if (post.saves === undefined) post.saves = 0;
        return post as unknown as CreatorProfile['posts'][number];
      });
      return { schema: 'unknown', fileName, posts };
    }
  }
}

function parseXlsx(content: string, fileName: string): CreatorProfile[] {
  const result = parseXlsxRaw(content, fileName);
  const isTikTok = result.schema.startsWith('tiktok_');
  const isXhs = result.schema === 'xhs_notes';

  const platform = isTikTok ? 'tiktok' : isXhs ? 'xhs' : 'douyin';
  const nickname = isTikTok ? 'TikTok Creator' : isXhs ? 'Red Note Creator' : 'Douyin Creator';

  const profile: CreatorProfile = {
    platform,
    profileUrl: '',
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname,
      uniqueId: `import-${Date.now()}`,
      followers: 0,
      likesTotal: (result.posts ?? []).reduce((sum, p) => sum + p.likes, 0),
      videosCount: (result.posts ?? []).length,
    },
    posts: result.posts ?? [],
    history: result.history,
    ...(result.fanPortrait ? { fanPortrait: result.fanPortrait as FanPortrait } : {}),
    ...(result.aggregate ? { bio: JSON.stringify(result.aggregate) } : {}),
  };

  const validation = validateCreatorProfile(profile);
  if (!validation.valid) {
    throw new FileImportError(
      'VALIDATION_ERROR',
      fileName,
      `XLSX data failed validation: ${validation.errors.join('; ')}`,
    );
  }

  return [profile];
}

// ---------------------------------------------------------------------------
// Multi-file merge — combines multiple XLSX results into one CreatorProfile
// ---------------------------------------------------------------------------

/**
 * Merge multiple parsed XLSX results into a single CreatorProfile.
 *
 * Douyin:
 *   - post_list takes priority over post_analysis (more complete fields).
 *   - timeseries data becomes history snapshots.
 *   - aggregate data is stored in the profile bio for reference.
 *
 * TikTok Studio:
 *   - tiktok_content provides posts.
 *   - tiktok_overview and tiktok_follower_history are merged by date into history.
 *     FollowerHistory provides real follower counts; Overview provides daily likes.
 *   - tiktok_follower_gender, _territory, _activity are merged into fanPortrait.
 */
export function mergeXlsxResults(results: XlsxParseResult[]): CreatorProfile {
  let posts: CreatorProfile['posts'] = [];
  let history: CreatorProfile['history'] = [];
  let aggregate: Record<string, unknown> | undefined;
  let fanPortrait: Partial<FanPortrait> | undefined;
  let hasPostList = false;

  // Detect platform from schema types present
  const hasTikTok = results.some((r) => r.schema.startsWith('tiktok_'));
  const hasXhs = results.some((r) => r.schema === 'xhs_notes');

  // First pass: collect all data by schema type
  for (const r of results) {
    // --- Posts ---
    if (r.schema === 'post_list' && r.posts) {
      if (!hasPostList) {
        posts = r.posts;
        hasPostList = true;
      } else {
        // Merge additional posts (dedup by desc)
        const existing = new Set(posts.map((p) => p.desc));
        for (const p of r.posts) {
          if (!existing.has(p.desc)) posts.push(p);
        }
      }
    } else if (r.schema === 'post_analysis' && r.posts && !hasPostList) {
      posts = r.posts;
    } else if ((r.schema === 'tiktok_content' || r.schema === 'xhs_notes') && r.posts) {
      posts = r.posts;
    }

    // --- History ---
    if ((r.schema === 'timeseries' || r.schema === 'tiktok_overview' || r.schema === 'tiktok_follower_history') && r.history) {
      history = [...(history ?? []), ...r.history];
    }

    // --- Aggregate (Douyin 30-day files) ---
    if (
      (r.schema === 'aggregate' ||
        r.schema === 'douyin_interaction' ||
        r.schema === 'douyin_posting' ||
        r.schema === 'douyin_follower' ||
        r.schema === 'douyin_view') &&
      r.aggregate
    ) {
      aggregate = { ...aggregate, ...r.aggregate };
    }

    // --- Fan portrait (TikTok) ---
    if (r.fanPortrait) {
      fanPortrait = { ...fanPortrait, ...r.fanPortrait };
    }
  }

  // Merge history entries by date — multiple timeseries files (Douyin: 9 files x 30 days,
  // TikTok: Overview + FollowerHistory) may have entries for the same dates with different metrics.
  if (history && history.length > 0) {
    const byDate = new Map<string, NonNullable<CreatorProfile['history']>[number]>();
    for (const snap of history) {
      const existing = byDate.get(snap.fetchedAt);
      if (existing) {
        byDate.set(snap.fetchedAt, {
          fetchedAt: snap.fetchedAt,
          profile: {
            followers: existing.profile.followers || snap.profile.followers,
            likesTotal: existing.profile.likesTotal || snap.profile.likesTotal,
            videosCount: existing.profile.videosCount || snap.profile.videosCount,
          },
        });
      } else {
        byDate.set(snap.fetchedAt, snap);
      }
    }
    history = Array.from(byDate.values());
  }

  // Sort history chronologically
  if (history && history.length > 1) {
    history.sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  }

  // Derive current follower count from the most recent history snapshot
  const latestFollowers =
    history && history.length > 0
      ? (history[history.length - 1]?.profile.followers ?? 0)
      : 0;

  const platform = hasTikTok ? 'tiktok' : hasXhs ? 'xhs' : 'douyin';
  const nickname = hasTikTok ? 'TikTok Creator' : hasXhs ? 'Red Note Creator' : 'Douyin Creator';

  const profile: CreatorProfile = {
    platform,
    profileUrl: '',
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname,
      uniqueId: `import-${Date.now()}`,
      followers: latestFollowers,
      likesTotal: posts.reduce((sum, p) => sum + p.likes, 0),
      videosCount: posts.length,
      ...(aggregate ? { bio: `数据汇总: ${Object.entries(aggregate).map(([k, v]) => `${k}=${v}`).join(', ')}` } : {}),
    },
    posts,
    ...(history && history.length > 0 ? { history } : {}),
    ...(fanPortrait ? { fanPortrait: fanPortrait as FanPortrait } : {}),
  };

  return profile;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse raw file content into CreatorProfile array.
 * Dispatches to the correct parser based on file extension.
 *
 * @param content — For JSON/CSV: raw text string. For XLSX/XLS: base64-encoded string.
 * @param fileName — Original file name with extension (used for format detection and error messages).
 */
export async function parseFileContent(
  content: string,
  fileName: string,
): Promise<CreatorProfile[]> {
  const ext = getFileExtension(fileName);

  switch (ext) {
    case 'json':
      return parseJson(content, fileName);
    case 'csv':
      return parseCsv(content, fileName);
    case 'xlsx':
    case 'xls':
      return parseXlsx(content, fileName);
    default:
      throw new FileImportError(
        'UNSUPPORTED_FORMAT',
        fileName,
        `Unsupported file format ".${ext}". Supported: .json, .csv, .xlsx`,
      );
  }
}

/**
 * DataAdapter interface implementation for the registry.
 * Accepts JSON string with format: { fileName: string, content: string }
 *
 * Note: The DataAdapter interface returns a single CreatorProfile, but
 * parseFileContent can return multiple (e.g., JSON array). This adapter
 * returns only the first profile. The actual file import flow in the
 * onboarding UI calls parseFileContent directly to handle multi-profile results.
 */
export class FileImportAdapter implements DataAdapter {
  readonly name = 'file_import';
  readonly description = 'Import creator data from uploaded files (JSON, CSV, XLSX)';

  async collect(input: string): Promise<CreatorProfile | null> {
    let payload: { fileName: string; content: string };
    try {
      payload = JSON.parse(input);
    } catch {
      return null;
    }
    if (!payload.fileName || !payload.content) return null;

    const profiles = await parseFileContent(payload.content, payload.fileName);
    return profiles[0] ?? null;
  }
}
