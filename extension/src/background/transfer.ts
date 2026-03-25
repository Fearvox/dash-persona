import type { CreatorProfile, FanPortrait } from '../shared/types';

// URL patterns to find DashPersona tabs (production + localhost dev)
const DASHPERSONA_URL_PATTERNS = [
  '*://dash-persona.vercel.app/*',
  '*://localhost:3000/*',
  '*://127.0.0.1:3000/*',
];

const DASHPERSONA_FALLBACK_URL = 'https://dash-persona.vercel.app';

/**
 * Find an open DashPersona tab across all known URL patterns.
 */
async function findDashPersonaTab(): Promise<chrome.tabs.Tab | null> {
  for (const pattern of DASHPERSONA_URL_PATTERNS) {
    const tabs = await chrome.tabs.query({ url: pattern });
    if (tabs.length > 0 && tabs[0].id) {
      return tabs[0];
    }
  }
  return null;
}

/**
 * Transfer collected profile data to the DashPersona dashboard.
 *
 * Uses chrome.scripting.executeScript to inject a window.postMessage call
 * into the DashPersona tab, which matches the dashboard's
 * window.addEventListener('message') listener in extension-data-loader.tsx.
 *
 * @param profile - The collected CreatorProfile data
 * @param fanPortrait - Optional fan portrait demographics (collected separately)
 */
export async function transferToDashPersona(
  profile: CreatorProfile,
  fanPortrait?: FanPortrait | null,
): Promise<void> {
  // Attach fanPortrait to profile if available
  const enrichedProfile: CreatorProfile = fanPortrait
    ? { ...profile, fanPortrait }
    : profile;

  // Strategy 1: Find open DashPersona tab and inject postMessage
  const tab = await findDashPersonaTab();
  if (tab?.id) {
    const tabId = tab.id;
    const profileJson = JSON.stringify(enrichedProfile);

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (json: string) => {
        const profile = JSON.parse(json);
        window.postMessage(
          { type: 'DASHPERSONA_PROFILE_DATA', profile },
          window.location.origin,
        );
      },
      args: [profileJson],
    });

    await chrome.tabs.update(tabId, { active: true });
    return;
  }

  // Strategy 2: Save to storage + open new tab
  await chrome.storage.local.set({ pendingProfile: enrichedProfile });

  // Prefer localhost if a dev server might be running, otherwise production
  const targetUrl = `${DASHPERSONA_FALLBACK_URL}/dashboard?source=extension`;
  await chrome.tabs.create({ url: targetUrl });
}
