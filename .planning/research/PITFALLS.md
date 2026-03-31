# DashPersona — Pipeline Pitfalls Research

Covering the five feature areas introduced in the Active milestone. Each pitfall
lists warning signs, a concrete prevention strategy, and the phase where it
should be addressed.

---

## 1. TikTok Scraping via Playwright

### P1-1 — Anti-bot fingerprint detection triggering CAPTCHA or soft-ban
TikTok runs browser fingerprinting (canvas hash, navigator properties, WebGL
vendor, audio context, CDP leak detection). Playwright's default Chromium build
is identifiable because `navigator.webdriver` is `true` and the browser
executable path leaks into the DevTools protocol handshake.

**Warning signs**
- `/collect` returns a login redirect even though the user is logged in
- A CAPTCHA (`/slide-verify`) appears immediately on page load
- The profile page loads but all post counts show 0
- Repeated 403 responses from `api.tiktok.com` endpoints within the page

**Prevention**
1. Pass `--disable-blink-features=AutomationControlled` in `chromium.launchPersistentContext` args (already partially done with `--no-sandbox`; add this alongside it)
2. Inject a `page.addInitScript` that deletes `window.cdc_*` properties and sets `Object.defineProperty(navigator, 'webdriver', { get: () => undefined })`
3. Use a real persistent profile (already done via `app.getPath('userData')/browser-profile`) — this carries real cookies, history, and cached resources that fingerprinting checks rely on
4. Add human-paced delays between navigations: random 1.5–3.5 s jitter between scroll steps, not fixed 3 s
5. Never run headless (`headless: false` is already set — keep it)
6. Do not call `page.setExtraHTTPHeaders` with fake UA strings; use the profile's native UA to stay consistent

**Phase**: TikTok Collector (Phase 2 equivalent — same sprint as building the extractor)

---

### P1-2 — Login state not detected for TikTok (cookie name differs from Douyin/XHS)
The existing `isLoggedIn` check uses `sessionid` (Douyin) and `a1` (XHS). TikTok
uses `sessionid_ss` or `sid_tt` depending on region and login method.

**Warning signs**
- `isLoggedIn('tiktok')` returns false even after successful manual login
- The collector immediately shows a login prompt on every collection attempt

**Prevention**
1. Detect any of `['sessionid_ss', 'sid_tt', 'sid_guard']` on `.tiktok.com`
2. Add a fallback DOM check: look for the logged-in avatar element (`[data-e2e="nav-profile"]`) as a secondary signal
3. Log the full cookie list (names only, no values) during login detection when in debug mode to catch future name changes

**Phase**: TikTok Collector

---

### P1-3 — DOM selector rot: TikTok changes markup every 2–4 weeks
TikTok A/B tests UI continuously. Selectors that work today (`[data-e2e="user-post-item"]`) break silently — the scraper returns 0 posts without throwing.

**Warning signs**
- Collection succeeds (no error) but `posts.length === 0`
- `page.evaluate` returns `null` instead of an object
- Post count in UI is non-zero but collected array is empty

**Prevention**
1. Assert a minimum post count after extraction: if the profile shows > 0 posts but the collected array is empty, throw `PARSE_ERROR` rather than returning silently
2. Keep selectors in a single constant object (`TIKTOK_SELECTORS`) at the top of the adapter file — one place to update
3. Add a schema version field to collected data so breakages are traceable to a release
4. Add a `--dry-run` / `--validate` CLI path that logs raw extracted JSON to a temp file for quick inspection when selectors break

**Phase**: TikTok Collector. Ongoing maintenance after.

---

### P1-4 — Rate limiting / account flagging from burst collection
Collecting 200 posts for 5 creators back-to-back from one IP/account triggers
TikTok's rate limiter. The response degrades gradually (slower page loads, then
empty API responses, then a soft-lock on the account).

**Warning signs**
- Post-count responses start returning fewer items than expected mid-batch
- Navigation starts taking 10+ seconds instead of 2–3 s
- `net::ERR_HTTP2_PROTOCOL_ERROR` errors appear in page console

**Prevention**
1. Enforce a minimum 30 s cool-down between creators when running batch mode
2. Cap daily collection at 10 creators per login session (configurable)
3. Surface the cool-down timer in the Collection Status UI so the user understands the delay is intentional, not a bug
4. Store the last-collected timestamp per creator; skip re-collection if < 6 hours have passed unless the user explicitly forces a refresh

**Phase**: Scheduled/Batch Collection phase

---

## 2. Client-Side PDF Generation with Embedded Charts

### P2-1 — Recharts renders to SVG; html2canvas-pro captures it incorrectly
Recharts outputs `<svg>` elements. `html2canvas-pro` can render SVGs but has
known issues: gradients and `clip-path` elements are dropped, text inside SVG
uses the page font stack which may not be embedded, and transforms applied via
CSS on the parent `<div>` are not respected.

**Warning signs**
- Charts appear in PDF but with missing fill colors or truncated lines
- Text labels inside charts are invisible or use a fallback serif font
- Chart appears correct in browser preview but is blank in the PDF output

**Prevention**
1. Render charts to an off-screen `<canvas>` using Recharts' `customized` render prop or a `ref` + `toDataURL()` before passing to the PDF builder — avoid capturing live DOM SVGs
2. Alternatively, use `@react-pdf/renderer` (already in scope via `html2canvas-pro`) with a dedicated PDF chart component that renders to `<Canvas>` primitives, bypassing SVG entirely
3. Test the PDF capture pipeline with every chart type in CI using a headless screenshot comparison (even a simple pixel-count diff catches blank charts)

**Phase**: PDF Export phase

---

### P2-2 — Geist Mono / Geist Sans not embedded: PDF falls back to Helvetica
Client-side PDF libraries (jsPDF, @react-pdf/renderer) require fonts to be
explicitly loaded as base64 or ArrayBuffer. Next.js loads fonts via `next/font`
at runtime — the font files are not directly available to the PDF generator.

**Warning signs**
- Numbers in the PDF appear in a different weight or width than the screen design
- Tabular number columns are misaligned
- Characters outside ASCII (CJK, accented) appear as boxes

**Prevention**
1. Fetch the `.woff2` / `.woff` font files at PDF generation time using `fetch('/fonts/geist-mono.woff2')` and pass the `ArrayBuffer` to the font loader; place static font copies in `/public/fonts/`
2. Subset the fonts: only embed the glyphs actually needed (Latin + digits is sufficient for metric labels)
3. Add a visual smoke test: generate a test PDF in CI and assert the word "DASH" appears in the correct font via a PDF text extractor (`pdfjs-dist`)

**Phase**: PDF Export phase

---

### P2-3 — Page breaks cut through charts and tables mid-render
Client-side PDF generation does not understand React component boundaries. A
chart that spans a natural page break will be sliced horizontally, often through
a legend or axis label.

**Warning signs**
- PDF preview looks correct but printed output has orphaned chart fragments
- Metric tables split with the header on one page and rows on the next

**Prevention**
1. Measure each section's height before layout using `getBoundingClientRect()` and insert explicit `page-break-before: always` signals or `pdf.addPage()` calls before sections that would overflow
2. Wrap each chart in a `<div style="page-break-inside: avoid">` when using html2canvas full-page capture (this hint is respected by some renderers)
3. Define a fixed section-height budget per page (e.g. A4 = 297mm minus 40mm margins = ~730px at 96 dpi) and pack sections greedily, then force a new page before overflow

**Phase**: PDF Export phase

---

### P2-4 — Large reports (50+ posts, 5 creators) cause tab freeze or OOM crash
Rendering a full comparison report with 250+ Recharts instances plus profile
images can consume 500 MB+ of canvas memory in a single tab.

**Warning signs**
- Tab becomes unresponsive for > 5 s during PDF generation
- `Cannot use 'in' operator to search for 'height' in null` errors from canvas allocator
- Users report "page crashed" on lower-memory machines

**Prevention**
1. Stream the PDF in sections: generate page 1, flush canvas, generate page 2 — never hold all canvases in memory simultaneously
2. Limit charts in PDF to a single thumbnail per section (250×150 px) rather than full-size; link to the live dashboard for interactive versions
3. Add a memory gate: check `performance.memory.usedJSHeapSize` (Chrome only) before starting; warn the user if headroom is < 200 MB
4. Set a hard cap: PDF reports are capped at 10 creators and 100 posts each to prevent abuse and memory blowout

**Phase**: PDF Export phase

---

## 3. Local JSON File Storage

### P3-1 — Concurrent writes from scheduler + manual collection corrupt the file
Node.js `fs.writeFileSync` / `fs.promises.writeFile` are not atomic on all
filesystems. Two writes racing (e.g. scheduler fires while a manual collect is
in flight) can produce a truncated or interleaved JSON file.

**Warning signs**
- `JSON.parse` throws `Unexpected end of JSON input` on startup
- Historical data for a creator disappears after a background collection run
- File size drops to 0 bytes after a crash during write

**Prevention**
1. Write to a `.tmp` file first, then `fs.renameSync` to the target path — rename is atomic on POSIX (macOS/Linux) and on NTFS when source and destination are on the same volume
2. Serialize all writes through a queue (a simple `Promise` chain) so concurrent write requests are serialized without locking
3. On startup, check for leftover `.tmp` files and remove them before loading

**Phase**: Local JSON Storage phase (must be in place before any scheduled collection)

---

### P3-2 — No schema migration: adding fields breaks existing stored data
The first time a new field (e.g. `collectedAt`, `platformVersion`) is added to
`CreatorDataSchema`, existing JSON files that lack the field will fail
validation or produce `undefined` in downstream analysis.

**Warning signs**
- Analysis modules return `NaN` for newly-added metrics on older records
- Zod `safeParse` failures on load with messages like `Required` on a new field
- Users who upgrade lose their historical data because the app refuses to load old files

**Prevention**
1. Every schema field added after v1 must have a `.optional()` or `.default()` fallback in Zod — never add a new required field to a stored schema
2. Store a `schemaVersion: number` at the top level of each JSON file
3. Write a `migrate(raw: unknown): StoredData` function that runs on load, upgrading from version N to current; keep it in `src/lib/storage/migrate.ts`
4. Test migrations: for each schema version bump, add a fixture file and an automated test that loads it and verifies the output

**Phase**: Local JSON Storage phase

---

### P3-3 — Query performance degrades as history grows
Reading and parsing a 5 MB JSON file on every dashboard load to answer "show
the last 30 days for one creator" is O(n) across all records. After 6 months of
daily collection for 20 creators, the file can grow to 20–50 MB and parse time
exceeds 500 ms.

**Warning signs**
- Dashboard data load time increases linearly over weeks
- `JSON.parse` call takes > 100 ms (observable via `performance.mark`)
- Memory usage spikes on every page load as the entire history is deserialized

**Prevention**
1. Partition storage by creator: one file per `creatorId` (e.g. `storage/tiktok-abc123.json`) instead of a single global file — most queries only need one creator
2. Within each creator file, store snapshots as an append-only array; reads for recent data only need the last N entries (slice from the end)
3. Add an in-memory LRU cache keyed by `(creatorId, date)` so repeated dashboard renders within a session don't re-parse the file
4. If per-file sizes approach 1 MB, implement a yearly archive: rotate records older than 12 months to `storage/archive/tiktok-abc123-2025.json`

**Phase**: Local JSON Storage phase; performance optimizations can be deferred to a later polish phase

---

### P3-4 — Storage path is not user-configurable: data is lost on app reinstall
Storing JSON files in `app.getPath('userData')` means data survives normal
updates but is wiped on a clean uninstall/reinstall, or when a user moves to a
new machine.

**Warning signs**
- Users report losing months of history after reinstalling
- No export/import path exists

**Prevention**
1. Add an "Export data" action to the tray menu that copies the storage directory to a user-chosen folder
2. Add an "Import data" action on first launch that detects an existing export and offers to restore it
3. Document the default storage path in the app's about screen so power users can back it up manually

**Phase**: Local JSON Storage phase (export/import can be a fast follow in the next milestone)

---

## 4. Electron Scheduled/Background Tasks

### P4-1 — macOS App Nap / system sleep pauses scheduled timers
macOS throttles timers in background apps via App Nap. A `setInterval`-based
scheduler will fire late or not at all when the machine is asleep or the app
has been backgrounded for > 10 minutes. The Electron app currently uses
`app.getPath('userData')` and a tray-only lifecycle but has no power-management
hooks.

**Warning signs**
- Scheduled collection runs are skipped overnight even though the app is running
- Timer fires 2–3 minutes late after the machine wakes from sleep
- Log shows no collection entries for multi-hour gaps

**Prevention**
1. Subscribe to Electron's `powerMonitor` events: on `resume` and `unlock-screen`, immediately check if any scheduled task is overdue and run it
2. Store the "last run" timestamp on disk; on every app launch, check if a scheduled run was missed during downtime and run it then
3. Use `powerSaveBlocker.start('prevent-app-suspension')` only for the duration of an active collection, not as a permanent setting — prevents App Nap without draining the battery
4. Notify the user in the tray badge / tooltip when a scheduled run was skipped, so they can trigger manually

**Phase**: Scheduled Collection phase

---

### P4-2 — Scheduled tasks run when the Playwright browser is in an inconsistent state
A scheduled trigger may fire mid-login (user is on the login page), mid-collection
(another manual collection is in progress), or after a browser crash. The current
`BrowserManager` has no "busy" state between `standby` and `active`.

**Warning signs**
- Two collection jobs overlap and produce interleaved data
- A scheduled job opens a new page on top of a login flow, confusing the user
- `isReady()` returns `true` but `pages` Map is in a stale state from a previous crash

**Prevention**
1. Add a `'busy'` state to `BrowserStatus` that is set before any collection and cleared on completion or error
2. The scheduler should skip a run if status is `'busy'` and log a "skipped due to ongoing collection" message
3. Add a mutex / semaphore at the collection level: wrap the collect-and-store flow in a lock that allows only one collection at a time
4. Expose the busy state in the tray UI so users can see when the app is working

**Phase**: Scheduled Collection phase

---

### P4-3 — App is not running when scheduled time arrives
The current architecture requires the Electron app to be manually launched.
Users who close the app lose scheduled collection entirely with no feedback.

**Warning signs**
- Collection history shows large gaps correlated with machine reboots
- Users expect "background" collection but the app is never in the dock/tray after restart

**Prevention**
1. Add a macOS Login Item registration using `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })` — prompt the user to enable this on first scheduled-task creation
2. Add a visible "auto-start is OFF" warning badge in the scheduler UI when auto-start is disabled but scheduled tasks exist
3. Do not silently skip missed runs — record them as `status: 'missed'` in the task history so users can see what was skipped

**Phase**: Scheduled Collection phase

---

### P4-4 — Tray process hangs: the `before-quit` lifecycle deadlocks on slow shutdown
`main.ts` already has a graceful shutdown in `before-quit` that stops the HTTP
server and closes the browser. If the browser context hangs (e.g. Playwright
is mid-navigation during a crash), `shutdown()` never resolves and the process
never exits.

**Warning signs**
- "Force Quit" is required to close the app
- macOS shows the spinning beachball during tray quit
- The HTTP server port `:3458` remains occupied after apparent quit, blocking next launch

**Prevention**
1. Wrap `shutdown()` in a `Promise.race` with a 5 s timeout fallback that calls `process.exit(0)` forcefully
2. Add `server.closeAllConnections()` (Node 18.2+) before `server.close()` to avoid open-socket hang
3. On startup, attempt to bind `:3458`; if `EADDRINUSE`, kill the leftover process with `lsof -ti tcp:3458 | xargs kill -9` and retry — or surface an error dialog

**Phase**: Scheduled Collection phase; the timeout fix should be applied before the phase ships

---

## 5. Multi-Creator Comparison UX

### P5-1 — Raw metric comparison is meaningless across platforms
Douyin, TikTok, and XHS use different engagement mechanics. A TikTok creator
with 100K followers is not equivalent to a Douyin creator with 100K followers —
algorithm reach, organic discovery, and typical engagement rates differ. Comparing
raw follower counts side-by-side misleads MCN clients.

**Warning signs**
- Comparison chart shows TikTok creators always ranking lower than Douyin peers
  with similar audience quality
- Clients ask "why does a Douyin creator with 50K beat a TikTok one with 200K?"
- Analysis outputs identical scores for creators with clearly different profiles

**Prevention**
1. The existing `benchmark.ts` module has platform-specific baselines — use these to normalize metrics into percentile scores (0–100) before comparison
2. Present a "Platform-Adjusted Score" as the primary comparison axis, with raw metrics available in a secondary detail view
3. Label every comparative metric with its normalization basis (e.g. "Engagement rate vs. Douyin top 10%") to maintain the brand principle of transparency
4. Add a platform filter to the comparison view so users can compare like-for-like (all TikTok, all Douyin) when raw numbers are needed

**Phase**: Multi-Creator Comparison phase

---

### P5-2 — Comparison with missing data fields causes NaN / null to cascade through UI
Not all platforms expose the same signals. XHS does not have a "share count";
TikTok hides exact follower counts unless the account crosses a threshold. When
a signal is absent, `undefined` flows into arithmetic and produces `NaN`, which
then renders as blank cells or broken charts.

**Warning signs**
- Comparison table shows empty cells or "NaN" strings
- Recharts renders a broken line that drops to zero for missing data points
- `JSON.stringify` output contains `null` values where numbers are expected

**Prevention**
1. The `signal-collector.ts` already produces a 18-signal object — add explicit `null` (not `undefined`) for unavailable signals and handle `null` in every downstream calculation
2. In chart components, use `Recharts`' `connectNulls={false}` to show gaps rather than misleading interpolated lines
3. Add a "Data completeness" indicator next to each creator in the comparison view (e.g. "14/18 signals") so users know which data is partial

**Phase**: Multi-Creator Comparison phase

---

### P5-3 — Comparison UX breaks with > 4 creators: chart becomes unreadable
Recharts `LineChart` with 6+ series becomes visually indistinguishable even
with a 6-color palette. The current design system only defines 5 accent colors
(green, red, yellow, blue, highlight).

**Warning signs**
- Colors repeat or are too similar in the legend
- Line chart with 5+ creators is a tangled spaghetti that no user can read
- Users try to add 10+ creators and the performance degrades noticeably

**Prevention**
1. Hard cap comparison at 5 creators and explain the limit in the UI ("Compare up to 5 creators for clarity")
2. For 2-creator comparison, use a head-to-head radar/spider chart layout — it handles 2-dataset comparison better than line charts
3. For 3–5 creators, use a ranked bar chart per metric category rather than time-series lines — cleaner at a glance
4. Reserve the full line-chart/timeline view for single-creator historical trending, not cross-creator comparison

**Phase**: Multi-Creator Comparison phase

---

### P5-4 — Data freshness skew: comparing a 3-day-old snapshot with today's data
Creators are collected at different times. A comparison between Creator A
(collected this morning) and Creator B (collected 3 days ago) shows misleading
relative positions, especially for fast-growing accounts.

**Warning signs**
- A creator's engagement rate appears to have dropped, but the snapshot is stale
- Two runs of the same comparison in the same day show different rankings

**Prevention**
1. Display the `collectedAt` timestamp next to each creator's name in the comparison view — make staleness visible
2. Warn the user with an inline banner when any creator in the comparison set has data older than 48 hours: "Creator X data is 3 days old — refresh for accurate comparison"
3. Offer a "Refresh all" button in the comparison view that triggers collection for all stale creators in sequence

**Phase**: Multi-Creator Comparison phase

---

*Last updated: 2026-03-31*
