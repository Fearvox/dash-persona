/**
 * Fire-and-forget event tracking functions.
 *
 * All functions are synchronous from the caller's perspective --
 * they enqueue a write to the learning store without awaiting the result.
 *
 * @module learning/tracker
 */

import { createLearningStore } from './store';

function fire(
  type: 'click' | 'expand' | 'dismiss' | 'view' | 'time_on_section',
  target: string,
  section: string,
  metadata?: Record<string, string>,
): void {
  const store = createLearningStore();
  // Fire-and-forget: intentionally not awaited
  void store.trackEvent({ type, target, section, metadata });
}

export function trackClick(target: string, section: string): void {
  fire('click', target, section);
}

export function trackExpand(target: string, section: string): void {
  fire('expand', target, section);
}

export function trackDismiss(target: string, section: string): void {
  fire('dismiss', target, section);
}

export function trackView(section: string): void {
  fire('view', section, section);
}
