/**
 * Job scheduler for DashPersona Collector.
 *
 * Manages scheduled collection jobs persisted to ~/.dashpersona/jobs.json.
 * Uses node-cron for in-memory scheduling and powerMonitor for App Nap
 * recovery on macOS (COLL-05).
 *
 * Jobs are stored as ScheduledJob[] in jobs.json. On each scheduled fire,
 * the Scheduler calls the registered enqueueFn so Plan 04's BatchQueue
 * handles the actual collection work.
 *
 * Preset intervals only (D-05) — no raw cron strings exposed to the user.
 *
 * @module collector/scheduler
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import cron from 'node-cron';
import { Notification, powerMonitor } from 'electron';
import { atomicWriteJSON, getDashPersonaDir } from './storage';
import { getConfig } from './config';
import type { SchedulerInterval } from './config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'captcha' | 'skipped';

export interface ScheduledJob {
  id: string;
  creatorUniqueId: string;
  platform: 'tiktok' | 'douyin' | 'xhs';
  interval: SchedulerInterval;
  postCount: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
}

export interface EnqueueRequest {
  creatorUniqueId: string;
  platform: 'tiktok' | 'douyin' | 'xhs';
  postCount: number;
  triggeredBy: 'scheduler' | 'manual';
}

// ---------------------------------------------------------------------------
// Cron expression map (D-05: preset intervals -> cron strings)
// ---------------------------------------------------------------------------

const INTERVAL_CRON: Record<SchedulerInterval, string> = {
  'every-6h': '0 */6 * * *',
  'every-12h': '0 */12 * * *',
  'daily': '0 9 * * *',
  'weekly': '0 9 * * 1',
};

const INTERVAL_MS: Record<SchedulerInterval, number> = {
  'every-6h': 6 * 60 * 60 * 1000,
  'every-12h': 12 * 60 * 60 * 1000,
  'daily': 24 * 60 * 60 * 1000,
  'weekly': 7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function getJobsPath(): string {
  return join(getDashPersonaDir(), 'jobs.json');
}

async function loadJobs(): Promise<ScheduledJob[]> {
  try {
    const raw = await readFile(getJobsPath(), 'utf-8');
    return JSON.parse(raw) as ScheduledJob[];
  } catch {
    return [];
  }
}

async function saveJobs(jobs: ScheduledJob[]): Promise<void> {
  await atomicWriteJSON(getJobsPath(), jobs);
}

// ---------------------------------------------------------------------------
// Next run computation
// ---------------------------------------------------------------------------

function computeNextRunAt(interval: SchedulerInterval, fromMs = Date.now()): string {
  return new Date(fromMs + INTERVAL_MS[interval]).toISOString();
}

// ---------------------------------------------------------------------------
// Missed run detection (COLL-05)
// ---------------------------------------------------------------------------

const MISSED_RUN_GRACE_MS = 60_000; // 1-minute grace period

function findMissedJobs(jobs: ScheduledJob[]): ScheduledJob[] {
  const now = Date.now();
  return jobs.filter((job) => {
    if (!job.enabled) return false;
    if (!job.lastRunAt) return false; // never run — not a "missed" run
    const next = new Date(job.nextRunAt).getTime();
    return next < now - MISSED_RUN_GRACE_MS;
  });
}

// ---------------------------------------------------------------------------
// Scheduler class
// ---------------------------------------------------------------------------

export class Scheduler {
  private jobs: ScheduledJob[] = [];
  private cronTasks: Map<string, cron.ScheduledTask> = new Map();
  private enqueueFn: ((requests: EnqueueRequest[]) => void) | null = null;
  private initialized = false;

  /** Missed runs queued internally — exposed via tray menu item (Review #2). */
  private missedRunQueue: ScheduledJob[] = [];

  /** Callback when missed runs list changes — used by tray to update menu. */
  private onMissedRunsChanged: ((missed: ScheduledJob[]) => void) | null = null;

  /**
   * Register the function that will enqueue jobs for execution.
   * Must be set before init() is called.
   */
  setEnqueueFn(fn: (requests: EnqueueRequest[]) => void): void {
    this.enqueueFn = fn;
  }

  /**
   * Initialize scheduler: load jobs from disk, register cron tasks,
   * check for missed runs on cold startup (Review #6), and hook
   * powerMonitor for App Nap recovery.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.jobs = await loadJobs();
    this.registerAllCronTasks();
    this.registerPowerMonitorHooks();

    // Check for missed runs on cold startup (Review #6)
    this.checkMissedRuns();

    console.log(`[scheduler] Initialized with ${this.jobs.length} job(s)`);
  }

  // ── Public API ────────���──────────────────────────────────────

  getJobs(): ScheduledJob[] {
    return [...this.jobs];
  }

  async addJob(
    params: Pick<ScheduledJob, 'creatorUniqueId' | 'platform' | 'interval' | 'postCount'>,
  ): Promise<ScheduledJob> {
    const job: ScheduledJob = {
      id: randomUUID(),
      ...params,
      enabled: true,
      lastRunAt: null,
      nextRunAt: computeNextRunAt(params.interval),
      createdAt: new Date().toISOString(),
    };

    this.jobs.push(job);
    await saveJobs(this.jobs);
    this.registerCronTask(job);
    return job;
  }

  async removeJob(jobId: string): Promise<void> {
    this.cronTasks.get(jobId)?.stop();
    this.cronTasks.delete(jobId);
    this.jobs = this.jobs.filter((j) => j.id !== jobId);
    await saveJobs(this.jobs);
  }

  async updateJob(jobId: string, delta: Partial<ScheduledJob>): Promise<void> {
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return;

    this.jobs[idx] = { ...this.jobs[idx], ...delta };

    // Re-register cron if interval changed
    if (delta.interval !== undefined) {
      this.cronTasks.get(jobId)?.stop();
      this.cronTasks.delete(jobId);
      if (this.jobs[idx].enabled) {
        this.registerCronTask(this.jobs[idx]);
      }
    }

    await saveJobs(this.jobs);
  }

  async setJobEnabled(jobId: string, enabled: boolean): Promise<void> {
    await this.updateJob(jobId, { enabled });

    if (!enabled) {
      this.cronTasks.get(jobId)?.stop();
      this.cronTasks.delete(jobId);
    } else {
      const job = this.jobs.find((j) => j.id === jobId);
      if (job) this.registerCronTask(job);
    }
  }

  /** Mark a job as completed and update lastRunAt / nextRunAt. */
  async recordJobRun(jobId: string, _status: 'success' | 'failed'): Promise<void> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    job.lastRunAt = new Date().toISOString();
    job.nextRunAt = computeNextRunAt(job.interval);
    await saveJobs(this.jobs);

    console.log(`[scheduler] Job ${jobId} recorded as ${_status}. Next: ${job.nextRunAt}`);
  }

  /** Get current missed runs for tray menu display. */
  getMissedRuns(): ScheduledJob[] {
    return [...this.missedRunQueue];
  }

  /** Clear missed runs (after user acts on them). */
  clearMissedRuns(): void {
    this.missedRunQueue = [];
    this.onMissedRunsChanged?.([]);
  }

  setOnMissedRunsChanged(fn: (missed: ScheduledJob[]) => void): void {
    this.onMissedRunsChanged = fn;
  }

  /** Check for missed runs — called by powerMonitor hooks and on cold startup (Review #6). */
  checkMissedRuns(): void {
    const missed = findMissedJobs(this.jobs);
    if (missed.length === 0) return;

    console.log(`[scheduler] Detected ${missed.length} missed job(s)`);
    this.notifyMissedRuns(missed);
  }

  /** Run all missed jobs now — called from tray menu. */
  runMissedNow(): void {
    if (this.missedRunQueue.length === 0) return;
    if (this.enqueueFn) {
      this.enqueueFn(
        this.missedRunQueue.map((j) => ({
          creatorUniqueId: j.creatorUniqueId,
          platform: j.platform,
          postCount: j.postCount,
          triggeredBy: 'scheduler' as const,
        })),
      );
    }
    this.clearMissedRuns();
  }

  /** Skip all missed jobs — update nextRunAt and clear queue. */
  skipMissedRuns(): void {
    for (const job of this.missedRunQueue) {
      void this.updateJob(job.id, { nextRunAt: computeNextRunAt(job.interval) });
    }
    this.clearMissedRuns();
  }

  destroy(): void {
    for (const task of this.cronTasks.values()) {
      task.stop();
    }
    this.cronTasks.clear();
  }

  // ── Internal ────────────���────────────────────────────────────

  private registerAllCronTasks(): void {
    for (const job of this.jobs) {
      if (job.enabled) this.registerCronTask(job);
    }
  }

  private registerCronTask(job: ScheduledJob): void {
    const cronExpr = INTERVAL_CRON[job.interval];
    if (!cronExpr) return;

    const task = cron.schedule(cronExpr, () => {
      void this.fireJob(job);
    });

    this.cronTasks.set(job.id, task);
  }

  private async fireJob(job: ScheduledJob): Promise<void> {
    if (!job.enabled) return;
    if (!this.enqueueFn) {
      console.warn(`[scheduler] No enqueue function registered — cannot fire job ${job.id}`);
      return;
    }

    const config = getConfig();
    if (!config.scheduler.enabled) return;

    console.log(`[scheduler] Firing job ${job.id} for @${job.creatorUniqueId}`);

    this.enqueueFn([
      {
        creatorUniqueId: job.creatorUniqueId,
        platform: job.platform,
        postCount: job.postCount,
        triggeredBy: 'scheduler',
      },
    ]);

    if (Notification.isSupported()) {
      const notif = new Notification({
        title: 'Collection started',
        body: `Collecting @${job.creatorUniqueId} on schedule.`,
        silent: true,
      });
      notif.show();
    }
  }

  private registerPowerMonitorHooks(): void {
    powerMonitor.on('resume', () => {
      this.checkMissedRuns();
    });

    powerMonitor.on('unlock-screen', () => {
      this.checkMissedRuns();
    });

    // macOS-specific: user becomes active after system sleep
    if (process.platform === 'darwin') {
      try {
        (powerMonitor as NodeJS.EventEmitter).on('user-did-become-active', () => {
          this.checkMissedRuns();
        });
      } catch {
        // Older Electron version — safe to ignore
      }
    }
  }

  /**
   * Non-blocking missed-run notification (Review #2).
   * Uses native OS Notification + tray menu instead of blocking dialogs.
   */
  private notifyMissedRuns(missed: ScheduledJob[]): void {
    const existingIds = new Set(this.missedRunQueue.map((j) => j.id));
    for (const job of missed) {
      if (!existingIds.has(job.id)) {
        this.missedRunQueue.push(job);
      }
    }

    this.onMissedRunsChanged?.([...this.missedRunQueue]);

    if (Notification.isSupported()) {
      const count = this.missedRunQueue.length;
      const notif = new Notification({
        title: 'Missed scheduled collection',
        body:
          count === 1
            ? `Scheduled collection for @${missed[0].creatorUniqueId} was missed. Check tray menu for options.`
            : `${count} scheduled collections were missed. Check tray menu for options.`,
        silent: false,
      });
      notif.show();
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let schedulerInstance: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}
