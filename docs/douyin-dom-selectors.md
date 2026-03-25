# Douyin Creator Center — DOM Selector Map

Research date: 2026-03-24
Target: creator.douyin.com (抖音创作者中心)
Method: Headless browse with authenticated cookies

## Profile Info (Homepage)

URL: `https://creator.douyin.com/creator-micro/home`

Profile text is in a single text node containing:
- Nickname, 抖音号, bio
- 关注 (following), 粉丝 (followers), 获赞 (total likes)

Profile card: `[class*=card-head]`

### Data Overview Section

Tab panel `[role=tabpanel]` with tabs: 数据总览 | 近期作品 | 直播数据

Metrics in overview (近7日):
- 播放量 (total plays)
- 主页访问量 (profile visits)
- 作品分享 (post shares)
- 作品评论 (post comments)

---

## Content Management Page

URL: `https://creator.douyin.com/creator-micro/content/manage`

### Container Structure

```
[class*=content-qNoE6N]           (page content wrapper)
  └─ [class*=micro-wrapper]       (main content area)
      └─ [class*=card-container]  (content card)
          ├─ Tab bar: 全部作品 | 已发布 | 审核中 | 未通过
          └─ Video card list
```

### Video Card — Single Post

Selector: `[class*=video-card-zQ02ng]`

> NOTE: Class hashes (e.g., `zQ02ng`) change on redeploy.
> Use partial match: `[class*=video-card-]` with semantic prefix.

```
[class*=video-card-]                    ← POST CARD ROOT
├─ [class*=video-card-content]          ← content wrapper
│   ├─ [class*=video-card-cover]        ← thumbnail image
│   │   └─ img
│   ├─ [class*=video-card-top]          ← top overlay
│   │   └─ [class*=video-left-top-tag]  ← badge (e.g., "14张")
│   └─ [class*=video-card-bottom]       ← bottom overlay
├─ [class*=video-card-info]             ← info section
│   ├─ [class*=info-title-text]         ← DESCRIPTION / CAPTION
│   ├─ [class*=info-time]              ← PUBLISH DATE ("2026年03月15日 10:38")
│   ├─ [class*=info-status]            ← STATUS ("已发布")
│   ├─ [class*=tag-container]          ← TAGS
│   │   └─ [class*=semi-tag-content]   ← individual tag text
│   └─ [class*=op-btns]               ← action buttons (edit, etc.)
└─ [class*=metric-container]            ← METRICS SECTION
    └─ [class*=metric-item-container]   ← metrics row
        └─ [class*=metric-item-]        ← SINGLE METRIC
            ├─ [class*=metric-label]    ← label text
            └─ [class*=metric-value]    ← value text
```

### Metric Fields (per card)

| Label (metric-label) | Maps To | CreatorProfile Field |
|----|----|----|
| 播放 | Views | `post.views` |
| 点赞 | Likes | `post.likes` |
| 评论 | Comments | `post.comments` |
| 分享 | Shares | `post.shares` |
| 收藏 | Saves/Bookmarks | `post.saves` |
| 文案展开率 | Caption expand rate | (extended metric, optional) |
| 平均浏览图片 | Avg image views | (extended metric, optional) |

> NOTE: 图文 posts show 收藏+文案展开率+平均浏览图片.
> 视频 posts show 分享 instead. Metric set varies by content type.

### Date Format

`info-time` text: `"2026年03月15日 10:38"`
Parse: `YYYY年MM月DD日 HH:mm` → ISO 8601

### Pagination

- No traditional pagination (no `[class*=pagination]`)
- Infinite scroll with `[class*=load-more]` → text "加载中…"
- Extension must scroll to load all posts, or capture visible batch

---

## Robust Selector Strategy

Douyin uses CSS modules with random hash suffixes. Selectors WILL break on redeploy.

**Recommended approach for extension:**

```typescript
// Use semantic prefix matching (stable across deploys)
const SELECTORS = {
  videoCard: '[class*="video-card-"][class*="video-card-new"]',
  description: '[class*="info-title-text"]',
  publishDate: '[class*="info-time"]',
  status: '[class*="info-status"]',
  tagContainer: '[class*="tag-container"]',
  tagText: '[class*="semi-tag-content"]',
  metricItem: '[class*="metric-item-"][class*="metric-item-u"]',
  metricLabel: '[class*="metric-label"]',
  metricValue: '[class*="metric-value"]',
} as const;
```

**Fallback strategy:** If selectors fail (DOM restructure), fall back to:
1. Text content matching (find elements containing "播放", "点赞", etc.)
2. Structural matching (find elements with numeric text near known labels)

---

## Sample Extracted Data

Card 1 (图文):
```json
{
  "desc": "我给他看了我的审美积JI…。把自己的审美积累喂给 agent...",
  "publishedAt": "2026-03-15T10:38:00+08:00",
  "status": "已发布",
  "tags": ["官方活动：是谁打翻了大自然调色盘"],
  "views": 4826,
  "likes": 262,
  "comments": 6,
  "saves": 83,
  "shares": 0
}
```

Card 2 (视频):
```json
{
  "desc": "sample this？#谁的一辈子 #学习通答案 #压制 #破局 #音乐制作",
  "publishedAt": "2026-02-05T22:53:00+08:00",
  "status": "已发布",
  "views": 1537,
  "likes": 43,
  "comments": 4,
  "shares": 0,
  "saves": 0
}
```

---

---

## Data Center Pages (数据中心)

### Navigation

Sidebar: `数据中心` menu expands to reveal:
- `账号总览` → `https://creator.douyin.com/creator-micro/data-center/operation`
- `作品分析` → `https://creator.douyin.com/creator-micro/data-center/content`
- `粉丝分析` → `https://creator.douyin.com/creator-micro/data/stats/follower/portrait`
- `重点关心` → (not needed for MVP)

### 1. 账号总览 (Account Overview)

URL: `https://creator.douyin.com/creator-micro/data-center/operation`

**Export button:** `button` containing "导出数据" text
- Selector: `button` with `[class*="download_stroked"]` icon + "导出数据" text
- Class pattern: `douyin-creator-pc-button douyin-creator-pc-button-tertiary`

**Account diagnosis (账号诊断):**
```
投稿活跃度: 投稿数为4，高于76.29%的同类创作者
视频播放量: 3,945，高于94.13%的同类创作者
视频完播率: 6.17%，低于65.41%的同类创作者
互动指数:   6.89%，高于87.97%的同类创作者
粉丝净增量: 新增粉丝数为19，高于94.62%的同类创作者
```

**Data tabs:** 短视频 | 直播

**Metrics (昨日/近7天/近30天 toggleable):**
- 播放量, 主页访问, 作品点赞, 作品分享, 作品评论
- 封面点击率, 净增粉丝, 取关粉丝

### 2. 作品分析 (Content Analysis)

URL: `https://creator.douyin.com/creator-micro/data-center/content`

**Two sub-views via radio buttons:**
- `投稿分析` (Post Analysis) — aggregated metrics
- `投稿列表` (Post List) — per-post table

**Date range filter:** `发布时间 2025-12-24 ~ 2026-03-24`
**Content type filter:** `体裁: 全部`

#### 投稿分析 (Post Analysis)

Two export buttons:
1. `投稿概览` section → "导出数据"
2. `投稿表现` section → "导出数据"

**投稿概览 metrics:**
- 周期内投稿量: 2
- 条均点击率: 2.69%
- 条均5s完播率: 14.89%
- 条均2s跳出率: 50.25%
- 条均播放时长: 5.53秒
- 播放量中位数: 3178.5
- 条均点赞数: 153
- 条均评论量: 5
- 条均分享量: 9

**投稿表现 chart:**
- 播放量趋势图 with per-post tooltip
- Shows: post title, date, plays, above/below average

#### 投稿列表 (Post List)

Export button: "导出数据" + "刷新数据"

**Table columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| 作品名称 | Post title + thumbnail + date + type (图文/视频) | by 发布时间 |
| 审核状态 | Status badge (✓通过) | no |
| 播放量 | Views | yes |
| 完播率 | Completion rate (video only) | yes |
| 5s完播率 | 5-second completion rate | yes |
| 封面点击率 | Cover click rate | yes |
| 操作 | "分析详情" link (deep dive per post) | no |

**Per-row data available:**
```
作品: "我给他看了我的审美积JI..."
日期: 2026-03-15 10:38
类型: 图文
状态: ✓通过
播放量: 4826
完播率: -
5s完播率: -
封面点击率: 0%
```

**Highlight section: 表现优异作品**
- Badges: 播放最高, 吸粉最高, 点击率最高, 点赞最高, 完播率最高
- Top post card with: plays ▷4,826 | likes ♡262 | comments 💬6 | new followers 👤21

### 3. 粉丝画像 (Fan Portrait)

URL: `https://creator.douyin.com/creator-micro/data/stats/follower/portrait`

**No export button on this page** — data must be scraped from DOM.

**Sections and data available:**

| Section | Data | Format |
|---------|------|--------|
| 性别分布 | 男性 71%, 女性 29% | Donut chart |
| 年龄分布 | <23, 24-30, 31-40, 41-50, >50 | Bar chart |
| 地域分布 | Province → percentage (北京 22%, 广东 12%, ...) | Map + table |
| 设备分布 | 苹果 54%, 其他 18%, 华为 8%, 红米 6%, VIVO 4%, OPPO 4%, 小米 4% | Donut chart |
| 粉丝兴趣分布 | 随拍 34%, 音乐 14%, 二次元 12%, 游戏 9%, 舞蹈 7%, 动物 6%, 明星 6% | Table |
| 粉丝关注热词 | (requires 1000+ followers) | Word cloud |
| 活跃分布 | 低活 25%, 轻度 4%, 中度 7%, 重度 64% | Donut chart |

---

## Export Strategy for Extension

### Auto-Export Flow

The extension should trigger exports automatically when visiting data center pages:

```
1. Navigate to 账号总览
   → Click "导出数据" → Download CSV/Excel

2. Navigate to 作品分析 → 投稿分析
   → Click "导出数据" (投稿概览) → Download
   → Click "导出数据" (投稿表现) → Download

3. Navigate to 作品分析 → 投稿列表
   → Click "导出数据" → Download full post table

4. Navigate to 粉丝画像
   → Scrape DOM (no export button)
   → Extract: gender, age, location, device, interests, activity
```

### Export Button Selector Pattern

All export buttons follow the same pattern:
```typescript
const EXPORT_SELECTOR = 'button:has([class*="download_stroked"])';
// or
const EXPORT_BUTTONS = [...document.querySelectorAll('button')]
  .filter(b => b.textContent?.includes('导出数据'));
```

### Key URLs for Extension Content Scripts

```typescript
const DATA_CENTER_URLS = {
  accountOverview: 'creator.douyin.com/creator-micro/data-center/operation',
  contentAnalysis: 'creator.douyin.com/creator-micro/data-center/content',
  fanPortrait: 'creator.douyin.com/creator-micro/data/stats/follower/portrait',
} as const;
```

---

## Profile Page Selectors (Homepage)

| Data | Source | Notes |
|------|--------|-------|
| Nickname | Text node in profile area | "0xVox" |
| 抖音号 (uniqueId) | Text after "抖音号：" | "synslius" |
| Followers | Text after "粉丝" | 423 |
| Following | Text after "关注" | 2000 |
| Total likes | Text after "获赞" | 2763 |
| Video count | Inferred from content count | 12 visible |

Profile data is in a single concatenated text node — parse with regex:
```
/关注\s*(\d+)\s*粉丝\s*(\d+)\s*获赞\s*(\d+)/
```
