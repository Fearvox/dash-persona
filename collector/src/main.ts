import { app, BrowserWindow } from 'electron';
import { BrowserManager } from './browser';
import { startServer, stopServer } from './server';
// import { TrayManager } from './tray'; // TODO: uncomment when tray is implemented

// ── Constants ────────────────────────────────────────────────
const API_PORT = 3458;
const MAX_BROWSER_RETRIES = 3;

// ── State ────────────────────────────────────────────────────
let browserManager: BrowserManager;
let browserRetries = 0;

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
      // 1. Init browser
      browserManager = BrowserManager.getInstance();
      await browserManager.init();
      console.log('[collector] Browser context initialized');

      // 2. Start HTTP API server
      await startServer(browserManager, API_PORT);
      console.log(`[collector] Server started on port ${API_PORT}`);

      // 3. Init tray (placeholder until tray.ts is implemented)
      // const tray = new TrayManager(browserManager);
      // tray.init();

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
    // TODO: update tray status to 'error' when tray is implemented
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
    console.log('[collector] Browser restarted successfully');
  } catch (err) {
    console.error('[collector] Browser restart failed:', err);
    // TODO: update tray status to 'error' when tray is implemented
  }
}
