import { app } from 'electron';
import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import crypto from 'crypto';

export type BrowserStatus = 'active' | 'standby' | 'error';

export class BrowserManager {
  private static instance: BrowserManager;

  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private status: BrowserStatus = 'standby';

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
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
      args: ['--no-sandbox'],
    });

    this.status = 'active';
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

    this.status = 'standby';
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
        (c) => c.domain.includes('.xiaohongshu.com') && c.name === 'customer-sesi-v1'
      );
    }

    return false;
  }

  showLoginWindow(): void {
    // In persistent context mode, the browser window is already visible
    // when launched with headless: false. This is a no-op placeholder
    // for future BrowserWindow.show() integration via Electron IPC.
  }

  hideWindow(): void {
    // Hiding requires Electron BrowserWindow control over the Chromium
    // instance, which persistent context doesn't directly expose.
    // Placeholder for future headless toggle or window minimization.
  }
}
