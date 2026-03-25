import { describe, it, expect } from 'vitest';
import {
  detectPlatformFromUrl,
  detectPlatformFromHtml,
  extractFromTikTokHtml,
  extractFromXhsHtml,
  isTikTokUrl,
  isXhsUrl,
  extractHashtags,
} from '../html-parse-adapter';

// ---------------------------------------------------------------------------
// Test fixtures: minimal HTML payloads
// ---------------------------------------------------------------------------

function buildTikTokHtml(userInfo: object): string {
  const payload = {
    __DEFAULT_SCOPE__: {
      'webapp.user-detail': { userInfo },
    },
  };
  return `<html><head>
    <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(payload)}</script>
  </head><body></body></html>`;
}

function buildXhsHtml(userData: object, notes: unknown[] = []): string {
  const payload = {
    user: {
      userPageData: userData,
      notes,
    },
  };
  return `<html><head>
    <script>window.__INITIAL_STATE__ = ${JSON.stringify(payload)};</script>
  </head><body></body></html>`;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

describe('detectPlatformFromUrl', () => {
  it('detects TikTok URLs', () => {
    expect(detectPlatformFromUrl('https://www.tiktok.com/@user')).toBe('tiktok');
    expect(detectPlatformFromUrl('https://m.tiktok.com/@user')).toBe('tiktok');
  });

  it('detects XHS URLs', () => {
    expect(detectPlatformFromUrl('https://www.xiaohongshu.com/user/profile/abc')).toBe('xhs');
    expect(detectPlatformFromUrl('https://xhslink.com/abc')).toBe('xhs');
  });

  it('returns null for unsupported URLs', () => {
    expect(detectPlatformFromUrl('https://www.youtube.com/@user')).toBeNull();
    expect(detectPlatformFromUrl('not-a-url')).toBeNull();
  });
});

describe('detectPlatformFromHtml', () => {
  it('detects TikTok HTML', () => {
    expect(detectPlatformFromHtml('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">')).toBe('tiktok');
  });

  it('detects XHS HTML', () => {
    expect(detectPlatformFromHtml('window.__INITIAL_STATE__ = {"noteDetail":{}}')).toBe('xhs');
    expect(detectPlatformFromHtml('<meta content="小红书">')).toBe('xhs');
  });

  it('returns null for unknown HTML', () => {
    expect(detectPlatformFromHtml('<html><body>Hello</body></html>')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

describe('isTikTokUrl / isXhsUrl', () => {
  it('isTikTokUrl works', () => {
    expect(isTikTokUrl('https://www.tiktok.com/@creator')).toBe(true);
    expect(isTikTokUrl('https://xiaohongshu.com/user')).toBe(false);
  });

  it('isXhsUrl works', () => {
    expect(isXhsUrl('https://www.xiaohongshu.com/user/profile/123')).toBe(true);
    expect(isXhsUrl('https://tiktok.com/@user')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hashtag extraction
// ---------------------------------------------------------------------------

describe('extractHashtags', () => {
  it('extracts # hashtags', () => {
    expect(extractHashtags('Hello #tag1 world #tag2')).toEqual(['tag1', 'tag2']);
  });

  it('extracts fullwidth ＃ hashtags', () => {
    expect(extractHashtags('你好＃标签1 世界＃标签2')).toEqual(['标签1', '标签2']);
  });

  it('returns empty for no hashtags', () => {
    expect(extractHashtags('no hashtags here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TikTok HTML extraction
// ---------------------------------------------------------------------------

describe('extractFromTikTokHtml', () => {
  it('extracts profile and posts from TikTok HTML', () => {
    const html = buildTikTokHtml({
      user: {
        nickname: 'TikTokCreator',
        uniqueId: 'ttcreator',
        avatarLarger: 'https://example.com/avatar.jpg',
        signature: 'My bio',
      },
      stats: {
        followerCount: 50000,
        heartCount: 1200000,
        videoCount: 120,
      },
      itemList: [
        {
          id: 'v001',
          desc: 'Dance video #dance #trending',
          createTime: 1700000000,
          stats: {
            playCount: 10000,
            diggCount: 500,
            commentCount: 30,
            shareCount: 10,
            collectCount: 20,
          },
        },
        {
          id: 'v002',
          desc: 'Comedy skit',
          createTime: 1700100000,
          stats: {
            playCount: 25000,
            diggCount: 1200,
            commentCount: 80,
            shareCount: 50,
            collectCount: 40,
          },
        },
      ],
    });

    const result = extractFromTikTokHtml(html, 'https://www.tiktok.com/@ttcreator');

    expect(result.platform).toBe('tiktok');
    expect(result.source).toBe('html_parse');
    expect(result.profileUrl).toBe('https://www.tiktok.com/@ttcreator');
    expect(result.profile.nickname).toBe('TikTokCreator');
    expect(result.profile.uniqueId).toBe('ttcreator');
    expect(result.profile.followers).toBe(50000);
    expect(result.profile.likesTotal).toBe(1200000);
    expect(result.profile.videosCount).toBe(120);
    expect(result.profile.bio).toBe('My bio');

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].postId).toBe('v001');
    expect(result.posts[0].views).toBe(10000);
    expect(result.posts[0].likes).toBe(500);
    expect(result.posts[0].tags).toEqual(['dance', 'trending']);

    expect(result.posts[1].postId).toBe('v002');
    expect(result.posts[1].views).toBe(25000);
  });

  it('throws when no data payload is found', () => {
    expect(() => extractFromTikTokHtml('<html></html>', 'https://tiktok.com/@x')).toThrow(
      'Could not find TikTok data payload',
    );
  });

  it('throws when user info is missing', () => {
    const html = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{"__DEFAULT_SCOPE__":{}}</script></html>`;
    expect(() => extractFromTikTokHtml(html, 'https://tiktok.com/@x')).toThrow(
      'Could not extract user info',
    );
  });

  it('handles missing stats gracefully', () => {
    const html = buildTikTokHtml({
      user: { nickname: 'Test', uniqueId: 'test' },
      stats: {},
      itemList: [],
    });
    const result = extractFromTikTokHtml(html, 'https://tiktok.com/@test');
    expect(result.profile.followers).toBe(0);
    expect(result.profile.likesTotal).toBe(0);
    expect(result.posts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// XHS (Red Note) HTML extraction
// ---------------------------------------------------------------------------

describe('extractFromXhsHtml', () => {
  it('extracts profile and posts from XHS HTML', () => {
    const html = buildXhsHtml(
      {
        basicInfo: {
          nickname: '小红书达人',
          redId: 'xhs_creator_88',
          imagePre: 'https://sns-avatar.xhscdn.com/avatar.jpg',
          desc: '分享生活每一天',
          fans: 120000,
          liked: 3500000,
          notes: 85,
        },
        interactions: [
          { type: 'fans', count: 120000 },
          { type: 'liked', count: 3500000 },
        ],
      },
      [
        {
          id: 'note001',
          title: '秋冬穿搭分享 #穿搭 #时尚',
          time: 1700000000,
          viewCount: 80000,
          likedCount: 3200,
          commentCount: 150,
          shareCount: 45,
          collectedCount: 200,
        },
        {
          noteId: 'note002',
          displayTitle: '好用的护肤品推荐',
          time: 1700200000,
          stats: {
            viewCount: 150000,
            likedCount: 8000,
            commentCount: 420,
            shareCount: 180,
            collectedCount: 650,
          },
        },
      ],
    );

    const result = extractFromXhsHtml(html, 'https://www.xiaohongshu.com/user/profile/abc123');

    expect(result.platform).toBe('xhs');
    expect(result.source).toBe('html_parse');
    expect(result.profileUrl).toBe('https://www.xiaohongshu.com/user/profile/abc123');
    expect(result.profile.nickname).toBe('小红书达人');
    expect(result.profile.uniqueId).toBe('xhs_creator_88');
    expect(result.profile.followers).toBe(120000);
    expect(result.profile.likesTotal).toBe(3500000);
    expect(result.profile.videosCount).toBe(85);
    expect(result.profile.bio).toBe('分享生活每一天');

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].postId).toBe('note001');
    expect(result.posts[0].desc).toContain('秋冬穿搭分享');
    expect(result.posts[0].views).toBe(80000);
    expect(result.posts[0].likes).toBe(3200);
    expect(result.posts[0].comments).toBe(150);
    expect(result.posts[0].shares).toBe(45);
    expect(result.posts[0].saves).toBe(200);
    expect(result.posts[0].tags).toEqual(['穿搭', '时尚']);

    expect(result.posts[1].postId).toBe('note002');
    expect(result.posts[1].views).toBe(150000);
    expect(result.posts[1].likes).toBe(8000);
  });

  it('throws when no XHS data payload is found', () => {
    expect(() => extractFromXhsHtml('<html></html>', 'https://xiaohongshu.com/user')).toThrow(
      'Could not find XHS data payload',
    );
  });

  it('handles missing fields gracefully', () => {
    const html = buildXhsHtml(
      {
        basicInfo: { nickname: '测试用户' },
        interactions: [],
      },
      [],
    );
    const result = extractFromXhsHtml(html, 'https://www.xiaohongshu.com/user/profile/test');
    expect(result.profile.nickname).toBe('测试用户');
    expect(result.profile.followers).toBe(0);
    expect(result.profile.likesTotal).toBe(0);
    expect(result.profile.videosCount).toBe(0);
    expect(result.posts).toHaveLength(0);
  });

  it('uses interactInfo fallback for post stats', () => {
    const html = buildXhsHtml(
      { basicInfo: { nickname: 'Fallback' }, interactions: [] },
      [
        {
          id: 'n1',
          title: 'Fallback test',
          interactInfo: {
            viewCount: 999,
            likedCount: 88,
            commentCount: 7,
            shareCount: 3,
            collectedCount: 5,
          },
        },
      ],
    );
    const result = extractFromXhsHtml(html, 'https://xiaohongshu.com/user/profile/fb');
    expect(result.posts[0].views).toBe(999);
    expect(result.posts[0].likes).toBe(88);
    expect(result.posts[0].saves).toBe(5);
  });
});
