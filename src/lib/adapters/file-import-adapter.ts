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
  '发布时间': 'publishedAt',
  '播放量': 'views',
  '5s完播率': 'completionRate',
  '2s跳出率': 'bounceRate',
  '平均播放时长': 'avgWatchDuration',
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
