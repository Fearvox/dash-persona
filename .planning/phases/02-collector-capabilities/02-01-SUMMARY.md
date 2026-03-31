---
phase: 02
plan: 01
title: TikTok Collection Engine
status: complete
started: "2026-03-31T21:25:00Z"
completed: "2026-03-31T21:40:00Z"
---

# Summary: TikTok Collection Engine

## What was built

TikTok creator data collection engine using Playwright network interception with anti-fingerprint stealth measures.

## Key deliverables

1. **BrowserManager stealth upgrade** (`collector/src/browser.ts`): Replaced bare `playwright` import with `playwright-extra` + `StealthPlugin`. Added 7 stealth launch args, `addInitScript` for cdc_ deletion, webdriver/plugins/languages override, chrome runtime stub, and Electron UA patching. Extended `BrowserStatus` with `collecting` and `captcha` states.

2. **TikTok collector** (`collector/src/tiktok-collector.ts`): Full collection flow — passive response interception for `/api/user/detail/` and `/api/post/item_list/`, scroll pagination with jitter (1.5-3.5s), CAPTCHA detection (5 selectors) with manual/scheduled timeout modes, schema validation before mapping, atomic snapshot write. Listener cleanup in `finally` block prevents leaks.

3. **Tray status precedence** (`collector/src/tray.ts`): Added `lockStatus`/`unlockStatus` to prevent periodic recomputation from clobbering transient `collecting`/`captcha` states. Built all 5 status icons dynamically.

4. **POST /collect endpoint** (`collector/src/server.ts`): Accepts `{ handle, postCount? }`, returns snapshot metadata. Exempt from 30s timeout. Does NOT own run-log or snapshot persistence — those belong to collectTikTok() and BatchQueue respectively.

## Key files

### Created
- `collector/src/tiktok-collector.ts` — 475 lines, full TikTok collection engine

### Modified
- `collector/src/browser.ts` — stealth args, addInitScript, BrowserStatus extension
- `collector/src/tray.ts` — 5-state icons, lockStatus/unlockStatus precedence
- `collector/src/server.ts` — POST /collect endpoint, timeout exemption
- `collector/package.json` — playwright-extra, puppeteer-extra-plugin-stealth, @types/uuid

## Verification

- `npx tsc --noEmit` — passes (0 errors)
- All structural grep checks pass
- 4 atomic commits, one per task

## Deviations

- Used `CAPTCHA_TIMEOUT_SCHEDULED_MS = 0` instead of `Infinity` — Playwright's `waitForFunction` timeout of 0 means no timeout, equivalent to infinite wait. `Infinity` would cause numeric issues.
- Added `as TikTokUserDetail | null` cast for `capturedDetail` — TypeScript control flow analysis cannot track mutations inside async callbacks.

## Self-Check: PASSED
