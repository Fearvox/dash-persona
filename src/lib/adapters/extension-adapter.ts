import type { CreatorProfile } from '../schema/creator-data';
import type { DataAdapter } from './types';

/**
 * Receives creator profile data from the DashPersona browser extension.
 * Input: JSON string matching CreatorProfile schema.
 */
export class ExtensionAdapter implements DataAdapter {
  name = 'extension';
  description = 'Receives creator data from the DashPersona browser extension';

  async collect(input: string): Promise<CreatorProfile | null> {
    try {
      const data = JSON.parse(input);

      if (!data.platform || !data.profileUrl || !data.profile || !Array.isArray(data.posts)) {
        return null;
      }
      if (!data.profile.nickname || !data.profile.uniqueId) {
        return null;
      }

      return {
        platform: data.platform,
        profileUrl: data.profileUrl,
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        source: 'extension',
        profile: {
          nickname: data.profile.nickname,
          uniqueId: data.profile.uniqueId,
          avatarUrl: data.profile.avatarUrl,
          followers: data.profile.followers ?? 0,
          likesTotal: data.profile.likesTotal ?? 0,
          videosCount: data.profile.videosCount ?? 0,
          bio: data.profile.bio,
        },
        posts: data.posts.map((p: Record<string, unknown>, i: number) => ({
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
        history: data.history,
      };
    } catch {
      return null;
    }
  }
}
