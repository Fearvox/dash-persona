import path from 'path';
import { app, BrowserWindow, ipcMain, BrowserWindow as ElectronBrowserWindow } from 'electron';
import { BrowserManager } from './browser';
import { startServer, stopServer, broadcastSSE } from './server';
import { TrayManager } from './tray';
import { initConfig, getConfig, saveConfig } from './config';
import { ensureDataDir } from './storage';
import { getScheduler } from './scheduler';
import { getBatchQueue } from './batch-queue';
import { pruneRunLog } from './run-log';
import type { CollectorConfig } from './config';
import type { EnqueueRequest } from './scheduler';

// ── Constants ────────────────────────────────────────────────
const API_PORT = 3458;
const MAX_BROWSER_RETRIES = 3;

// ── State ────────────────────────────────────────────────────
let browserManager: BrowserManager;
let trayManager: TrayManager | null = null;
let schedulerInstance: ReturnType<typeof getScheduler> | null = null;
let browserRetries = 0;
let progressWindow: ElectronBrowserWindow | null = null;
let settingsWindow: ElectronBrowserWindow | null = null;
let runLogWindow: ElectronBrowserWindow | null = null;

// ── Window factory functions ─────────────────────────────────

function openProgressWindow(): ElectronBrowserWindow {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.focus();
    return progressWindow;
  }
  progressWindow = new ElectronBrowserWindow({
    width: 680,
    height: 480,
    minWidth: 580,
    minHeight: 360,
    resizable: true,
    title: 'Collection Progress',
    backgroundColor: '#0a0f0d',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  progressWindow.loadFile(path.join(__dirname, '../ui/progress.html'));
  progressWindow.on('closed', () => { progressWindow = null; });
  return progressWindow;
}

function openSettingsWindow(): ElectronBrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new ElectronBrowserWindow({
    width: 480,
    height: 520,
    resizable: false,
    title: 'Collector Settings',
    backgroundColor: '#0a0f0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(path.join(__dirname, '../ui/settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
  return settingsWindow;
}

function openRunLogWindow(): ElectronBrowserWindow {
  if (runLogWindow && !runLogWindow.isDestroyed()) {
    runLogWindow.focus();
    return runLogWindow;
  }
  runLogWindow = new ElectronBrowserWindow({
    width: 720,
    height: 560,
    minWidth: 560,
    minHeight: 400,
    resizable: true,
    title: 'Collection History',
    backgroundColor: '#0a0f0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  runLogWindow.loadFile(path.join(__dirname, '../ui/run-log.html'));
  runLogWindow.on('closed', () => { runLogWindow = null; });
  return runLogWindow;
}

// ── Single instance lock ─────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  console.log('[collector] Another instance is already running. Exiting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus any existing window when a second instance is attempted
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // ── Startup ──────────────────────────────────────────────────

  app.whenReady().then(async () => {
    try {
      // 1. Init config store (must be first — other modules may read config)
      initConfig();
      console.log('[collector] Config initialized');

      // 2. Ensure data directory exists
      await ensureDataDir();
      console.log('[collector] Data directory ready');

      // 2.5. Init scheduler (loads jobs.json, registers cron tasks, hooks powerMonitor)
      schedulerInstance = getScheduler();
      // Placeholder enqueue — replaced in step 6 below after BatchQueue is available
      schedulerInstance.setEnqueueFn((_requests: EnqueueRequest[]) => {
        console.log('[main] Scheduler fired — BatchQueue not yet linked');
      });
      await schedulerInstance.init();
      console.log('[collector] Scheduler initialized');

      // 3. Init browser
      browserManager = BrowserManager.getInstance();
      await browserManager.init();
      console.log('[collector] Browser context initialized');

      // 4. Start HTTP API server
      await startServer(browserManager, API_PORT);
      console.log(`[collector] Server started on port ${API_PORT}`);

      // 5. Init tray
      trayManager = new TrayManager(browserManager);
      trayManager.init();
      console.log('[collector] Tray initialized');

      // 5.5 Init batch queue and wire IPC update callback
      const batchQueue = getBatchQueue();

      batchQueue.setOnUpdate((items) => {
        // IPC -> progress window
        if (progressWindow && !progressWindow.isDestroyed()) {
          progressWindow.webContents.send('collection:status-update', items);
        }
        // SSE -> web app (Phase 3)
        broadcastSSE('batch:update', items);

        // Update tray icon based on batch state
        const running = items.filter((i) => i.status === 'running' || i.status === 'queued');
        const allDone = items.every((i) => ['done', 'failed', 'skipped'].includes(i.status));
        if (allDone && items.length > 0) {
          trayManager?.clearCollectionState();
          const summary = {
            total: items.length,
            done: items.filter((i) => i.status === 'done').length,
            failed: items.filter((i) => i.status === 'failed').length,
          };
          progressWindow?.webContents.send('collection:batch-complete', summary);
          broadcastSSE('batch:complete', summary);
        } else if (running.length > 0) {
          trayManager?.setCollectionState('collecting', running.length);
          // Auto-open progress window on first batch start
          if (!progressWindow || progressWindow.isDestroyed()) {
            openProgressWindow();
          }
        }
      });

      batchQueue.setOnCaptchaDetected((handle) => {
        trayManager?.setCollectionState('captcha', 0);
        const payload = { creatorId: handle, handle };
        progressWindow?.webContents.send('collection:captcha-detected', payload);
        broadcastSSE('captcha', { creatorUniqueId: handle, message: `CAPTCHA required for @${handle}` });
      });

      batchQueue.setOnCaptchaResolved((handle) => {
        trayManager?.setCollectionState('collecting', 1);
        progressWindow?.webContents.send('collection:captcha-resolved', { creatorId: handle });
      });

      // 6. Wire scheduler enqueue function to the real BatchQueue
      const scheduler = getScheduler();
      scheduler.setEnqueueFn((requests: EnqueueRequest[]) => {
        batchQueue.enqueue(
          requests.map((r) => ({
            creatorUniqueId: r.creatorUniqueId,
            platform: r.platform,
            postCount: r.postCount,
            context: r.triggeredBy === 'scheduler' ? 'scheduled' as const : 'manual' as const,
          })),
        );
      });

      // Wire missed-run tray updates (Review #2)
      scheduler.setOnMissedRunsChanged((missed) => {
        trayManager?.setMissedRunCount(missed.length);
      });
      trayManager?.setMissedRunCallbacks({
        runMissedNow: () => scheduler.runMissedNow(),
        skipMissed: () => scheduler.skipMissedRuns(),
      });

      console.log('[collector] BatchQueue and Scheduler linked');

      // 7. Set tray callbacks for window opening and collection actions
      trayManager?.setCollectionCallbacks({
        openProgressWindow: () => openProgressWindow(),
        cancelCollection: () => batchQueue.cancelAll(),
        showBrowser: async () => {
          await browserManager.showLoginWindow();
          // If neither platform is logged in, show desktop notification to guide user
          const [douyin, xhs] = await Promise.all([
            browserManager.isLoggedIn('douyin'),
            browserManager.isLoggedIn('xhs'),
          ]);
          if (!douyin && !xhs) {
            trayManager?.showLoginRequiredNotification();
          }
        },
      });
      trayManager?.setWindowCallbacks({
        openSettings: () => openSettingsWindow(),
        openRunLog: () => openRunLogWindow(),
      });

      // 8. Register IPC handlers
      ipcMain.on('collection:cancel', () => {
        batchQueue.cancelAll();
      });

      ipcMain.on('settings:load', (event) => {
        event.sender.send('settings:loaded', getConfig());
      });

      ipcMain.on('settings:save', (_event, delta: Partial<CollectorConfig>) => {
        saveConfig(delta);
        // Re-send updated config to all settings windows
        settingsWindow?.webContents.send('settings:loaded', getConfig());
      });

      ipcMain.on('settings:purge-runlog', async () => {
        const config = getConfig();
        await pruneRunLog(config.runLog.retention);
      });

      ipcMain.on('runlog:open', () => {
        openRunLogWindow();
      });

      console.log('[collector] Ready');
    } catch (err) {
      console.error('[collector] Startup failed:', err);
      app.quit();
    }
  });

  // ── Lifecycle ────────────────────────────────────────────────

  app.on('window-all-closed', () => {
    // macOS: stay alive in tray even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked and no windows exist
    // Currently the persistent browser context manages its own windows,
    // so this is a placeholder for future BrowserWindow UI.
  });

  app.on('before-quit', async (e) => {
    e.preventDefault();
    try {
      console.log('[collector] Shutting down…');
      schedulerInstance?.destroy();
      trayManager?.destroy();
      await stopServer();
      console.log('[collector] Server stopped');
      await browserManager?.shutdown();
      console.log('[collector] Browser shut down');
    } catch (err) {
      console.error('[collector] Error during shutdown:', err);
    } finally {
      // Remove the listener to avoid infinite loop, then quit
      app.removeAllListeners('before-quit');
      app.quit();
    }
  });

  // ── Error handling ───────────────────────────────────────────

  process.on('uncaughtException', (err) => {
    console.error('[collector] Uncaught exception:', err);

    // Detect Playwright browser crash and attempt restart
    if (
      err.message?.includes('Browser') ||
      err.message?.includes('Target closed') ||
      err.message?.includes('Connection closed')
    ) {
      handleBrowserCrash();
    }
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[collector] Unhandled rejection:', reason);
  });
}

// ── Browser crash recovery ─────────────────────────────────────

async function handleBrowserCrash(): Promise<void> {
  if (browserRetries >= MAX_BROWSER_RETRIES) {
    console.error(
      `[collector] Browser crashed ${MAX_BROWSER_RETRIES} times. Giving up.`
    );
    trayManager?.updateStatus('error');
    return;
  }

  browserRetries++;
  console.log(
    `[collector] Browser crash detected. Restarting (attempt ${browserRetries}/${MAX_BROWSER_RETRIES})…`
  );

  try {
    await browserManager?.shutdown();
    await browserManager?.init();
    browserRetries = 0; // Reset on successful restart
    trayManager?.updateStatus('active');
    console.log('[collector] Browser restarted successfully');
  } catch (err) {
    console.error('[collector] Browser restart failed:', err);
    trayManager?.updateStatus('error');
  }
}
