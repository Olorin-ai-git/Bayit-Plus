/**
 * Watch Party Store for tvOS
 *
 * Re-exports the shared watch party store with text-only mode enabled.
 * Provides full watch party functionality except WebRTC audio:
 * - Create/join parties
 * - Real-time text chat via WebSocket
 * - Playback synchronization with host
 * - Participant list (no speaking indicators)
 */

import { useEffect } from 'react';
import { useWatchPartyStore as useSharedWatchPartyStore } from '@bayit/shared-stores';

/**
 * Hook wrapper that automatically enables text-only mode for tvOS
 */
export const useWatchPartyStore = () => {
  const store = useSharedWatchPartyStore();

  // Ensure text-only mode is enabled on tvOS
  useEffect(() => {
    if (!store.textOnlyMode) {
      store.setTextOnlyMode(true);
    }
  }, [store.textOnlyMode, store.setTextOnlyMode]);

  return store;
};

// Also export the raw store for cases where the hook wrapper isn't needed
export { useWatchPartyStore as useSharedWatchPartyStore } from '@bayit/shared-stores';

export default useWatchPartyStore;
