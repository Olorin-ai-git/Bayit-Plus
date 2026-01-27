/**
 * Audible Integration Hook
 *
 * Manages Audible account connection, library fetching, and playback.
 */

import { useCallback, useEffect, useState } from 'react';

interface AudibleAudiobook {
  asin: string;
  title: string;
  author: string;
  narrator?: string;
  image?: string;
  description?: string;
  duration_minutes?: number;
  rating?: number;
  is_owned: boolean;
  source: string;
}

interface AudibleConnection {
  connected: boolean;
  audible_user_id?: string;
  synced_at?: string;
  last_sync_error?: string;
}

export function useAudibleIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [library, setLibrary] = useState<AudibleAudiobook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/user/audible/connected');
      if (response.ok) {
        const data: AudibleConnection = await response.json();
        setIsConnected(data.connected);
        if (data.last_sync_error) {
          setError(data.last_sync_error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check connection');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync Audible library
  const syncLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/user/audible/library/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync Audible library');
      }

      await fetchLibrary();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch synced library
  const fetchLibrary = useCallback(async (limit = 50, skip = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/user/audible/library?skip=${skip}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Audible library');
      }

      const data: AudibleAudiobook[] = await response.json();
      setLibrary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch library');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search Audible catalog
  const searchCatalog = useCallback(async (query: string, limit = 20) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/user/audible/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: AudibleAudiobook[] = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get play URL and handle smart redirect
  const playAudiobook = useCallback(async (asin: string) => {
    try {
      const response = await fetch(`/api/v1/user/audible/${asin}/play-url`);

      if (!response.ok) {
        throw new Error('Failed to get play URL');
      }

      const data = await response.json();

      // Smart redirect based on platform
      const userAgent = navigator.userAgent.toLowerCase();

      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        // iOS: Use deep link
        window.location.href = data.url;
      } else if (userAgent.includes('android')) {
        // Android: Use deep link
        window.location.href = data.url;
      } else {
        // Web: Open in new tab
        window.open(data.url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open audiobook');
    }
  }, []);

  // Disconnect Audible account
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/user/audible/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIsConnected(false);
      setLibrary([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    library,
    isLoading,
    error,
    checkConnection,
    syncLibrary,
    fetchLibrary,
    searchCatalog,
    playAudiobook,
    disconnect,
  };
}
