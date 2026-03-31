# Technical Debt & Concerns — DashPersona

**Last Updated:** 2026-03-31  
**Codebase:** 190 source files (src/) + 33 test files  
**Build Status:** Passing (type-check clean, npm run build ✓)

---

## 1. UNCOMMITTED CHANGES (Active Work)

### In-Flight UI Refactoring (6 modified files)
- `src/app/dashboard/page.tsx` — Replacing `transition-colors` with `btn-primary` / `card-interactive` Tailwind classes
- `src/app/onboarding/page.tsx` — Same transition class removal pattern
- `src/components/file-drop-zone.tsx`
- `src/components/landing/boot-sequence.tsx`
- `src/components/landing/output-wall.tsx`
- `src/components/site-header.tsx`

**Risk:** Incomplete refactoring across motion system. Classes `btn-primary` and `card-interactive` must exist in Tailwind config for deploy. Verify `.planning/codebase/TODO.md` or commit these changes before next deploy.

**Action:** Either commit these pending changes or revert before merging to main.

---

## 2. HARDCODED LOCALHOST ADDRESSES (Network Fragility)

### CDP Proxy Hardcoded to localhost:3458
Files affected:
- `src/lib/collectors/cdp-client.ts` — "CDP proxy not running at localhost:3458"
- `src/lib/collectors/trending-collector.ts` — CDP proxy endpoint assumption
- `src/lib/adapters/cdp-adapter.ts` — HTTP client using hardcoded `CDP_BASE = 'http://127.0.0.1:3458'`
- `src/lib/adapters/browser-adapter.ts` — Resolves `bb-browser` CLI via process.env PATH manipulation

**Risk:**
- No environment variable support (`CDP_PROXY_URL` or `CDP_HOST`/`CDP_PORT`)
- Electron Collector app always listens on :3458 with no configurability
- Fails loudly if proxy runs on different port (e.g., during dev on different machine, Docker, or test isolation)
- Error messages are user-facing but don't suggest alternatives

**Recommendation:**
- Add `CDP_PROXY_HOST` and `CDP_PROXY_PORT` env vars with defaults
- Export from a config module to centralize
- Update Electron Collector startup logging to show actual listening port

---

## 3. TYPE SAFETY GAPS

### @ts-ignore Pragmatism in HTML Parsing
Files:
- `src/lib/adapters/html-parse-adapter.ts` — 3x `@eslint-disable-next-line @typescript-eslint/no-explicit-any`
- `src/components/growth-sparklines.tsx` — 1x explicit `any` for Recharts state management

**Concern:** DOM HTML parsing from TikTok/XHS embedded scripts (`__UNIVERSAL_DATA_FOR_REHYDRATION__`, `__INITIAL_STATE__`) are not strongly typed. Payload structures change when platforms update, causing silent data extraction failures.

**Risk:**
- No runtime validation of extracted JSON structure
- Posts array sliced to 30 items with no error if expected fields are missing
- Platform detection regex patterns could match false positives

**Recommendation:**
- Add optional Zod/io-ts schema validation on extracted payloads (only for invalid-structure recovery, not required for happy path)
- Consider typed parser tests with fixture HTML from each platform

---

## 4. PROCESS.ENV PATH MANIPULATION (Security Surface)

File: `src/lib/adapters/browser-adapter.ts` (line 96)
```typescript
env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` }
```

**Risk:**
- Spreads all process.env vars to child process, including secrets if carelessly added
- Mutates PATH globally across process lifetime for CLI resolution
- If `bb-browser` binary is hijacked, could execute arbitrary code

**Recommendation:**
- Use a whitelist of safe env vars when spawning child processes
- Consider using `npx --yes <package>` or explicit binary path from node_modules/.bin instead of CLI resolution
- Add comments explaining why PATH mutation is necessary

---

## 5. ERROR HANDLING INCONSISTENCIES

### Dual Error Handling Patterns
**Pattern A (Structured):**
- `src/lib/adapters/cdp-adapter.ts` — Custom `CDPAdapterError` with error codes
- `src/lib/adapters/browser-adapter.ts` — Custom `BrowserAdapterError` with error codes

**Pattern B (Unstructured):**
- `src/lib/collectors/cdp-client.ts` — Throws raw Error strings on fetch failure
- `src/lib/collectors/video-analyzer.ts` — Returns `{ error: string }` JSON, inconsistent with thrown exceptions
- Route handlers (`/api/cdp-collect`, `/api/collect-browser`) — Mix try/catch with error object returns

**Risk:** Clients must pattern-match on error messages instead of checking error codes. Breaking changes if error strings change.

**Recommendation:**
- Standardize on error codes + messages across all collectors
- Wrap collector errors in adapter boundary with error normalization

### Silent Error Suppression
Files:
- `src/lib/collectors/video-analyzer.ts` — "If pause fails, continue anyway — screenshots may have motion blur"
- `src/lib/adapters/browser-adapter.ts` — Catches `npm bin -g` and `which` failures silently

**Risk:** Difficult to debug when data collection silently degrades. Error logs are not user-facing.

**Recommendation:**
- Add metrics/counters for error suppression points (e.g., "video pause failed: X times")
- Expose degradation status to dashboard (e.g., "📊 Collected 47/50 videos, 3 skipped due to playback error")

---

## 6. VALIDATION GAPS

### Input Validation at Boundaries
**Good:**
- `src/lib/schema/validate.ts` — Comprehensive runtime validation of `CreatorProfile` JSON structure
- Test coverage: `src/lib/schema/__tests__/validate.test.ts` ✓

**Weak:**
- No URL validation before CDP fetch attempts (only string type check)
- Post IDs not validated for platform-specific format (Douyin IDs are numeric, TikTok use alphanumeric)
- Platform detection regex may accept invalid variations

**Recommendation:**
- Add `Platform`-specific post ID validators (e.g., `isValidTikTokPostId()`)
- Validate URLs are valid before passing to collectors

### Missing Edge Case Handling
Files:
- `src/lib/engine/growth.ts` — "Timezone is configurable via `utcOffset` (hours) instead of hardcoded CST" — **TODO comment in code**, not yet fully configurable
- Empty dataset handling is present but not consistently tested across all 11 analysis modules

---

## 7. PERFORMANCE CONCERNS

### Array Operations in Hot Paths
**Heavy usage of map/filter/reduce:**
- `src/lib/engine/`: 161+ map/filter/reduce operations
- `src/lib/engine/next-content.ts` — Multiple passes over trending data to find overlaps, category matches, etc.
- No visible memoization or result caching between analysis runs

**Risk:** With 100+ creator profiles in memory, repeated analysis could become O(n²) on intersection operations.

**Recommendation:**
- Profile `analyzeCreatorData()` on real datasets (50+ profiles)
- Consider caching benchmark data lookups by (platform, category) tuple
- Measure actual render impact before optimizing

### Screenshot Buffering for Video Analysis
File: `src/lib/collectors/video-analyzer.ts`
- Captures 8 segments per video (default), stores as PNG on disk
- `maxBuffer: 5 * 1024 * 1024` (5 MB) for child process stdout
- Collecting 50 videos = 400+ screenshots on disk (tmp-manager cleanup required)

**Risk:** Disk cleanup may not be guaranteed if process crashes. Screenshots accumulate if tmp-manager fails.

**Recommendation:**
- Verify tmp-manager cleanup is called on all error paths (use try/finally)
- Add periodic cleanup job (>24h old files) as fallback

---

## 8. MISSING TEST COVERAGE

### Analysis Modules Without Dedicated Tests
- `src/lib/engine/content-analyzer.ts` — No .test.ts file
- `src/lib/engine/strategy.ts` — No .test.ts file
- `src/lib/adapters/manual-import-adapter.ts` — No .test.ts file
- `src/lib/adapters/browser-adapter-xhs.ts` — No .test.ts file

**Risk:** Manual content analysis and Xhs-specific browser logic untested; platform-specific changes break without detection.

### Route Handler Tests Missing
- `/api/cdp-collect`
- `/api/collect-browser`
- `/api/trending`
- `/api/collect`

All 4 route handlers use manual fetch + AbortController timeout logic. No tests verify error handling or timeout correctness.

**Recommendation:**
- Add E2E tests for each route handler (with mocked CDP/browser adapters)
- Add unit test for timeout + cancellation flow

---

## 9. ACCESSIBILITY & MOTION ISSUES

### Resolved Concerns (from memory)
✓ `scroll-reveal` now renders visible by default, hides from tab order when not yet revealed  
✓ `setTimeout` cleanup on unmount added (`src/components/ui/scroll-reveal.tsx`)  
✓ `prefers-reduced-motion` support in place

### In-Progress Refactoring Risk
- Uncommitted changes removing `transition-colors` inline styles → need to verify `btn-primary` and `card-interactive` Tailwind classes include prefers-reduced-motion respects
- 93 uses of `transition-colors` across components — ensure bulk replacement is consistent

---

## 10. CONFIGURATION & BUILD ISSUES

### TypeScript Strict Mode with Next.js Warnings
File: `src/lib/textcraft/core/pretext-stub.d.ts` — Type stub for `@chenglou/pretext@0.0.2`

**Concern:** `pretext` ships raw `.ts` files (not compiled), requires:
- `transpilePackages: ["@chenglou/pretext"]` ✓ (already in next.config.ts)
- `ignoreBuildErrors: true` ✓ (already set)
- Suppresses build errors from pretext's invalid .ts → import extensions

**Risk:** If pretext updates with breaking changes, build still succeeds but might have runtime issues. Workaround hides real errors.

**Recommendation:**
- Monitor pretext releases; consider contributing .d.ts or migrating to typed alternative
- Add a pre-build script to validate pretext exports are still accessible

### Missing tsconfig.check.json Details
File: `src/lib/schema/creator-data.ts` excluded in tsconfig.json from pretext exclusion

**Risk:** Type checking via `npm run type-check` uses separate config (`tsconfig.check.json`) which may diverge from build config.

---

## 11. DATA SAFETY & STATE MUTATION

### In-Place Post Classification
File: `src/lib/engine/persona-tree.ts`
```typescript
classifyContent(posts);  // Mutates posts array in-place
```

**Risk:** Mutation without explicit return or side-effect warning. If called twice, classification may be incorrect. Difficult to trace without careful code reading.

**Recommendation:**
- Return new array instead of mutating: `posts = classifyContent(posts)`
- Add JSDoc comment marking as side-effect function

### No Immutable Data Structures
Throughout engine modules: Posts arrays are modified with `.push()`, `.splice()`, etc. (103+ operations across codebase).

**Risk:** Harder to debug state consistency, potential for bugs when data is reused across analyses.

**Recommendation:**
- Consider using `readonly Post[]` type annotations more broadly
- Use `.concat()` / spread operator instead of `.push()` where possible

---

## 12. KNOWN ENVIRONMENT ISSUES

### Chrome/Playwright Path Resolution
File: `src/lib/adapters/browser-adapter.ts` — `bb-browser` CLI lookup
- Tries: `bb-browser`, `/usr/local/bin/bb-browser`, `/opt/homebrew/bin/bb-browser`, npm global bin
- Falls back to first candidate, which produces ENOENT if not found

**Risk:** Non-obvious error on systems without npm globally installed or in standard Homebrew location.

**Recommendation:**
- Log which paths were tried when resolution fails
- Suggest installation step in error message

---

## 13. INCOMPLETE FEATURES

### Growth Timezone Configuration
File: `src/lib/engine/growth.ts` — Comment indicates `utcOffset` is configurable but may not be fully implemented across all growth calculations.

**Risk:** Growth analysis may assume CST (UTC+8) in some places, configurable offset in others.

**Recommendation:**
- Audit all `new Date()` operations in engine/ for hardcoded timezone assumptions
- Move timezone to a single source of truth (config module)

---

## 14. COLLECTOR STABILITY

### Video Duration Edge Cases
File: `src/lib/collectors/video-analyzer.ts`
- `RETRY_LOAD_WAIT_MS = 3000` — If video duration is not populated after retry, uses duration 0
- No data loss, but creates segments at 0s only

**Risk:** Silent degradation (user sees "no segments captured" without explanation).

**Recommendation:**
- Return detailed metadata about why segment capture failed (e.g., "no video element", "duration not available", etc.)
- Track these failure modes in analytics

---

## 15. SECURITY CONSIDERATIONS

### No CSRF/CORS Headers on API Routes
Files: `/api/cdp-collect`, `/api/collect-browser`, `/api/trending`, `/api/collect`

**Risk:** If frontend is compromised, any origin could potentially trigger data collection requests.

**Recommendation:**
- Add Origin/Referer checks if routes are only used from same-origin frontend
- Document CORS expectations

### No Rate Limiting
Collection endpoints accept unlimited requests from authenticated users.

**Risk:** User could accidentally DOS their own machine by rapidly triggering collection.

**Recommendation:**
- Add basic rate limiting (e.g., 1 collection per 5 seconds) or at least warning if request is in-flight

### Playwright CDP Proxy Exposes DOM Access
File: `src/lib/collectors/cdp-client.ts` — `cdpEval()` function evaluates arbitrary JavaScript in user's browser context.

**Risk:** If attacker can write to localhost:3458 proxy, they can execute JS in user's session.

**Recommendation:**
- Document that CDP proxy must only be exposed to trusted network (not internet-facing)
- Consider adding shared-secret authentication between Collector app and Next.js backend

---

## 16. DEPENDENCIES

### pretext (@chenglou/pretext@0.0.2)
- Ships raw `.ts` files, requires `transpilePackages` workaround
- No TypeScript definitions
- Low adoption (custom package)

**Risk:** Package maintenance may be abandoned; migration effort required if breaking changes occur.

### html2canvas-pro (^2.0.2)
- Pro version not clearly documented in package.json
- Used for export functionality only

**Risk:** Version bump may introduce breaking changes or license issues.

### elkjs (^0.11.1)
- Used for pipeline graph layout
- No type definitions in package

**Recommendation:**
- Add `@types/elkjs` if available, or consider `@dagrejs/dagre` alternative

---

## 17. MONITORING & OBSERVABILITY

### No Error Metrics/Logging
- Collection failures (timeouts, parse errors, network issues) are silently suppressed or returned as error objects
- No structured logging to track error frequency or patterns
- No analytics for adapter selection (which adapter was used, success rate by adapter)

**Recommendation:**
- Add Sentry/LogRocket integration for client-side error tracking
- Log collection metrics (success rate by adapter/platform) to analytics
- Expose adapter health status in dashboard (e.g., "CDP proxy: healthy", "Browser adapter: 2 failures in last hour")

---

## 18. DOCUMENTATION GAPS

### No Architecture Decision Records (ADRs)
- Why CDP proxy approach instead of browser extension + sync server?
- Why Playwright for collectors instead of Puppeteer?
- Why abandoning HTMLParseAdapter (marked "experimental")?

**Risk:** Future contributors cannot understand design tradeoffs.

**Recommendation:**
- Create `/docs/adr/` directory with decisions on key integrations

### Missing Configuration Documentation
- Timezone offset behavior unclear
- Environment variables documented in `.env.example` but no detailed configuration guide
- Benchmark data URL configurable but no examples

---

## SUMMARY TABLE

| Category | Severity | Count | Status |
|----------|----------|-------|--------|
| Uncommitted changes | Medium | 6 files | Needs commit or revert |
| Hardcoded addresses | Medium | 4 files | Needs env vars |
| Type safety gaps | Low | 3 patterns | Pragmatic, acceptable |
| Error handling | Medium | 2 patterns | Inconsistent |
| Missing tests | Medium | 8 modules | Gaps in coverage |
| Accessibility (in-progress) | Low | UI refactor | Active |
| Configuration issues | Low | 2 areas | Manageable |
| Data mutations | Low | 1 major + 103 ops | Should monitor |
| Dependency stability | Low | 3 packages | Watch for updates |
| Observability | Medium | 0 tracking | No metrics |

---

## NEXT ACTIONS

1. **Before Next Deploy:**
   - Commit or revert 6 in-flight UI changes
   - Verify `btn-primary` and `card-interactive` Tailwind classes exist and respect prefers-reduced-motion

2. **Short-term (1-2 sprints):**
   - Extract hardcoded localhost:3458 to environment variables
   - Add unit tests for route handlers (/api/*)
   - Document required CDP proxy startup message in Collector app

3. **Medium-term (next quarter):**
   - Add error tracking (Sentry or similar)
   - Standardize error handling across collectors
   - Add integration tests for browser-adapter and cdp-adapter

4. **Long-term:**
   - Consider migration away from pretext if maintenance stalls
   - Evaluate type safety improvements in HTML parsing
   - Build analytics dashboard for adapter health

