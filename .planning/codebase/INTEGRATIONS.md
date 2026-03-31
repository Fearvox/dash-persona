# External Integrations & APIs — DashPersona

## Overview

DashPersona is **data-agnostic** with **no external AI/LLM** dependencies. All analysis uses deterministic algorithms. External integrations are limited to:
1. **Social media platform data collection** (passive, read-only)
2. **Internal CDP proxy** (localhost:3458)
3. **Optional platform benchmarking**
4. **Vercel analytics** (optional)

## Social Media Platforms

### TikTok

#### HTML Parsing (Public Profiles)
- **Endpoint**: `src/app/api/collect/route.ts`
- **Method**: HTTP POST to `/api/collect`
- **URL Filtering**: SSRF protection restricts to TikTok domains
  - **Allowed hosts**: `tiktok.com`, `www.tiktok.com`, `vm.tiktok.com`
  - **Blocked**: Private IPs (127.*, 192.168.*, 10.*, 172.*)
- **Parser**: `src/lib/adapters/html-parse-adapter.ts`
  - Extracts public profile data from HTML script tags (`__UNIVERSAL_DATA_FOR_REHYDRATION__`)
  - Parses video list, engagement metrics, profile info
  - No authentication required (public pages only)
- **Timeout**: 504 gateway timeout if platform blocks request (geo-blocking, rate-limiting, captcha)
- **Status**: Experimental; platform may block requests

### Douyin (抖音)

#### Chrome DevTools Protocol Proxy
- **Proxy Location**: localhost:3458 (local Electron app)
- **Endpoints**:
  - `GET http://127.0.0.1:3458/health` — Health check
  - `GET http://127.0.0.1:3458/new?url=<URL>&background=true` — Open new tab
  - `POST http://127.0.0.1:3458/eval?target=<ID>` — Execute JavaScript
  - `POST http://127.0.0.1:3458/close` — Close tab
  - `GET http://127.0.0.1:3458/screenshot?target=<ID>` — Capture screenshot
- **Purpose**: Automated profile scraping via real browser session with user cookies
- **Authentication**: Uses user's existing Chrome session (user must be logged in)
- **Data Collected**:
  - Creator profile (name, avatar, bio, follower count)
  - Video list (up to 200 posts)
  - Engagement metrics (views, likes, comments, shares)
  - Content metadata (timestamps, hashtags, descriptions)
- **Flow**:
  1. User logs into Douyin in Collector desktop app
  2. Collector app runs local Express server on localhost:3458
  3. Web app sends collection request to API route
  4. API route proxies request to localhost:3458
  5. Playwright browser evaluates JavaScript to parse DOM
- **Timeout**: 5 minutes (Douyin full scroll takes 3+ minutes)
- **Errors**: ECONNREFUSED if proxy not running
- **Implementation**: `src/lib/adapters/cdp-adapter.ts`, `collector/src/browser.ts`, `collector/src/server.ts`

### Red Note (小红书 / XHS)

#### Chrome DevTools Protocol Proxy (Same as Douyin)
- **Proxy**: localhost:3458 (shared with Douyin)
- **URLs**: `xiaohongshu.com`, `xhslink.com`, `xhs.cn`
- **Authentication**: User's existing Red Note session
- **Data Collected**: Profile, posts, engagement metrics (same as Douyin)
- **Implementation**: `src/lib/adapters/html-parse-adapter.ts` (HTML parsing), `src/lib/adapters/cdp-adapter.ts` (CDP proxy)

## Internal Services

### Local CDP Proxy (Collector Desktop App)

**Type**: Electron + Playwright + Express HTTP server

**Package**: `@dash/collector` v0.1.0 (private, not published)

**Port**: localhost:3458 (hardcoded)

**Technologies**:
- `electron` 33.4.11 — Desktop application wrapper
- `playwright` 1.52.0 — Browser automation (Chromium)
- `express` 4.21.0 — HTTP API server
- `electron-updater` 6.3.0 — Auto-update mechanism

**API Endpoints**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (returns `{status: "ok"}` if browser ready) |
| `/new?url=<URL>` | GET | Open new tab, return targetId |
| `/eval?target=<ID>` | POST | Execute JavaScript on tab |
| `/close` | POST | Close tab |
| `/screenshot?target=<ID>` | GET | Capture screenshot |

**Request Format**:
- Body: Plain text (JavaScript code or CSS selector)
- Timeout: 30 seconds per request
- Response: JSON

**Error Codes**:
```
PROXY_NOT_RUNNING    — Collector not running (ECONNREFUSED)
NOT_LOGGED_IN        — User not logged into platform
TIMEOUT              — Navigation or evaluation exceeded time limit
PARSE_ERROR          — Response was not valid JSON
NAVIGATION_FAILED    — Failed to navigate to URL
TARGET_CLOSED        — Tab was closed or context ended
BROWSER_NOT_READY    — Browser not initialized
```

**Source**: `collector/src/` (main.ts, browser.ts, server.ts, tray.ts, preload.ts)

## Data Adapters

### Adapter Registry

Location: `src/lib/adapters/registry.ts`

| Adapter | Type | Status | External Integration |
|---------|------|--------|----------------------|
| `demo-adapter.ts` | Demo data | Active | None |
| `file-import-adapter.ts` | CSV/Excel import | Active | None (local file) |
| `manual-import-adapter.ts` | Manual form entry | Active | None |
| `html-parse-adapter.ts` | HTML parsing | Active (exp) | TikTok, XHS public pages |
| `extension-adapter.ts` | Chrome extension | Active | Extension messaging |
| `browser-adapter.ts` | Headless browser | Active | Local child process |
| `browser-adapter-xhs.ts` | XHS-specific browser | Active | Local child process |
| `cdp-adapter.ts` | CDP proxy | Active | localhost:3458 (Collector) |

### File Import Adapter

**Type**: Local CSV/Excel parsing

**Libraries**: `xlsx` 0.18.5, `papaparse` 5.4.1

**Files**: `src/lib/adapters/file-import-adapter.ts`, `extension/src/`

**No external API calls** — all processing local

### Extension Adapter

**Type**: Chrome extension message passing

**Purpose**: Send collection requests from webpage context to extension

**Protocol**: `window.postMessage()` with structured data

**Extension**: `extension/` (Vite + CRX build)

**No external API calls** — uses Chrome extension IPC

## Environment Variables

### Configuration File
Location: `/.env.example`

**Optional Variables**:
```
TIMEZONE_OFFSET=8                    # UTC offset for growth baseline (default: 8 CST)
ENABLE_HTML_ADAPTER=true             # Enable experimental HTML parsing
BENCHMARK_DATA_URL=                  # Custom platform benchmark data URL
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=     # Vercel Web Vitals analytics
```

**No Required Env Vars** — app functions without environment configuration

### Vercel Deployment
- **Token**: Stored in `.vercel/.env.development.local` (VERCEL_OIDC_TOKEN)
- **Not used at runtime** — only for deployment

## No External Integrations For

- **AI/LLM APIs**: No Claude, ChatGPT, Gemini, or other LLM calls
- **Database**: No external database (data is ephemeral in-memory)
- **Authentication**: No external auth providers (local login via browser session)
- **Webhooks**: None
- **Payment**: None
- **Email/SMS**: None
- **Analytics**: Optional Vercel analytics only (NEXT_PUBLIC_VERCEL_ANALYTICS_ID)

## API Routes Summary

Location: `src/app/api/`

| Route | Method | Purpose | External Integration |
|-------|--------|---------|----------------------|
| `/api/collect` | POST | TikTok HTML parsing | TikTok public pages |
| `/api/cdp-collect` | POST | Douyin/TikTok/XHS via CDP | localhost:3458 CDP proxy |
| `/api/collect-browser` | POST | Headless browser collection | Local browser process |
| `/api/trending` | GET/POST | Trending data aggregation | None (local calculation) |

## Security & SSRF Mitigation

### API `/collect` Route
- **SSRF Protection**: Whitelist-only host validation
  - Only allows: TikTok, Douyin, Red Note domains
  - Blocks all private IP ranges (127.*, 192.168.*, 10.*, 172.*)
  - Blocks localhost, 0.0.0.0, *.local
- **Timeout**: 504 Gateway Timeout on platform response failure

### API `/cdp-collect` Route
- **Authentication**: Requires user login in Collector app
- **Timeout**: 5 minutes (300,000 ms) for full profile collection
- **Error Handling**: Detailed error codes for debugging

## Data Flow

```
User Browser
    ↓
Web App (/api/collect or /api/cdp-collect)
    ↓
TikTok/Douyin/XHS (public profile pages)
         OR
         Collector Desktop App (localhost:3458)
              ↓
         Playwright Browser (user's Chrome session)
              ↓
         TikTok/Douyin/XHS (with real cookies)
    ↓
Parse & Return CreatorProfile JSON
```

## No Data Persistence

- **Database**: None
- **Cloud Storage**: None
- **Log Aggregation**: None
- **Telemetry**: Optional Vercel Web Vitals only

All analysis runs in-memory on collected profiles. No data is stored on server or sent to third-party services.
