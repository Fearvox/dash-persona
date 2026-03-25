import type { CreatorProfile } from '../schema/creator-data';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type ExtensionErrorCode =
  | 'PARSE_ERROR'
  | 'MISSING_FIELDS'
  | 'INVALID_PROFILE';

export class ExtensionAdapterError extends Error {
  readonly code: ExtensionErrorCode;

  constructor(code: ExtensionErrorCode, message: string) {
    super(message);
    this.name = 'ExtensionAdapterError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Receives creator profile data from the DashPersona browser extension.
 * Input: JSON string matching CreatorProfile schema.
 *
 * Throws ExtensionAdapterError with structured error codes instead of
 * silently returning null, so callers can surface meaningful feedback.
 */
export class ExtensionAdapter implements DataAdapter {
  name = 'extension';
  description = 'Receives creator data from the DashPersona browser extension';

  async collect(input: string): Promise<CreatorProfile | null> {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ExtensionAdapterError('PARSE_ERROR', `Invalid JSON from extension: ${msg}`);
    }

    if (!data.platform || !data.profileUrl || !data.profile || !Array.isArray(data.posts)) {
      const missing = [
        !data.platform && 'platform',
        !data.profileUrl && 'profileUrl',
        !data.profile && 'profile',
        !Array.isArray(data.posts) && 'posts',
      ].filter(Boolean);
      throw new ExtensionAdapterError(
        'MISSING_FIELDS',
        `Extension data missing required fields: ${missing.join(', ')}`,
      );
    }

    const profile = data.profile as Record<string, unknown>;
    if (!profile.nickname || !profile.uniqueId) {
      throw new ExtensionAdapterError(
        'INVALID_PROFILE',
        `Extension profile missing nickname or uniqueId`,
      );
    }

    return {
      platform: data.platform as string,
      profileUrl: data.profileUrl as string,
      fetchedAt: (data.fetchedAt as string) ?? new Date().toISOString(),
      source: 'extension',
      profile: {
        nickname: profile.nickname as string,
        uniqueId: profile.uniqueId as string,
        avatarUrl: profile.avatarUrl as string | undefined,
        followers: (profile.followers as number) ?? 0,
        likesTotal: (profile.likesTotal as number) ?? 0,
        videosCount: (profile.videosCount as number) ?? 0,
        bio: profile.bio as string | undefined,
      },
      posts: (data.posts as Record<string, unknown>[]).map((p, i) => ({
        postId: (p.postId as string) ?? `ext-${i}`,
        desc: (p.desc as string) ?? '',
        publishedAt: p.publishedAt as string | undefined,
        views: (p.views as number) ?? 0,
        likes: (p.likes as number) ?? 0,
        comments: (p.comments as number) ?? 0,
        shares: (p.shares as number) ?? 0,
        saves: (p.saves as number) ?? 0,
        tags: p.tags as string[] | undefined,
      })),
      history: data.history as CreatorProfile['history'],
    };
  }
}
