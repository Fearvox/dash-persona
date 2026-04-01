import { app } from 'electron';
import { chromium as chromiumBase } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { BrowserContext, Page } from 'playwright';
import path from 'path';
import crypto from 'crypto';

// Apply stealth plugin once at module load
chromiumBase.use(StealthPlugin());
const chromium = chromiumBase;

export type BrowserStatus = 'active' | 'standby' | 'error' | 'collecting' | 'captcha';

export type StatusChangeCallback = (status: BrowserStatus, error?: string) => void;

export class BrowserManager {
  private static instance: BrowserManager;

  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private status: BrowserStatus = 'standby';
  private loginPages: Map<'douyin' | 'xhs', Page> = new Map();
  private onStatusChange: StatusChangeCallback | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  setStatusChangeCallback(cb: StatusChangeCallback): void {
    this.onStatusChange = cb;
  }

  getStatus(): BrowserStatus {
    return this.status;
  }

  private setStatus(status: BrowserStatus, error?: string): void {
    this.status = status;
    this.onStatusChange?.(status, error);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.context) return;

    const profileDir = path.join(
      app.getPath('userData'),
      'browser-profile'
    );

    this.context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--lang=zh-CN,zh',
      ],
    });

    // Apply init script to every page in this context
    await this.context.addInitScript(() => {
      // 1. Delete cdc_ properties injected by CDP/Playwright
      const deleteProps = (obj: object): void => {
        for (const key of Object.keys(obj)) {
          if (key.startsWith('cdc_')) {
            delete (obj as Record<string, unknown>)[key];
          }
        }
      };
      deleteProps(window);
      deleteProps(document);

      // 2. Override navigator.webdriver to undefined
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // 3. Restore navigator.plugins (TikTok checks for empty array)
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
        configurable: true,
      });

      // 4. Restore navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
        configurable: true,
      });

      // 5. Add chrome runtime stub
      const w = window as unknown as { chrome?: { runtime: Record<string, unknown> } };
      if (!w.chrome) {
        w.chrome = { runtime: {} };
      }
    });

    // 6. Patch Electron UA: remove the "Electron/X.Y.Z " fragment
    const pages = this.context.pages();
    const testPage = pages[0] ?? await this.context.newPage();
    const ua: string = await testPage.evaluate(() => navigator.userAgent);
    if (ua.includes('Electron')) {
      await this.context.setExtraHTTPHeaders({
        'User-Agent': ua.replace(/Electron\/[\d.]+ /, ''),
      });
    }
    if (pages.length === 0) await testPage.close();

    this.context.on('close', () => {
      this.context = null;
      this.setStatus('error', 'Browser context closed unexpectedly');
    });

    this.setStatus('active');
  }

  async shutdown(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const [id, page] of this.pages) {
      closePromises.push(page.close().then(() => { this.pages.delete(id); }));
    }
    await Promise.all(closePromises);

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.setStatus('standby');
  }

  isReady(): boolean {
    return this.context !== null && this.status === 'active';
  }

  // ── Page management ────────────────────────────────────────

  private generateTargetId(): string {
    return crypto.randomUUID();
  }

  async newPage(url: string): Promise<{ targetId: string }> {
    if (!this.context) throw new Error('Browser not initialized. Call init() first.');

    const page = await this.context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const targetId = this.generateTargetId();
    this.pages.set(targetId, page);

    page.once('close', () => {
      this.pages.delete(targetId);
    });

    return { targetId };
  }

  getPage(targetId: string): Page | undefined {
    return this.pages.get(targetId);
  }

  async closePage(targetId: string): Promise<void> {
    const page = this.pages.get(targetId);
    if (!page) return;
    this.pages.delete(targetId);
    await page.close();
  }

  // ── Login state ────────────────────────────────────────────

  async isLoggedIn(platform: 'douyin' | 'xhs'): Promise<boolean> {
    if (!this.context) return false;

    const cookies = await this.context.cookies();

    if (platform === 'douyin') {
      return cookies.some(
        (c) => c.domain.includes('.douyin.com') && c.name === 'sessionid'
      );
    }

    if (platform === 'xhs') {
      return cookies.some(
        (c) => c.domain.includes('.xiaohongshu.com') && c.name === 'a1'
      );
    }

    return false;
  }

  async showLoginWindow(platform?: 'douyin' | 'xhs'): Promise<void> {
    if (!this.context) return;

    const targets: Array<{ platform: 'douyin' | 'xhs'; url: string }> = platform
      ? [{ platform, url: platform === 'douyin' ? 'https://creator.douyin.com' : 'https://www.xiaohongshu.com/' }]
      : [
          { platform: 'douyin', url: 'https://creator.douyin.com' },
          { platform: 'xhs', url: 'https://www.xiaohongshu.com/' },
        ];

    for (const target of targets) {
      const existing = this.loginPages.get(target.platform);
      if (existing && !existing.isClosed()) continue;

      const page = await this.context.newPage();
      await page.goto(target.url, { waitUntil: 'domcontentloaded' });
      this.loginPages.set(target.platform, page);

      page.once('close', () => {
        if (this.loginPages.get(target.platform) === page) {
          this.loginPages.delete(target.platform);
        }
      });
    }
  }

  async checkAndHideLoginWindow(): Promise<void> {
    if (this.loginPages.size === 0) return;

    const [douyin, xhs] = await Promise.all([
      this.isLoggedIn('douyin'),
      this.isLoggedIn('xhs'),
    ]);

    const closePromises: Promise<void>[] = [];

    if (douyin) {
      const page = this.loginPages.get('douyin');
      if (page && !page.isClosed()) {
        this.loginPages.delete('douyin');
        closePromises.push(page.close());
      }
    }

    if (xhs) {
      const page = this.loginPages.get('xhs');
      if (page && !page.isClosed()) {
        this.loginPages.delete('xhs');
        closePromises.push(page.close());
      }
    }

    await Promise.all(closePromises);
  }

  async hideWindow(): Promise<void> {
    if (!this.context) return;

    // Close pages not tracked by the pages Map (e.g. login windows)
    const managedPages = new Set(this.pages.values());
    const closePromises: Promise<void>[] = [];
    for (const page of this.context.pages()) {
      if (!managedPages.has(page)) {
        closePromises.push(page.close());
      }
    }
    await Promise.all(closePromises);
  }
}
