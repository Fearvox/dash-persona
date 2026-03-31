/**
 * Sequential batch collection queue.
 *
 * Processes one creator at a time in a single Playwright context (D-07).
 * State transitions: queued → running → done | failed | captcha
 * CAPTCHA state pauses the queue — user must solve manually before
 * collection resumes (D-03 aligned with UI-SPEC note).
 *
 * Emits updates via two channels (D-10):
 * 1. IPC: onUpdate callback → main.ts sends to progress BrowserWindow
 * 2. SSE: broadcastSSE (imported from server.ts) → web app consumers
 *
 * IMPORTANT: BatchQueue is the SINGLE owner of run-log writes (Review #1).
 * Neither POST /collect nor any other component writes to run-log.json.
 *
 * @module collector/batch-queue
 */

import { randomUUID } from 'crypto';
import { collectTikTok, classifyTikTokError } from './tiktok-collector';
import { appendRunLog } from './run-log';
import type { Platform } from './snapshot-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'captcha' | 'skipped';

export interface BatchJobItem {
  id: string;
  creatorUniqueId: string;
  platform: Platform;
  postCount: number;
  /** Run context: determines CAPTCHA timeout behavior (Review #8). */
  context: 'manual' | 'scheduled';
  status: JobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  snapshotFile: string | null;
  error: { code: string; message: string; remediation: string } | null;
}

export type BatchUpdateCallback = (items: BatchJobItem[]) => void;
export type CaptchaCallback = (creatorUniqueId: string) => void;

// ---------------------------------------------------------------------------
// BatchQueue
// ---------------------------------------------------------------------------

export class BatchQueue {
  private queue: BatchJobItem[] = [];
  private running = false;
  private cancelled = false;
  private onUpdate: BatchUpdateCallback | null = null;
  private onCaptchaDetected: CaptchaCallback | null = null;
  private onCaptchaResolved: CaptchaCallback | null = null;

  setOnUpdate(fn: BatchUpdateCallback): void {
    this.onUpdate = fn;
  }

  setOnCaptchaDetected(fn: CaptchaCallback): void {
    this.onCaptchaDetected = fn;
  }

  setOnCaptchaResolved(fn: CaptchaCallback): void {
    this.onCaptchaResolved = fn;
  }

  /** Add items to the queue. Starts draining immediately if idle. */
  enqueue(
    items: Array<Pick<BatchJobItem, 'creatorUniqueId' | 'platform' | 'postCount'> & { context?: 'manual' | 'scheduled' }>,
  ): BatchJobItem[] {
    const newItems: BatchJobItem[] = items.map((item) => ({
      id: randomUUID(),
      creatorUniqueId: item.creatorUniqueId,
      platform: item.platform,
      postCount: item.postCount,
      context: item.context ?? 'manual',
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      snapshotFile: null,
      error: null,
    }));

    this.queue.push(...newItems);
    this.emit();

    if (!this.running) {
      this.cancelled = false;
      void this.drain();
    }

    return newItems;
  }

  /** Cancel all queued jobs. Running job continues to completion. */
  cancelAll(): void {
    this.cancelled = true;
    for (const job of this.queue) {
      if (job.status === 'queued') {
        job.status = 'skipped';
      }
    }
    this.emit();
  }

  getItems(): BatchJobItem[] {
    return [...this.queue];
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Clear completed/failed jobs from the queue. */
  clear(): void {
    this.queue = this.queue.filter(
      (j) => j.status === 'queued' || j.status === 'running',
    );
    this.emit();
  }

  // ── Internal drain loop ──────────────────────────────────────

  private async drain(): Promise<void> {
    this.running = true;

    while (true) {
      if (this.cancelled) break;

      const job = this.queue.find((j) => j.status === 'queued');
      if (!job) break;

      await this.runJob(job);

      // After CAPTCHA job finishes (any outcome), continue queue
    }

    this.running = false;
    this.emit();
  }

  private async runJob(job: BatchJobItem): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.emit();

    try {
      if (job.platform !== 'tiktok') {
        // Non-TikTok platforms not yet implemented — skip gracefully
        job.status = 'skipped';
        job.finishedAt = new Date().toISOString();
        job.durationMs = 0;
        this.emit();
        return;
      }

      const result = await collectTikTok({
        handle: job.creatorUniqueId,
        postCount: job.postCount,
        context: job.context, // Review #8: pass context for CAPTCHA timeout behavior
        onCaptchaDetected: (handle) => {
          job.status = 'captcha';
          this.emit();
          this.onCaptchaDetected?.(handle);
        },
        onCaptchaResolved: (handle) => {
          job.status = 'running';
          this.emit();
          this.onCaptchaResolved?.(handle);
        },
      });

      job.status = 'done';
      job.finishedAt = new Date().toISOString();
      job.durationMs = result.profile
        ? Date.now() - new Date(job.startedAt!).getTime()
        : 0;
      job.snapshotFile = result.snapshotFile;

      await appendRunLog({
        creatorUniqueId: result.profile.profile.uniqueId,
        platform: 'tiktok',
        status: 'success',
        durationMs: job.durationMs,
        snapshotFile: result.snapshotFile,
      }).catch(() => {/* best-effort */});
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const durationMs = job.startedAt
        ? Date.now() - new Date(job.startedAt).getTime()
        : 0;

      const classified = classifyTikTokError(err);

      job.status = 'failed';
      job.finishedAt = finishedAt;
      job.durationMs = durationMs;
      job.error = classified;

      await appendRunLog({
        creatorUniqueId: job.creatorUniqueId,
        platform: 'tiktok',
        status: 'failed',
        durationMs,
        error: classified,
      }).catch(() => {/* best-effort */});
    }

    this.emit();
  }

  private emit(): void {
    this.onUpdate?.([...this.queue]);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let batchQueueInstance: BatchQueue | null = null;

export function getBatchQueue(): BatchQueue {
  if (!batchQueueInstance) {
    batchQueueInstance = new BatchQueue();
  }
  return batchQueueInstance;
}
