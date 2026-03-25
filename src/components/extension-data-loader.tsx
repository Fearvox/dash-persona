'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { ExtensionAdapter, ExtensionAdapterError } from '@/lib/adapters/extension-adapter';

const STORAGE_KEY = 'dashpersona-extension-profile';

interface ExtensionDataLoaderProps {
  /** Fallback profiles to use while waiting for extension data */
  fallbackProfiles: Record<string, CreatorProfile>;
  /** Render prop — receives the loaded profiles (extension or fallback) */
  children: (props: {
    profiles: Record<string, CreatorProfile>;
    isExtensionData: boolean;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

/**
 * Client component that listens for extension data via:
 * 1. postMessage from the Data Passport extension
 * 2. localStorage fallback (extension stores data before opening tab)
 *
 * Once data arrives, passes it to children via render prop.
 * Surfaces structured errors instead of silently falling back.
 */
export default function ExtensionDataLoader({
  fallbackProfiles,
  children,
}: ExtensionDataLoaderProps) {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile>>(fallbackProfiles);
  const [isExtensionData, setIsExtensionData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adapter = new ExtensionAdapter();

  const loadProfile = useCallback(async (data: unknown) => {
    try {
      const json = typeof data === 'string' ? data : JSON.stringify(data);
      const profile = await adapter.collect(json);
      if (profile) {
        setProfiles({ [profile.platform]: profile });
        setIsExtensionData(true);
        setError(null);
        try {
          localStorage.setItem(STORAGE_KEY, json);
        } catch { /* storage full — ignore */ }
      }
    } catch (err) {
      if (err instanceof ExtensionAdapterError) {
        setError(`Extension data error: ${err.message} (${err.code})`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to process extension data');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Strategy 1: Listen for postMessage from extension
    const handleMessage = (event: MessageEvent) => {
      // Origin validation — accept from same origin or chrome extensions
      if (
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

  return <>{children({ profiles, isExtensionData, isLoading, error })}</>;
}
