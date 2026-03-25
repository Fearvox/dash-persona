/**
 * Browser-based data adapter — uses bb-browser CLI to leverage the user's
 * real browser (with login sessions) for authenticated data collection.
 *
 * Unlike HTMLParseAdapter (server-side fetch) or ExtensionAdapter (Chrome
 * extension postMessage), this adapter calls `bb-browser` as a child process,
 * which controls the user's default browser (e.g. Brave) via CDP.
 *
 * @module adapters/browser-adapter
 */

import { execFile } from 'node:child_process';
import type { CreatorProfile, Post } from '../schema/creator-data';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type BrowserAdapterErrorCode =
  | 'CLI_NOT_FOUND'
  | 'TIMEOUT'
  | 'COMMAND_FAILED'
  | 'PARSE_ERROR'
  | 'UNSUPPORTED_PLATFORM'
  | 'NO_DATA';

export class BrowserAdapterError extends Error {
  readonly code: BrowserAdapterErrorCode;

  constructor(code: BrowserAdapterErrorCode, message: string) {
    super(message);
    this.name = 'BrowserAdapterError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// CLI execution layer
// ---------------------------------------------------------------------------

const CLI_TIMEOUT_MS = 30_000;
const BB_BROWSER_BIN = 'bb-browser';

/**
 * Execute a bb-browser CLI command and return stdout.
 *
 * @param args - Command arguments (e.g. ['site', 'xiaohongshu/me', '--json'])
 * @param timeoutMs - Timeout in milliseconds (default 30s)
 */
export function execBrowser(
  args: string[],
  timeoutMs: number = CLI_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      BB_BROWSER_BIN,
      args,
      { timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = error.message ?? '';
          if (msg.includes('ENOENT') || msg.includes('not found')) {
            reject(
              new BrowserAdapterError(
                'CLI_NOT_FOUND',
                'bb-browser not installed. Run: npm install -g bb-browser',
              ),
            );
            return;
          }
          if (error.killed || msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
            reject(
              new BrowserAdapterError('TIMEOUT', `bb-browser timed out after ${timeoutMs}ms`),
            );
            return;
          }
          reject(
            new BrowserAdapterError(
              'COMMAND_FAILED',
              `bb-browser failed: ${stderr || msg}`,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

/**
 * Parse bb-browser JSON output. All site commands output JSON when
 * called with --json flag.
 */
export function parseBrowserOutput<T>(stdout: string): T {
  try {
    const parsed = JSON.parse(stdout);
    // bb-browser wraps output in { id, success, data } envelope
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed.data as T;
    }
    return parsed as T;
  } catch {
    throw new BrowserAdapterError(
      'PARSE_ERROR',
      `Failed to parse bb-browser output as JSON. Got: ${stdout.slice(0, 200)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Platform-specific collectors
// ---------------------------------------------------------------------------

interface XhsUserProfile {
  nickname?: string;
  red_id?: string;
  desc?: string;
  follows?: number;
  fans?: number;
  interaction?: number;
  [key: string]: unknown;
}

interface XhsNote {
  id?: string;
  note_id?: string;
  title?: string;
  desc?: string;
  liked_count?: number;
  collected_count?: number;
  comment_count?: number;
  share_count?: number;
  [key: string]: unknown;
}

/**
 * Collect Red Note (XHS) creator profile using bb-browser site adapters.
 */
async function collectXhs(userId: string): Promise<CreatorProfile> {
  // Step 1: Get user profile
  const profileOut = await execBrowser(['site', 'xiaohongshu/user_posts', userId, '--json']);
  const data = parseBrowserOutput<{ user?: XhsUserProfile; notes?: XhsNote[] }>(profileOut);

  const user = data.user ?? {};
  const notes = data.notes ?? [];

  if (!user.nickname && notes.length === 0) {
    throw new BrowserAdapterError('NO_DATA', `No data returned for XHS user: ${userId}`);
  }

  const posts: Post[] = notes.map((note, i) => ({
    postId: note.note_id ?? note.id ?? `xhs-${i}`,
    desc: note.title ?? note.desc ?? '',
    views: 0, // XHS doesn't expose view counts publicly
    likes: Number(note.liked_count) || 0,
    comments: Number(note.comment_count) || 0,
    shares: Number(note.share_count) || 0,
    saves: Number(note.collected_count) || 0,
  }));

  return {
    platform: 'xhs',
    profileUrl: `https://www.xiaohongshu.com/user/profile/${userId}`,
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: String(user.nickname ?? ''),
      uniqueId: String(user.red_id ?? userId),
      followers: Number(user.fans) || 0,
      likesTotal: Number(user.interaction) || 0,
      videosCount: posts.length,
      bio: user.desc ? String(user.desc) : undefined,
    },
    posts,
  };
}

/**
 * Collect Douyin creator data using bb-browser page automation.
 * Since there's no built-in douyin adapter, we use open + eval + snapshot.
 */
async function collectDouyin(url: string): Promise<CreatorProfile> {
  // Navigate to creator page
  await execBrowser(['open', url]);
  // Wait for SPA to render
  await new Promise((r) => setTimeout(r, 5000));

  // Extract profile data via JS evaluation
  const profileOut = await execBrowser([
    'eval',
    `JSON.stringify({
      title: document.title,
      text: document.body.innerText.slice(0, 5000),
      url: window.location.href,
    })`,
    '--json',
  ]);
  const pageData = parseBrowserOutput<{ title: string; text: string; url: string }>(profileOut);

  // Parse basic profile info from page text
  const followMatch = pageData.text.match(/关注\s*([\d,]+)/);
  const fansMatch = pageData.text.match(/粉丝\s*([\d,]+)/);
  const likesMatch = pageData.text.match(/获赞\s*([\d,]+)/);
  const idMatch = pageData.text.match(/抖音号[：:]\s*(\S+)/);

  const parseNum = (s?: string): number => {
    if (!s) return 0;
    return Number(s.replace(/,/g, '')) || 0;
  };

  return {
    platform: 'douyin',
    profileUrl: url,
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: pageData.title.replace(/ - 抖音.*$/, '').trim() || 'Douyin Creator',
      uniqueId: idMatch?.[1] ?? 'unknown',
      followers: parseNum(fansMatch?.[1]),
      likesTotal: parseNum(likesMatch?.[1]),
      videosCount: 0,
    },
    posts: [], // Douyin post data requires deeper navigation — Phase 2
  };
}

// ---------------------------------------------------------------------------
// BrowserAdapter class
// ---------------------------------------------------------------------------

/**
 * Data adapter that uses bb-browser CLI to collect creator data through
 * the user's real browser with existing login sessions.
 *
 * Input format: JSON string with { platform, userId? | url? }
 * - platform: 'xhs' | 'douyin' | 'tiktok'
 * - userId: platform user ID (for xhs)
 * - url: profile URL (for douyin/tiktok)
 */
export class BrowserAdapter implements DataAdapter {
  readonly name = 'browser';
  readonly description = 'Collect creator data via bb-browser CLI using real browser sessions';
  readonly experimental = true;

  async collect(input: string): Promise<CreatorProfile | null> {
    let params: { platform: string; userId?: string; url?: string };
    try {
      params = JSON.parse(input);
    } catch {
      throw new BrowserAdapterError('PARSE_ERROR', 'Input must be JSON: { platform, userId?, url? }');
    }

    const { platform, userId, url } = params;

    switch (platform) {
      case 'xhs':
      case 'xiaohongshu':
        if (!userId) throw new BrowserAdapterError('NO_DATA', 'userId required for XHS collection');
        return collectXhs(userId);

      case 'douyin':
        if (!url) throw new BrowserAdapterError('NO_DATA', 'url required for Douyin collection');
        return collectDouyin(url);

      default:
        throw new BrowserAdapterError(
          'UNSUPPORTED_PLATFORM',
          `Platform "${platform}" not supported yet. Available: xhs, douyin`,
        );
    }
  }
}
