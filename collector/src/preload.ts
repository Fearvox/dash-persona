/**
 * Preload script — IPC bridge between renderer (HTML windows) and main process.
 *
 * Exposes typed APIs on window.collector via contextBridge.
 * Context isolation is enforced — renderers cannot access Node APIs directly.
 *
 * Channel naming follows the UI-SPEC convention:
 *   collection:* — batch collection events
 *   settings:*   — settings window events
 *   runlog:*     — run log window events
 *   missed-run:* — missed-run dialog events
 *
 * @module collector/preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { BatchJobItem } from './batch-queue';
import type { CollectorConfig } from './config';

contextBridge.exposeInMainWorld('collector', {
  // ── Version info ─────────────────────────────────────────────
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // ── Batch collection ──────────────────────────────────────────
  batch: {
    /** Register a callback for per-creator status row updates. */
    onStatusUpdate: (cb: (items: BatchJobItem[]) => void): void => {
      ipcRenderer.on('collection:status-update', (_event, items: BatchJobItem[]) => cb(items));
    },
    /** Register a callback for when the entire batch completes. */
    onBatchComplete: (cb: (summary: { total: number; done: number; failed: number }) => void): void => {
      ipcRenderer.on('collection:batch-complete', (_event, summary) => cb(summary));
    },
    /** Register a callback for CAPTCHA detection. */
    onCaptchaDetected: (cb: (payload: { creatorId: string; handle: string }) => void): void => {
      ipcRenderer.on('collection:captcha-detected', (_event, payload) => cb(payload));
    },
    /** Register a callback for CAPTCHA resolution. */
    onCaptchaResolved: (cb: (payload: { creatorId: string }) => void): void => {
      ipcRenderer.on('collection:captcha-resolved', (_event, payload) => cb(payload));
    },
    /** Send cancel signal to main process. */
    cancel: (): void => {
      ipcRenderer.send('collection:cancel');
    },
  },

  // ── Settings ──────────────────────────────────────────────────
  settings: {
    /** Request current settings from main process. */
    load: (): void => {
      ipcRenderer.send('settings:load');
    },
    /** Register callback for settings data response. */
    onLoaded: (cb: (config: CollectorConfig) => void): void => {
      ipcRenderer.on('settings:loaded', (_event, config: CollectorConfig) => cb(config));
    },
    /** Save settings delta to main process. */
    save: (delta: Partial<CollectorConfig>): void => {
      ipcRenderer.send('settings:save', delta);
    },
    /** Trigger run-log purge in main process. */
    purgeRunLog: (): void => {
      ipcRenderer.send('settings:purge-runlog');
    },
  },

  // ── Run log ───────────────────────────────────────────────────
  runlog: {
    /** Open the run log window. */
    open: (): void => {
      ipcRenderer.send('runlog:open');
    },
  },

  // ── Missed run dialog ─────────────────────────────────────────
  missedRun: {
    /** Send user's response to a missed run notification. */
    respond: (response: { action: 'now' | 'skip' | 'delay'; delayMinutes?: number }): void => {
      ipcRenderer.send('missed-run:response', response);
    },
  },
});
