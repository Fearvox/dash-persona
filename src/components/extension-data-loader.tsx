'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { ExtensionAdapter } from '@/lib/adapters/extension-adapter';

const DASHPERSONA_ORIGIN = 'https://dash-persona.vercel.app';
const STORAGE_KEY = 'dashpersona-extension-profile';

interface ExtensionDataLoaderProps {
  /** Fallback profiles to use while waiting for extension data */
  fallbackProfiles: Record<string, CreatorProfile>;
  /** Render prop — receives the loaded profiles (extension or fallback) */
  children: (props: {
    profiles: Record<string, CreatorProfile>;
    isExtensionData: boolean;
    isLoading: boolean;
  }) => React.ReactNode;
}

/**
 * Client component that listens for extension data via:
 * 1. postMessage from the Data Passport extension
 * 2. localStorage fallback (extension stores data before opening tab)
 *
 * Once data arrives, passes it to children via render prop.
 */
export default function ExtensionDataLoader({
  fallbackProfiles,
  children,
}: ExtensionDataLoaderProps) {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile>>(fallbackProfiles);
  const [isExtensionData, setIsExtensionData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const adapter = new ExtensionAdapter();

  const loadProfile = useCallback(async (data: unknown) => {
    try {
      const json = typeof data === 'string' ? data : JSON.stringify(data);
      const profile = await adapter.collect(json);
      if (profile) {
        setProfiles({ [profile.platform]: profile });
        setIsExtensionData(true);
        // Persist for page refreshes
        try {
          localStorage.setItem(STORAGE_KEY, json);
        } catch { /* storage full — ignore */ }
      }
    } catch {
      // Invalid data — stay on fallback
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Strategy 1: Listen for postMessage from extension
    const handleMessage = (event: MessageEvent) => {
      // Origin validation — only accept from extension or same origin
      if (
        event.origin !== DASHPERSONA_ORIGIN &&
        event.origin !== window.location.origin &&
        !event.origin.startsWith('chrome-extension://')
      ) {
        return;
      }
      if (event.data?.type === 'DASHPERSONA_PROFILE_DATA' && event.data?.profile) {
        loadProfile(event.data.profile);
      }
    };
    window.addEventListener('message', handleMessage);

    // Strategy 2: Check localStorage for pending profile (from extension storage fallback)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        loadProfile(stored);
      }
    } catch { /* no storage access */ }

    setIsLoading(false);

    return () => window.removeEventListener('message', handleMessage);
  }, [loadProfile]);

  return <>{children({ profiles, isExtensionData, isLoading })}</>;
}
