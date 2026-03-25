import type { CollectionState, CollectionStep, CreatorProfile, ExtMessage } from '../shared/types';
import { DATA_CENTER_URLS } from '../shared/selectors';
import { transferToDashPersona } from './transfer';

const STEPS: { step: CollectionStep; label: string; url: string; extractType: string }[] = [
  { step: 'collecting_profile', label: 'Profile + Posts', url: DATA_CENTER_URLS.contentManage, extractType: 'EXTRACT_PROFILE' },
  { step: 'collecting_overview', label: 'Account Overview', url: DATA_CENTER_URLS.accountOverview, extractType: 'EXTRACT_OVERVIEW' },
  { step: 'collecting_post_list', label: 'Post Analysis', url: DATA_CENTER_URLS.contentAnalysis, extractType: 'EXTRACT_POST_LIST' },
  { step: 'collecting_fans', label: 'Fan Portrait', url: DATA_CENTER_URLS.fanPortrait, extractType: 'EXTRACT_FANS' },
];

let state: CollectionState = {
  step: 'idle', currentStepIndex: 0, totalSteps: STEPS.length,
  stepLabel: '', profile: null, fanPortrait: null, diagnostics: null,
  error: null, lastCollectedAt: null,
};

function updateState(patch: Partial<CollectionState>): void {
  state = { ...state, ...patch };
  // Broadcast to popup
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
}

async function runCollection(tabId: number): Promise<void> {
  const collectedProfile: Partial<CreatorProfile> = {
    platform: 'douyin',
    profileUrl: DATA_CENTER_URLS.home,
    fetchedAt: new Date().toISOString(),
    source: 'extension',
    profile: { nickname: '', uniqueId: '', followers: 0, likesTotal: 0, videosCount: 0 },
    posts: [],
  };

  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    updateState({ step: s.step, currentStepIndex: i, stepLabel: s.label });

    // Navigate tab
    await chrome.tabs.update(tabId, { url: s.url });
    await waitForLoad(tabId);

    // Wait for content script to be ready (retry until it responds)
    await waitForContentScript(tabId);

    // Dismiss any Douyin modal popups (e.g., "新增共创中心" notice)
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'DISMISS_POPUPS' });
    } catch { /* no popup to dismiss — fine */ }

    // Send extraction message
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: s.extractType, tabId });
      if (response?.data) {
        if (s.step === 'collecting_profile') {
          if (response.data.profile) collectedProfile.profile = response.data.profile;
          if (response.data.posts) collectedProfile.posts = response.data.posts;
          collectedProfile.profile!.videosCount = response.data.posts?.length ?? 0;
        }
        if (s.step === 'collecting_overview' && response.data) {
          state.diagnostics = response.data;
        }
        if (s.step === 'collecting_fans' && response.data) {
          state.fanPortrait = response.data;
        }
      }
    } catch (err) {
      // Non-fatal: continue with partial data
      console.warn(`Step ${s.step} failed:`, err);
    }
  }

  // Merge + send
  updateState({ step: 'merging', stepLabel: 'Merging data...' });
  const finalProfile = collectedProfile as CreatorProfile;

  updateState({ step: 'sending', stepLabel: 'Sending to DashPersona...' });
  await transferToDashPersona(finalProfile, state.fanPortrait);

  updateState({
    step: 'done', stepLabel: 'Complete',
    profile: finalProfile,
    lastCollectedAt: new Date().toISOString(),
  });
}

/** Default page load timeout — Douyin SPA needs 10-15s for full JS render */
const PAGE_LOAD_TIMEOUT = 20_000;
/** Extra delay after 'complete' for dynamic content to render */
const JS_RENDER_DELAY = 8_000;

function waitForLoad(tabId: number, timeout: number = PAGE_LOAD_TIMEOUT): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    const listener = (id: number, info: chrome.tabs.TabChangeInfo): void => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        // Douyin SPA: content renders well after 'complete' event
        setTimeout(resolve, JS_RENDER_DELAY);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Poll until content script is injected and responding.
 * Solves "Receiving end does not exist" — content script may not be
 * ready immediately after page 'complete' event on SPA navigations.
 */
async function waitForContentScript(tabId: number, maxRetries = 10, intervalMs = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'DISMISS_POPUPS' });
      return; // Content script responded — ready
    } catch {
      // Not ready yet — wait and retry
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  // After all retries, try injecting content script programmatically
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/douyin.ts'],
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch {
    // scripting API may not be available — proceed anyway
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message: ExtMessage, _sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    sendResponse(state);
    return;
  }
  if (message.type === 'IMPORT_FILE_DATA') {
    // Merge imported posts into collected profile (or create new one)
    const importedPosts = (message as { posts: Array<Record<string, unknown>> }).posts ?? [];
    const fileName = (message as { fileName: string }).fileName ?? 'import';

    const existingProfile = state.profile as CreatorProfile | null;
    const merged: CreatorProfile = existingProfile ? { ...existingProfile } : {
      platform: 'douyin',
      profileUrl: 'https://creator.douyin.com',
      fetchedAt: new Date().toISOString(),
      source: 'extension',
      profile: { nickname: 'Imported', uniqueId: 'import', followers: 0, likesTotal: 0, videosCount: 0 },
      posts: [],
    };

    // Merge: add imported posts, dedup by desc+date
    const existingDescs = new Set(merged.posts.map(p => p.desc));
    for (const post of importedPosts) {
      if (!existingDescs.has(String(post.desc ?? ''))) {
        merged.posts.push(post as CreatorProfile['posts'][0]);
      }
    }
    merged.profile.videosCount = merged.posts.length;

    // Transfer to DashPersona
    transferToDashPersona(merged).then(() => {
      updateState({
        step: 'done',
        stepLabel: `Imported ${importedPosts.length} posts from ${fileName}`,
        profile: merged,
        lastCollectedAt: new Date().toISOString(),
      });
    });
    sendResponse({ ok: true });
    return;
  }
  if (message.type === 'START_COLLECTION') {
    // Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url?.includes('creator.douyin.com')) {
        updateState({ step: 'error', error: 'Not on creator.douyin.com' });
        return;
      }
      updateState({ step: 'collecting_profile', error: null });
      runCollection(tab.id).catch((err: unknown) => {
        updateState({ step: 'error', error: String(err) });
      });
    });
    sendResponse({ ok: true });
    return;
  }
});
