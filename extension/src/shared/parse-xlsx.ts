import * as XLSX from 'xlsx';
import type { Post } from './types';
import { parseNumber } from './parse-date';

/**
 * Column mapping from Douyin export xlsx to Post fields.
 *
 * Known export format (账号总览 / 投稿分析):
 *   视频名称 | 发布时间 | 播放量 | 5s完播率 | 2s跳出率 | 平均播放时长
 */
const COLUMN_MAP: Record<string, string> = {
  '视频名称': 'desc',
  '作品名称': 'desc',
  '发布时间': 'publishedAt',
  '播放量': 'views',
  '播放': 'views',
  '点赞量': 'likes',
  '点赞': 'likes',
  '评论量': 'comments',
  '评论': 'comments',
  '分享量': 'shares',
  '分享': 'shares',
  '收藏量': 'saves',
  '收藏': 'saves',
  '5s完播率': 'fiveSecRate',
  '2s跳出率': 'bounceRate',
  '平均播放时长': 'avgDuration',
};

export interface ParsedXlsxRow {
  desc: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  fiveSecRate?: number;
  bounceRate?: number;
  avgDuration?: number;
}

/**
 * Parse a Douyin export xlsx ArrayBuffer into structured post data.
 */
export function parseDouyinXlsx(buffer: ArrayBuffer): ParsedXlsxRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
  const rows: ParsedXlsxRow[] = [];

  for (const row of jsonData) {
    const mapped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const field = COLUMN_MAP[key.trim()];
      if (field) mapped[field] = value;
    }

    const desc = String(mapped.desc ?? '');
    const publishedAt = String(mapped.publishedAt ?? '');

    rows.push({
      desc,
      publishedAt: normalizeDate(publishedAt),
      views: toInt(mapped.views),
      likes: toInt(mapped.likes),
      comments: toInt(mapped.comments),
      shares: toInt(mapped.shares),
      saves: toInt(mapped.saves),
      fiveSecRate: toFloat(mapped.fiveSecRate),
      bounceRate: toFloat(mapped.bounceRate),
      avgDuration: toFloat(mapped.avgDuration),
    });
  }

  return rows;
}

/**
 * Convert parsed xlsx rows to Post[] for CreatorProfile.
 */
export function xlsxRowsToPosts(rows: ParsedXlsxRow[]): Post[] {
  return rows.map((row, i) => ({
    postId: `xlsx-${i}-${Date.now()}`,
    desc: row.desc,
    publishedAt: row.publishedAt || undefined,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
    // Douyin-specific quality signals (from xlsx export)
    completionRate: row.fiveSecRate,
    bounceRate: row.bounceRate,
    avgWatchDuration: row.avgDuration,
  }));
}

function toInt(val: unknown): number {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') return parseNumber(val);
  return 0;
}

function toFloat(val: unknown): number | undefined {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

/** Normalize "2025-12-31 20:56" → ISO 8601 */
function normalizeDate(text: string): string {
  if (!text) return '';
  // Already ISO-like: "2025-12-31 20:56"
  const match = text.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}:00+08:00`;
  return text;
}
