---
phase: 02
slug: collector-capabilities
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-31
---

# Phase 02 — UI Design Contract

> Visual and interaction contract for the Collector Capabilities phase. All UI surfaces are Electron BrowserWindows rendering plain HTML + CSS + vanilla JS with Electron IPC. No React, no component library, no build step.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Plain HTML/CSS/JS in Electron BrowserWindow |
| Preset | Not applicable |
| Component library | None (vanilla DOM) |
| Icon library | None — status states conveyed through colored circles and text labels only (consistent with existing tray icon pattern) |
| Interface font | Geist Sans (loaded via CSS @font-face from bundled assets or system fallback: `ui-sans-serif, system-ui, sans-serif`) |
| Data/metrics font | Geist Mono (loaded via CSS @font-face; `font-variant-numeric: tabular-nums` on all numeric cells) |
| Banned fonts | Inter, Roboto, Arial, any serif |

---

## Spacing Scale

All spacing values are multiples of 4px. Named tokens for use in CSS custom properties:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon-to-label gap, tight internal padding |
| `--space-2` | 8px | Cell padding (compact), inline badge padding |
| `--space-3` | 12px | Table cell padding (default), form field internal |
| `--space-4` | 16px | Section padding, card padding, input height padding |
| `--space-5` | 20px | Row height baseline for table rows |
| `--space-6` | 24px | Panel section gap, heading bottom margin |
| `--space-8` | 32px | Window edge padding, major section separation |
| `--space-10` | 40px | Window title bar height clearance |
| `--space-12` | 48px | Footer / action bar height |

---

## Typography

All type is set in Geist Sans unless noted. Font size scale uses px for precision in a native window context.

| Role | Font | Size | Weight | Line-height | Color token | Usage |
|------|------|------|--------|-------------|-------------|-------|
| Window title | Geist Sans | 13px | 600 | 1.2 | `--text-primary` | BrowserWindow title bar label (in-page) |
| Section heading | Geist Sans | 12px | 600 | 1.3 | `--text-secondary` | Panel section labels, column headers |
| Body | Geist Sans | 13px | 400 | 1.5 | `--text-primary` | General prose, descriptions |
| Label | Geist Sans | 12px | 400 | 1.4 | `--text-secondary` | Form labels, field descriptors |
| Data / metric | Geist Mono | 13px | 400 | 1.4 | `--text-primary` | Elapsed time, counts, durations |
| Status text | Geist Mono | 11px | 500 | 1.3 | (per status) | Row status pill text |
| Timestamp | Geist Mono | 11px | 400 | 1.4 | `--text-subtle` | Run log `collectedAt`, start times |
| Error detail | Geist Mono | 11px | 400 | 1.5 | `--accent-red` | Inline error code and message |
| Caption / hint | Geist Sans | 11px | 400 | 1.4 | `--text-subtle` | Retention hint, secondary descriptions |
| Button | Geist Sans | 13px | 500 | 1 | (per variant) | Action button labels |

---

## Color

CSS custom properties defined in the HTML `<head>` of each BrowserWindow. All values are exact hex — no opacity shortcuts.

### Base Palette

```css
:root {
  --bg-primary:   #0a0f0d;
  --bg-card:      #151d19;
  --bg-row-hover: #1a2420;
  --bg-input:     #0e1512;
  --bg-overlay:   #0a0f0dcc; /* 80% opacity for modal backdrop */

  --text-primary:   #e8fff6;
  --text-secondary: #b8c4be;
  --text-subtle:    #8a9590;

  --accent-green:    #7ed29a;
  --accent-red:      #c87e7e;
  --accent-yellow:   #d2c87e;
  --accent-blue:     #7eb8d2;
  --accent-highlight: #f0f545;

  --border-default: #1f2d28;
  --border-focus:   #7ed29a;
}
```

### Status Color Mapping

Used in tray icons, status pills, and row backgrounds.

| State | Color hex | Token | Usage |
|-------|-----------|-------|-------|
| Queued | `#8a9590` | `--text-subtle` | Pill text, tray: no change (idle color) |
| Running | `#d2c87e` | `--accent-yellow` | Pill text + left indicator dot, tray collecting color |
| Done | `#7ed29a` | `--accent-green` | Pill text + indicator dot, tray idle color |
| Failed | `#c87e7e` | `--accent-red` | Pill text + indicator dot, tray error color |
| CAPTCHA | `#f0f545` | `--accent-highlight` | Pill text + indicator dot, tray: same as collecting |
| Skipped | `#8a9590` | `--text-subtle` | Pill text only, no indicator dot |

### Button Variants

| Variant | Background | Text | Border | Hover background |
|---------|-----------|------|--------|-----------------|
| Primary | `#7ed29a` | `#0a0f0d` | none | `#9adcb0` |
| Destructive | `#c87e7e` | `#0a0f0d` | none | `#d09090` |
| Ghost | transparent | `#b8c4be` | `1px solid #1f2d28` | `#1a2420` |

---

## Component Specifications

---

### Batch Progress Window

**Requirement:** COLL-06, COLL-07 | **Decision:** D-09, D-10, D-11

#### Window Properties

| Property | Value |
|----------|-------|
| BrowserWindow width | 680px |
| BrowserWindow height | 480px (resizable, min-height: 360px) |
| Frame | true (native frame, macOS traffic lights visible) |
| Background color | `#0a0f0d` |
| Title | "Collection Progress" |
| Always on top | false |
| Show on taskbar | false (macOS: no dock icon for this window) |

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  [native macOS frame / title bar — "Collection Progress"]│
├─────────────────────────────────────────────────────────┤
│  HEADER (height: 52px, padding: 0 24px)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ "Collecting 3 creators"   [status pill]  [Cancel]│   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  PROGRESS BAR (height: 2px)                             │
│  ░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
├─────────────────────────────────────────────────────────┤
│  TABLE (flex: 1, overflow-y: auto)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ # │ Creator      │ Platform │ Status  │ Elapsed  │   │
│  ├──────────────────────────────────────────────────┤   │
│  │   │ ...rows...   │          │         │          │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  FOOTER (height: 48px, padding: 0 24px)                 │
│  │ Total elapsed: 0:42      Done: 1  Failed: 0  Queued: 2│
└─────────────────────────────────────────────────────────┘
```

#### Header

- Height: 52px, `display: flex`, `align-items: center`, padding `0 24px`
- Left: heading text — "Collecting N creators" (13px / 600 / `--text-primary`)
- Center: overall status pill (see pill spec below)
- Right: "Cancel" ghost button (only visible while batch is running; hidden when all done/failed)
- Background: `--bg-primary`
- Bottom border: `1px solid --border-default`

#### Progress Bar

- Height: 2px, full width, no border-radius
- Track color: `--border-default`
- Fill color: `--accent-green` for normal progress; `--accent-yellow` during CAPTCHA pause
- Value computed as `completedCount / totalCount` (0–1)
- Transition: `width 400ms cubic-bezier(0.22, 1, 0.36, 1)`
- `@media (prefers-reduced-motion: reduce)`: no transition

#### Status Table

Column definitions:

| Col | Header | Width | Alignment | Font |
|-----|--------|-------|-----------|------|
| # | "#" | 36px fixed | center | Geist Mono 12px / `--text-subtle` |
| Creator | "Creator" | flex 1 (min 160px) | left | Geist Sans 13px / `--text-primary` |
| Platform | "Platform" | 80px fixed | left | Geist Mono 11px / `--text-subtle` |
| Status | "Status" | 100px fixed | left | (pill) |
| Elapsed | "Elapsed" | 72px fixed | right | Geist Mono 13px / `--text-secondary` |

- Column headers: 12px / 600 / `--text-subtle`, uppercase, `letter-spacing: 0.04em`
- Header row height: 36px, background `--bg-card`, sticky at top during scroll
- Header bottom border: `1px solid --border-default`

#### Table Row States

| State | Background | Left border (2px) | Opacity |
|-------|-----------|-------------------|---------|
| Queued | `--bg-primary` | none | 0.6 |
| Running | `--bg-card` | `--accent-yellow` | 1 |
| Done | `--bg-primary` | none | 1 |
| Failed | `#1a0f0f` (red-tinted dark) | `--accent-red` | 1 |
| CAPTCHA | `#1a1a0a` (yellow-tinted dark) | `--accent-highlight` | 1 |

- Row height: 44px when collapsed; expands to auto when error detail is shown
- Row hover background: `--bg-row-hover` (applies to queued/done rows only; running/failed/captcha rows keep their background)
- Running row: animated left border — opacity pulses between 0.5 and 1.0 at 1.2s period, `prefers-reduced-motion` disables pulse

#### Status Pill

Inline element, `display: inline-flex`, `align-items: center`, `gap: 6px`

- Indicator dot: 6px × 6px circle, `border-radius: 50%`, color per status table above
- Text: Geist Mono 11px / 500, uppercase
- Pill container: no background, no border (text + dot only — avoids colored borders anti-pattern)

Status labels:

| State | Label text |
|-------|-----------|
| Queued | "QUEUED" |
| Running | "RUNNING" |
| Done | "DONE" |
| Failed | "FAILED" |
| CAPTCHA | "CAPTCHA" |
| Skipped | "SKIPPED" |

#### Error Detail Expansion

When a row has `status: failed`:
- Row expands below the main row data to show error detail block
- Error detail block: `padding: 8px 12px 12px 36px` (indented past the # column)
- Error code: Geist Mono 11px / `--accent-red` — e.g. `TIKTOK_RATE_LIMITED`
- Error message: Geist Mono 11px / `--text-secondary` — e.g. "API returned 429 after 3 retries"
- Remediation: Geist Sans 11px / `--text-subtle` — e.g. "Wait 10 minutes before retrying this creator"
- No expand/collapse toggle — error detail always visible when status is failed

#### Footer Summary Bar

- Height: 48px, `display: flex`, `align-items: center`, padding `0 24px`
- Background: `--bg-card`
- Top border: `1px solid --border-default`
- Left: "Total elapsed: M:SS" — Geist Mono 12px / `--text-secondary`
- Right: "Done: N  Failed: N  Queued: N" — Geist Mono 12px / `--text-subtle`, values in `--text-primary`
- Separator between counts: `·` (U+00B7), `--text-subtle`

---

### Scheduler Panel

**Requirement:** COLL-03, COLL-04, COLL-05 | **Decision:** D-05, D-06, D-08

The Scheduler Panel is a settings section rendered within the Collector's tray-opened settings window (a new `BrowserWindow`). It is NOT a floating panel — it is a full settings page.

#### Settings Window Properties

| Property | Value |
|----------|-------|
| BrowserWindow width | 480px |
| BrowserWindow height | 520px |
| Resizable | false |
| Frame | true |
| Title | "Collector Settings" |
| Background color | `#0a0f0d` |

#### Settings Window Layout

```
┌────────────────────────────────────────┐
│  [native frame — "Collector Settings"] │
├────────────────────────────────────────┤
│  HEADER (52px)                         │
│    "Settings"  (heading)               │
├────────────────────────────────────────┤
│  CONTENT (flex:1, padding: 24px)       │
│                                        │
│  ── Schedule ──────────────────────    │
│  [Enable scheduler toggle]  ON/OFF     │
│                                        │
│  Run every                             │
│  [dropdown ▼ Every 12 hours       ]    │
│                                        │
│  Next run                              │
│  2026-04-01 09:00 (in 14h 22m)        │
│                                        │
│  ── Collection ────────────────────    │
│  Posts per creator                     │
│  [dropdown ▼ 20 posts            ]     │
│                                        │
│  ── Run Log ───────────────────────    │
│  Retain                                │
│  [dropdown ▼ Last 500 entries    ]     │
│  [Purge now]  (ghost, destructive)     │
│                                        │
├────────────────────────────────────────┤
│  FOOTER (48px)    [Cancel] [Save]      │
└────────────────────────────────────────┘
```

#### Enable Scheduler Toggle

- `display: flex`, `justify-content: space-between`, `align-items: center`
- Label: "Enable scheduler" — Geist Sans 13px / `--text-primary`
- Toggle: custom `<button role="switch">` — 40px × 22px pill shape
  - Track off: `--border-default` background
  - Track on: `--accent-green` background
  - Thumb: 18px × 18px circle, `--bg-primary`, with 2px inset
  - Transition: `background 200ms`, `transform 200ms`
  - When disabled (off): all schedule fields below become opacity 0.4, `pointer-events: none`

#### Interval Dropdown

- Label: "Run every" — Geist Sans 12px / `--text-subtle` label above
- Control: `<select>` styled as:
  - Width: 100%
  - Height: 36px
  - Background: `--bg-input`
  - Border: `1px solid --border-default`
  - Border-radius: 4px
  - Padding: `0 12px`
  - Font: Geist Sans 13px / `--text-primary`
  - Chevron: custom SVG in `--text-subtle`, positioned at right 10px
  - Focus ring: `outline: 2px solid --border-focus`, `outline-offset: 2px`

Options (stored as interval labels per D-05):

| Display label | Stored value |
|---------------|-------------|
| Every 6 hours | `6h` |
| Every 12 hours | `12h` |
| Daily | `daily` |
| Weekly | `weekly` |

Default selection: "Every 12 hours"

#### Next Run Display

- Shown only when scheduler is enabled and a schedule is saved
- Label: "Next run" — Geist Sans 12px / `--text-subtle`
- Value: Geist Mono 13px / `--text-secondary` — ISO date formatted as "YYYY-MM-DD HH:MM" followed by relative time in `--text-subtle`: "(in Xh Ym)"
- If scheduler was paused due to missed run: value shows "Paused — missed run" in `--accent-yellow`

#### Posts Per Creator Dropdown

- Label: "Posts per creator" — Geist Sans 12px / `--text-subtle`
- Control: same `<select>` styling as interval dropdown
- Options:

| Display label | Stored value |
|---------------|-------------|
| 10 posts | `10` |
| 20 posts (default) | `20` |
| 50 posts | `50` |
| 100 posts | `100` |

Default: 20 posts

#### Run Log Retention Dropdown

- Label: "Retain" — Geist Sans 12px / `--text-subtle`
- Control: same `<select>` styling
- Options:

| Display label | Stored value |
|---------------|-------------|
| Last 100 entries | `count:100` |
| Last 500 entries (default) | `count:500` |
| Last 1000 entries | `count:1000` |
| Last 30 days | `days:30` |
| Last 90 days | `days:90` |
| Last 180 days | `days:180` |
| Keep all | `all` |

Default: "Last 500 entries"

#### Purge Now Button

- Visible only when retention is not "Keep all"
- Label: "Purge old entries" — ghost button variant, Geist Sans 13px / `--accent-red` text
- Border: `1px solid #c87e7e40` (red at 25% opacity)
- Hover background: `#c87e7e12`
- Clicking opens the Retention Confirmation Dialog (see Copywriting Contract)

#### Section Dividers

- `──  Section Title  ──────────` pattern: Geist Sans 11px / `--text-subtle` / uppercase / `letter-spacing: 0.08em`
- No horizontal rule element — label text only with `margin: 24px 0 16px`

#### Footer Action Bar

- Height: 48px, `display: flex`, `justify-content: flex-end`, `gap: 8px`, padding `0 24px`
- Background: `--bg-card`
- Top border: `1px solid --border-default`
- "Cancel": ghost button
- "Save": primary button
- Both buttons: height 32px, padding `0 16px`, border-radius 4px

---

### Tray Icon States

**Requirement:** COLL-06, COLL-07 | **Decision:** D-09

Extends the existing `TrayManager` with a new `collecting` status and a `captcha` status. The tray icon is a 16×16 PNG circle generated programmatically (same `createCircleIcon` pattern already in `tray.ts`).

#### Status → Color Mapping

| Status | Hex | Description | Existing? |
|--------|-----|-------------|-----------|
| `active` | `#7ed29a` | Browser ready, logged in, no active collection | Yes |
| `standby` | `#d2c87e` | Browser running, not logged in | Yes |
| `error` | `#c87e7e` | Browser crash or collection failed | Yes |
| `collecting` | `#7eb8d2` | Active collection in progress | **New** |
| `captcha` | `#f0f545` | Collection paused — awaiting CAPTCHA solve | **New** |

#### Color Rationale

- `collecting` uses blue (`#7eb8d2`) — distinct from standby yellow, conveys active/in-progress state without alarm
- `captcha` uses highlight yellow-green (`#f0f545`) — maximum attention without red alarm; different enough from standby `#d2c87e` to be distinguishable

#### Tooltip Text Per State

| State | Tooltip |
|-------|---------|
| `active` | "DashPersona Collector — Ready" |
| `standby` | "DashPersona Collector — Not logged in" |
| `error` | "DashPersona Collector — Error (click for details)" |
| `collecting` | "DashPersona Collector — Collecting N creators…" |
| `captcha` | "DashPersona Collector — CAPTCHA required" |

#### Tray Menu Additions

When `status === 'collecting'`, add above the separator:
- "Show Progress Window" item (enabled)
- "Cancel Collection" item (enabled, destructive intent — no visual indicator in menu)

When `status === 'captcha'`, add above the separator:
- "Show Browser — Solve CAPTCHA" item (enabled, styled identically to other items)

#### Transition Behavior

- State transitions are immediate (no animation on tray icon itself — macOS handles icon refresh)
- On transition to `collecting`: open or focus the Batch Progress Window
- On transition from `collecting` back to `active` or `error`: tray icon updates; if Progress Window is open, it shows final summary state

---

### CAPTCHA Handling UI

**Requirement:** COLL-01 | **Decision:** D-03

#### Detection

Playwright page event handler monitors for navigation to known CAPTCHA challenge URLs and for DOM elements matching CAPTCHA selectors (`[id*="captcha"]`, `[class*="verify"]`, TikTok-specific: `#secsdk-captcha-drag-wrapper`).

#### CAPTCHA Pause Flow

1. Collection pauses for the affected creator (other queued creators remain queued — do not auto-start)
2. Tray icon changes to `captcha` (`#f0f545`)
3. In the Batch Progress Window, the affected creator row changes to CAPTCHA state
4. A native macOS notification fires (via Electron `Notification` API):
   - Title: "CAPTCHA Required"
   - Body: "Collection paused for @{creatorId}. Open the browser to solve it."
   - Action button: "Show Browser"
5. If the user clicks "Show Browser" in the notification OR clicks "Show Browser — Solve CAPTCHA" in the tray menu: the Playwright browser window is brought to the foreground via `BrowserWindow.focus()` or the Playwright page's underlying window is shown

#### CAPTCHA In-Window Banner

A fixed banner renders at the top of the Batch Progress Window when any creator has CAPTCHA status:

```
┌────────────────────────────────────────────────────────────────┐
│  [●] CAPTCHA required for @{creatorId}  [Show Browser]         │
└────────────────────────────────────────────────────────────────┘
```

- Background: `#1a1a0a` (yellow-tinted dark)
- Left border: `2px solid #f0f545`
- Padding: `10px 16px`
- Indicator dot: 6px circle `#f0f545`
- Text: Geist Sans 13px / `--text-primary` — "CAPTCHA required for @{handle}"
- "Show Browser" button: ghost variant, Geist Sans 13px / `--accent-highlight`
- Multiple CAPTCHA creators: banner shows count — "CAPTCHA required for 2 creators" with "Show Browser" cycling through them

#### Auto-Resume

- Playwright `page.waitForNavigation({ url: /^(?!.*captcha)/ })` with 5-minute timeout
- On successful navigation past CAPTCHA: collection resumes automatically for that creator
- Tray icon reverts to `collecting` (or `active` if all done)
- If 5-minute timeout expires without resolution: creator row changes to `failed` with error code `CAPTCHA_TIMEOUT`, message "CAPTCHA was not solved within 5 minutes"

---

### Run Log View

**Requirement:** COLL-08 | **Decision:** D-12, D-13, D-14

The Run Log View is a separate tab or section within the Collector Settings window, accessible via a tab navigation or by a "View Run Log" tray menu item that opens a dedicated `BrowserWindow`.

#### Run Log Window Properties

| Property | Value |
|----------|-------|
| BrowserWindow width | 720px |
| BrowserWindow height | 560px |
| Resizable | true (min: 560×400) |
| Frame | true |
| Title | "Collection History" |
| Background color | `#0a0f0d` |

#### Run Log Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [native frame — "Collection History"]                        │
├──────────────────────────────────────────────────────────────┤
│  TOOLBAR (48px, padding: 0 24px)                             │
│  [Platform: All ▼]  [Status: All ▼]   Showing 24 of 500     │
├──────────────────────────────────────────────────────────────┤
│  TABLE (flex: 1, overflow-y: auto)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Timestamp    │ Creator    │ Platform │ Status │ Duration│  │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ...rows...                                          │   │
│  └──────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  FOOTER (40px, padding: 0 24px)                              │
│  └ "500 entries · Retaining last 500 · [Settings]"           │
└──────────────────────────────────────────────────────────────┘
```

#### Toolbar

- Height: 48px, `display: flex`, `align-items: center`, `gap: 12px`, padding `0 24px`
- Background: `--bg-card`
- Bottom border: `1px solid --border-default`
- Platform filter: `<select>` styled same as settings dropdowns, width 120px
  - Options: "All Platforms", "TikTok", "Douyin", "XHS"
- Status filter: `<select>`, width 100px
  - Options: "All Statuses", "Success", "Failed", "CAPTCHA", "Skipped"
- Entry count: Geist Mono 12px / `--text-subtle`, right-aligned: "Showing N of N"

#### Run Log Table Columns

| Col | Header | Width | Alignment | Font |
|-----|--------|-------|-----------|------|
| Timestamp | "Timestamp" | 160px fixed | left | Geist Mono 11px / `--text-subtle` |
| Creator | "Creator" | flex 1 (min 140px) | left | Geist Sans 13px / `--text-primary` |
| Platform | "Platform" | 80px fixed | left | Geist Mono 11px / `--text-subtle` |
| Status | "Status" | 90px fixed | left | (pill — same spec as batch progress) |
| Duration | "Duration" | 80px fixed | right | Geist Mono 13px / `--text-secondary` |

- Column headers: same spec as batch progress table
- Row height: 40px (no error expansion in run log — errors are read-only history)
- Row hover: `--bg-row-hover`
- Click on a failed row: expands inline to show error code + message + remediation (same layout as batch progress error detail, same colors)
- Initial sort: timestamp descending (most recent first)
- No column re-sort UI in v1 (sort is fixed)

#### Timestamp Format

- Display format: `YYYY-MM-DD HH:MM:SS` in local time
- Geist Mono 11px / `--text-subtle`
- Full ISO string in `title` attribute for tooltip on hover

#### Duration Format

- Sub-1 minute: "0:SS" — e.g. "0:42"
- 1 minute+: "M:SS" — e.g. "2:07"
- Failed before any data: "—" (`--text-subtle`)

#### Footer Retention Indicator

- Height: 40px, `display: flex`, `align-items: center`, padding `0 24px`
- Background: `--bg-card`
- Top border: `1px solid --border-default`
- Text: Geist Sans 11px / `--text-subtle` — "N entries · Retaining last 500 · "
- "Settings" is a text link: `--accent-green`, no underline by default, underline on hover; opens Collector Settings window focused on the retention section

#### Empty State

When run log has no entries:
- Table area shows centered content (vertically and horizontally)
- Primary text: "No collections yet" — Geist Sans 14px / 500 / `--text-secondary`
- Secondary text: "Start collecting a creator to see history here" — Geist Sans 12px / `--text-subtle`
- No illustration, no icon

---

### Missed Run Notification Dialog

**Requirement:** COLL-05 | **Decision:** D-06

This is a native Electron dialog shown when `powerMonitor` detects a resume/unlock event and determines a scheduled job was missed.

#### Dialog Properties

Rendered as a small `BrowserWindow` (not `dialog.showMessageBox` — needs 3 custom buttons):

| Property | Value |
|----------|-------|
| Width | 400px |
| Height | 200px |
| Resizable | false |
| Frame | false (frameless, custom title bar) |
| Always on top | true |
| Background color | `#151d19` |
| Shadow | true |
| Border-radius via CSS | 8px (with `vibrancy: false`, `transparent: false`) |

#### Dialog Layout

```
┌──────────────────────────────────────────┐
│  Scheduled job missed                    │
│                                          │
│  The daily collection for 3 creators     │
│  was scheduled for 09:00 but the         │
│  system was asleep.                      │
│                                          │
│  [Run now]  [Skip this run]  [Run in...] │
└──────────────────────────────────────────┘
```

- Container: `padding: 24px`, `display: flex`, `flex-direction: column`, `gap: 16px`
- Title: Geist Sans 14px / 600 / `--text-primary`
- Body: Geist Sans 13px / 400 / `--text-secondary`, line-height 1.5
- Button row: `display: flex`, `gap: 8px`, `justify-content: flex-end`, `margin-top: 8px`
- "Run now": primary button
- "Skip this run": ghost button
- "Run in...": ghost button (triggers a sub-menu or inline time picker — spec below)

#### "Run in..." Sub-interaction

Clicking "Run in..." replaces the button row with:

```
Run in  [__] minutes   [Confirm]  [Cancel]
```

- Number input: Geist Mono 13px, width 56px, height 32px, background `--bg-input`, border `1px solid --border-default`, `border-radius: 4px`, text-align center
- Default value: 30
- Min: 5, Max: 480
- "Confirm": primary button (32px height)
- "Cancel": ghost button (returns to 3-button state)

---

## Copywriting Contract

### Status Labels

| State | Label | Notes |
|-------|-------|-------|
| Queued | "QUEUED" | All caps, Geist Mono |
| Running | "RUNNING" | All caps |
| Done | "DONE" | All caps |
| Failed | "FAILED" | All caps |
| CAPTCHA | "CAPTCHA" | All caps |
| Skipped | "SKIPPED" | All caps |

### Error Codes and Messages

Each error entry must include `code`, `message`, and `remediation`. Format:

```
TIKTOK_RATE_LIMITED
API returned HTTP 429 after 3 retries
Wait 10–15 minutes before retrying this creator.

CAPTCHA_TIMEOUT
CAPTCHA was not solved within 5 minutes
Solve the CAPTCHA in the browser window and try again.

TIKTOK_PROFILE_NOT_FOUND
Profile page returned 404 or empty user data
Check that the creator URL is correct and the account is public.

TIKTOK_NETWORK_ERROR
Network request failed (no response received)
Check your internet connection. If the issue persists, try restarting the Collector.

BROWSER_NOT_READY
Browser context is not initialized
Restart DashPersona Collector. If the issue continues, check the log at ~/.dashpersona/collector.log.

SCHEDULE_MISSED
Scheduled collection did not run — system was asleep
Choose to run now, skip, or delay in the notification dialog.
```

### Empty States

| Surface | Primary text | Secondary text |
|---------|-------------|----------------|
| Run log — no entries | "No collections yet" | "Start collecting a creator to see history here." |
| Run log — filter returns no results | "No matching entries" | "Try adjusting the platform or status filter." |
| Batch progress — no creators queued | "Nothing queued" | "Add creators via the Collector API or tray menu." |

### Confirmations

#### Cancel Batch Collection
- Title: "Cancel collection?"
- Body: "N creators are queued or in progress. Cancelling will stop the current run and discard any unfinished results."
- Confirm button: "Cancel collection" (destructive styling — `--accent-red` background)
- Dismiss button: "Keep running" (primary styling)

#### Purge Run Log Entries
- Title: "Purge old entries?"
- Body: "This will permanently delete N entries older than [threshold]. This cannot be undone."
- Sub-text (caption): "Retained entries: N. Entries to delete: N."
- Confirm button: "Delete N entries" (destructive)
- Dismiss button: "Keep all" (ghost)

### Scheduler Notifications (macOS native)

| Event | Title | Body |
|-------|-------|------|
| Scheduled run started | "Collection started" | "Collecting N creators on schedule." |
| Scheduled run complete (all success) | "Collection complete" | "N creators collected successfully." |
| Scheduled run complete (with failures) | "Collection complete" | "N of N creators succeeded. N failed — open Collector for details." |
| CAPTCHA detected | "CAPTCHA Required" | "Collection paused for @{handle}. Open the browser to solve it." |
| Missed run detected | "Scheduled job missed" | "The [daily] collection was scheduled for HH:MM. Choose what to do now." |

### Settings Copy

| Field | Label | Hint text |
|-------|-------|-----------|
| Scheduler toggle | "Enable scheduler" | (none) |
| Interval select | "Run every" | (none) |
| Next run display | "Next run" | (none) |
| Posts per creator | "Posts per creator" | "Collecting more posts improves analysis accuracy but takes longer." |
| Retention select | "Retain" | "Older entries are deleted automatically. You will be asked to confirm before any deletion." |
| Purge button | "Purge old entries" | (none) |

---

## IPC Channel Naming

Defined here for implementer reference. Used in `preload.ts` and main process event emitters.

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `collection:status-update` | main → renderer | `CollectionStatusUpdate` | Per-creator status row update for Progress Window |
| `collection:batch-complete` | main → renderer | `BatchSummary` | Signals all creators finished |
| `collection:captcha-detected` | main → renderer | `{ creatorId, handle }` | Triggers CAPTCHA banner in Progress Window |
| `collection:captcha-resolved` | main → renderer | `{ creatorId }` | Clears CAPTCHA banner for that creator |
| `collection:cancel` | renderer → main | none | User requested batch cancel |
| `settings:save` | renderer → main | `SettingsDelta` | Save settings from Settings Window |
| `settings:load` | renderer → main | none (request) | Load current settings |
| `settings:loaded` | main → renderer | `CollectorConfig` | Response to settings:load |
| `runlog:open` | renderer → main | none | Open Run Log window |
| `missed-run:response` | renderer → main | `{ action: 'now' \| 'skip' \| 'delay', delayMinutes?: number }` | User response to missed run dialog |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None | N/A — vanilla HTML/CSS in Electron BrowserWindows | Not required |

No npm packages are added for UI. All UI is implemented with:
- Plain HTML structure
- CSS custom properties (design tokens inlined in `<style>`)
- Vanilla JS for DOM updates and IPC via `contextBridge` preload
- Geist fonts loaded via `@font-face` from bundled font files already present in the project

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-03-31

**Note:** D-03 specifies "remaining creators continue if possible" during CAPTCHA, but this spec pauses the queue (line 462). Accepted — safer for sequential single-context collection per D-07. CONTEXT.md D-03 should be updated to match during implementation.

---

*UI-SPEC created: 2026-03-31*
*Author: ui-designer agent*
*Phase: 02-collector-capabilities*
