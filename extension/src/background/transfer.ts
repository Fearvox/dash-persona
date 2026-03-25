import type { CreatorProfile } from '../shared/types';

const DASHPERSONA_ORIGIN = 'https://dash-persona.vercel.app';

export async function transferToDashPersona(profile: CreatorProfile): Promise<void> {
  // Strategy 1: Find open DashPersona tab and postMessage
  const tabs = await chrome.tabs.query({ url: `${DASHPERSONA_ORIGIN}/*` });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.sendMessage(tabs[0].id, {
      type: 'DASHPERSONA_PROFILE_DATA',
      profile,
      origin: DASHPERSONA_ORIGIN,
    });
    await chrome.tabs.update(tabs[0].id, { active: true });
    return;
  }

  // Strategy 2: Save to storage + open new tab
  await chrome.storage.local.set({ pendingProfile: profile });
  await chrome.tabs.create({
    url: `${DASHPERSONA_ORIGIN}/dashboard?source=extension`,
  });
}
