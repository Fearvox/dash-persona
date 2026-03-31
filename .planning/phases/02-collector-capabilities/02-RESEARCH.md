# Phase 02: Collector Capabilities — Research

**Authored:** 2026-03-31
**Status:** Complete
**Feeds into:** 02-PLAN.md

---

## 1. TikTok Collection Architecture

### API Endpoints to Intercept

TikTok's web app makes two XHR calls that contain all structured data we need:

**Profile endpoint** (fires when the profile page loads):
```
https://www.tiktok.com/api/user/detail/?uniqueId=<handle>&...
```

**Post list endpoint** (fires on scroll or page load, paginated):
```
https://www.tiktok.com/api/post/item_list/?count=<n>&cursor=<cursor>&...
```

Both are JSON over HTTPS. Both are triggered by navigating to `https://www.tiktok.com/@<handle>`.

### API Response Shapes

**User detail response** (relevant fields):
```json
{
  "userInfo": {
    "user": {
      "id": "6784563828479518726",
      "uniqueId": "charlidamelio",
      "nickname": "charli d'amelio",
      "avatarLarger": "https://p16-sign.tiktokcdn-us.com/...",
      "signature": "bio text",
      "verified": true,
      "secUid": "MS4wLjABAAAA..."
    },
    "stats": {
      "followingCount": 1234,
      "followerCount": 152800000,
      "heartCount": 11000000000,
      "videoCount": 2437,
      "diggCount": 7890
    }
  },
  "statusCode": 0
}
```

**Post item list response** (relevant fields):
```json
{
  "itemList": [
    {
      "id": "7234567890123456789",
      "desc": "video caption #hashtag",
      "createTime": 1706745600,
      "stats": {
        "diggCount": 4200000,
        "shareCount": 89000,
        "commentCount": 45000,
        "playCount": 89000000,
        "collectCount": 230000
      },
      "textExtra": [
        { "hashtagName": "hashtag", "type": 1 }
      ],
      "video": {
        "duration": 42
      }
    }
  ],
  "cursor": "7234567890123456000",
  "hasMore": true,
  "statusCode": 0
}
```

### Field Mapping to CreatorProfile Schema

| TikTok API field | CreatorProfile field | Notes |
|---|---|---|
| `user.uniqueId` | `profile.uniqueId` | Direct |
| `user.nickname` | `profile.nickname` | Direct |
| `user.avatarLarger` | `profile.avatarUrl` | Direct |
| `stats.followerCount` | `profile.followers` | Direct |
| `stats.heartCount` | `profile.likesTotal` | "Hearts" = likes |
| `stats.videoCount` | `profile.videosCount` | Direct |
| `user.signature` | `profile.bio` | Bio text |
| `item.id` | `post.postId` | Direct |
| `item.desc` | `post.desc` | Direct |
| `item.createTime` | `post.publishedAt` | Unix → ISO string |
| `item.stats.playCount` | `post.views` | Direct |
| `item.stats.diggCount` | `post.likes` | "Digg" = like |
| `item.stats.commentCount` | `post.comments` | Direct |
| `item.stats.shareCount` | `post.shares` | Direct |
| `item.stats.collectCount` | `post.saves` | "Collect" = save |
| `item.textExtra[].hashtagName` | `post.tags` | Filter type === 1 |

Fields not available from network interception (require creator dashboard login or separate API): `completionRate`, `bounceRate`, `avgWatchDuration`. These remain optional in the schema and should be left `undefined` when collecting from a public profile.

### Network Interception Approach

**`page.on('response', handler)` is the correct approach for TikTok**, not `page.route()`. Here is why:

- `page.route()` intercepts before the request fires and requires you to `route.continue()` every request. This adds overhead and can cause timing issues with TikTok's request sequencing.
- `page.on('response', ...)` is a passive observer — it fires after the browser receives the response without modifying the request lifecycle. This is safer for anti-detection and simpler to implement.

```typescript
// Pattern: Intercept user/detail and item_list responses
const collectTikTokProfile = async (
  page: Page,
  handle: string,
  postCount: number,
): Promise<{ userDetail: unknown; posts: unknown[] }> => {
  let userDetailData: unknown = null;
  const collectedPosts: unknown[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/user/detail/') && url.includes(handle)) {
      try {
        userDetailData = await response.json();
      } catch { /* ignore parse errors */ }
    }
    if (url.includes('/api/post/item_list/')) {
      try {
        const body = await response.json();
        if (body?.itemList) {
          collectedPosts.push(...body.itemList);
        }
      } catch { /* ignore parse errors */ }
    }
  });

  await page.goto(`https://www.tiktok.com/@${handle}`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  // Scroll to trigger post list if not already fired
  if (collectedPosts.length === 0) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);
  }

  // Continue scrolling until we have enough posts
  while (collectedPosts.length < postCount) {
    const before = collectedPosts.length;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1500 + Math.random() * 2000); // jitter
    if (collectedPosts.length === before) break; // no new posts loaded
  }

  return { userDetail: userDetailData, posts: collectedPosts.slice(0, postCount) };
};
```

### Pagination Strategy

TikTok paginates post lists via `cursor` field in the response. The web page triggers additional `item_list` requests automatically as the user scrolls. By scrolling the Playwright page down, each subsequent request fires automatically — we intercept all of them. There is no need to construct paginated API calls manually.

**Wait strategy:** After each scroll, wait `networkidle` is too slow on TikTok (they have background tracking pings). Use `waitForTimeout` with jitter instead: 1500ms + random(0–2000ms).

### CAPTCHA and Anti-Bot Patterns

TikTok triggers verification in these situations:
1. Fresh browser profile with no cookies / history
2. Navigation speed that no human could match
3. Automation signals in the browser fingerprint (`navigator.webdriver = true`, CDP presence, `cdc_*` properties)
4. Multiple rapid requests from the same session
5. Navigating directly to API endpoints rather than profile pages

Detection after trigger: TikTok injects a CAPTCHA overlay (slide puzzle or rotation puzzle) at `div[class*="captcha"]` or `#captcha-verify-image`. The page does not navigate — it overlays the existing page.

---

## 2. Anti-Fingerprint Strategy

### What TikTok Fingerprints

Based on reverse engineering of TikTok's web client (`webmssdk.js`):

1. **`navigator.webdriver`** — set to `true` by Playwright by default. Must be overridden to `undefined`.
2. **`cdc_*` properties** — Playwright/ChromeDriver inject properties on `window` and `document` with a `cdc_` prefix. Must be deleted via `page.addInitScript`.
3. **Chrome automation flag** — `--disable-blink-features=AutomationControlled` Chrome arg prevents the `navigator.webdriver` flag from being set.
4. **User-Agent string** — Playwright's default UA includes the Chromium version but not the full Chrome release string. TikTok compares this against its own internal UA database.
5. **`navigator.plugins`** — An empty plugins array signals a headless/automated browser.
6. **Canvas fingerprint** — `HTMLCanvasElement.toDataURL()` is used to fingerprint GPU. Consistent across real browsers, distinct for automated ones.
7. **WebGL vendor/renderer** — `WEBGL_debug_renderer_info` exposes GPU info. Automated browsers often report software renderers.
8. **Screen dimensions** — `window.outerWidth/Height` differs from `window.innerWidth/Height` in headless mode.
9. **Timing** — Zero or near-zero delays between page load and first interaction.
10. **Chrome runtime** — `window.chrome` object must be present and partially populated.

### Chromium Launch Args for Anti-Detection

```typescript
const STEALTH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',        // only if headless; remove for visible mode
  '--lang=zh-CN,zh',      // TikTok (Chinese) expects Chinese locale in some regions
];
```

For the visible (non-headless) browser we already use in this project: remove `--disable-gpu`. The browser runs headed (headless: false) which already passes most visual fingerprinting checks.

### `addInitScript` Patches

These run before any page script executes:

```typescript
await context.addInitScript(() => {
  // 1. Delete cdc_ properties injected by CDP/Playwright
  const deleteProps = (obj: object) => {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('cdc_')) {
        delete (obj as Record<string, unknown>)[key];
      }
    }
  };
  deleteProps(window);
  deleteProps(document);

  // 2. Override navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true,
  });

  // 3. Restore navigator.plugins (TikTok checks for empty array)
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5], // non-empty, length is what matters
    configurable: true,
  });

  // 4. Restore navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en'],
    configurable: true,
  });

  // 5. Add chrome runtime stub
  if (!(window as unknown as { chrome: unknown }).chrome) {
    (window as unknown as { chrome: { runtime: Record<string, unknown> } }).chrome = {
      runtime: {},
    };
  }
});
```

### playwright-extra and Stealth Plugin

**Assessment: playwright-extra + puppeteer-extra-plugin-stealth works with Playwright's Chromium, but there is a critical integration issue with Electron.**

The `playwright-extra` package wraps Playwright's `chromium` export to add plugin support. It works at the `chromium.launch()` and `chromium.launchPersistentContext()` level.

**Installation:**
```
npm install playwright-extra puppeteer-extra-plugin-stealth
```

**Usage pattern:**
```typescript
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

// Then use chromium.launchPersistentContext() as before
this.context = await chromium.launchPersistentContext(profileDir, { ... });
```

**Electron-specific concern:** The collector uses `playwright` (not `playwright-core`) as the bundled binary. `playwright-extra` wraps the standard playwright `chromium` export and should work with this setup. The stealth plugin performs 11 evasion techniques automatically including WebGL spoofing, canvas noise, and navigator.plugins restoration.

**Alternative: rebrowser-playwright** — This is a fork of Playwright that patches the CDP protocol itself to avoid bot detection. It is more thorough but also more disruptive to maintain. Given that we already have a persistent context with real user cookies (users log in manually), the standard `playwright-extra + stealth` approach is sufficient. Save rebrowser-playwright for if stealth proves insufficient in production.

**Recommendation:** Use `playwright-extra` + `puppeteer-extra-plugin-stealth` as a drop-in enhancement to the existing `BrowserManager.init()`. Keep the manual `addInitScript` patches as belt-and-suspenders for `cdc_*` cleanup.

### Navigation Jitter Implementation

```typescript
const jitter = (min = 1500, max = 3500): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, min + Math.random() * (max - min))
  );

// Usage in collection flow:
await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
await jitter(1500, 3500); // D-02: 1.5–3.5s per decision
await page.evaluate(() => window.scrollBy(0, 300)); // small scroll to trigger content
await jitter(1500, 3500);
```

### Electron User-Agent Consideration

Electron's bundled Chromium does not include a standard Chrome UA string by default. Check the UA at startup and patch if needed:

```typescript
// In BrowserManager.init(), after context is created:
const ua = await this.context.pages()[0]?.evaluate(() => navigator.userAgent) ?? '';
if (ua.includes('Electron')) {
  // Patch to a standard Chrome UA
  await this.context.setExtraHTTPHeaders({
    'User-Agent': ua.replace(/Electron\/[\d.]+ /, ''),
  });
}
```

---

## 3. Scheduler Design

### node-cron vs Custom setInterval

| | `node-cron` | `node-schedule` | Custom `setInterval` |
|---|---|---|---|
| Cron expression support | Yes | Yes | No |
| Named presets (every 6h, daily) | Via cron strings | Via recurrence rules | Native |
| Missed run detection | No | No | Manual |
| App Nap aware | No | No | Manual |
| Bundle size | ~8KB | ~50KB | 0 |
| Complexity | Low | Medium | Medium |
| TypeScript types | `@types/node-cron` | Built-in | Built-in |

**Decision: Use `node-cron`** (D-05 says "preset intervals only, no raw cron"). Despite the user seeing only preset labels, internally cron strings map cleanly to these intervals:

```typescript
const INTERVAL_CRON: Record<string, string> = {
  'every-6h':  '0 */6 * * *',
  'every-12h': '0 */12 * * *',
  'daily':     '0 9 * * *',   // 9am daily
  'weekly':    '0 9 * * 1',   // Monday 9am
};
```

`node-cron` is well-maintained (npm: 3M+ weekly downloads), has TypeScript support, and works in Node/Electron without issues. Its cron tasks are in-memory — persistence of "when job last ran" is handled separately via `jobs.json` (D-08).

**Installation:** `npm install node-cron` + `npm install -D @types/node-cron`

### macOS App Nap Handling (COLL-05)

Electron exposes `powerMonitor` from the main process. The relevant events:

```typescript
import { powerMonitor } from 'electron';

// In main.ts, after scheduler is initialized:
powerMonitor.on('resume', () => {
  scheduler.checkMissedRuns();
});
powerMonitor.on('unlock-screen', () => {
  scheduler.checkMissedRuns();
});
// macOS-specific: fires when user becomes active after system sleep
powerMonitor.on('user-did-become-active', () => {
  scheduler.checkMissedRuns();
});
```

Note: `user-did-become-active` is macOS-only (undocumented in older Electron docs but available in Electron 27+). Use a feature check:
```typescript
if (process.platform === 'darwin' && 'user-did-become-active' in powerMonitor) {
  powerMonitor.on('user-did-become-active' as Parameters<typeof powerMonitor.on>[0], () => {
    scheduler.checkMissedRuns();
  });
}
```

### Missed Run Detection Logic

Per D-06: show user a choice (run now / wait for next / custom delay) rather than silently running.

```typescript
interface ScheduledJob {
  id: string;
  creatorUniqueId: string;
  platform: 'tiktok' | 'douyin' | 'xhs';
  interval: 'every-6h' | 'every-12h' | 'daily' | 'weekly';
  postCount: number;          // D-04: configurable per job
  enabled: boolean;
  lastRunAt: string | null;   // ISO timestamp
  nextRunAt: string;          // ISO timestamp, computed on each run
  createdAt: string;
}

function checkMissedRuns(jobs: ScheduledJob[]): ScheduledJob[] {
  const now = Date.now();
  return jobs.filter((job) => {
    if (!job.enabled) return false;
    if (!job.lastRunAt) return false;       // never run — not "missed"
    const next = new Date(job.nextRunAt).getTime();
    return next < now - 60_000;             // 1 min grace period
  });
}
```

Missed jobs are surfaced via `Notification` API (see Section 6). The notification action buttons map to: "Run now", "Wait for next", "Remind me later" (custom delay). These are handled via `Notification.on('action', handler)` which is available in macOS notifications.

### Jobs Persistence

Jobs are stored separately from `config.json` at `~/.dashpersona/jobs.json` (per D-08, COLL-04). This keeps config.json for settings and jobs.json for job definitions — easier to reset one without the other.

```typescript
// Load on startup, save on any mutation
const loadJobs = async (): Promise<ScheduledJob[]> => {
  try {
    const raw = await readFile(join(getDashPersonaDir(), 'jobs.json'), 'utf-8');
    return JSON.parse(raw) as ScheduledJob[];
  } catch {
    return []; // file doesn't exist yet
  }
};

const saveJobs = async (jobs: ScheduledJob[]): Promise<void> => {
  await atomicWriteJSON(join(getDashPersonaDir(), 'jobs.json'), jobs);
};
```

---

## 4. Batch Queue System

### State Machine

```
           ┌─────────┐
    add ──►│  queued  │
           └────┬─────┘
                │ dequeue (only when no other job is running)
           ┌────▼─────┐
           │ running  │
           └────┬─────┘
       ┌────────┼────────┐
       │        │        │
  ┌────▼───┐ ┌──▼──┐ ┌───▼────┐
  │  done  │ │failed│ │captcha │
  └────────┘ └──────┘ └───▼────┘
                          │ user solves + page navigates
                       resume → running again
```

**State type:**
```typescript
type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'captcha' | 'skipped';

interface BatchJobItem {
  id: string;
  creatorUniqueId: string;
  platform: 'tiktok' | 'douyin' | 'xhs';
  postCount: number;
  status: JobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: { code: string; message: string; remediation: string } | null;
}
```

### Sequential Queue Implementation

Per D-07: one creator at a time, single Playwright context. A simple array-backed queue with a running flag:

```typescript
class BatchQueue {
  private queue: BatchJobItem[] = [];
  private running = false;
  private onUpdate: (items: BatchJobItem[]) => void;

  enqueue(items: BatchJobItem[]): void {
    this.queue.push(...items);
    this.onUpdate([...this.queue]);
    if (!this.running) void this.drain();
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.queue.some((j) => j.status === 'queued')) {
      const job = this.queue.find((j) => j.status === 'queued');
      if (!job) break;
      await this.runJob(job);
    }
    this.running = false;
  }

  private async runJob(job: BatchJobItem): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.onUpdate([...this.queue]);

    try {
      const profile = await collectTikTok(job.creatorUniqueId, job.postCount);
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
      job.durationMs = Date.now() - new Date(job.startedAt).getTime();
      await saveSnapshot(profile);
      await appendRunLog({ ...job, status: 'success' });
    } catch (err) {
      if (isCaptchaError(err)) {
        job.status = 'captcha';
        await handleCaptcha(job); // surfaces browser, waits for resume
        // After resume, re-attempt once or mark failed
      } else {
        job.status = 'failed';
        job.error = classifyCollectionError(err);
        job.finishedAt = new Date().toISOString();
        await appendRunLog({ ...job, status: 'failed' });
      }
    }
    this.onUpdate([...this.queue]);
  }
}
```

### IPC Communication: Main → Renderer (D-10 Primary)

The batch progress BrowserWindow (D-09) receives updates via Electron IPC. The renderer registers a listener via `ipcRenderer.on`, exposed through the preload script.

**Channel naming convention** (follows existing patterns, uses namespace prefix):
```
collector:batch:update      — main → renderer, sends BatchJobItem[]
collector:batch:cancel      — renderer → main, cancels a queued job
collector:batch:start       — renderer → main, starts a new batch
collector:captcha:detected  — main → renderer, highlights captcha row
collector:captcha:resolved  — main → renderer, resumes after captcha
```

**Preload extension** (`collector/src/preload.ts`):
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('collector', {
  versions: { /* existing */ },
  batch: {
    onUpdate: (cb: (items: BatchJobItem[]) => void) =>
      ipcRenderer.on('collector:batch:update', (_event, items) => cb(items)),
    cancelJob: (id: string) =>
      ipcRenderer.send('collector:batch:cancel', id),
    start: (jobs: Omit<BatchJobItem, 'status' | 'startedAt' | 'finishedAt' | 'durationMs' | 'error'>[]) =>
      ipcRenderer.send('collector:batch:start', jobs),
  },
});
```

**Main process sends updates:**
```typescript
// In BatchQueue.onUpdate callback registered in main.ts:
progressWindow.webContents.send('collector:batch:update', items);
```

### SSE Endpoint: Express → Web App (D-10 Secondary)

The SSE endpoint allows the Phase 3 web app (Next.js) to subscribe to collection status updates.

```typescript
// In server.ts, add to createServer():

// Track active SSE clients
const sseClients = new Set<Response>();

app.get('/events', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.flushHeaders();

  // Send initial heartbeat
  res.write('event: connected\ndata: {}\n\n');

  sseClients.add(res);
  _req.on('close', () => sseClients.delete(res));
});

// Exported function for BatchQueue to call:
export function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}
```

**SSE event types:**
```
batch:update    — full BatchJobItem[] array snapshot
batch:complete  — entire batch finished
captcha         — { creatorUniqueId, message }
```

### BrowserWindow for Progress UI (D-09)

```typescript
// In main.ts, create progress window on batch start:
let progressWindow: BrowserWindow | null = null;

function openProgressWindow(): BrowserWindow {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.focus();
    return progressWindow;
  }

  progressWindow = new BrowserWindow({
    width: 680,
    height: 520,
    minWidth: 580,
    minHeight: 400,
    resizable: true,
    title: 'DASH Collector — Batch Progress',
    backgroundColor: '#0a0f0d',
    titleBarStyle: 'hiddenInset', // macOS native title bar integration
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  progressWindow.loadFile(path.join(__dirname, '../ui/progress.html'));

  progressWindow.on('closed', () => {
    progressWindow = null;
  });

  return progressWindow;
}
```

The progress window HTML lives at `collector/ui/progress.html` (plain HTML, no build step per UI-SPEC). This directory is not TypeScript-compiled — it is copied directly to `dist/ui/` via `electron-builder` files config.

---

## 5. Run Log and History

### Append-Only Log Pattern

The run log (`~/.dashpersona/run-log.json`) is an array of log entries. Unlike snapshot files (write-once), this file grows over time. `atomicWriteJSON` rewrites the whole file, which is fine for small arrays but needs care at scale.

**For Phase 2, full rewrite is acceptable** — up to 1000 entries × ~300 bytes = ~300KB. Full atomic rewrite stays under 1MB. Re-evaluate for Phase 4+ if retention grows to 10K+ entries.

**Run log entry schema** (per D-12):
```typescript
interface RunLogEntry {
  id: string;              // UUID, for deduplication
  timestamp: string;       // ISO8601, when the run completed
  creatorUniqueId: string;
  platform: Platform;
  status: 'success' | 'failed' | 'captcha' | 'skipped';
  durationMs: number;
  snapshotFile?: string;   // filename written, only on success
  error?: {
    code: string;
    message: string;
    remediation: string;
  };
}
```

**Append function** (load → append → atomic write):
```typescript
export async function appendRunLog(entry: RunLogEntry): Promise<void> {
  const logPath = join(getDashPersonaDir(), 'run-log.json');
  let entries: RunLogEntry[] = [];

  try {
    const raw = await readFile(logPath, 'utf-8');
    entries = JSON.parse(raw) as RunLogEntry[];
  } catch {
    // File doesn't exist yet — start fresh
  }

  entries.push(entry);
  await atomicWriteJSON(logPath, entries);
}
```

### Retention Policy (D-13)

Three modes from config, with confirmation before pruning (D-13):

```typescript
type RetentionPolicy =
  | { mode: 'count'; maxEntries: number }   // e.g. 100, 500, 1000
  | { mode: 'days';  maxDays: number }      // e.g. 30, 90, 180
  | { mode: 'all' };                        // keep everything

const DEFAULT_RETENTION: RetentionPolicy = { mode: 'count', maxEntries: 500 };

function applyRetention(
  entries: RunLogEntry[],
  policy: RetentionPolicy,
): { kept: RunLogEntry[]; removed: RunLogEntry[] } {
  if (policy.mode === 'all') return { kept: entries, removed: [] };

  if (policy.mode === 'count') {
    if (entries.length <= policy.maxEntries) return { kept: entries, removed: [] };
    const kept = entries.slice(-policy.maxEntries);      // keep newest
    const removed = entries.slice(0, entries.length - policy.maxEntries);
    return { kept, removed };
  }

  const cutoff = Date.now() - policy.maxDays * 86_400_000;
  const kept = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  const removed = entries.filter((e) => new Date(e.timestamp).getTime() < cutoff);
  return { kept, removed };
}
```

The confirmation step surfaces `removed.length` to the user before calling `atomicWriteJSON` with `kept`. Confirmation is done via Electron `dialog.showMessageBox()`.

### `/api/run-log` Web App Route (D-14)

Add to the Next.js app (same pattern as `/api/profiles`):

```typescript
// src/app/api/run-log/route.ts
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export async function GET() {
  const logPath = join(homedir(), '.dashpersona', 'run-log.json');
  try {
    const raw = await readFile(logPath, 'utf-8');
    const entries = JSON.parse(raw);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
```

---

## 6. CAPTCHA Handling

### Detection Patterns

TikTok presents three CAPTCHA types. All are detectable by DOM selectors:

```typescript
const CAPTCHA_SELECTORS = [
  '#captcha-verify-image',           // image-based slide CAPTCHA
  'div[class*="captcha_verify"]',    // class-based wrapper
  'div[class*="secsdk-captcha"]',    // newer SecSDK CAPTCHA
  'iframe[src*="captcha"]',          // iframe-embedded CAPTCHA
];

async function detectCaptcha(page: Page): Promise<boolean> {
  for (const selector of CAPTCHA_SELECTORS) {
    const el = await page.$(selector);
    if (el) return true;
  }
  return false;
}
```

Also listen for navigation events that suggest a redirect to a verification page:
```typescript
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) {
    const url = frame.url();
    if (url.includes('/login') || url.includes('/verify') || url.includes('captcha')) {
      // Flag as CAPTCHA / auth required
    }
  }
});
```

### Surfacing the Browser Window on macOS

When a CAPTCHA is detected, bring the Playwright-managed Chromium window to the foreground. This window is not an Electron `BrowserWindow` — it is the Playwright browser. The approach:

1. The Playwright browser is launched with `headless: false`, so it already has a native window.
2. On macOS, use `app.focus()` to bring the app to foreground, then `page.bringToFront()` to focus the specific Playwright tab.

```typescript
async function surfaceCaptchaWindow(page: Page): Promise<void> {
  // 1. Focus the Electron app (makes the process active)
  app.focus({ steal: true });

  // 2. Bring the specific Playwright page to front
  await page.bringToFront();

  // 3. Send native notification to alert user
  const notification = new Notification({
    title: 'DASH Collector — Action Required',
    body: 'TikTok is showing a verification. Please solve it in the browser window.',
    silent: false,
  });
  notification.show();
}
```

**Electron `Notification` API** (available in main process without `shell`):
```typescript
import { Notification } from 'electron';

// macOS: supports action buttons via 'actions' field
const notification = new Notification({
  title: 'Missed Collection Run',
  body: 'The scheduled run for @creator was missed. What would you like to do?',
  actions: [
    { type: 'button', text: 'Run Now' },
    { type: 'button', text: 'Skip' },
  ],
  closeButtonText: 'Wait for Next',
});

notification.on('action', (_event, index) => {
  if (index === 0) scheduler.runNow(jobId);
  if (index === 1) scheduler.skipNext(jobId);
});
notification.on('close', () => {
  // "Wait for Next" — no action needed
});

notification.show();
```

Note: macOS notification actions (`actions` field) require the app to be signed or have `NSUserNotificationAlertStyle = alert` in Info.plist. For unsigned development builds, fall back to `dialog.showMessageBox()` as the confirmation mechanism for the 3-choice missed-run prompt.

### Auto-Resume After CAPTCHA

After surfacing the browser, wait for the CAPTCHA to be resolved. The CAPTCHA is gone when its DOM elements are removed or when the page navigates past the verification:

```typescript
async function waitForCaptchaResolution(page: Page, timeoutMs = 300_000): Promise<void> {
  // Wait until none of the CAPTCHA selectors are visible
  await page.waitForFunction(
    (selectors: string[]) => !selectors.some((s) => document.querySelector(s)),
    CAPTCHA_SELECTORS,
    { timeout: timeoutMs, polling: 1000 },
  );
}
```

5-minute timeout (300s) is sufficient — if user hasn't solved in 5 minutes, mark as `failed` with code `CAPTCHA_TIMEOUT`.

Per D-03: in batch mode, the current creator pauses but remaining creators in the queue cannot proceed since we use a single Playwright context and a single page. The queue itself pauses at the CAPTCHA step — once resolved, the current creator continues and then the queue drains normally.

---

## 7. Integration Map

### Files to Modify

| File | What Changes |
|---|---|
| `collector/src/browser.ts` | Add `collectTikTok(handle, postCount)` method, stealth args, `addInitScript` patches |
| `collector/src/server.ts` | Add `GET /events` SSE endpoint, `broadcastSSE()` export, `GET /run-log` proxy |
| `collector/src/config.ts` | Replace `scheduler.jobs: unknown[]` with `ScheduledJob[]`, add `retentionPolicy` to preferences |
| `collector/src/tray.ts` | Add `collecting` status (orange), extend `STATUS_COLORS`, update `buildMenu()` with batch progress item |
| `collector/src/preload.ts` | Add `batch.*` IPC channels, `scheduler.*` channels |
| `collector/src/main.ts` | Initialize scheduler after config, register `powerMonitor` listeners, create progress window on batch start |
| `collector/src/storage.ts` | Add `appendRunLog()` export |

### New Files to Create

| File | What It Is |
|---|---|
| `collector/src/tiktok-collector.ts` | TikTok collection logic: navigate, intercept, parse, map to CreatorProfile |
| `collector/src/scheduler.ts` | Scheduler class wrapping node-cron, job management, missed-run detection |
| `collector/src/batch-queue.ts` | BatchQueue class, state machine, IPC/SSE broadcast |
| `collector/src/run-log.ts` | `appendRunLog`, `loadRunLog`, `applyRetention` |
| `collector/src/jobs-store.ts` | `loadJobs`, `saveJobs`, job CRUD operations |
| `collector/ui/progress.html` | Batch progress BrowserWindow HTML (plain HTML/CSS/JS, not compiled) |
| `collector/ui/progress.css` | Styles for progress window (uses CSS vars from UI-SPEC) |
| `collector/ui/progress.js` | Vanilla JS for progress window IPC listener and DOM updates |
| `src/app/api/run-log/route.ts` | Next.js route handler exposing `~/.dashpersona/run-log.json` to web app |

### Config Schema Extension

```typescript
// collector/src/config.ts — extend CollectorConfig:
export interface CollectorConfig {
  schemaVersion: string;
  dataDir: string;
  preferences: {
    openAtLogin: boolean;
    retentionPolicy: RetentionPolicy;    // NEW Phase 2
  };
  scheduler: {
    enabled: boolean;
    defaultInterval: IntervalLabel;      // typed instead of string
    jobs: ScheduledJob[];                // typed instead of unknown[]
  };
}

type IntervalLabel = 'every-6h' | 'every-12h' | 'daily' | 'weekly';
```

### TrayManager Extension

Add a `collecting` status (active collection in progress):

```typescript
// tray.ts — new status color:
const STATUS_COLORS = {
  active: '#7ed29a',      // green — logged in, ready (existing)
  standby: '#d2c87e',     // yellow — running, not logged in (existing)
  error: '#c87e7e',       // red — crash or failure (existing)
  collecting: '#7eb8d2',  // blue — collection in progress (NEW)
};

// BrowserStatus type extension:
export type BrowserStatus = 'active' | 'standby' | 'error' | 'collecting';
```

Add tray menu item for batch progress:
```typescript
// In buildMenu(), add before separator before Quit:
{
  label: this.batchRunning ? 'Show Collection Progress…' : 'Start Collection…',
  click: () => {
    if (this.batchRunning) {
      openProgressWindow();
    } else {
      openSchedulerWindow(); // Phase 2 stretch or simplified start dialog
    }
  },
},
```

---

## 8. Dependencies

### New npm Packages

| Package | Version | Purpose | Install Location |
|---|---|---|---|
| `playwright-extra` | `^4.3.6` | Playwright wrapper with plugin support | `collector/` (dependencies) |
| `puppeteer-extra-plugin-stealth` | `^2.11.2` | 11-technique stealth evasion | `collector/` (dependencies) |
| `node-cron` | `^3.0.3` | Cron expression scheduler | `collector/` (dependencies) |
| `@types/node-cron` | `^3.0.11` | TypeScript types for node-cron | `collector/` (devDependencies) |

**No new dependencies for the web app** — the `GET /api/run-log` route uses only `fs/promises` and `os` from Node.js stdlib.

### Version Notes

- `playwright-extra` 4.3.6 is the latest stable as of early 2026. It wraps `playwright` 1.x without version locking — install `playwright-extra` as a companion to the existing `playwright@^1.52.0`.
- `puppeteer-extra-plugin-stealth` 2.11.2 was designed for puppeteer but works with playwright-extra's compatibility layer. The stealth patches it applies are browser-level, not puppeteer-specific.
- `node-cron` 3.x has a clean API and full TypeScript support. v3 requires Node 12+ (fine, we use Node 25).

### Install Commands

```bash
cd collector
npm install playwright-extra puppeteer-extra-plugin-stealth node-cron
npm install -D @types/node-cron
```

### electron-builder Config Update

Add `collector/ui/` to bundled files:
```json
{
  "files": [
    "dist/**/*",
    "ui/**/*",
    "package.json"
  ]
}
```

---

## 9. Risk Register

### R-01: TikTok API Response Shape Changes
**Risk:** TikTok changes field names in `/api/user/detail/` or `/api/post/item_list/` without notice. Collection silently returns incomplete profiles.
**Probability:** Medium (TikTok has changed APIs before)
**Mitigation:** Validate extracted profile against `validateCreatorSnapshot()` before writing. If validation fails, log with `TIKTOK_SCHEMA_MISMATCH` error code and include raw response excerpt in error details. This surfaces the breakage immediately rather than writing bad data.

### R-02: playwright-extra Compatibility with Electron 33
**Risk:** `playwright-extra` wraps `playwright`'s `chromium` export — it may not wrap `launchPersistentContext()` or may have version incompatibilities with the specific Playwright version bundled with Electron 33.
**Probability:** Low (playwright-extra 4.x supports playwright 1.x broadly)
**Mitigation:** At startup, log the stealth plugin version and whether it attached successfully. If playwright-extra fails to wrap the context, fall back to manual `addInitScript` patches (which cover the critical `webdriver` and `cdc_*` detections). The manual patches alone provide ~70% of stealth coverage.

### R-03: macOS Notification Actions Not Available in Unsigned Builds
**Risk:** Electron notification `actions` (buttons) require a signed app or specific entitlements on macOS. Development builds may not show action buttons, breaking the 3-choice missed-run prompt (D-06).
**Probability:** High for development, Low for production
**Mitigation:** Detect whether actions are supported at runtime. If `Notification` is available but action buttons don't appear (no `action` event fires within 30s of show), fall back to `dialog.showMessageBox()` which always works in development.

### R-04: Single Playwright Context Blocking on CAPTCHA
**Risk:** Per D-03 and D-07, a CAPTCHA pauses the entire queue since there is only one context. If the user is away and a CAPTCHA appears, the entire batch stalls indefinitely.
**Probability:** Medium (TikTok shows CAPTCHAs fairly often for new accounts)
**Mitigation:** Implement `CAPTCHA_TIMEOUT` (5 minutes, see Section 6). After timeout, mark current creator as `failed/captcha`, skip to next creator in queue. Log `CAPTCHA_TIMEOUT` with remediation: "Open the TikTok profile manually in the Collector browser to clear the verification." Also set tray icon to `error` state during CAPTCHA pause so user is visually alerted even without notification.

### R-05: Run Log Grows Unbounded if Retention Not Applied
**Risk:** If the retention policy is `all` (user's choice) and they run large batches daily, `run-log.json` could grow to 10MB+ over months, causing slow reads and atomic rewrites.
**Probability:** Low (default is `count: 500`, only "all" mode has unbounded growth)
**Mitigation:** In `appendRunLog`, after each write, check if file size exceeds 5MB. If so, warn user via tray notification even if their policy is `all`. Do not auto-prune — respect the user's explicit choice.

### R-06: IPC BrowserWindow Not Found on Batch Update
**Risk:** `progressWindow.webContents.send(...)` crashes if `progressWindow` is null or destroyed between creation and the batch completing.
**Probability:** Medium (user can close the progress window while batch runs)
**Mitigation:** Always guard: `if (progressWindow && !progressWindow.isDestroyed())`. The batch continues running even if the progress window is closed — it just doesn't update the UI. The tray icon still reflects `collecting` state.

### R-07: node-cron Fires During App Sleep (App Nap)
**Risk:** macOS App Nap throttles timer resolution for background processes, potentially causing `node-cron` to fire late or not at all.
**Probability:** Medium (Electron apps can be napped if they have no visible windows)
**Mitigation:** This is exactly what the `powerMonitor` missed-run detection handles (Section 3). node-cron fires normally when the system is awake — App Nap does not permanently suppress timers, it just delays them. Combined with the resume/unlock-screen handlers, missed runs are detected and surfaced to the user within seconds of wake.

### R-08: TikTok Login Session Expiry
**Risk:** The persistent Chromium profile stores TikTok session cookies, but these expire (typically 30–90 days). Scheduled collection fails silently if the session has expired.
**Probability:** Medium (scheduled collection is designed for weeks/months of use)
**Mitigation:** In `tiktok-collector.ts`, after navigating to the profile, check if the response from `/api/user/detail/` returns `statusCode: -1` or if the page redirects to `/login`. If session expired, fail with error code `TIKTOK_SESSION_EXPIRED` and remediation: "Re-login to TikTok via the Collector browser window." Surface as tray notification.

---

## Summary: Key Architectural Decisions Confirmed

1. **Network interception** via `page.on('response')` — passive, no routing overhead, lower detection risk than `page.route()`
2. **playwright-extra + stealth** wrapping existing `BrowserManager.init()` — minimal disruption, high coverage
3. **node-cron** for scheduler — clean, minimal, TypeScript-typed, sufficient for preset intervals
4. **Plain array with running flag** for queue — simpler than a full queue library, easier to debug, satisfies sequential D-07
5. **IPC as primary, SSE as secondary** per D-10 — IPC is synchronous and reliable for in-app UI; SSE allows future web app consumption
6. **Atomic full-rewrite** for run-log — safe up to ~1000 entries, revisit if scale demands append-only
7. **Dialog fallback** for notification actions — gracefully degrades in unsigned development builds
8. **`ui/` directory** for plain HTML progress window — no build step, fast iteration, consistent with UI-SPEC requirement of vanilla DOM

---

## RESEARCH COMPLETE

*Phase 02 research complete. Ready for planning document (02-PLAN.md).*
*All code patterns above are actionable and specific to the existing codebase.*
*Downstream planner should cross-reference `02-CONTEXT.md` decisions D-01 through D-14 for any divergences.*
