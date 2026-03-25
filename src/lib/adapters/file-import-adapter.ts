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
import type { CreatorProfile } from '../schema/creator-data';
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
  '发布时间': 'publishedAt',
  '播放量': 'views',
  '点赞量': 'likes',
  '分享量': 'shares',
  '评论量': 'comments',
  '收藏量': 'saves',
  '完播率': 'completionRate',
  '5s完播率': 'completionRate',
  '2s跳出率': 'bounceRate',
  '封面点击率': 'coverClickRate',
  '平均播放时长': 'avgWatchDuration',
  '粉丝增量': 'followerDelta',
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

  return [profile];
}

// ---------------------------------------------------------------------------
// XLSX schema detection — Douyin exports have 4 distinct formats
// ---------------------------------------------------------------------------

/**
 * Douyin export schema types:
 * A) 作品列表 — per-post full metrics (作品名称, 播放量, 点赞量, 分享量, 评论量, 收藏量...)
 * B) 投稿分析 — per-post partial metrics (视频名称, 播放量, 5s完播率, but no likes/comments)
 * C) 投稿汇总 — single-row aggregate stats (条均点击率, 条均5s完播率, 播放量中位数...)
 * D) 时间序列 — daily metrics (日期 + 播放量 or 作品点赞)
 */
type DouyinSchemaType = 'post_list' | 'post_analysis' | 'aggregate' | 'timeseries' | 'unknown';

function detectDouyinSchema(columns: string[]): DouyinSchemaType {
  const colSet = new Set(columns);

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

  const history = rows
    .filter((row) => row['日期'])
    .map((row) => {
      const val = parseDouyinNum(row[metricCol]);
      return {
        fetchedAt: String(row['日期']),
        profile: {
          followers: 0,
          likesTotal: metricCol === '作品点赞' ? val : 0,
          videosCount: 0,
        },
        // Store the raw metric for downstream use
        _metric: metricCol,
        _value: val,
      };
    });

  return { history: history as unknown as CreatorProfile['history'] };
}

// ---------------------------------------------------------------------------
// XLSX parsing — schema-aware
// ---------------------------------------------------------------------------

/** Result from parsing a single XLSX file — may contain posts, history, or aggregate data */
export interface XlsxParseResult {
  schema: DouyinSchemaType;
  fileName: string;
  posts?: CreatorProfile['posts'];
  history?: CreatorProfile['history'];
  aggregate?: Record<string, unknown>;
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
  const schema = detectDouyinSchema(columns);

  switch (schema) {
    case 'post_list':
      return { schema, fileName, ...parsePostList(rows, fileName) };
    case 'post_analysis':
      return { schema, fileName, ...parsePostAnalysis(rows) };
    case 'aggregate':
      return { schema, fileName, ...parseAggregate(rows) };
    case 'timeseries':
      return { schema, fileName, ...parseTimeseries(rows) };
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

  const profile: CreatorProfile = {
    platform: 'douyin',
    profileUrl: '',
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: 'Douyin Creator',
      uniqueId: `import-${Date.now()}`,
      followers: 0,
      likesTotal: (result.posts ?? []).reduce((sum, p) => sum + p.likes, 0),
      videosCount: (result.posts ?? []).length,
    },
    posts: result.posts ?? [],
    history: result.history,
  };

  return [profile];
}

// ---------------------------------------------------------------------------
// Multi-file merge — combines multiple XLSX results into one CreatorProfile
// ---------------------------------------------------------------------------

/**
 * Merge multiple parsed XLSX results into a single CreatorProfile.
 * Posts from post_list take priority over post_analysis (more fields).
 * Timeseries data becomes history snapshots.
 * Aggregate data is stored in the profile for reference.
 */
export function mergeXlsxResults(results: XlsxParseResult[]): CreatorProfile {
  let posts: CreatorProfile['posts'] = [];
  let history: CreatorProfile['history'] = [];
  let aggregate: Record<string, unknown> | undefined;
  let hasPostList = false;

  for (const r of results) {
    if (r.schema === 'post_list' && r.posts) {
      // Post list has the most complete data — use it as primary
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
      // Only use post_analysis if we don't have post_list yet
      posts = r.posts;
    }

    if (r.schema === 'timeseries' && r.history) {
      history = [...(history ?? []), ...r.history];
    }

    if (r.schema === 'aggregate' && r.aggregate) {
      aggregate = r.aggregate;
    }
  }

  // Sort history by date
  if (history && history.length > 1) {
    history.sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  }

  const profile: CreatorProfile = {
    platform: 'douyin',
    profileUrl: '',
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: 'Douyin Creator',
      uniqueId: `import-${Date.now()}`,
      followers: 0,
      likesTotal: posts.reduce((sum, p) => sum + p.likes, 0),
      videosCount: posts.length,
      ...(aggregate ? { bio: `投稿汇总: ${(aggregate.period as string) ?? ''}` } : {}),
    },
    posts,
    ...(history && history.length > 0 ? { history } : {}),
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
