import { useCallback } from 'react';
import { usePlaylistStore } from '@bayit/shared/stores/playlistStore';
import logger from '@/utils/logger';

interface PlaylistVoicePayload {
  sub_action: 'add' | 'remove' | 'clear' | 'review';
  items?: Array<{
    content_id: string;
    content_type: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    position: number;
    added_at: string;
  }>;
}

const log = logger.scope('PlaylistVoiceActions');

export function usePlaylistVoiceActions() {
  const setItems = usePlaylistStore((s) => s.setItems);
  const setVisible = usePlaylistStore((s) => s.setVisible);
  const clearPlaylist = usePlaylistStore((s) => s.clearPlaylist);

  const handlePlaylistAction = useCallback(
    (payload: PlaylistVoicePayload) => {
      if (!payload?.sub_action) {
        log.warn('Received playlist action without sub_action', { payload });
        return;
      }

      log.info('Processing playlist voice action', {
        sub_action: payload.sub_action,
        itemCount: payload.items?.length,
      });

      switch (payload.sub_action) {
        case 'add':
        case 'remove':
        case 'review':
          if (payload.items) {
            setItems(payload.items);
          }
          setVisible(true);
          break;

        case 'clear':
          clearPlaylist();
          setVisible(true);
          break;
      }
    },
    [setItems, setVisible, clearPlaylist],
  );

  return { handlePlaylistAction };
}

export default usePlaylistVoiceActions;
