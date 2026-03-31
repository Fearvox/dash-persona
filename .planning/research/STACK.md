# Technology Research — New Feature Stack

Researched: 2026-03-31
Codebase baseline: Next.js 16.2.1 + React 19.2.4 + Tailwind CSS 4, Electron 33 + Playwright 1.52.0

---

## 1. Client-Side PDF Generation

### Requirement
Professional multi-page reports with charts, matching the DashPersona dark-mode design system. Must work entirely in the browser — no server-side rendering service.

### Decision: `@react-pdf/renderer` + `jsPDF` hybrid

Use `@react-pdf/renderer` as the primary PDF engine, with `jsPDF` + `html2canvas-pro` as a fallback path for chart rasterization.

---

### Option A — `@react-pdf/renderer` (recommended primary)

**Package**: `@react-pdf/renderer`
**Version**: `^4.3.2`
**React 19 support**: Yes, since v4.1.0
**npm**: ~1.5M weekly downloads

**Why**:
- Declarative React component model — PDF layout is just JSX. No html→canvas→image pipeline.
- Vector text (not rasterized), proper font embedding with Geist Mono/Sans subsets.
- Native support for multi-page layout, flexbox, custom color values — maps cleanly to DashPersona's design tokens.
- Does not depend on the DOM; runs entirely in the browser via a bundled PDF renderer.
- `PDFDownloadLink` gives a zero-server download button; `PDFViewer` gives an inline preview — both fit the local-first model.
- `BlobProvider` enables programmatic blob generation for offline workflows.

**Chart integration**:
react-pdf does NOT support recharts directly (recharts v3 broke react-pdf-charts compatibility). The correct pattern is to render each Recharts component to SVG in a hidden off-screen `<div>`, convert to PNG with the existing `html2canvas-pro`, then embed as an `<Image>` in the PDF document. Set `isAnimationActive={false}` on all Recharts components before capture to prevent blank renders.

```
Recharts component (hidden, no animation)
  → html2canvas-pro → PNG blob URL
  → @react-pdf/renderer <Image src={pngUrl} />
```

**Limitations**:
- No support for `@tailwind` classes inside PDF components; styles are an inline object API similar to React Native StyleSheet.
- Fonts must be registered explicitly via `Font.register()` with a URL or buffer — bundle Geist woff2 locally.
- First render is slow (~200–400ms) due to font loading; show a spinner.

**Install**: `npm install @react-pdf/renderer`

---

### Option B — `jsPDF` + `html2canvas-pro` (already in project)

**Package**: `jspdf`
**Version**: `^4.2.1`
**html2canvas-pro**: already in `dependencies` at `^2.0.2`

**Why it works but is second choice**:
- `html2canvas-pro` is already installed and proven in the codebase.
- The `jsPDF` approach rasterizes the entire dashboard DOM → single PNG per page → embeds in PDF. Simple to implement, handles complex CSS including Tailwind and CSS variables.
- However: rasterization at screen DPI produces blurry print output unless `devicePixelRatio` is forced to 3+, which triples capture time (~2–4s per page on M1).
- Text is not selectable/searchable in the output PDF.
- Page-break logic requires manual pixel measurement.
- `jsPDF` v4 has a breaking change: the `autoPaging` API moved to `html()` method under `options.autoPaging`.

**When to use**: Keep as the chart-capture utility for feeding PNGs to `@react-pdf/renderer`. Do NOT use jsPDF as the primary PDF layout engine for DashPersona reports.

---

### What NOT to use

| Library | Reason |
|---------|--------|
| `pdfmake` | JSON/vfs font system is cumbersome; no React component model; font registration significantly more complex than react-pdf |
| `react-to-pdf` | Thin wrapper over html2canvas+jsPDF; same limitations as Option B with less control |
| `puppeteer`/server-side PDF | Violates the client-side constraint; requires a server process |
| `react-pdf-charts` | Abandoned for recharts v3+; last release predates recharts 3 |
| `@pdfme/generator` | Good template engine but optimized for form-like templates, not data-dense analytical reports |

---

### Summary

| | `@react-pdf/renderer` | `jsPDF` + `html2canvas-pro` |
|--|--|--|
| Vector text | Yes | No (rasterized) |
| Chart support | Indirect (PNG embed) | Native (DOM capture) |
| Design token fidelity | Medium (manual port) | High (captures real CSS) |
| File size | Small | Large (PNG images) |
| Multi-page | Declarative | Manual pixel math |
| Confidence | **High** | Medium |

**Recommendation**: `@react-pdf/renderer ^4.3.2` for layout/typography, `html2canvas-pro` (existing) for chart rasterization.

---

## 2. Local JSON File-Based Data Persistence

### Requirement
Store historical collection snapshots for timeline tracking. No database. No cloud. Data stays on the user's machine. Write path is the Electron Collector app; read path is both Collector and the Next.js web app (via the Collector's Express API on :3458).

### Decision: Native `fs/promises` + `app.getPath('userData')` + atomic-write pattern

No third-party library needed. The Collector already uses Node.js directly; adding a library would be unnecessary overhead.

---

### Pattern

```
collector/src/storage.ts
  — getStorageDir()  → app.getPath('userData') + '/data/'
  — readSnapshot(creatorId, date)
  — writeSnapshot(creatorId, profile)   // atomic: write to .tmp, rename
  — listSnapshots(creatorId)            // returns sorted date list
  — readLatest(creatorId)
```

**File layout**:
```
~/Library/Application Support/@dash/collector/data/
  douyin/
    <uniqueId>/
      2026-03-31T12:00:00Z.json
      2026-04-01T09:00:00Z.json
  tiktok/
    <uniqueId>/
      ...
  xhs/
    <uniqueId>/
      ...
  index.json          ← manifest: { platform, uniqueId, latest, count }
```

**Atomic write**: Write to `<file>.tmp` then `fs.rename()` (atomic on POSIX). This prevents corruption if the Electron process is killed mid-write.

**Schema**: Each snapshot file is a `CreatorProfile` object (existing `CreatorDataSchema`) plus a `collectedAt` ISO timestamp at the top level.

---

### Optional helper: `electron-store` for settings/config only

**Package**: `electron-store`
**Version**: `^10.0.0`
**npm**: ~500K weekly downloads

Use `electron-store` only for small key-value config (API interval, enabled platforms, window bounds). It has built-in atomic writes and schema validation via `ajv`. Do NOT use it for historical snapshots — it reads/writes the entire file on every operation, which degrades with datasets over ~200KB.

**Install (Collector only)**: `npm install electron-store` inside `collector/`

---

### What NOT to use

| Library | Reason |
|---------|--------|
| SQLite / `better-sqlite3` | Overkill; binary dependency; Electron rebuild required; contradicts "zero-dependency local JSON" requirement |
| `nedb` / `@seald-io/nedb` | Abandoned or maintenance-mode; adds MongoDB-like query overhead for simple append+read |
| `lowdb` | ESM-only (v7+); requires `"type": "module"` in collector — conflicts with Electron CJS expectations |
| `electron-json-storage` | Older API, no atomic writes by default, effectively abandoned |
| IndexedDB | Browser-side only; not available in Electron main process |

---

### Read API from Next.js web app

The web app reads historical data via the Collector's Express API (:3458). Add two endpoints:

```
GET /history/:platform/:uniqueId        → list of snapshot timestamps
GET /history/:platform/:uniqueId/:date  → single CreatorProfile JSON
GET /history/:platform/:uniqueId/latest → most recent snapshot
```

The web app does not touch the filesystem directly — it stays stateless and server-less per the existing architecture.

**Confidence: High**

---

## 3. Scheduled / Automated Browser Tasks in Electron + Playwright

### Requirement
Timer-based batch collection: run Playwright collection jobs at a user-configured interval (e.g., every 6 hours) while the Electron app is in the tray. Must survive across multiple collection runs and integrate with the existing `BrowserManager` singleton.

### Decision: `node-cron ^4.2.1`

**Package**: `node-cron`
**Version**: `^4.2.1`
**TypeScript**: Built-in types (no `@types/node-cron` needed in v4)
**npm**: ~4M weekly downloads

**Why**:
- Pure JavaScript, zero native binaries — no Electron rebuild required.
- Cron expression syntax is familiar and maps cleanly to user-facing "every N hours" intervals.
- Lightweight (~10KB); adds nothing to Electron app bundle size perceptibly.
- In-process scheduling — jobs run as long as the Electron app is alive, which is the desired behavior for a tray app.
- v4 ships its own TypeScript types; no separate `@types/` package needed.
- Works on Node 25 (tested against Node 18+).

**Usage pattern**:

```typescript
// collector/src/scheduler.ts
import cron from 'node-cron';

export class CollectionScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  schedule(creatorId: string, expression: string, fn: () => Promise<void>): void {
    this.tasks.get(creatorId)?.stop();
    const task = cron.schedule(expression, fn, { scheduled: false });
    this.tasks.set(creatorId, task);
    task.start();
  }

  cancel(creatorId: string): void {
    this.tasks.get(creatorId)?.stop();
    this.tasks.delete(creatorId);
  }

  stopAll(): void {
    for (const task of this.tasks.values()) task.stop();
    this.tasks.clear();
  }
}
```

**Interval presets** (translate user-friendly options to cron):
```
Every 6 hours  → '0 */6 * * *'
Every 12 hours → '0 */12 * * *'
Daily at 3am   → '0 3 * * *'
```

---

### Alternative considered: `node-schedule`

`node-schedule ^2.1.1` is also well-suited — more flexible (Date objects, complex recurrence, cancel by name). However, for DashPersona's simple interval use case, the extra API surface of `node-schedule` is unnecessary. `node-cron` is smaller and more focused.

---

### What NOT to use

| Approach | Reason |
|----------|--------|
| `setInterval` | No cron expressions, no persistence of "last run" time, hard to serialize to config, easy to double-fire on re-render |
| Electron's built-in timer | Same as setInterval — no cron syntax, no cancellation registry |
| `cron` package | Older API; TypeScript types are via separate `@types/cron`; less active maintenance |
| OS cron / `launchd` | Out-of-process; cannot access the running Playwright `BrowserContext`; requires macOS-specific setup |
| Bull / BullMQ | Redis-backed queue — total overkill, introduces a server dependency |

**Confidence: High**

---

## 4. TikTok Data Collection via Playwright

### Requirement
Collect TikTok creator profile data (followers, likes, video list with per-post metrics) using the existing Electron Collector + Playwright infrastructure. Must follow the same pattern as Douyin/XHS collection. Login state persists via `chromium.launchPersistentContext` (already implemented).

### Decision: Network interception via `page.route()` + `page.on('response')` — no new library

TikTok loads creator data through its internal JSON API. Playwright can intercept these responses directly; no additional npm package is needed.

---

### Approach

**Login**: TikTok's login state is stored in cookies (`sessionid`, `tt_csrf_token`, `ttwid`). The existing `launchPersistentContext` in `BrowserManager` already persists cookies across runs. Add a `tiktok` branch to `isLoggedIn()` and `showLoginWindow()` using `https://www.tiktok.com/login`.

**Data extraction**: Two complementary techniques, in order of preference:

**Technique 1 — Intercept `/api/user/detail/`** (preferred):
```typescript
const responsePromise = page.waitForResponse(
  r => r.url().includes('/api/user/detail/') && r.status() === 200
);
await page.goto(`https://www.tiktok.com/@${uniqueId}`, { waitUntil: 'domcontentloaded' });
const response = await responsePromise;
const data = await response.json();
// data.userInfo.user → nickname, followerCount, heartCount, videoCount
// data.userInfo.stats → diggCount, followerCount, followingCount, heartCount, videoCount
```

**Technique 2 — Intercept `/api/post/item_list/`** (for post list):
```typescript
page.on('response', async (response) => {
  if (response.url().includes('/api/post/item_list/') && response.status() === 200) {
    const json = await response.json().catch(() => null);
    if (json?.itemList) posts.push(...json.itemList);
  }
});
// Scroll to trigger pagination
await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
```

**Anti-detection**: The existing `chromium.launchPersistentContext` with `headless: false` and a persistent user profile is the most reliable approach — TikTok's anti-bot measures are significantly weaker against real persistent sessions vs. headless contexts. Do NOT use `headless: true` for TikTok. No proxy rotation or fingerprint library is needed for personal-use single-session collection.

**Endpoint stability**: TikTok changes internal API paths every 4–8 weeks. Use a glob match (`**/api/user/detail/**`) rather than exact URL matching to survive minor path changes.

**Data mapping** (TikTok JSON → `CreatorProfile`):
```
userInfo.user.nickname         → profile.nickname
userInfo.user.uniqueId         → profile.uniqueId
userInfo.stats.followerCount   → profile.followers
userInfo.stats.heartCount      → profile.likesTotal
userInfo.stats.videoCount      → profile.videosCount
userInfo.user.signature        → profile.bio
itemList[].stats.playCount     → post.views
itemList[].stats.diggCount     → post.likes
itemList[].stats.commentCount  → post.comments
itemList[].stats.shareCount    → post.shares
itemList[].stats.collectCount  → post.saves
```

---

### What NOT to use

| Approach | Reason |
|----------|--------|
| TikTok Official API | Requires app review, rate limits, and a public web server for OAuth callback — incompatible with local-first/offline model |
| `TikTokApi` (Python) | Python runtime not available in Electron; would require spawning a subprocess; adds 200MB+ dependency |
| HTML parsing (`DOMParser` on page content) | TikTok is a fully client-side SPA; HTML contains no static data; network interception is orders of magnitude more reliable |
| Third-party scraping proxies / services | Violates local-first principle; external dependency; cost |
| `playwright-extra` + stealth plugin | Stealth plugin patches are increasingly ineffective against TikTok 2025 bot detection; unnecessary complexity when using real persistent profile |

**Confidence: Medium** (TikTok endpoint paths change ~every 6 weeks; the glob-match pattern mitigates but does not eliminate maintenance burden)

---

## Summary Table

| Feature | Package | Version | Location | Confidence |
|---------|---------|---------|----------|-----------|
| PDF layout engine | `@react-pdf/renderer` | `^4.3.2` | `src/` (web app) | High |
| PDF chart rasterization | `html2canvas-pro` | existing `^2.0.2` | `src/` (web app) | High |
| Local JSON persistence | `fs/promises` (Node built-in) | — | `collector/src/` | High |
| Electron config/settings | `electron-store` | `^10.0.0` | `collector/src/` | High |
| Scheduled collection | `node-cron` | `^4.2.1` | `collector/src/` | High |
| TikTok data collection | Playwright (existing `^1.52.0`) | — | `collector/src/` | Medium |

**New `npm install` commands:**

Web app:
```bash
npm install @react-pdf/renderer
```

Collector:
```bash
cd collector && npm install node-cron electron-store
```

No new packages needed for JSON persistence or TikTok collection — both use existing built-ins and the existing Playwright instance.
