/**
 * XiaoHongShu (小红书) data collection adapter via bb-browser CLI.
 *
 * Uses the user's real browser (Brave) login session to collect profile
 * and post data from XiaoHongShu, then maps it to CreatorProfile schema.
 *
 * @module adapters/browser-adapter-xhs
 */

import type {
  CreatorProfile,
  Post,
  ProfileInfo,
} from '../schema/creator-data';
import type { DataAdapter } from './types';
import { execBrowser, parseBrowserOutput, BrowserAdapterError } from './browser-adapter';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type XhsBrowserErrorCode =
  | 'NOT_LOGGED_IN'
  | 'BROWSER_NOT_FOUND'
  | 'COLLECTION_FAILED'
  | 'PARSE_ERROR'
  | 'TIMEOUT';

export class XhsBrowserAdapterError extends Error {
  readonly code: XhsBrowserErrorCode;

  constructor(code: XhsBrowserErrorCode, message: string) {
    super(message);
    this.name = 'XhsBrowserAdapterError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// bb-browser XHS response types (from xiaohongshu site commands)
// ---------------------------------------------------------------------------

interface XhsMeResponse {
  userId: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  likes: number;
  notes: number;
}

interface XhsPostListItem {
  noteId: string;
  title: string;
  type: string; // 'normal' | 'video'
  likes: number;
  timestamp?: string;
}

interface XhsNoteDetail {
  noteId: string;
  title: string;
  desc: string;
  type: string;
  views?: number;
  likes: number;
  comments: number;
  shares: number;
  collects: number; // saves/bookmarks
  tags?: string[];
  publishedAt?: string;
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

const MAX_POSTS = 30;

function mapXhsProfile(me: XhsMeResponse): ProfileInfo {
  return {
    nickname: me.nickname,
    uniqueId: me.userId,
    avatarUrl: me.avatar,
    bio: me.bio,
    followers: me.followers,
    likesTotal: me.likes,
    videosCount: me.notes,
  };
}

function mapXhsNoteToPost(note: XhsNoteDetail): Post {
  return {
    postId: note.noteId,
    desc: note.desc || note.title,
    publishedAt: note.publishedAt,
    views: note.views ?? 0,
    likes: note.likes,
    comments: note.comments,
    shares: note.shares,
    saves: note.collects,
    tags: note.tags,
  };
}

function mapXhsToCreatorProfile(
  me: XhsMeResponse,
  notes: XhsNoteDetail[],
): CreatorProfile {
  return {
    platform: 'xhs',
    profileUrl: `https://www.xiaohongshu.com/user/profile/${me.userId}`,
    fetchedAt: new Date().toISOString(),
    source: 'browser',
    profile: mapXhsProfile(me),
    posts: notes.map(mapXhsNoteToPost),
  };
}

// ---------------------------------------------------------------------------
// Collection logic
// ---------------------------------------------------------------------------

/**
 * Collect the logged-in user's XiaoHongShu profile and recent posts.
 *
 * Data flow:
 * 1. site xiaohongshu/me → get logged-in user info + userId
 * 2. site xiaohongshu/user_posts <userId> → get post list
 * 3. For each noteId (up to 30): site xiaohongshu/note <noteId> → get detail
 * 4. Map all data to CreatorProfile schema
 */
async function collectXhsProfile(): Promise<CreatorProfile> {
  // Step 1: Get logged-in user profile
  let me: XhsMeResponse;
  try {
    const stdout = await execBrowser(['site', 'xiaohongshu/me', '--json']);
    me = parseBrowserOutput<XhsMeResponse>(stdout);
  } catch (err) {
    if (err instanceof BrowserAdapterError) {
      if (err.code === 'CLI_NOT_FOUND') {
        throw new XhsBrowserAdapterError(
          'BROWSER_NOT_FOUND',
          'bb-browser CLI not found. Please install it: npm install -g bb-browser',
        );
      }
      if (err.code === 'TIMEOUT') {
        throw new XhsBrowserAdapterError('TIMEOUT', err.message);
      }
      // Check for login-related errors
      if (err.message.includes('login') || err.message.includes('401')) {
        throw new XhsBrowserAdapterError(
          'NOT_LOGGED_IN',
          'XiaoHongShu login required. Please log in to xiaohongshu.com in your browser first, then retry.',
        );
      }
    }
    throw new XhsBrowserAdapterError(
      'COLLECTION_FAILED',
      `Failed to get XHS profile: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!me.userId) {
    throw new XhsBrowserAdapterError('PARSE_ERROR', 'XHS profile response missing userId');
  }

  // Step 2: Get post list
  let postList: XhsPostListItem[];
  try {
    const stdout = await execBrowser(['site', 'xiaohongshu/user_posts', me.userId, '--json']);
    const data = parseBrowserOutput<XhsPostListItem[] | { notes?: XhsPostListItem[] }>(stdout);
    postList = Array.isArray(data) ? data : (data.notes ?? []);
  } catch (err) {
    throw new XhsBrowserAdapterError(
      'COLLECTION_FAILED',
      `Failed to get XHS posts: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Step 3: Get detail for each note (limited to MAX_POSTS)
  const noteIds = postList.slice(0, MAX_POSTS).map((p) => p.noteId);
  const noteDetails: XhsNoteDetail[] = [];

  for (const noteId of noteIds) {
    try {
      const stdout = await execBrowser(['site', 'xiaohongshu/note', noteId, '--json']);
      const detail = parseBrowserOutput<XhsNoteDetail>(stdout);
      noteDetails.push(detail);
    } catch {
      // Skip failed individual notes — don't abort the whole collection
    }
  }

  // Step 4: Map to CreatorProfile
  return mapXhsToCreatorProfile(me, noteDetails);
}

// ---------------------------------------------------------------------------
// DataAdapter implementation
// ---------------------------------------------------------------------------

/**
 * XiaoHongShu browser adapter.
 *
 * Uses bb-browser CLI to collect data from the user's authenticated browser
 * session. The `input` parameter is ignored (data comes from the browser).
 */
export class XhsBrowserAdapter implements DataAdapter {
  name = 'xhs-browser';
  description = 'Collects XiaoHongShu data via bb-browser (user login session)';
  experimental = true;

  async collect(_input: string): Promise<CreatorProfile | null> {
    return collectXhsProfile();
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { collectXhsProfile, mapXhsToCreatorProfile };
