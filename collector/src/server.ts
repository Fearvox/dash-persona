import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import { join } from 'path';
import { BrowserManager } from './browser';
import { atomicWriteJSON, getDataDir, ensureDataDir, classifyStorageError } from './storage';
import { collectAndSave, classifyTikTokError } from './tiktok-collector';
import {
  validateCreatorSnapshot,
  snapshotFilename,
  SNAPSHOT_SCHEMA_VERSION,
  type CreatorSnapshot,
  type CreatorProfile,
} from './snapshot-types';

// ── SSE client registry ─────────────────────────────────────────────────────
const sseClients = new Set<Response>();

/** Broadcast an SSE event to all connected web app clients (D-10 secondary). */
export function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

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
  app.use(express.text({ type: 'text/*' }));

  // Parse JSON bodies for /snapshot endpoint
  app.use(express.json({ limit: '10mb' }));

  // Request timeout middleware — applies to all routes EXCEPT /collect (which can take 90s+)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/collect') {
      next();
      return;
    }
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

  // ── GET /events (SSE) ────────────────────────────────────────────
  // Server-Sent Events stream for real-time collection status.
  // Web app subscribes to this endpoint in Phase 3.

  app.get('/events', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.flushHeaders();

    // Initial heartbeat so client knows the connection is live
    res.write('event: connected\ndata: {}\n\n');

    sseClients.add(res);

    _req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // ── GET /run-log ─────────────────────────────────────────────────
  app.get('/run-log', async (_req: Request, res: Response) => {
    try {
      const { loadRunLog } = await import('./run-log');
      const entries = await loadRunLog();
      const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      res.json({ entries: sorted, total: entries.length });
    } catch (err) {
      res.status(500).json({ entries: [], total: 0, error: String(err) });
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

  // ── POST /snapshot ────────────────────────────────────────────
  // Accept a CreatorProfile from the web app, wrap in CreatorSnapshot,
  // validate, and atomically write to ~/.dashpersona/data/.

  app.post('/snapshot', async (req: Request, res: Response) => {
    const body = req.body as unknown;

    if (!body || typeof body !== 'object') {
      res.status(400).json({
        error: 'Request body must be a JSON object containing a CreatorProfile',
        code: 'INVALID_REQUEST_BODY',
      });
      return;
    }

    const profile = body as CreatorProfile;

    const platform = profile?.platform;
    const uniqueId = profile?.profile?.uniqueId;

    if (!platform || typeof platform !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid "platform" field in profile',
        code: 'MISSING_PLATFORM',
      });
      return;
    }
    if (!uniqueId || typeof uniqueId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid "profile.uniqueId" field',
        code: 'MISSING_UNIQUE_ID',
      });
      return;
    }

    const collectedAt = new Date().toISOString();

    const snapshot: CreatorSnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      collectedAt,
      platform,
      uniqueId,
      profile,
    };

    const validation = validateCreatorSnapshot(snapshot);
    if (!validation.valid) {
      res.status(422).json({
        error: 'Profile data failed validation — snapshot not written',
        code: 'WRITE_VALIDATION_FAILED',
        details: validation.errors,
        remediation: 'Ensure the profile data is complete and conforms to CreatorProfile schema.',
      });
      return;
    }

    try {
      await ensureDataDir();
      const filename = snapshotFilename(platform, uniqueId, collectedAt);
      const filePath = join(getDataDir(), filename);
      await atomicWriteJSON(filePath, snapshot);
      res.json({ success: true, filename, collectedAt, filePath });
    } catch (err) {
      const classified = classifyStorageError(err, getDataDir());
      res.status(500).json(classified);
    }
  });

  // ── POST /collect ─────────────────────────────────────────────
  // Trigger TikTok collection for a given handle. Returns snapshot metadata.
  // Request body: { handle: string; postCount?: number }
  // NOTE: This endpoint does NOT log to run-log — BatchQueue is the single
  // run-log owner (Review #1, #4). It does NOT persist snapshots separately —
  // that is done inside collectTikTok(). This endpoint only orchestrates.

  app.post('/collect', async (req: Request, res: Response) => {
    const body = req.body as { handle?: unknown; postCount?: unknown };

    const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
    if (!handle) {
      res.status(400).json({
        error: 'Missing or invalid "handle" field',
        code: 'MISSING_HANDLE',
      });
      return;
    }

    const postCount =
      typeof body.postCount === 'number' && body.postCount > 0
        ? Math.min(body.postCount, 100)
        : 20;

    try {
      const result = await collectAndSave({ handle, postCount });
      res.json(result);
    } catch (err) {
      const classified = classifyTikTokError(err);
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
