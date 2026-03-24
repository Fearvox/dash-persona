/**
 * Demo adapter — returns pre-built creator profiles for testing and
 * onboarding without requiring any real platform data.
 *
 * Three persona archetypes are available:
 *   - tutorial  — tech / education creator
 *   - entertainment — comedy / skit / trending creator
 *   - lifestyle — lifestyle & product-review creator
 *
 * All numeric data is generated via a seeded PRNG so results are
 * deterministic for the same input string.
 *
 * @module adapters/demo-adapter
 */

import type { CreatorProfile, Post, HistorySnapshot, Platform } from '../schema/creator-data';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Seeded PRNG (simple 32-bit xorshift)
// ---------------------------------------------------------------------------

function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let state = seed | 1; // avoid 0 state
  return {
    /** Returns a float in [0, 1). */
    next(): number {
      state ^= state << 13;
      state ^= state >> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    },
    /** Returns an integer in [min, max]. */
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
  };
}

// ---------------------------------------------------------------------------
// Engagement ranges per platform
// ---------------------------------------------------------------------------

interface MetricRange {
  views: [number, number];
  likes: [number, number];
  comments: [number, number];
  shares: [number, number];
  saves: [number, number];
}

const PLATFORM_RANGES: Record<string, MetricRange> = {
  douyin: {
    views: [5_000, 500_000],
    likes: [200, 50_000],
    comments: [10, 5_000],
    shares: [5, 2_000],
    saves: [3, 1_000],
  },
  tiktok: {
    views: [2_000, 200_000],
    likes: [100, 30_000],
    comments: [5, 3_000],
    shares: [10, 5_000],
    saves: [5, 2_000],
  },
  xhs: {
    views: [500, 50_000],
    likes: [50, 10_000],
    comments: [5, 2_000],
    shares: [2, 500],
    saves: [20, 5_000],
  },
};

// ---------------------------------------------------------------------------
// Persona presets
// ---------------------------------------------------------------------------

interface PersonaPreset {
  label: string;
  profiles: Record<Platform, {
    nickname: string;
    uniqueId: string;
    bio: string;
    followers: number;
    likesTotal: number;
    videosCount: number;
    postDescs: string[];
  }>;
}

const TUTORIAL_POST_DESCS = [
  '5分钟学会 CSS Grid 布局 #前端开发 #编程教学',
  'React 18 新特性全解析 #React #前端',
  'TypeScript 泛型入门教程 #TypeScript',
  'Node.js 性能优化实战 #后端 #Node',
  '从零搭建 Vite + Vue3 项目 #Vue3 #Vite',
  'Git 工作流最佳实践 #Git #协作',
  'Docker 容器化部署指南 #Docker #DevOps',
  'API 设计规范与 RESTful 实践 #API #REST',
  '前端单元测试入门 #测试 #Jest',
  'Tailwind CSS 实用技巧分享 #CSS #Tailwind',
  'Next.js App Router 深度解析 #Next #全栈',
  'PostgreSQL 查询优化技巧 #数据库 #SQL',
  'CI/CD 流水线搭建教程 #DevOps #自动化',
  'WebSocket 实时通信实战 #WebSocket',
  'OAuth 2.0 认证流程详解 #安全 #认证',
  '微前端架构方案对比 #架构 #微前端',
  'GraphQL vs REST 怎么选？ #GraphQL #API',
  'Linux 命令行效率提升 #Linux #终端',
  'Redis 缓存策略详解 #Redis #缓存',
  'Figma 转代码工作流 #设计 #前端',
  'Prisma ORM 快速上手 #ORM #数据库',
  'Vercel 部署全流程 #部署 #Vercel',
  'Zustand 状态管理实战 #状态管理 #React',
  'ESLint + Prettier 配置指南 #工具链',
  'PWA 离线应用开发 #PWA #ServiceWorker',
  'Three.js 3D 可视化入门 #3D #WebGL',
  'Monorepo 工程化实践 #Monorepo #Turborepo',
  'Vitest 测试框架使用指南 #测试 #Vitest',
  'Bun 运行时体验报告 #Bun #Runtime',
  'Playwright E2E 测试实战 #E2E #自动化测试',
];

const ENTERTAINMENT_POST_DESCS = [
  '当程序员遇到产品经理改需求... #搞笑 #程序员日常',
  '挑战：用10秒画完一幅画 #挑战赛 #搞笑',
  '模仿各国人说"你好" #搞笑 #模仿',
  '当你的代码第一次跑通 #程序员 #快乐',
  '办公室摸鱼被抓现场 #职场 #搞笑',
  '猫咪看到黄瓜的反应合集 #萌宠 #搞笑',
  '如果生活有进度条... #创意 #动画',
  '各地方言说"我爱你" #方言 #搞笑',
  '翻拍经典电影名场面 #翻拍 #电影',
  '一人分饰多角演绎职场百态 #情景剧 #职场',
  '街头采访：你最后悔的事？ #街头采访',
  '魔术揭秘：这个技巧人人能学 #魔术',
  '把老歌用说唱方式重新演绎 #音乐 #说唱',
  '挑战24小时只说英语 #挑战 #英语',
  '情侣之间的默契测试 #情侣 #默契',
  '深夜emo时听这首歌 #音乐 #深夜',
  '路人反应实验：假装摔倒 #社会实验',
  '这道菜居然这么简单？ #美食 #教程',
  '挑战一天花100元生存 #挑战 #省钱',
  '宠物成精了！不可思议瞬间 #萌宠',
  '变装秀：从路人到明星 #变装 #穿搭',
  '盘点那些让人DNA动了的瞬间 #盘点',
  '跟着我学这个舞 #舞蹈 #教学',
  '各种食物的ASMR合集 #ASMR #美食',
  '测评网红餐厅：值不值？ #测评 #美食',
  '挑战不笑：看完算你赢 #搞笑 #挑战',
  '如果动物会说话... #动画 #搞笑',
  '一秒入戏挑战 #演技 #挑战',
  '奇怪的冷知识增加了 #冷知识',
  '全网最治愈的视频合集 #治愈 #温暖',
];

const LIFESTYLE_POST_DESCS = [
  '这款面霜用了一个月真实感受 #护肤 #测评',
  '618 必买清单：这5样真的好用 #购物 #好物推荐',
  '极简主义生活30天挑战 #极简 #生活方式',
  '早晨护肤步骤全分享 #护肤 #日常',
  '小户型改造：30平变出大空间 #家居 #改造',
  '一周穿搭不重样 #穿搭 #OOTD',
  '旅行必备好物清单 #旅行 #好物',
  '这家咖啡店也太好拍了 #咖啡 #打卡',
  '月薪5000的理财计划 #理财 #省钱',
  '周末一个人的vlog #vlog #独居',
  '二手好物淘到宝了！ #二手 #vintage',
  '无滤镜日落合集 #日落 #摄影',
  '租房改造｜不动墙也能大变样 #租房 #改造',
  '5分钟早餐：上班族必学 #美食 #早餐',
  '图书馆自习vlog #学习 #vlog',
  '秋冬必入的5支口红 #美妆 #口红',
  '居家健身：不需要器材 #健身 #居家',
  '文具控的开箱 #文具 #开箱',
  '我的阅读清单分享 #阅读 #书单',
  '如何养成早起习惯 #自律 #习惯',
  '平价好物vs大牌对比 #测评 #性价比',
  '一日三餐减脂食谱 #减脂 #食谱',
  '通勤穿搭：职场也能好看 #穿搭 #职场',
  '香薰蜡烛测评合集 #家居 #香氛',
  '新手化妆教程：日常妆 #化妆 #教程',
  '我家猫的一天 #萌宠 #猫咪',
  '周末市集探店vlog #市集 #探店',
  '收纳整理｜衣柜大改造 #收纳 #整理',
  '护发好物推荐 #护发 #好物',
  '搬家后的新家tour #家居 #room tour',
];

const PRESETS: Record<string, PersonaPreset> = {
  tutorial: {
    label: 'Tech Tutorial Creator',
    profiles: {
      douyin: {
        nickname: '代码小课堂',
        uniqueId: 'code_classroom',
        bio: '全栈开发者 | 每天一个编程技巧 | 让编程更简单',
        followers: 285_000,
        likesTotal: 1_420_000,
        videosCount: 312,
        postDescs: TUTORIAL_POST_DESCS,
      },
      tiktok: {
        nickname: 'CodeClassroom',
        uniqueId: 'codeclass_official',
        bio: 'Full-stack dev | Daily coding tips | Making code simple',
        followers: 142_000,
        likesTotal: 890_000,
        videosCount: 275,
        postDescs: TUTORIAL_POST_DESCS,
      },
      xhs: {
        nickname: '代码课堂笔记',
        uniqueId: 'code_notes_xhs',
        bio: '程序员 | 技术笔记 | 学习路线分享',
        followers: 68_000,
        likesTotal: 520_000,
        videosCount: 198,
        postDescs: TUTORIAL_POST_DESCS,
      },
    },
  },
  entertainment: {
    label: 'Entertainment Creator',
    profiles: {
      douyin: {
        nickname: '笑点制造机',
        uniqueId: 'laugh_factory',
        bio: '专业制造快乐 | 每天一个段子 | 笑一笑十年少',
        followers: 1_850_000,
        likesTotal: 12_500_000,
        videosCount: 520,
        postDescs: ENTERTAINMENT_POST_DESCS,
      },
      tiktok: {
        nickname: 'LaughFactory',
        uniqueId: 'laughfactory_tv',
        bio: 'Making people smile since 2022 | Comedy & Skits',
        followers: 920_000,
        likesTotal: 7_800_000,
        videosCount: 415,
        postDescs: ENTERTAINMENT_POST_DESCS,
      },
      xhs: {
        nickname: '快乐制造局',
        uniqueId: 'happy_bureau',
        bio: '搞笑日常 | 段子手 | 欢迎来笑',
        followers: 320_000,
        likesTotal: 2_100_000,
        videosCount: 280,
        postDescs: ENTERTAINMENT_POST_DESCS,
      },
    },
  },
  lifestyle: {
    label: 'Lifestyle & Review Creator',
    profiles: {
      douyin: {
        nickname: '生活研究所',
        uniqueId: 'life_lab_dy',
        bio: '分享美好生活 | 真实测评 | 好物种草',
        followers: 425_000,
        likesTotal: 3_200_000,
        videosCount: 380,
        postDescs: LIFESTYLE_POST_DESCS,
      },
      tiktok: {
        nickname: 'LifeLab',
        uniqueId: 'lifelab_reviews',
        bio: 'Honest reviews | Lifestyle tips | Living better with less',
        followers: 198_000,
        likesTotal: 1_650_000,
        videosCount: 310,
        postDescs: LIFESTYLE_POST_DESCS,
      },
      xhs: {
        nickname: '生活好物志',
        uniqueId: 'goodlife_xhs',
        bio: '好物分享 | 生活方式 | 认真测评每一件',
        followers: 156_000,
        likesTotal: 1_280_000,
        videosCount: 265,
        postDescs: LIFESTYLE_POST_DESCS,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function generatePosts(
  rng: ReturnType<typeof createRng>,
  descs: string[],
  platform: Platform,
  count: number,
): Post[] {
  const range = PLATFORM_RANGES[platform] ?? PLATFORM_RANGES.douyin;
  const posts: Post[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const daysAgo = rng.int(0, 90);
    const publishedAt = new Date(now - daysAgo * 86_400_000 - rng.int(0, 86_400_000));

    posts.push({
      postId: `demo_${platform}_${i.toString(36).padStart(4, '0')}`,
      desc: descs[i % descs.length],
      publishedAt: publishedAt.toISOString(),
      views: rng.int(...range.views),
      likes: rng.int(...range.likes),
      comments: rng.int(...range.comments),
      shares: rng.int(...range.shares),
      saves: rng.int(...range.saves),
      tags: extractTags(descs[i % descs.length]),
    });
  }

  // Sort newest first by convention
  posts.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  return posts;
}

function extractTags(desc: string): string[] {
  const matches = desc.match(/#[^\s#]+/g);
  return matches ? matches.map((t) => t.slice(1)) : [];
}

function generateHistory(
  rng: ReturnType<typeof createRng>,
  baseFollowers: number,
  baseLikes: number,
  baseVideos: number,
  entries: number,
): HistorySnapshot[] {
  const snapshots: HistorySnapshot[] = [];
  const now = Date.now();

  // Walk backwards from now, with slight daily growth
  let followers = baseFollowers;
  let likes = baseLikes;
  let videos = baseVideos;

  // Pre-compute growth rates
  const dailyFollowerGrowth = rng.int(50, 800);
  const dailyLikeGrowth = rng.int(200, 5_000);
  const dailyVideoGrowth = rng.next() < 0.6 ? 1 : 0;

  for (let i = entries - 1; i >= 0; i--) {
    const hoursAgo = i * (7 * 24) / entries; // spread over 7 days
    const date = new Date(now - hoursAgo * 3_600_000);

    snapshots.push({
      fetchedAt: date.toISOString(),
      profile: {
        followers,
        likesTotal: likes,
        videosCount: videos,
      },
    });

    // Grow for next (more recent) snapshot
    followers += dailyFollowerGrowth + rng.int(-100, 200);
    likes += dailyLikeGrowth + rng.int(-500, 1_000);
    videos += dailyVideoGrowth;
  }

  // Oldest first by convention
  snapshots.reverse();
  return snapshots;
}

function buildProfile(
  preset: PersonaPreset,
  platform: Platform,
  seedExtra: string,
): CreatorProfile {
  const info = preset.profiles[platform];
  if (!info) {
    throw new Error(`No preset data for platform "${platform}" in "${preset.label}"`);
  }

  const seed = hashSeed(`${preset.label}:${platform}:${seedExtra}`);
  const rng = createRng(seed);

  const posts = generatePosts(rng, info.postDescs, platform, 30);
  const history = generateHistory(rng, info.followers, info.likesTotal, info.videosCount, 10);

  return {
    platform,
    profileUrl: `https://${platform}.example.com/@${info.uniqueId}`,
    fetchedAt: new Date().toISOString(),
    source: 'demo',
    profile: {
      nickname: info.nickname,
      uniqueId: info.uniqueId,
      bio: info.bio,
      followers: info.followers,
      likesTotal: info.likesTotal,
      videosCount: info.videosCount,
    },
    posts,
    history,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type DemoPersonaType = 'tutorial' | 'entertainment' | 'lifestyle';

const PLATFORMS: Platform[] = ['douyin', 'tiktok', 'xhs'];

/**
 * All three demo persona presets, keyed by type.
 * Each preset contains profiles for all 3 platforms.
 */
export const DEMO_PROFILES: Record<DemoPersonaType, PersonaPreset> = {
  tutorial: PRESETS.tutorial,
  entertainment: PRESETS.entertainment,
  lifestyle: PRESETS.lifestyle,
};

/**
 * Get all platform profiles for a given persona type.
 *
 * @returns A record keyed by platform slug, each value a full
 *          `CreatorProfile` with 30 posts and 10 history snapshots.
 */
export function getDemoProfile(type: DemoPersonaType): Record<string, CreatorProfile> {
  const preset = PRESETS[type];
  if (!preset) {
    throw new Error(`Unknown demo persona type: "${type}"`);
  }

  const result: Record<string, CreatorProfile> = {};
  for (const platform of PLATFORMS) {
    result[platform] = buildProfile(preset, platform, 'stable');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

/**
 * Demo adapter that returns pre-built creator profiles for testing.
 *
 * Pass one of the following as `input`:
 *   - `"tutorial"` / `"entertainment"` / `"lifestyle"` — returns the
 *     Douyin profile for that persona type.
 *   - `"<type>:<platform>"` (e.g. `"tutorial:tiktok"`) — returns a
 *     specific platform profile.
 *   - Any other string — returns the tutorial Douyin profile.
 */
export class DemoAdapter implements DataAdapter {
  readonly name = 'demo';
  readonly description = 'Returns preset demo creator profiles for testing and onboarding';

  async collect(input: string): Promise<CreatorProfile | null> {
    const parts = input.trim().toLowerCase().split(':');
    const type = (['tutorial', 'entertainment', 'lifestyle'].includes(parts[0])
      ? parts[0]
      : 'tutorial') as DemoPersonaType;
    const platform = (parts[1] && PLATFORMS.includes(parts[1]) ? parts[1] : 'douyin') as Platform;

    const preset = PRESETS[type];
    if (!preset) return null;

    return buildProfile(preset, platform, 'stable');
  }
}
