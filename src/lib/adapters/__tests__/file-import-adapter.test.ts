import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseFileContent, FileImportError, parseXlsxRaw, mergeXlsxResults } from '../file-import-adapter';

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

  describe('XLSX parsing', () => {
    function createXlsxContent(rows: Record<string, unknown>[]): string {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
    }

    it('parses XLSX with standard column names', async () => {
      const content = createXlsxContent([
        { postId: 'p1', desc: 'Video 1', views: 1000, likes: 100, comments: 10, shares: 5, saves: 20 },
        { postId: 'p2', desc: 'Video 2', views: 2000, likes: 200, comments: 20, shares: 10, saves: 40 },
      ]);
      const result = await parseFileContent(content, 'data.xlsx');
      expect(result).toHaveLength(1);
      expect(result[0].posts).toHaveLength(2);
      expect(result[0].posts[0].views).toBe(1000);
    });

    it('parses XLSX with Chinese column names (Douyin export)', async () => {
      const content = createXlsxContent([
        { '视频名称': '测试视频', '发布时间': '2026-03-01', '播放量': 5000, '5s完播率': '45.2%', '2s跳出率': '12.1%', '平均播放时长': 15.3 },
      ]);
      const result = await parseFileContent(content, 'douyin-export.xlsx');
      expect(result[0].posts).toHaveLength(1);
      expect(result[0].posts[0].desc).toBe('测试视频');
      expect(result[0].posts[0].views).toBe(5000);
      expect(result[0].posts[0].completionRate).toBe(45.2);
    });

    it('throws for empty XLSX', async () => {
      const ws = XLSX.utils.aoa_to_sheet([['postId', 'desc']]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const content = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
      await expect(parseFileContent(content, 'empty.xlsx')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('Douyin schema detection', () => {
    function toBase64(rows: Record<string, unknown>[]): string {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
    }

    it('detects 作品列表 (post_list) schema', () => {
      const content = toBase64([
        { '作品名称': '视频1', '播放量': '9334', '点赞量': '1000', '评论量': '10', '分享量': '73', '收藏量': '33', '完播率': '0.058', '5s完播率': '0.327', '2s跳出率': '0.326', '平均播放时长': '5.11' },
      ]);
      const result = parseXlsxRaw(content, '作品列表.xlsx');
      expect(result.schema).toBe('post_list');
      expect(result.posts).toHaveLength(1);
      expect(result.posts![0].desc).toBe('视频1');
      expect(result.posts![0].views).toBe(9334);
      expect(result.posts![0].likes).toBe(1000);
    });

    it('detects 投稿分析 (post_analysis) schema', () => {
      const content = toBase64([
        { '视频名称': '跨年视频', '发布时间': '2025-12-31', '播放量': '5242', '5s完播率': '0.073', '2s跳出率': '0.740', '平均播放时长': '2.24' },
      ]);
      const result = parseXlsxRaw(content, 'data1.xlsx');
      expect(result.schema).toBe('post_analysis');
      expect(result.posts![0].likes).toBe(0); // no interaction data
    });

    it('detects 投稿汇总 (aggregate) schema', () => {
      const content = toBase64([
        { '发布时间': '2025-12-25 ~ 2026-03-25', '体裁': '1min-视频', '垂类': '动物,体育', '周期内投稿量': '8', '条均点击率': '0.0168', '条均5s完播率': '0.196', '条均2s跳出率': '0.531', '条均播放时长': '3.92', '播放量中位数': '9133', '条均点赞数': '200', '条均评论量': '10', '条均分享量': '30' },
      ]);
      const result = parseXlsxRaw(content, 'data.xlsx');
      expect(result.schema).toBe('aggregate');
      expect(result.aggregate).toBeDefined();
      expect(result.aggregate!.postCount).toBe(8);
      expect(result.aggregate!.medianViews).toBe(9133);
    });

    it('detects 时间序列 (timeseries) schema', () => {
      const content = toBase64([
        { '日期': '2026-02-22', '播放量': 444 },
        { '日期': '2026-02-23', '播放量': 800 },
        { '日期': '2026-02-24', '播放量': 1200 },
      ]);
      const result = parseXlsxRaw(content, '数据表现_播放量数据.xlsx');
      expect(result.schema).toBe('timeseries');
      expect(result.history).toHaveLength(3);
    });

    it('handles "-" values as 0', () => {
      const content = toBase64([
        { '作品名称': '视频', '播放量': '-', '点赞量': '0', '评论量': '-', '分享量': '0', '收藏量': '-', '封面点击率': '-' },
      ]);
      const result = parseXlsxRaw(content, 'test.xlsx');
      expect(result.posts![0].views).toBe(0);
      expect(result.posts![0].comments).toBe(0);
    });
  });

  describe('Multi-file merge', () => {
    function toBase64(rows: Record<string, unknown>[]): string {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
    }

    it('merges post_list + timeseries + aggregate into one profile', () => {
      const postList = parseXlsxRaw(
        toBase64([{ '作品名称': 'V1', '播放量': '100', '点赞量': '10', '评论量': '1', '分享量': '2', '收藏量': '3' }]),
        '作品列表.xlsx',
      );
      const timeseries = parseXlsxRaw(
        toBase64([{ '日期': '2026-03-01', '播放量': 500 }, { '日期': '2026-03-02', '播放量': 600 }]),
        '播放量.xlsx',
      );
      const aggregate = parseXlsxRaw(
        toBase64([{ '条均点击率': '0.02', '条均5s完播率': '0.2', '周期内投稿量': '5', '播放量中位数': '300', '条均点赞数': '20', '条均评论量': '5', '条均分享量': '8', '条均2s跳出率': '0.5', '条均播放时长': '4' }]),
        'data.xlsx',
      );

      const merged = mergeXlsxResults([postList, timeseries, aggregate]);
      expect(merged.posts).toHaveLength(1);
      expect(merged.posts[0].desc).toBe('V1');
      expect(merged.history).toHaveLength(2);
      expect(merged.platform).toBe('douyin');
    });

    it('prefers post_list over post_analysis', () => {
      const postList = parseXlsxRaw(
        toBase64([{ '作品名称': 'Full', '播放量': '100', '点赞量': '10', '评论量': '1', '分享量': '2', '收藏量': '3' }]),
        '作品列表.xlsx',
      );
      const analysis = parseXlsxRaw(
        toBase64([{ '视频名称': 'Partial', '播放量': '200', '5s完播率': '0.1', '2s跳出率': '0.5', '平均播放时长': '3' }]),
        'data1.xlsx',
      );

      const merged = mergeXlsxResults([analysis, postList]);
      expect(merged.posts).toHaveLength(1);
      expect(merged.posts[0].desc).toBe('Full');
      expect(merged.posts[0].likes).toBe(10);
    });
  });
});
