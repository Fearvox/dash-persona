import { describe, it, expect, beforeEach } from 'vitest';
import { createLearningStore, resetStoreCache } from '../store';
import { derivePreferences } from '../preferences';

/**
 * These tests use the in-memory fallback store (no IndexedDB in Node).
 */
beforeEach(() => {
  resetStoreCache();
});

describe('derivePreferences', () => {
  it('returns defaults when there are no events', async () => {
    const prefs = await derivePreferences();

    expect(prefs.topSections).toEqual([]);
    expect(prefs.preferredTimeRange).toBe(168);
    expect(prefs.focusPlatform).toBeNull();
    expect(prefs.dismissedContentTypes).toEqual([]);
    expect(prefs.interactionCount).toBe(0);
  });

  it('correctly identifies top sections from click events', async () => {
    const store = createLearningStore();

    // Simulate more interactions on 'growth' section than 'persona'
    await store.trackEvent({ type: 'click', target: 'chart.followers', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'chart.likes', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'chart.views', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'persona.score', section: 'persona' });

    const prefs = await derivePreferences();

    expect(prefs.topSections[0]).toBe('growth');
    expect(prefs.topSections).toContain('persona');
    expect(prefs.interactionCount).toBe(4);
  });

  it('identifies focus platform from click targets', async () => {
    const store = createLearningStore();

    await store.trackEvent({ type: 'click', target: 'sparkline.douyin', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.douyin', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });

    const prefs = await derivePreferences();

    expect(prefs.focusPlatform).toBe('douyin');
  });

  it('applies exponential decay: old events weigh less than recent ones', async () => {
    const store = createLearningStore();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86_400_000;

    // Manually inject events with custom timestamps.
    // Many old 'tiktok' clicks vs one recent 'douyin' click.
    // The in-memory store doesn't let us set timestamps directly,
    // so we'll access the store internals via the public API and
    // then manually adjust timestamps in the events array.

    // First, add the events via the public API
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    await store.trackEvent({ type: 'click', target: 'sparkline.douyin', section: 'growth' });

    // Get all events and modify timestamps to simulate old vs recent
    const events = await store.getEvents();
    // Make the first 5 (tiktok) events 30 days old
    for (let i = 0; i < 5; i++) {
      events[i].timestamp = thirtyDaysAgo;
    }
    // The last one (douyin) stays recent (as-is, Date.now())

    // Clear and re-insert with modified timestamps
    await store.clear();
    for (const ev of events) {
      // We need to re-add manually. Since the store generates new ids/timestamps,
      // we'll work around it by directly manipulating the in-memory array.
      // Instead, let's use a fresh store and directly test the preference logic.
    }

    // Alternative approach: create a fresh store, add events, then get & mutate
    resetStoreCache();
    const store2 = createLearningStore();

    // We'll track events and then verify via the getEvents + manual mutation approach.
    // Since in-memory store returns reference to its internal array entries,
    // we can mutate timestamps in place before deriving preferences.
    for (let i = 0; i < 5; i++) {
      await store2.trackEvent({ type: 'click', target: 'sparkline.tiktok', section: 'growth' });
    }
    await store2.trackEvent({ type: 'click', target: 'sparkline.douyin', section: 'growth' });

    // Mutate timestamps of the stored events
    const allEvents = await store2.getEvents();
    for (let i = 0; i < 5; i++) {
      allEvents[i].timestamp = thirtyDaysAgo;
    }
    // Last event stays recent

    const prefs = await derivePreferences();

    // Despite having 5 tiktok events vs 1 douyin event, the recent douyin
    // event should outweigh the 30-day-old tiktok events due to decay.
    // Decay at 30 days with 7-day half-life: weight = exp(-ln(2)*30/7) ~ 0.05
    // 5 * 0.05 = 0.25 total for tiktok vs ~1.0 for douyin
    expect(prefs.focusPlatform).toBe('douyin');
  });

  it('resets preferences to defaults after clearing the store', async () => {
    const store = createLearningStore();

    await store.trackEvent({ type: 'click', target: 'sparkline.douyin', section: 'growth' });
    await store.trackEvent({ type: 'view', target: 'persona', section: 'persona' });

    let prefs = await derivePreferences();
    expect(prefs.interactionCount).toBe(2);

    await store.clear();
    prefs = await derivePreferences();

    expect(prefs.topSections).toEqual([]);
    expect(prefs.focusPlatform).toBeNull();
    expect(prefs.interactionCount).toBe(0);
  });

  it('tracks interactionCount accurately', async () => {
    const store = createLearningStore();

    await store.trackEvent({ type: 'click', target: 'a', section: 's1' });
    await store.trackEvent({ type: 'view', target: 's2', section: 's2' });
    await store.trackEvent({ type: 'expand', target: 'b', section: 's1' });
    await store.trackEvent({ type: 'dismiss', target: 'c', section: 's3' });
    await store.trackEvent({ type: 'click', target: 'd', section: 's1' });

    const prefs = await derivePreferences();
    expect(prefs.interactionCount).toBe(5);
  });

  it('tracks dismissed content types', async () => {
    const store = createLearningStore();

    await store.trackEvent({ type: 'dismiss', target: 'tutorial', section: 'calendar' });
    await store.trackEvent({ type: 'dismiss', target: 'tutorial', section: 'calendar' });
    await store.trackEvent({ type: 'dismiss', target: 'lifestyle', section: 'calendar' });

    const prefs = await derivePreferences();

    expect(prefs.dismissedContentTypes[0]).toBe('tutorial');
    expect(prefs.dismissedContentTypes).toContain('lifestyle');
  });
});
