/**
 * useVoiceActionExecutor Hook
 *
 * Watches for pending voice actions from the support store and executes them.
 * Currently handles PLAYBACK (navigate) actions by opening the fullscreen player,
 * and SEARCH actions by navigating to the search page.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';
import logger from '@/utils/logger';

const LOG_CONTEXT = 'VoiceActionExecutor';

/** Content type mapping for fullscreen player */
type PlayerContentType = 'movie' | 'series' | 'live' | 'vod' | 'audiobook' | 'podcast' | 'radio';

/** Normalize backend content_type to player-compatible type */
function toPlayerType(contentType: string, isSeries: boolean): PlayerContentType {
  if (isSeries) return 'series';
  const mapping: Record<string, PlayerContentType> = {
    movie: 'movie',
    series: 'series',
    live: 'live',
    vod: 'vod',
    audiobook: 'audiobook',
    podcast: 'podcast',
    radio: 'radio',
  };
  return mapping[contentType] || 'vod';
}

/**
 * Watches pendingVoiceAction in supportStore and executes actions:
 * - navigate with content_id: opens fullscreen player directly
 * - navigate without content_id: uses react-router navigation
 * - search: navigates to search results page
 */
export function useVoiceActionExecutor(): void {
  const navigate = useNavigate();
  const openPlayer = useFullscreenPlayerStore((s) => s.openPlayer);
  const pendingAction = useSupportStore((s) => s.pendingVoiceAction);
  const consumeAction = useSupportStore((s) => s.consumeVoiceAction);

  useEffect(() => {
    if (!pendingAction) return;

    const action = consumeAction();
    if (!action) return;

    const { type, payload } = action;

    logger.info('Executing voice action', LOG_CONTEXT, { type, payload });

    if (type === 'navigate' && payload.content_id) {
      const contentId = String(payload.content_id);
      const title = String(payload.title || '');
      const contentType = String(payload.content_type || 'vod');
      const isSeries = Boolean(payload.is_series);
      const thumbnail = payload.thumbnail ? String(payload.thumbnail) : undefined;

      logger.info('Opening player from voice command', LOG_CONTEXT, {
        contentId,
        title,
        contentType,
      });

      openPlayer({
        id: contentId,
        title,
        src: '',
        type: toPlayerType(contentType, isSeries),
        poster: thumbnail,
      });
    } else if (type === 'navigate' && payload.path) {
      const path = String(payload.path);
      logger.info('Navigating from voice command', LOG_CONTEXT, { path });
      navigate(path);
    } else if (type === 'search' && payload.query) {
      const query = String(payload.query);
      logger.info('Searching from voice command', LOG_CONTEXT, { query });
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      logger.warn('Unknown voice action type', LOG_CONTEXT, { type, payload });
    }
  }, [pendingAction, consumeAction, openPlayer, navigate]);
}
