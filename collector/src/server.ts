import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import { BrowserManager } from './browser';

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

interface CollectorError {
  error: string;
  code: string;
}

const REQUEST_TIMEOUT_MS = 30_000;

function classifyError(err: unknown): CollectorError {
  const message = err instanceof Error ? err.message : String(err);

  if (/target closed|target page, context or browser has been closed/i.test(message)) {
    return { error: 'Page was closed or navigated away', code: 'TARGET_CLOSED' };
  }
  if (/timeout/i.test(message)) {
    return { error: 'Navigation timed out', code: 'TIMEOUT' };
  }
  if (/browser.*not initialized|not ready/i.test(message)) {
    return { error: 'Browser is not running', code: 'BROWSER_NOT_READY' };
  }
  return { error: message, code: 'INTERNAL_ERROR' };
}

// ---------------------------------------------------------------------------
// Express app factory
// ---------------------------------------------------------------------------

export function createServer(browserManager: BrowserManager): express.Express {
  const app = express();

  // Parse text/plain bodies (cdp-adapter sends JS code and selectors this way)
  app.use(express.text({ type: '*/*' }));

  // Request timeout middleware — abort if handler takes >30s
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timed out', code: 'REQUEST_TIMEOUT' });
      }
    }, REQUEST_TIMEOUT_MS);
    res.on('finish', () => clearTimeout(timer));
    next();
  });

  // ── GET /health ──────────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    if (browserManager.isReady()) {
      res.json({ status: 'ok' });
    } else {
      res.status(503).json({ status: 'error', message: 'Browser not ready' });
    }
  });

  // ── GET /new?url=... ─────────────────────────────────────────

  app.get('/new', async (req: Request, res: Response) => {
    const url = req.query.url as string | undefined;
    if (!url) {
      res.status(400).json({ error: 'Missing url query parameter' });
      return;
    }
    try {
      const { targetId } = await browserManager.newPage(url);
      res.json({ targetId });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  // ── POST /eval?target=... ────────────────────────────────────

  app.post('/eval', async (req: Request, res: Response) => {
    const targetId = req.query.target as string | undefined;
    if (!targetId) {
      res.status(400).json({ error: 'Missing target query parameter' });
      return;
    }

    const page = browserManager.getPage(targetId);
    if (!page) {
      res.status(404).json({ error: `Target ${targetId} not found` });
      return;
    }

    const code = typeof req.body === 'string' ? req.body : String(req.body);
    if (!code) {
      res.status(400).json({ error: 'Missing JavaScript code in request body' });
      return;
    }

    try {
      const value = await page.evaluate(code);
      res.json({ value });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  // ── POST /click?target=... ───────────────────────────────────
  // cdp-adapter sends selector as text/plain body

  app.post('/click', async (req: Request, res: Response) => {
    const targetId = req.query.target as string | undefined;
    if (!targetId) {
      res.status(400).json({ error: 'Missing target query parameter' });
      return;
    }

    const page = browserManager.getPage(targetId);
    if (!page) {
      res.status(404).json({ error: `Target ${targetId} not found` });
      return;
    }

    const selector = typeof req.body === 'string' ? req.body : String(req.body);
    if (!selector) {
      res.status(400).json({ error: 'Missing selector in request body' });
      return;
    }

    try {
      await page.click(selector);
      res.json({ success: true });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  // ── GET /scroll?target=...&direction=... ─────────────────────
  // cdp-adapter calls: /scroll?target=...&direction=bottom (GET, no body)

  app.get('/scroll', async (req: Request, res: Response) => {
    const targetId = req.query.target as string | undefined;
    if (!targetId) {
      res.status(400).json({ error: 'Missing target query parameter' });
      return;
    }

    const page = browserManager.getPage(targetId);
    if (!page) {
      res.status(404).json({ error: `Target ${targetId} not found` });
      return;
    }

    const direction = (req.query.direction as string) || 'bottom';

    try {
      if (direction === 'top') {
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        // 'bottom' or default — scroll down by one viewport height
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      }
      res.json({ success: true });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  // ── GET /navigate?target=...&url=... ─────────────────────────

  app.get('/navigate', async (req: Request, res: Response) => {
    const targetId = req.query.target as string | undefined;
    const url = req.query.url as string | undefined;
    if (!targetId) {
      res.status(400).json({ error: 'Missing target query parameter' });
      return;
    }
    if (!url) {
      res.status(400).json({ error: 'Missing url query parameter' });
      return;
    }

    const page = browserManager.getPage(targetId);
    if (!page) {
      res.status(404).json({ error: `Target ${targetId} not found` });
      return;
    }

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      res.json({ success: true });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  // ── GET /close?target=... ────────────────────────────────────

  app.get('/close', async (req: Request, res: Response) => {
    const targetId = req.query.target as string | undefined;
    if (!targetId) {
      res.status(400).json({ error: 'Missing target query parameter' });
      return;
    }

    try {
      await browserManager.closePage(targetId);
      res.json({ success: true });
    } catch (err) {
      const classified = classifyError(err);
      res.status(500).json(classified);
    }
  });

  return app;
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let serverInstance: http.Server | null = null;

export async function startServer(
  browserManager: BrowserManager,
  port: number = 3458,
): Promise<http.Server> {
  const app = createServer(browserManager);

  return new Promise((resolve, reject) => {
    serverInstance = app.listen(port, '127.0.0.1', () => {
      console.log(`[collector] HTTP API listening on 127.0.0.1:${port}`);
      resolve(serverInstance!);
    });
    serverInstance.on('error', reject);
  });
}

export async function stopServer(): Promise<void> {
  if (!serverInstance) return;
  return new Promise((resolve, reject) => {
    serverInstance!.close((err) => {
      serverInstance = null;
      if (err) reject(err);
      else resolve();
    });
  });
}
