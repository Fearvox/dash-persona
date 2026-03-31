# Feature Research — Creator Analytics Platforms

**Research date:** 2026-03-31
**Scope:** Competitor feature audit across Social Blade, NoxInfluencer, HypeAuditor, 蝉妈妈/Chanmama, 飞瓜/Feigua, 新榜/Xinbang — focused on pipeline features: automated collection, historical tracking, multi-creator comparison, PDF reports, collection status UX.

---

## Competitors Surveyed

| Platform | Primary Market | Focus |
|----------|---------------|-------|
| Social Blade | Global (EN) | YouTube/TikTok/Instagram passive analytics |
| NoxInfluencer | Global (EN) | YouTube-first influencer discovery + comparison |
| HypeAuditor | Global (EN) | B2B influencer marketing, fraud detection |
| 蝉妈妈 (Chanmama) | China (Douyin/XHS) | Live commerce, e-commerce product selection |
| 飞瓜 (Feigua) | China (Douyin/Kuaishou/Bili) | Short-video + live commerce data |
| 新榜 (Xinbang) | China (WeChat/multi-platform) | Content creator rankings, brand matching |

---

## Area 1: Data Collection Automation

### Table Stakes
- **Pull-on-demand lookups** — all platforms offer single-account stat fetch on page load. This is the minimum; users assume it works instantly.
- **Data refresh within 24 hours** — Social Blade shows daily deltas; Feigua updates every 60 seconds for live rooms. For regular creator stats, daily refresh is the floor.
- **Multi-platform coverage in one product** — users refuse to context-switch. Social Blade covers 5 platforms; Chanmama covers Douyin + XHS; Feigua covers Douyin + Kuaishou + Bilibili.
- **Error state visibility** — all cloud platforms surface "data unavailable" states. Users abandon tools that silently fail.

### Differentiators
- **Scheduled/batch collection at user-defined intervals** — no competitor reviewed offers user-configurable scheduling for a personal watchlist. HypeAuditor tracks campaign content automatically (post-level), but this is campaign-centric not creator-centric. DashPersona's Electron Collector + local-first model is a genuine whitespace.
- **Watchlist / monitoring lists** — Chanmama and Feigua allow merchants to "follow" creators and receive update digests. 新榜 monitors 240,000+ accounts with minute-level alerts. Building a personal watchlist with configurable refresh is a differentiator for individual/agency users.
- **Offline-capable, local-first collection** — no SaaS competitor stores data locally. DashPersona's approach is unique and privacy-advantaged.
- **Collection history log** — Chanmama provides a job history view for live-stream monitoring sessions. Most platforms don't expose collection provenance to the end user.

### Anti-features
- **Background polling without user awareness** — platforms that auto-refresh without timestamps create distrust ("is this stale?"). Always show collection timestamp.
- **Opaque rate limits with no feedback** — SaaS platforms throttle API calls silently. Users interpret this as broken data. If collection is throttled, say so.
- **Requiring account login to see basic stats** — Social Blade provides public stats without login; platforms that gate everything behind auth have high abandonment.

### Complexity Notes
- Scheduling requires: a persistent background process (already have via Electron), a job queue with retry logic, per-creator last-collected timestamps, and UI to configure intervals. Medium complexity.
- Batch collection of N creators requires: rate limiting (Playwright sessions can't parallelize safely), a queue with status per job, and clear ETA feedback. High complexity.
- Dependency: Collection scheduling requires the dashboard to consume Collector data (not Demo), which is also an active requirement.

---

## Area 2: Historical Trend Tracking

### Table Stakes
- **Follower/subscriber growth chart over time** — Social Blade's core value proposition. All platforms show this. A tool without it is not credible.
- **Daily delta table** (last 14–30 days) — Social Blade shows a detailed daily table alongside charts. Users scan this to spot anomalies.
- **Monthly/weekly aggregated views** — granularity selector (day / week / month) is expected. Feigua supports multiple granularities.
- **Engagement rate trend** — not just follower count; engagement over time is expected by any serious user.

### Differentiators
- **Cross-snapshot comparison** (e.g., "compare this creator 90 days ago vs today") — Social Blade provides static before/after but no interactive time-range picker for comparison. NoxInfluencer's comparison reports include historical data. A range-selectable chart with two reference lines (T1 vs T2) would stand out.
- **Per-post historical performance** — Feigua stores video-level stats with trend lines. Showing how a creator's video cadence and per-post engagement has changed over time goes beyond follower count.
- **Velocity and acceleration metrics** — translating raw growth into rate-of-change (growth acceleration) is mentioned by neither Social Blade nor Chanmama in user-facing views. DashPersona's engine has the statistical primitives for this.
- **Collection-time watermarking** — since DashPersona collects locally, each snapshot is timestamped at collection time. This is more honest than cloud platforms that may backfill data retroactively.

### Anti-features
- **Showing "estimated" historical data without labeling it** — Social Blade's earnings estimates are clearly marked; other platforms interpolate missing dates silently. Always distinguish collected data from inferred/interpolated data.
- **Unbounded chart history that loads slowly** — platforms that render 3-year daily charts as a single DOM-heavy component create performance problems. Implement windowed / virtualized chart rendering.
- **Deleting old snapshots silently on storage limits** — users who have collected 6 months of data expect it to persist. If pruning is needed, warn explicitly and let the user control retention policy.

### Complexity Notes
- Requires: local JSON schema that appends snapshots with timestamps, a chart component that reads time-series from the store, and a granularity selector. Medium complexity.
- Depends on: local JSON file storage (active requirement) and Collector-to-Dashboard integration (active requirement).

---

## Area 3: Multi-Creator Comparison

### Table Stakes
- **2–3 creator side-by-side** — Social Blade compares up to 3; NoxInfluencer supports 2–3. Users expect at minimum a dual-creator view.
- **Normalized metrics** (so a 1M-follower creator and a 50K-follower creator can be compared meaningfully) — engagement rate, growth rate, posting frequency are the standard normalized metrics.
- **Common metric table** — a tabular view of the same set of metrics across all compared creators. Social Blade does this; NoxInfluencer generates a comparison report.

### Differentiators
- **Comparison of up to 10+ creators** — HypeAuditor supports up to 100 in its comparison tool, a significant leap. Most agencies need 5–20 in a shortlist view. Supporting up to 10 without performance degradation is a realistic differentiator.
- **Ranking within a comparison set** — ranking creators 1–N on each metric (who has best engagement, who has fastest growth) is more actionable than raw numbers side by side. NoxInfluencer's comparison reports do this.
- **Historical comparison** — comparing the same 3 creators' metrics at two points in time. No platform reviewed makes this trivial to do. DashPersona's snapshot model enables it naturally.
- **Exportable comparison table** — NoxInfluencer exports comparison reports. HypeAuditor exports to XLS/CSV/PDF. Agencies need to share comparison data; an export action on the comparison view is expected at the professional tier.

### Anti-features
- **Forcing users into a separate "comparison mode"** — some platforms require navigating away from a creator's profile to add them to a comparison. Adding a creator to comparison directly from their profile card reduces friction.
- **Showing absolute numbers without context** — comparing raw follower counts across different platform types (Douyin vs TikTok) is misleading. Always surface platform context.
- **Requiring all compared creators to be on the same platform** — Feigua is Douyin-centric; Social Blade is cross-platform. Cross-platform comparison with clear platform labeling is a differentiator.

### Complexity Notes
- Requires: a comparison store (list of creator IDs to compare), a comparison layout component, metric normalization functions (some exist in the engine's stats/ library). Medium complexity.
- The comparison view is largely a presentation layer over existing analysis engine output; the engine already supports multi-creator analysis via comparator module. Lower implementation risk than it appears.

---

## Area 4: Report Generation / Export

### Table Stakes
- **CSV/Excel export of raw metrics** — all platforms offer this at their paid tier. NoxInfluencer: 100 basic exports/year on Business; HypeAuditor: XLS/CSV/PDF. Users expect to get their data out.
- **Shareable link or PDF** — Social Blade's public profiles are the shareable link equivalent. HypeAuditor exports full PDF reports. For professional use, a PDF is the expected deliverable.
- **Brand/logo on the report** — HypeAuditor and NoxInfluencer include branding in exported reports. Agencies rebrand these for clients.

### Differentiators
- **Multi-page professionally typeset PDF** — HypeAuditor's reports are multi-section with charts embedded. Most tools export data tables; embedding charts in a layout-correct PDF is harder and stands out. This is the stated goal for DashPersona.
- **Cover page with creator identity** — platform logo, creator avatar, platform icon, report date, commissioning entity name. Chanmama's reports include live-commerce summaries with a branded cover. Small detail, large signal of quality.
- **Snapshot-as-of date on every chart** — since DashPersona collects locally, it can embed the exact collection timestamp on every chart in the report. Cloud platforms with backfilled data cannot guarantee this honesty.
- **Single-creator deep-dive vs multi-creator shortlist report formats** — two distinct report formats serve different use cases (talent evaluation vs roster overview). No competitor reviewed offers this as an explicit choice.

### Anti-features
- **Reports that require internet to render** — some platforms generate reports server-side, meaning the report is only viewable while logged in. A local-first PDF that persists offline is strictly better for the user.
- **Watermarking free-tier exports** — frustrating for users evaluating the tool. Consider gating complexity (multi-creator reports) rather than adding watermarks.
- **Exporting data that wasn't on screen** — some platforms include hidden/extra data in exports that the user never saw. Principle of least surprise: export what is shown.
- **Slow, blocking report generation UI** — if PDF generation takes more than 3 seconds, show a progress indicator. If it takes more than 10, run it asynchronously and notify on completion.

### Complexity Notes
- Client-side PDF generation is constrained: html2canvas + jsPDF or a headless render approach. DashPersona already has html2canvas-pro.
- Chart inclusion in PDF requires ensuring Recharts SVGs are rasterized correctly before capture. Known edge cases with Recharts + html2canvas (clip paths, foreign objects).
- Multi-page layout is the hard part: pagination logic, page break avoidance for charts, header/footer repetition. High complexity.
- Depends on: completed dashboard with charts rendered, historical data loaded, comparison view ready (for multi-creator report variant).

---

## Area 5: Collection Progress UX

### Table Stakes
- **Visible loading state** — any operation that takes more than 300ms must show a loading indicator. All modern platforms do this. Silent loads are a table stakes failure.
- **Error message with actionable guidance** — "Something went wrong" with no context is a table stakes failure. "Could not reach Douyin — check that your browser session is active" is table stakes done right.
- **Last-collected timestamp** — every data display should show when it was last updated. Google Analytics, Feigua, and Social Blade all surface this. It is the primary signal of data trust.

### Differentiators
- **Per-creator collection status in a batch view** — when collecting 10+ creators, a status row per creator (queued / in progress / done / failed) is far more useful than a single spinner. Chanmama's monitoring job list is the closest analog found; it is not common elsewhere.
- **Progress bar with ETA for batch jobs** — for a 10-creator batch run that takes 3–5 minutes, a progress bar with estimated time remaining prevents abandonment. No competitor reviewed surfaces this because they are cloud-side; DashPersona's local Playwright model makes collection time visible and controllable.
- **Retry failed collections inline** — if one creator's collection fails (login expired, rate limited), surface a retry button next to that creator in the status view. Batch retry for all failures is also useful.
- **Collection log / audit trail** — a timestamped log of what was collected, when, and whether it succeeded. 新榜 surfaces alerts and monitoring events. An audit trail distinguishes "this data was collected at 14:23 on March 30" from "this data is from sometime this week".
- **Non-blocking collection** — collection runs in the background (Electron can do this natively); the user can browse the dashboard while it runs. Communicate completion via a toast/badge, not a blocking modal.

### Anti-features
- **Blocking the entire UI during collection** — a modal overlay that prevents all interaction while Playwright runs is the worst pattern. Collection must be non-blocking.
- **No distinction between "collecting now" and "queued"** — if 5 creators are queued and only 1 is running, showing all 5 as "in progress" is misleading.
- **Ambiguous error states** — "Failed" with no reason. Log the actual error (timeout, selector not found, auth expired) and surface it in the UI. Especially important for Playwright-based collection where failures are diagnostic.
- **Auto-retry loops without user knowledge** — if retry logic runs silently in the background after a failure, users may not know why the session is still active. All retries should be user-initiated or at minimum surfaced in the log.
- **Confusing "data is from Demo mode" with real data** — the current app has a Demo adapter. Once real collection is wired, any mix of Demo and real data must be visually distinguished.

### Complexity Notes
- Non-blocking collection requires the Electron Collector to run Playwright jobs in a worker process and emit progress events back to the Express API, which the web app polls or subscribes to. Medium-high complexity.
- Per-creator status requires a job queue data structure with status transitions (queued → running → done | failed | retrying) persisted to disk so it survives app restarts. Medium complexity.
- The status view is a new UI component (collection status panel) that renders the queue. Low complexity given the data model.
- Depends on: Electron Collector job queue architecture (not yet built), local JSON storage, Dashboard ↔ Collector API integration.

---

## Synthesis: Feature Priority Map

### Build Now (table stakes for the active milestone)

| Feature | Why | Effort |
|---------|-----|--------|
| Last-collected timestamp on all data | Users need to know if data is stale | Low |
| Loading state for collection | 300ms rule; without it the UI feels broken | Low |
| Error state with actionable message | Silent failures kill trust | Low |
| Basic historical chart (follower/engagement over time) | Core feature users expect | Medium |
| 2–3 creator side-by-side comparison | Table stakes for professional use | Medium |
| CSV data export | Table stakes at any paid/showcase tier | Low-Medium |
| PDF single-creator report | Stated milestone goal; differentiates from Social Blade | High |

### Build Next (differentiators worth the complexity)

| Feature | Why | Effort |
|---------|-----|--------|
| Per-creator collection status in batch view | No competitor does this; core to Collector UX | Medium |
| Collection log / audit trail | Transparency = trust; unique to local-first model | Medium |
| Watchlist with configurable refresh schedule | Clear whitespace vs all SaaS competitors | High |
| Historical time-range comparison (T1 vs T2) | Unique to snapshot model; high analytical value | Medium-High |
| Multi-creator PDF report (shortlist format) | Agency use case; second report format | High |

### Defer (complexity not justified yet)

| Feature | Why defer |
|---------|-----------|
| 10+ creator simultaneous comparison | Medium use case; performance risk without pagination |
| Branded report templates / white-label | Zero-to-one first; branding options come after core report works |
| Scheduled auto-reports (email/Slack delivery) | Local-first model complicates delivery; cloud feature grafted onto desktop |
| Real-time live-stream data | Requires always-on collection; out of stated scope |
| AI-generated insight summaries | Anti-feature for DashPersona's determinism brand principle |

---

## Anti-features: Deliberately Not Building

| Anti-feature | Rationale |
|-------------|-----------|
| AI-powered narrative summaries | Brand principle: deterministic, transparent algorithms. AI analysis is a direct competitor differentiator in the wrong direction. |
| "Grade" or score theater (A++ ranking) | Social Blade's grades are aesthetically engaging but analytically shallow. DashPersona's 11-module engine produces richer signal; a single letter grade would undermine that. |
| Follower count estimates / projections | Projection features are fun but frequently wrong. They create liability and distract from real data. |
| Social comparison benchmarks from unknown populations | "Your engagement rate is above 73% of creators" sounds impressive but is meaningless without auditable methodology. If benchmarking is added, the benchmark population must be documented. |
| Gamification / badges / milestones | "Your channel hit 10K followers — here's a badge!" is antithetical to the precise, professional tone of DashPersona. |
| Email/cloud sync of collected data | Local-first is a constraint and a brand principle. Cloud sync opens privacy and compliance complexity with no benefit for the current use case. |
| Browser extension approach | Explicitly out of scope; Electron + Playwright is the chosen path and is more capable. |
| Payment / subscription gating in the UI | Commercial prototype only; no paywall infrastructure. |

---

## Dependency Graph

```
Local JSON storage
    └── Historical trend tracking
    └── Collection log / audit trail
    └── Scheduled collection

Collector ↔ Dashboard integration
    └── Real data in dashboard (replaces Demo)
    └── Collection status UX
    └── Historical data persistence

Collection status UX
    └── Per-creator batch status
    └── Collection log
    └── Non-blocking collection

Historical data
    └── Historical chart view
    └── T1 vs T2 comparison
    └── Multi-creator historical comparison

Multi-creator comparison view
    └── Comparison table (2–3 creators)
    └── Exportable comparison

Charts rendered correctly
    └── PDF single-creator report
    └── PDF multi-creator report (depends on comparison view too)
```

The critical path is: **local JSON storage → Collector integration → historical data → charts → PDF report**.
Multi-creator comparison branches off the Collector integration and can proceed in parallel once real data flows.

---

*Research based on: Social Blade (socialblade.com), NoxInfluencer (noxinfluencer.com), HypeAuditor (hypeauditor.com), 蝉妈妈 (chanmama.com), 飞瓜 (feigua.cn / dy.feigua.cn), 新榜 (newrank.cn / data.newrank.cn). Data as of March 2026.*
