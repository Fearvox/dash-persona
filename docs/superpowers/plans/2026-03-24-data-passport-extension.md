# Data Passport Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that captures real Douyin creator data (profile, posts, analytics, fan portrait) and sends it to DashPersona for analysis.

**Architecture:** Monorepo `extension/` subdirectory with Vite + CRXJS. Content scripts extract data from 5 Douyin creator center pages. Background service worker orchestrates multi-page collection via state machine. Data transfers to DashPersona via postMessage with origin validation. DashPersona receives via new ExtensionAdapter.

**Tech Stack:** Chrome Manifest V3, Vite + CRXJS, TypeScript, papaparse (CSV), postMessage API

**Design doc:** `/Users/0xvox/.claude/plans/elegant-forging-fern.md`
**DOM selectors:** `docs/douyin-dom-selectors.md`

---

## File Map

### Extension (`extension/`)
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `extension/package.json` | Extension deps: vite, @crxjs/vite-plugin, papaparse |
| Create | `extension/vite.config.ts` | CRXJS + TypeScript build |
| Create | `extension/tsconfig.json` | Extension TypeScript config |
| Create | `extension/manifest.json` | MV3 manifest: permissions, content scripts, service worker |
| Create | `extension/src/shared/types.ts` | Shared types (mirrors CreatorProfile) |
| Create | `extension/src/shared/selectors.ts` | Douyin DOM selectors with fallback |
| Create | `extension/src/shared/parse-date.ts` | Douyin date format → ISO 8601 |
| Create | `extension/src/shared/parse-csv.ts` | CSV → structured data via papaparse |
| Create | `extension/src/content/extract-profile.ts` | Homepage profile extraction |
| Create | `extension/src/content/extract-posts.ts` | Content management page post cards |
| Create | `extension/src/content/extract-overview.ts` | 账号总览 metrics + CSV export click |
| Create | `extension/src/content/extract-analysis.ts` | 投稿分析/投稿列表 CSV export |
| Create | `extension/src/content/extract-fans.ts` | 粉丝画像 DOM scrape |
| Create | `extension/src/content/douyin.ts` | Content script entry (message handler) |
| Create | `extension/src/background/service-worker.ts` | State machine orchestrator |
| Create | `extension/src/background/transfer.ts` | postMessage sender + storage fallback |
| Create | `extension/src/popup/popup.html` | Popup shell (dark theme) |
| Create | `extension/src/popup/popup.ts` | Popup state rendering (5 states) |
| Create | `extension/src/popup/popup.css` | Dark mode styles (DashPersona tokens) |

### DashPersona Web App
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/adapters/extension-adapter.ts` | postMessage listener + validation |
| Create | `src/lib/adapters/__tests__/extension-adapter.test.ts` | Adapter tests |
| Modify | `src/lib/adapters/registry.ts` | Register ExtensionAdapter |
| Modify | `src/app/dashboard/page.tsx` | Handle `?source=extension` |
| Modify | `src/app/onboarding/page.tsx` | Add extension install option |

---

## Tasks

### Task 1: Extension scaffold

**Files:**
- Create: `extension/package.json`
- Create: `extension/vite.config.ts`
- Create: `extension/tsconfig.json`
- Create: `extension/manifest.json`

- [ ] **Step 1: Create extension/package.json**

```json
{
  "name": "dash-persona-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "vite": "^6.0.0",
    "typescript": "^5.7.0"
  },
  "dependencies": {
    "papaparse": "^5.4.1"
  }
}
```

- [ ] **Step 2: Create extension/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create extension/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: { outDir: 'dist' },
});
```

- [ ] **Step 4: Create extension/manifest.json**

```json
{
  "manifest_version": 3,
  "name": "DashPersona Data Passport",
  "version": "0.1.0",
  "description": "One-click creator data capture for DashPersona",
  "permissions": ["activeTab", "storage", "downloads", "tabs"],
  "host_permissions": ["https://creator.douyin.com/*"],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["https://creator.douyin.com/*"],
    "js": ["src/content/douyin.ts"]
  }],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
  },
  "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
}
```

- [ ] **Step 5: Create placeholder icons**

```bash
mkdir -p extension/icons extension/src/shared extension/src/content extension/src/background extension/src/popup
# Create minimal SVG-based placeholder icons (replace later with real icons)
```

- [ ] **Step 6: Install deps + verify build**

```bash
cd extension && npm install && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add extension/
git commit -m "feat(extension): scaffold Chrome MV3 extension with Vite + CRXJS"
```

---

### Task 2: Shared types + DOM selectors

**Files:**
- Create: `extension/src/shared/types.ts`
- Create: `extension/src/shared/selectors.ts`
- Create: `extension/src/shared/parse-date.ts`

- [ ] **Step 1: Create extension/src/shared/types.ts**

Mirror essential types from `src/lib/schema/creator-data.ts`:

```typescript
// Mirrors DashPersona's CreatorProfile schema
export interface Post {
  postId: string;
  desc: string;
  publishedAt?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  tags?: string[];
  contentType?: string;
}

export interface ProfileInfo {
  nickname: string;
  uniqueId: string;
  avatarUrl?: string;
  followers: number;
  likesTotal: number;
  videosCount: number;
  bio?: string;
}

export interface CreatorProfile {
  platform: string;
  profileUrl: string;
  fetchedAt: string;
  source: 'extension';
  profile: ProfileInfo;
  posts: Post[];
  history?: Array<{
    fetchedAt: string;
    profile: { followers: number; likesTotal: number; videosCount: number };
  }>;
}

// Fan portrait data (not in core schema — extension-specific enrichment)
export interface FanPortrait {
  gender: { male: number; female: number };
  ageGroups: Array<{ range: string; percentage: number }>;
  topProvinces: Array<{ province: string; percentage: number }>;
  devices: Array<{ device: string; percentage: number }>;
  interests: Array<{ interest: string; percentage: number }>;
  activityLevels: Array<{ level: string; percentage: number }>;
}

// Account diagnostics (账号诊断 — percentile data)
export interface AccountDiagnostics {
  postActivity: { value: number; percentile: number };
  videoPlays: { value: number; percentile: number };
  completionRate: { value: number; percentile: number };
  interactionIndex: { value: number; percentile: number };
  followerGrowth: { value: number; percentile: number };
}

// Collection state machine
export type CollectionStep =
  | 'idle'
  | 'collecting_profile'
  | 'collecting_overview'
  | 'collecting_posts'
  | 'collecting_post_list'
  | 'collecting_fans'
  | 'merging'
  | 'sending'
  | 'done'
  | 'error';

export interface CollectionState {
  step: CollectionStep;
  currentStepIndex: number;
  totalSteps: number;
  stepLabel: string;
  profile: Partial<CreatorProfile> | null;
  fanPortrait: FanPortrait | null;
  diagnostics: AccountDiagnostics | null;
  error: string | null;
  lastCollectedAt: string | null;
}

// Message types between content script ↔ service worker ↔ popup
export type ExtMessage =
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; state: CollectionState }
  | { type: 'START_COLLECTION' }
  | { type: 'EXTRACT_PROFILE'; tabId: number }
  | { type: 'EXTRACT_POSTS'; tabId: number }
  | { type: 'EXTRACT_OVERVIEW'; tabId: number }
  | { type: 'EXTRACT_POST_LIST'; tabId: number }
  | { type: 'EXTRACT_FANS'; tabId: number }
  | { type: 'EXTRACTION_RESULT'; step: string; data: unknown; error?: string }
  | { type: 'CLICK_EXPORT'; tabId: number }
  | { type: 'TRANSFER_TO_DASHPERSONA'; profile: CreatorProfile };
```

- [ ] **Step 2: Create extension/src/shared/selectors.ts**

```typescript
// Semantic prefix selectors — resist CSS module hash changes
// Source: docs/douyin-dom-selectors.md (researched 2026-03-24)

export const SELECTORS = {
  // Content management page
  videoCard: '[class*="video-card-"][class*="video-card-new"]',
  description: '[class*="info-title-text"]',
  publishDate: '[class*="info-time"]',
  status: '[class*="info-status"]',
  tagContainer: '[class*="tag-container"]',
  tagText: '[class*="semi-tag-content"]',
  metricItem: '[class*="metric-item-u"]',
  metricLabel: '[class*="metric-label"]',
  metricValue: '[class*="metric-value"]',

  // Export buttons (data center pages)
  exportButton: 'button',
  exportButtonText: '导出数据',

  // Profile page
  profileCard: '[class*="card-head"]',
} as const;

// Regex for profile text parsing
export const PROFILE_REGEX = /关注\s*([\d,]+)\s*粉丝\s*([\d,]+)\s*获赞\s*([\d,]+)/;
export const DOUYIN_ID_REGEX = /抖音号[：:]\s*(\S+)/;

// Douyin data center URLs
export const DATA_CENTER_URLS = {
  home: 'https://creator.douyin.com/creator-micro/home',
  contentManage: 'https://creator.douyin.com/creator-micro/content/manage',
  accountOverview: 'https://creator.douyin.com/creator-micro/data-center/operation',
  contentAnalysis: 'https://creator.douyin.com/creator-micro/data-center/content',
  fanPortrait: 'https://creator.douyin.com/creator-micro/data/stats/follower/portrait',
} as const;

// Metric label → CreatorProfile field mapping
export const METRIC_MAP: Record<string, keyof import('./types').Post> = {
  '播放': 'views',
  '点赞': 'likes',
  '评论': 'comments',
  '分享': 'shares',
  '收藏': 'saves',
};

/**
 * Fallback selector: find element by text content when CSS selectors fail.
 */
export function findByText(root: Element | Document, text: string): Element | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.includes(text)) {
      return walker.currentNode.parentElement;
    }
  }
  return null;
}
```

- [ ] **Step 3: Create extension/src/shared/parse-date.ts**

```typescript
/**
 * Parse Douyin date format "2026年03月15日 10:38" → ISO 8601 string.
 */
export function parseDouyinDate(text: string): string | undefined {
  // Format: "2026年03月15日 10:38" or "2026-03-15 10:38"
  const match = text.match(/(\d{4})[年-](\d{2})[月-](\d{2})日?\s+(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

/** Parse numeric string, removing commas. */
export function parseNumber(text: string): number {
  return parseInt(text.replace(/[,，\s]/g, ''), 10) || 0;
}

/** Parse percentage string like "7.09%" → 0.0709 */
export function parsePercent(text: string): number {
  const match = text.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) / 100 : 0;
}
```

- [ ] **Step 4: Commit**

```bash
git add extension/src/shared/
git commit -m "feat(extension): shared types, DOM selectors, date/number parsers"
```

---

### Task 3: Content script — profile + posts extraction

**Files:**
- Create: `extension/src/content/extract-profile.ts`
- Create: `extension/src/content/extract-posts.ts`

- [ ] **Step 1: Create extract-profile.ts**

```typescript
import type { ProfileInfo } from '../shared/types';
import { PROFILE_REGEX, DOUYIN_ID_REGEX, SELECTORS, findByText } from '../shared/selectors';
import { parseNumber } from '../shared/parse-date';

export function extractProfile(): ProfileInfo | null {
  // Profile data is in a concatenated text node on the homepage
  const profileCard = document.querySelector(SELECTORS.profileCard);
  const textSource = profileCard?.textContent ?? document.body.textContent ?? '';

  const profileMatch = textSource.match(PROFILE_REGEX);
  if (!profileMatch) return null;

  const idMatch = textSource.match(DOUYIN_ID_REGEX);
  // Extract nickname: text before "抖音号"
  const nickMatch = textSource.match(/^([^\s]+)\s*抖音号/);

  const followers = parseNumber(profileMatch[2]);
  const likesTotal = parseNumber(profileMatch[3]);

  return {
    nickname: nickMatch?.[1] ?? 'Unknown',
    uniqueId: idMatch?.[1] ?? '',
    followers,
    likesTotal,
    videosCount: 0, // Inferred from post count later
  };
}
```

- [ ] **Step 2: Create extract-posts.ts**

```typescript
import type { Post } from '../shared/types';
import { SELECTORS, METRIC_MAP, findByText } from '../shared/selectors';
import { parseDouyinDate, parseNumber } from '../shared/parse-date';

export function extractPosts(): Post[] {
  const cards = document.querySelectorAll(SELECTORS.videoCard);
  const posts: Post[] = [];

  for (const card of cards) {
    const desc = card.querySelector(SELECTORS.description)?.textContent?.trim() ?? '';
    const dateText = card.querySelector(SELECTORS.publishDate)?.textContent?.trim() ?? '';
    const publishedAt = parseDouyinDate(dateText);
    const status = card.querySelector(SELECTORS.status)?.textContent?.trim();

    // Only include published posts
    if (status && !status.includes('发布') && !status.includes('通过')) continue;

    // Extract metrics
    const metrics: Record<string, number> = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    const metricItems = card.querySelectorAll(SELECTORS.metricItem);
    for (const item of metricItems) {
      const label = item.querySelector(SELECTORS.metricLabel)?.textContent?.trim() ?? '';
      const value = item.querySelector(SELECTORS.metricValue)?.textContent?.trim() ?? '0';
      const field = METRIC_MAP[label];
      if (field && field in metrics) {
        (metrics as Record<string, number>)[field] = parseNumber(value);
      }
    }

    // Extract tags
    const tagEls = card.querySelectorAll(SELECTORS.tagText);
    const tags = [...tagEls].map(t => t.textContent?.trim()).filter(Boolean) as string[];

    const postId = `dy-${Date.now()}-${posts.length}`;

    posts.push({
      postId,
      desc,
      publishedAt,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return posts;
}
```

- [ ] **Step 3: Commit**

```bash
git add extension/src/content/extract-profile.ts extension/src/content/extract-posts.ts
git commit -m "feat(extension): profile + post card extraction from Douyin DOM"
```

---

### Task 4: Content script — data center extractions

**Files:**
- Create: `extension/src/content/extract-overview.ts`
- Create: `extension/src/content/extract-analysis.ts`
- Create: `extension/src/content/extract-fans.ts`
- Create: `extension/src/shared/parse-csv.ts`

- [ ] **Step 1: Create parse-csv.ts**

```typescript
import Papa from 'papaparse';

export function parseCSV<T = Record<string, string>>(csvText: string): T[] {
  const result = Papa.parse<T>(csvText, { header: true, skipEmptyLines: true });
  return result.data;
}
```

- [ ] **Step 2: Create extract-overview.ts**

Extracts 账号诊断 (percentile data) from DOM text matching.

```typescript
import type { AccountDiagnostics } from '../shared/types';
import { parseNumber, parsePercent } from '../shared/parse-date';
import { findByText } from '../shared/selectors';

export function extractAccountOverview(): AccountDiagnostics | null {
  const body = document.body.textContent ?? '';

  const extract = (keyword: string): { value: number; percentile: number } => {
    // Pattern: "投稿数为4，高于76.29%的同类创作者"
    const regex = new RegExp(`${keyword}[为是]([\\d,.]+)[^]*?([\\d.]+)%的同类创作者`);
    const match = body.match(regex);
    if (!match) return { value: 0, percentile: 0 };
    return { value: parseNumber(match[1]), percentile: parseFloat(match[2]) };
  };

  const postActivity = extract('投稿数');
  const videoPlays = extract('视频播放量');
  const completionRate = extract('完播率');
  const interactionIndex = extract('互动指数');
  const followerGrowth = extract('新增粉丝数');

  // If nothing matched, page probably didn't load or session expired
  if (postActivity.percentile === 0 && videoPlays.percentile === 0) return null;

  return { postActivity, videoPlays, completionRate, interactionIndex, followerGrowth };
}
```

- [ ] **Step 3: Create extract-fans.ts**

```typescript
import type { FanPortrait } from '../shared/types';
import { findByText } from '../shared/selectors';

export function extractFanPortrait(): FanPortrait | null {
  const body = document.body.textContent ?? '';
  if (!body.includes('粉丝画像') && !body.includes('性别分布')) return null;

  // Gender: "男性 71%" or "71% 男性"
  const maleMatch = body.match(/男性?\s*(\d+)%|(\d+)%\s*男/);
  const femaleMatch = body.match(/女性?\s*(\d+)%|(\d+)%\s*女/);
  const male = parseInt(maleMatch?.[1] ?? maleMatch?.[2] ?? '0', 10);
  const female = parseInt(femaleMatch?.[1] ?? femaleMatch?.[2] ?? '0', 10);

  // Interests table: "兴趣 占比" then rows
  const interests: Array<{ interest: string; percentage: number }> = [];
  const interestRows = body.match(/(?:随拍|音乐|二次元|游戏|舞蹈|动物|明星|体育|时尚|美食)\s+(\d+)%/g);
  if (interestRows) {
    for (const row of interestRows) {
      const m = row.match(/(\S+)\s+(\d+)%/);
      if (m) interests.push({ interest: m[1], percentage: parseInt(m[2], 10) });
    }
  }

  // Provinces table
  const topProvinces: Array<{ province: string; percentage: number }> = [];
  const provinceRows = body.match(/(?:北京|广东|四川|山东|河南|浙江|江苏|福建|上海|湖北)\s+(\d+)%/g);
  if (provinceRows) {
    for (const row of provinceRows) {
      const m = row.match(/(\S+)\s+(\d+)%/);
      if (m) topProvinces.push({ province: m[1], percentage: parseInt(m[2], 10) });
    }
  }

  return {
    gender: { male, female },
    ageGroups: [], // Chart data hard to extract from DOM text
    topProvinces,
    devices: [],
    interests,
    activityLevels: [],
  };
}
```

- [ ] **Step 4: Create extract-analysis.ts**

Clicks export buttons and triggers CSV downloads.

```typescript
import { SELECTORS } from '../shared/selectors';

/** Find and click all "导出数据" buttons on the page. Returns count clicked. */
export function clickExportButtons(): number {
  const buttons = [...document.querySelectorAll('button')]
    .filter(b => b.textContent?.includes(SELECTORS.exportButtonText));
  let clicked = 0;
  for (const btn of buttons) {
    if (!btn.disabled) {
      btn.click();
      clicked++;
    }
  }
  return clicked;
}

/** Extract post list table data directly from DOM (投稿列表 view). */
export function extractPostListTable(): Array<{
  title: string;
  date: string;
  type: string;
  views: number;
  completionRate: string;
  fiveSecRate: string;
  coverClickRate: string;
}> {
  // Post list is a table-like structure with rows
  const rows: Array<Record<string, string | number>> = [];
  // Implementation depends on exact DOM — use text content matching as fallback
  const bodyText = document.body.textContent ?? '';
  // For MVP: return empty, rely on content management page extraction instead
  return [];
}
```

- [ ] **Step 5: Commit**

```bash
git add extension/src/content/ extension/src/shared/parse-csv.ts
git commit -m "feat(extension): data center extractors (overview, analysis, fan portrait)"
```

---

### Task 5: Content script entry + service worker

**Files:**
- Create: `extension/src/content/douyin.ts`
- Create: `extension/src/background/service-worker.ts`
- Create: `extension/src/background/transfer.ts`

- [ ] **Step 1: Create extension/src/content/douyin.ts**

Content script entry — listens for messages from service worker.

```typescript
import type { ExtMessage } from '../shared/types';
import { extractProfile } from './extract-profile';
import { extractPosts } from './extract-posts';
import { extractAccountOverview } from './extract-overview';
import { extractFanPortrait } from './extract-fans';
import { clickExportButtons } from './extract-analysis';

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'EXTRACT_PROFILE': {
        const profile = extractProfile();
        const posts = extractPosts();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'profile', data: { profile, posts } });
        break;
      }
      case 'EXTRACT_OVERVIEW': {
        const diagnostics = extractAccountOverview();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'overview', data: diagnostics });
        break;
      }
      case 'EXTRACT_POST_LIST': {
        clickExportButtons();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'post_list', data: { exported: true } });
        break;
      }
      case 'EXTRACT_FANS': {
        const fans = extractFanPortrait();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'fans', data: fans });
        break;
      }
    }
    return true; // async response
  },
);
```

- [ ] **Step 2: Create extension/src/background/service-worker.ts**

State machine orchestrator.

```typescript
import type { CollectionState, CollectionStep, CreatorProfile, ExtMessage } from '../shared/types';
import { DATA_CENTER_URLS } from '../shared/selectors';
import { transferToDashPersona } from './transfer';

const STEPS: { step: CollectionStep; label: string; url: string; extractType: string }[] = [
  { step: 'collecting_profile', label: 'Profile + Posts', url: DATA_CENTER_URLS.contentManage, extractType: 'EXTRACT_PROFILE' },
  { step: 'collecting_overview', label: 'Account Overview', url: DATA_CENTER_URLS.accountOverview, extractType: 'EXTRACT_OVERVIEW' },
  { step: 'collecting_post_list', label: 'Post Analysis', url: DATA_CENTER_URLS.contentAnalysis, extractType: 'EXTRACT_POST_LIST' },
  { step: 'collecting_fans', label: 'Fan Portrait', url: DATA_CENTER_URLS.fanPortrait, extractType: 'EXTRACT_FANS' },
];

let state: CollectionState = {
  step: 'idle', currentStepIndex: 0, totalSteps: STEPS.length,
  stepLabel: '', profile: null, fanPortrait: null, diagnostics: null,
  error: null, lastCollectedAt: null,
};

function updateState(patch: Partial<CollectionState>) {
  state = { ...state, ...patch };
  // Broadcast to popup
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
}

async function runCollection(tabId: number) {
  const collectedProfile: Partial<CreatorProfile> = {
    platform: 'douyin',
    profileUrl: DATA_CENTER_URLS.home,
    fetchedAt: new Date().toISOString(),
    source: 'extension',
    profile: { nickname: '', uniqueId: '', followers: 0, likesTotal: 0, videosCount: 0 },
    posts: [],
  };

  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    updateState({ step: s.step, currentStepIndex: i, stepLabel: s.label });

    // Navigate tab
    await chrome.tabs.update(tabId, { url: s.url });
    await waitForLoad(tabId, 5000);

    // Send extraction message
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: s.extractType, tabId });
      if (response?.data) {
        if (s.step === 'collecting_profile') {
          if (response.data.profile) collectedProfile.profile = response.data.profile;
          if (response.data.posts) collectedProfile.posts = response.data.posts;
          collectedProfile.profile!.videosCount = response.data.posts?.length ?? 0;
        }
        if (s.step === 'collecting_overview' && response.data) {
          state.diagnostics = response.data;
        }
        if (s.step === 'collecting_fans' && response.data) {
          state.fanPortrait = response.data;
        }
      }
    } catch (err) {
      // Non-fatal: continue with partial data
      console.warn(`Step ${s.step} failed:`, err);
    }
  }

  // Merge + send
  updateState({ step: 'merging', stepLabel: 'Merging data...' });
  const finalProfile = collectedProfile as CreatorProfile;

  updateState({ step: 'sending', stepLabel: 'Sending to DashPersona...' });
  await transferToDashPersona(finalProfile);

  updateState({
    step: 'done', stepLabel: 'Complete',
    profile: finalProfile,
    lastCollectedAt: new Date().toISOString(),
  });
}

function waitForLoad(tabId: number, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        // Extra delay for JS rendering
        setTimeout(resolve, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message: ExtMessage, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    sendResponse(state);
    return;
  }
  if (message.type === 'START_COLLECTION') {
    // Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url?.includes('creator.douyin.com')) {
        updateState({ step: 'error', error: 'Not on creator.douyin.com' });
        return;
      }
      updateState({ step: 'collecting_profile', error: null });
      runCollection(tab.id).catch((err) => {
        updateState({ step: 'error', error: String(err) });
      });
    });
    sendResponse({ ok: true });
    return;
  }
});
```

- [ ] **Step 3: Create extension/src/background/transfer.ts**

```typescript
import type { CreatorProfile } from '../shared/types';

const DASHPERSONA_ORIGIN = 'https://dash-persona.vercel.app';

export async function transferToDashPersona(profile: CreatorProfile): Promise<void> {
  // Strategy 1: Find open DashPersona tab and postMessage
  const tabs = await chrome.tabs.query({ url: `${DASHPERSONA_ORIGIN}/*` });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.sendMessage(tabs[0].id, {
      type: 'DASHPERSONA_PROFILE_DATA',
      profile,
      origin: DASHPERSONA_ORIGIN,
    });
    await chrome.tabs.update(tabs[0].id, { active: true });
    return;
  }

  // Strategy 2: Save to storage + open new tab
  await chrome.storage.local.set({ pendingProfile: profile });
  await chrome.tabs.create({
    url: `${DASHPERSONA_ORIGIN}/dashboard?source=extension`,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add extension/src/content/douyin.ts extension/src/background/
git commit -m "feat(extension): content script entry + service worker state machine + transfer"
```

---

### Task 6: Popup UI

**Files:**
- Create: `extension/src/popup/popup.html`
- Create: `extension/src/popup/popup.css`
- Create: `extension/src/popup/popup.ts`

- [ ] **Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=360">
  <link rel="stylesheet" href="popup.css">
  <title>Data Passport</title>
</head>
<body>
  <div id="app">
    <header>
      <span class="logo">─/ DASH</span>
      <span class="title" id="title">Data Passport</span>
    </header>
    <main id="content"></main>
    <footer id="footer"></footer>
  </div>
  <script type="module" src="popup.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup.css**

DashPersona design tokens. Implement the 5-state popup wireframes from the design review.

- [ ] **Step 3: Create popup.ts**

Renders 5 states (idle, collecting, done, error, not-on-platform) based on CollectionState from service worker. Sends `START_COLLECTION` message on button click.

- [ ] **Step 4: Build + verify**

```bash
cd extension && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add extension/src/popup/
git commit -m "feat(extension): popup UI with 5-state rendering (DashPersona dark theme)"
```

---

### Task 7: ExtensionAdapter (DashPersona side)

**Files:**
- Create: `src/lib/adapters/extension-adapter.ts`
- Create: `src/lib/adapters/__tests__/extension-adapter.test.ts`
- Modify: `src/lib/adapters/registry.ts`

- [ ] **Step 1: Write extension-adapter tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionAdapter } from '../extension-adapter';

describe('ExtensionAdapter', () => {
  const adapter = new ExtensionAdapter();

  it('has correct name and description', () => {
    expect(adapter.name).toBe('extension');
    expect(adapter.description).toContain('browser extension');
  });

  it('collects from valid JSON input', async () => {
    const input = JSON.stringify({
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      fetchedAt: '2026-03-24T12:00:00Z',
      source: 'extension',
      profile: { nickname: 'Test', uniqueId: 'test123', followers: 100, likesTotal: 500, videosCount: 10 },
      posts: [{ postId: 'p1', desc: 'test', views: 100, likes: 10, comments: 1, shares: 0, saves: 5 }],
    });
    const result = await adapter.collect(input);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('extension');
    expect(result!.posts).toHaveLength(1);
  });

  it('returns null for invalid JSON', async () => {
    const result = await adapter.collect('not json');
    expect(result).toBeNull();
  });

  it('returns null for missing required fields', async () => {
    const result = await adapter.collect(JSON.stringify({ platform: 'douyin' }));
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/adapters/__tests__/extension-adapter.test.ts
```

- [ ] **Step 3: Implement ExtensionAdapter**

```typescript
import type { CreatorProfile } from '../schema/creator-data';
import type { DataAdapter } from './types';

export class ExtensionAdapter implements DataAdapter {
  name = 'extension';
  description = 'Receives creator data from the DashPersona browser extension';

  async collect(input: string): Promise<CreatorProfile | null> {
    try {
      const data = JSON.parse(input);

      // Validate required fields
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
```

- [ ] **Step 4: Register in registry.ts**

Add after line 16 (HTMLParseAdapter import):
```typescript
import { ExtensionAdapter } from './extension-adapter';
```

Add after line 153 (HTMLParseAdapter registration):
```typescript
registerAdapter(new ExtensionAdapter());
```

- [ ] **Step 5: Run tests — verify pass**

```bash
npx vitest run src/lib/adapters/__tests__/extension-adapter.test.ts
```

- [ ] **Step 6: Full build check**

```bash
npm run build && npm run test
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/adapters/
git commit -m "feat(adapters): ExtensionAdapter for browser extension data ingestion"
```

---

### Task 8: Dashboard + onboarding integration

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Add extension source handling to dashboard**

In `dashboard/page.tsx`, the `isLive` branch already handles non-demo sources. Add extension handling:

After the `isLive` block (around line 74), add an `isExtension` branch that reads profile data from a client-side mechanism (extension stores data in `chrome.storage.local`, DashPersona reads it via a client component).

For MVP: extension data arrives via `?source=extension` → dashboard checks `chrome.storage.local` for `pendingProfile` → passes to engines.

This requires a new client component `ExtensionDataLoader` that:
1. On mount, listens for `window.addEventListener('message', ...)` with origin validation
2. Also checks URL params for `source=extension` and reads from localStorage fallback
3. Passes loaded profile to existing dashboard components

- [ ] **Step 2: Add extension option to onboarding**

Add a third card in the onboarding flow: "Install Extension" with link to sideload instructions.

- [ ] **Step 3: Build + test**

```bash
npm run build && npm run test
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/ src/app/onboarding/
git commit -m "feat(dashboard): extension source handling + onboarding extension option"
```

---

### Task 9: End-to-end verification + deploy

- [ ] **Step 1: Build extension**

```bash
cd extension && npm run build
```

- [ ] **Step 2: Sideload in Chrome**

Open `chrome://extensions` → Developer mode → Load unpacked → select `extension/dist/`

- [ ] **Step 3: Navigate to creator.douyin.com (logged in)**

- [ ] **Step 4: Click extension popup → "全量采集"**

Verify: popup shows progress through 4 steps, then opens DashPersona with real data.

- [ ] **Step 5: Verify DashPersona dashboard**

- Real profile data displays
- Persona consistency score computed from real posts
- Benchmark card shows niche comparison
- History snapshot saved

- [ ] **Step 6: Build + test DashPersona**

```bash
npm run build && npm run test
```

- [ ] **Step 7: Deploy**

```bash
vercel --prod
```

- [ ] **Step 8: Commit + update README roadmap**

Check off "Douyin and Red Note live adapters" and "Browser extension adapter for one-click data capture" in README.md.

```bash
git add .
git commit -m "feat: Data Passport — Chrome extension for real Douyin data collection"
```

---

## Dependency Graph

```
Task 1 (scaffold)
  ↓
Task 2 (types + selectors)
  ↓
Task 3 (profile + posts)  ←── parallel ──→  Task 7 (ExtensionAdapter)
  ↓
Task 4 (data center extractors)
  ↓
Task 5 (content entry + service worker)
  ↓
Task 6 (popup UI)
  ↓
Task 8 (dashboard + onboarding) ← depends on Task 7
  ↓
Task 9 (E2E verify + deploy)
```

Tasks 3-6 (extension) and Task 7 (web app adapter) can run in **parallel**.

## Verification

1. Extension builds: `cd extension && npm run build` succeeds
2. DashPersona tests: `npm run test` — all 143+ tests pass
3. DashPersona build: `npm run build` succeeds
4. Sideload test: Extension popup shows 5 states correctly
5. E2E: Click "全量采集" on creator.douyin.com → data appears in DashPersona dashboard
6. Deploy: `vercel --prod` → 200 OK
