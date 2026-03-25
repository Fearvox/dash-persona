import { describe, it, expect } from 'vitest';
import { ExtensionAdapter } from '../extension-adapter';

describe('ExtensionAdapter', () => {
  const adapter = new ExtensionAdapter();

  it('has correct name and description', () => {
    expect(adapter.name).toBe('extension');
    expect(adapter.description).toContain('extension');
  });

  it('collects from valid JSON input', async () => {
    const input = JSON.stringify({
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      fetchedAt: '2026-03-24T12:00:00Z',
      source: 'extension',
      profile: { nickname: 'TestUser', uniqueId: 'test123', followers: 100, likesTotal: 500, videosCount: 10 },
      posts: [{ postId: 'p1', desc: 'test post', views: 100, likes: 10, comments: 1, shares: 2, saves: 5 }],
    });
    const result = await adapter.collect(input);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('extension');
    expect(result!.platform).toBe('douyin');
    expect(result!.profile.nickname).toBe('TestUser');
    expect(result!.posts).toHaveLength(1);
    expect(result!.posts[0].views).toBe(100);
  });

  it('returns null for invalid JSON', async () => {
    const result = await adapter.collect('not json at all');
    expect(result).toBeNull();
  });

  it('returns null for missing required fields', async () => {
    const result = await adapter.collect(JSON.stringify({ platform: 'douyin' }));
    expect(result).toBeNull();
  });

  it('returns null when profile is missing nickname', async () => {
    const input = JSON.stringify({
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      source: 'extension',
      profile: { uniqueId: 'test', followers: 0, likesTotal: 0, videosCount: 0 },
      posts: [],
    });
    const result = await adapter.collect(input);
    expect(result).toBeNull();
  });

  it('defaults missing numeric fields to 0', async () => {
    const input = JSON.stringify({
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      fetchedAt: '2026-03-24T12:00:00Z',
      source: 'extension',
      profile: { nickname: 'User', uniqueId: 'u1' },
      posts: [{ postId: 'p1', desc: 'test' }],
    });
    const result = await adapter.collect(input);
    expect(result).not.toBeNull();
    expect(result!.profile.followers).toBe(0);
    expect(result!.posts[0].views).toBe(0);
    expect(result!.posts[0].likes).toBe(0);
  });

  it('generates fetchedAt if not provided', async () => {
    const input = JSON.stringify({
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      source: 'extension',
      profile: { nickname: 'User', uniqueId: 'u1', followers: 0, likesTotal: 0, videosCount: 0 },
      posts: [],
    });
    const result = await adapter.collect(input);
    expect(result).not.toBeNull();
    expect(result!.fetchedAt).toBeTruthy();
  });
});
