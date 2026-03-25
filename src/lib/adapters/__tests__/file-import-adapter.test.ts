import { describe, it, expect } from 'vitest';
import { parseFileContent, FileImportError } from '../file-import-adapter';

const VALID_PROFILE = {
  platform: 'douyin',
  profileUrl: 'https://creator.douyin.com/creator/home',
  fetchedAt: '2026-03-25T00:00:00Z',
  source: 'manual_import',
  profile: {
    nickname: 'TestCreator',
    uniqueId: 'test123',
    followers: 1000,
    likesTotal: 5000,
    videosCount: 50,
  },
  posts: [
    { postId: 'p1', desc: 'First post', views: 100, likes: 10, comments: 1, shares: 2, saves: 5 },
  ],
};

describe('parseFileContent', () => {
  describe('JSON parsing', () => {
    it('parses a valid CreatorProfile JSON string', async () => {
      const result = await parseFileContent(JSON.stringify(VALID_PROFILE), 'profile.json');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('douyin');
      expect(result[0].profile.nickname).toBe('TestCreator');
    });

    it('parses a JSON array of CreatorProfiles', async () => {
      const tiktokProfile = { ...VALID_PROFILE, platform: 'tiktok', profileUrl: 'https://tiktok.com/@test' };
      const result = await parseFileContent(JSON.stringify([VALID_PROFILE, tiktokProfile]), 'profiles.json');
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('douyin');
      expect(result[1].platform).toBe('tiktok');
    });

    it('sets source to manual_import when missing', async () => {
      const noSource = { ...VALID_PROFILE, source: undefined };
      const json = JSON.stringify(noSource);
      // source will be missing in JSON since undefined is stripped
      const result = await parseFileContent(json, 'profile.json');
      expect(result[0].source).toBe('manual_import');
    });

    it('throws FileImportError for invalid JSON', async () => {
      await expect(parseFileContent('not json', 'bad.json')).rejects.toThrow(FileImportError);
      await expect(parseFileContent('not json', 'bad.json')).rejects.toMatchObject({ code: 'PARSE_ERROR' });
    });

    it('throws FileImportError for valid JSON that fails schema validation', async () => {
      const invalid = { platform: 'douyin' };
      await expect(parseFileContent(JSON.stringify(invalid), 'bad.json')).rejects.toThrow(FileImportError);
      await expect(parseFileContent(JSON.stringify(invalid), 'bad.json')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('CSV parsing', () => {
    const CSV_HEADER = 'postId,desc,views,likes,comments,shares,saves,publishedAt';
    const CSV_ROW1 = 'p1,First post,1000,100,10,5,20,2026-03-01';
    const CSV_ROW2 = 'p2,Second post,2000,200,20,10,40,2026-03-02';

    it('parses CSV with header row into a CreatorProfile', async () => {
      const csv = [CSV_HEADER, CSV_ROW1, CSV_ROW2].join('\n');
      const result = await parseFileContent(csv, 'posts.csv');
      expect(result).toHaveLength(1);
      expect(result[0].posts).toHaveLength(2);
      expect(result[0].posts[0].postId).toBe('p1');
      expect(result[0].posts[0].views).toBe(1000);
      expect(result[0].posts[1].desc).toBe('Second post');
    });

    it('handles quoted fields with commas', async () => {
      const csv = [CSV_HEADER, '"p1","Hello, world",500,50,5,2,10,2026-03-01'].join('\n');
      const result = await parseFileContent(csv, 'quoted.csv');
      expect(result[0].posts[0].desc).toBe('Hello, world');
    });

    it('skips empty rows', async () => {
      const csv = [CSV_HEADER, CSV_ROW1, '', '  ', CSV_ROW2].join('\n');
      const result = await parseFileContent(csv, 'gaps.csv');
      expect(result[0].posts).toHaveLength(2);
    });

    it('throws for CSV with no data rows', async () => {
      await expect(parseFileContent(CSV_HEADER, 'empty.csv')).rejects.toThrow(FileImportError);
      await expect(parseFileContent(CSV_HEADER, 'empty.csv')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('generates a placeholder CreatorProfile with manual_import source', async () => {
      const csv = [CSV_HEADER, CSV_ROW1].join('\n');
      const result = await parseFileContent(csv, 'posts.csv');
      expect(result[0].source).toBe('manual_import');
      expect(result[0].platform).toBe('unknown');
      expect(result[0].profile.nickname).toBe('Imported from posts.csv');
    });
  });
});
