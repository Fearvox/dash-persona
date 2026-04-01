import { Tray, Menu, nativeImage, app, Notification, type NativeImage } from 'electron';
import { deflateSync } from 'zlib';
import { BrowserManager, type BrowserStatus } from './browser';

const ICON_SIZE = 16;

function createCircleIcon(color: string): NativeImage {
  const width = ICON_SIZE;
  const height = ICON_SIZE;
  const channels = 4; // RGBA
  const pixels = new Uint8Array(width * height * channels);

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const cx = width / 2;
  const cy = height / 2;
  const radius = 6;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        const offset = (y * width + x) * channels;
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255;
        pixels[offset] = r;
        pixels[offset + 1] = g;
        pixels[offset + 2] = b;
        pixels[offset + 3] = alpha;
      }
    }
  }

  return nativeImage.createFromBuffer(
    Buffer.from(encodePNG(width, height, pixels)),
    { width, height, scaleFactor: 2.0 }
  );
}

// ── Minimal PNG encoder (no external dependencies) ───────────

function encodePNG(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: raw pixel data with filter byte per row
  const rowLen = width * 4 + 1;
  const rawData = new Uint8Array(height * rowLen);
  for (let y = 0; y < height; y++) {
    rawData[y * rowLen] = 0; // filter: None
    rawData.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * rowLen + 1);
  }

  const compressed = new Uint8Array(deflateSync(rawData));

  return concat([
    signature,
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', compressed),
    buildChunk('IEND', new Uint8Array(0)),
  ]);
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  const crcInput = concat([typeBytes, data]);

  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length);

  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32(crcInput) >>> 0);

  return concat([len, typeBytes, data, crc]);
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return c ^ 0xffffffff;
}

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c);
  }
  return table;
})();

// Pre-build status icons
const STATUS_COLORS: Record<BrowserStatus, string> = {
  active: '#7ed29a',     // green — logged in, ready
  standby: '#d2c87e',    // yellow — running, not logged in
  error: '#c87e7e',      // red — crash or failure
  collecting: '#7eb8d2', // blue — collection in progress
  captcha: '#f0f545',    // highlight — CAPTCHA needs attention
};

const REFRESH_INTERVAL_MS = 30_000;

export class TrayManager {
  private tray: Tray | null = null;
  private browserManager: BrowserManager;
  private icons: Record<BrowserStatus, NativeImage> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private douyinLoggedIn = false;
  private xhsLoggedIn = false;
  private lastError: string | null = null;
  /** Transient status that takes precedence over periodic recomputation. */
  private lockedStatus: BrowserStatus | null = null;

  // ── Collection state ─────────────────────────────────────────
  private collectionCreatorCount = 0;
  private currentCollectionStatus: 'collecting' | 'captcha' | null = null;

  // ── Window/action callbacks (set by main.ts) ─────────────────
  private onOpenProgressWindow: (() => void) | null = null;
  private onCancelCollection: (() => void) | null = null;
  private onShowBrowser: (() => void) | null = null;
  private onOpenSettings: (() => void) | null = null;
  private onOpenRunLog: (() => void) | null = null;

  // ── Missed run callbacks ──────────────────────────────────────
  private missedRunCount = 0;
  private onRunMissedNow: (() => void) | null = null;
  private onSkipMissed: (() => void) | null = null;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Lock the tray status to a transient state (collecting/captcha).
   * Periodic recomputation via updateStatus() will be a no-op while locked.
   */
  lockStatus(status: 'collecting' | 'captcha'): void {
    this.lockedStatus = status;
    this.applyStatus(status);
  }

  /** Clear the transient lock, allowing periodic recomputation to resume. */
  unlockStatus(): void {
    this.lockedStatus = null;
  }

  setCollectionState(status: 'collecting' | 'captcha', creatorCount: number): void {
    this.currentCollectionStatus = status;
    this.collectionCreatorCount = creatorCount;
    // Use lockStatus (Review #3) to prevent periodic recomputation from overriding
    this.lockStatus(status);
    if (this.tray) {
      const tooltip =
        status === 'captcha'
          ? 'DashPersona Collector — CAPTCHA required'
          : `DashPersona Collector — Collecting ${creatorCount} creator${creatorCount !== 1 ? 's' : ''}…`;
      this.tray.setToolTip(tooltip);
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  clearCollectionState(): void {
    this.currentCollectionStatus = null;
    this.collectionCreatorCount = 0;
    // Unlock tray status so periodic recomputation can resume (Review #3)
    this.unlockStatus();
    if (this.tray) {
      this.tray.setToolTip('DashPersona Collector — Ready');
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  setCollectionCallbacks(callbacks: {
    openProgressWindow: () => void;
    cancelCollection: () => void;
    showBrowser: () => void;
  }): void {
    this.onOpenProgressWindow = callbacks.openProgressWindow;
    this.onCancelCollection = callbacks.cancelCollection;
    this.onShowBrowser = callbacks.showBrowser;
  }

  setWindowCallbacks(callbacks: {
    openSettings: () => void;
    openRunLog: () => void;
  }): void {
    this.onOpenSettings = callbacks.openSettings;
    this.onOpenRunLog = callbacks.openRunLog;
  }

  /** Called by Scheduler.setOnMissedRunsChanged callback. */
  setMissedRunCount(count: number): void {
    this.missedRunCount = count;
    if (this.tray) {
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  setMissedRunCallbacks(callbacks: {
    runMissedNow: () => void;
    skipMissed: () => void;
  }): void {
    this.onRunMissedNow = callbacks.runMissedNow;
    this.onSkipMissed = callbacks.skipMissed;
  }

  init(): void {
    // Lazy-build icons (nativeImage requires Electron app ready)
    this.icons = Object.fromEntries(
      Object.entries(STATUS_COLORS).map(([k, v]) => [k, createCircleIcon(v)])
    ) as Record<BrowserStatus, NativeImage>;

    this.tray = new Tray(this.icons.standby);
    this.tray.setToolTip('DashPersona Collector');

    this.tray.setContextMenu(this.buildMenu());

    // Listen for browser status changes (e.g. crash)
    this.browserManager.setStatusChangeCallback((status, error) => {
      this.updateStatus(status);
      if (status === 'error' && error) {
        this.setLastError(error);
      }
    });

    // Start periodic login status refresh
    this.refreshLoginStatus();
    this.refreshTimer = setInterval(() => {
      this.refreshLoginStatus();
    }, REFRESH_INTERVAL_MS);
  }

  setLastError(message: string): void {
    this.lastError = message;
    if (this.tray) {
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  clearLastError(): void {
    if (this.lastError) {
      this.lastError = null;
      if (this.tray) {
        this.tray.setContextMenu(this.buildMenu());
      }
    }
  }

  updateStatus(status: BrowserStatus): void {
    // If a transient status (collecting/captcha) is locked, do not override it
    if (this.lockedStatus !== null) return;
    this.applyStatus(status);
  }

  private applyStatus(status: BrowserStatus): void {
    if (!this.tray || !this.icons) return;
    this.tray.setImage(this.icons[status]);
  }

  buildMenu(): Menu {
    const autoLaunch = app.getLoginItemSettings().openAtLogin;

    // ── Collection state items ────────────────────────────────────
    const collectionItems: Electron.MenuItemConstructorOptions[] =
      this.currentCollectionStatus === 'collecting'
        ? [
            {
              label: 'Show Progress Window',
              click: () => { this.onOpenProgressWindow?.(); },
            },
            {
              label: 'Cancel Collection',
              click: () => { this.onCancelCollection?.(); },
            },
            { type: 'separator' },
          ]
        : this.currentCollectionStatus === 'captcha'
        ? [
            {
              label: 'Show Browser — Solve CAPTCHA',
              click: () => { this.onShowBrowser?.(); },
            },
            { type: 'separator' },
          ]
        : [];

    // ── Missed run items (Review #2) ─────────────────────────────
    const missedRunItems: Electron.MenuItemConstructorOptions[] =
      this.missedRunCount > 0
        ? [
            { type: 'separator' },
            {
              label: `Missed runs (${this.missedRunCount})`,
              enabled: false,  // label only
            },
            {
              label: '  Run all now',
              click: () => { this.onRunMissedNow?.(); },
            },
            {
              label: '  Skip all',
              click: () => { this.onSkipMissed?.(); },
            },
          ]
        : [];

    return Menu.buildFromTemplate([
      ...collectionItems,
      {
        label: this.douyinLoggedIn
          ? 'Douyin 已登录 ✓'
          : '打开 Douyin 登录',
        enabled: !this.douyinLoggedIn,
        click: () => {
          void this.browserManager.showLoginWindow('douyin');
        },
      },
      {
        label: this.xhsLoggedIn
          ? 'XHS 已登录 ✓'
          : '打开 XHS 登录',
        enabled: !this.xhsLoggedIn,
        click: () => {
          void this.browserManager.showLoginWindow('xhs');
        },
      },
      ...(this.lastError
        ? [
            { type: 'separator' as const },
            { label: `⚠ ${this.lastError}`, enabled: false },
          ]
        : []),
      ...missedRunItems,
      { type: 'separator' },
      {
        label: '开机自启动',
        type: 'checkbox',
        checked: autoLaunch,
        click: (menuItem: { checked: boolean }) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        },
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => { this.onOpenSettings?.(); },
      },
      {
        label: 'Collection History',
        click: () => { this.onOpenRunLog?.(); },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
    ]);
  }

  async refreshLoginStatus(): Promise<void> {
    const [douyin, xhs] = await Promise.all([
      this.browserManager.isLoggedIn('douyin'),
      this.browserManager.isLoggedIn('xhs'),
    ]);

    this.douyinLoggedIn = douyin;
    this.xhsLoggedIn = xhs;

    // Auto-hide login window once both platforms are logged in
    if (douyin && xhs) {
      await this.browserManager.checkAndHideLoginWindow();
    }

    // Derive tray icon status from login state
    if (douyin || xhs) {
      this.updateStatus('active');
      this.clearLastError();
    } else if (this.browserManager.isReady()) {
      this.updateStatus('standby');
    } else {
      this.updateStatus('error');
    }

    // Rebuild menu with updated labels
    if (this.tray) {
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  /**
   * Show a desktop notification guiding the user to complete login.
   * Call this after opening login windows so the user knows to act.
   */
  showLoginRequiredNotification(): void {
    if (!Notification.isSupported()) return;
    const notification = new Notification({
      title: 'DASH Collector — 需要登录',
      body: '请在打开的浏览器窗口中扫码登录 Douyin 和小红书。登录成功后此提示将自动消失。',
      silent: false,
    });
    notification.show();
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
