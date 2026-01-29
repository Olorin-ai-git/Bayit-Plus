/**
 * WidgetManager - Global widget orchestrator
 *
 * Loads widgets from the API, filters by page/role/subscription,
 * and renders WidgetContainer for each visible widget.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useWidgetStore } from '@/stores/widgetStore';
import { adminWidgetsService } from '@/services/adminApi';
import { liveService, radioService, podcastService } from '@/services/api';
import { adminContentService } from '@/services/adminApi';
import { useAuthStore } from '@/stores/authStore';
import WidgetContainer from './WidgetContainer';
import MinimizedWidgetDock from './MinimizedWidgetDock';
import type { Widget, WidgetPosition } from '@/types/widget';
import type { PodcastEpisode } from '@/types/podcast';
import logger from '@/utils/logger';

// Cache for stream URLs and episode data to avoid repeated API calls
const streamUrlCache: Record<string, { streamUrl?: string; episodeData?: PodcastEpisode }> = {};

export default function WidgetManager() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const {
    widgets,
    setWidgets,
    setLoading,
    setError,
    getVisibleWidgets,
    getWidgetState,
    toggleMute,
    closeWidget,
    toggleMinimize,
    updatePosition,
    localState,
  } = useWidgetStore();

  // Load widgets from API
  const loadWidgets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminWidgetsService.getMyWidgets(location.pathname);
      setWidgets(response.items || []);
    } catch (err) {
      logger.error('Failed to load widgets', 'WidgetManager', { error: err, pathname: location.pathname });
      setError('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, [location.pathname, setWidgets, setLoading, setError]);

  // Load widgets on mount and when path changes
  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Get stream URL for any content type
  const getContentStreamUrl = useCallback(async (widget: Widget): Promise<{ streamUrl?: string; episodeData?: PodcastEpisode }> => {
    const cacheKey = `${widget.content.content_type}-${widget.content.live_channel_id || widget.content.podcast_id || widget.content.content_id || widget.content.station_id}`;

    if (streamUrlCache[cacheKey]) {
      return streamUrlCache[cacheKey];
    }

    try {
      let streamUrl: string | undefined;
      let coverUrl: string | undefined;
      let episodeData: PodcastEpisode | undefined;

      switch (widget.content.content_type) {
        case 'live_channel':
        case 'live':
          if (widget.content.live_channel_id) {
            const channel = await liveService.getChannel(widget.content.live_channel_id);
            streamUrl = channel?.stream_url;
            coverUrl = channel?.thumbnail;
          }
          break;

        case 'vod':
          if (widget.content.content_id) {
            const response = await adminContentService.getStreamUrl(widget.content.content_id);
            streamUrl = response?.url || response?.stream_url;
            const contentData = await adminContentService.getById(widget.content.content_id).catch(() => null);
            coverUrl = contentData?.thumbnail || contentData?.backdrop;
          }
          break;

        case 'podcast':
          if (widget.content.podcast_id) {
            const podcast = await podcastService.getShow(widget.content.podcast_id);
            coverUrl = podcast?.cover || podcast?.thumbnail;

            // Fetch latest episode
            try {
              const episodesResponse = await podcastService.getEpisodes(widget.content.podcast_id, {
                limit: 1,
                sort: '-publishedAt' // Sort by newest first
              });
              const latestEpisode = episodesResponse?.episodes?.[0];

              if (latestEpisode) {
                streamUrl = latestEpisode.audioUrl || latestEpisode.audio_url;
                episodeData = latestEpisode;
              }
            } catch (err) {
              logger.error('Failed to fetch podcast episodes', 'WidgetManager', { error: err, podcastId: widget.content.podcast_id });
            }
          }
          break;

        case 'radio':
          if (widget.content.station_id) {
            logger.debug('Fetching radio stream', 'WidgetManager', {
              stationId: widget.content.station_id,
            });
            try {
              const response = await radioService.getStreamUrl(widget.content.station_id);
              streamUrl = response?.url || response?.stream_url;
              logger.debug('Radio stream URL retrieved successfully', 'WidgetManager', {
                stationId: widget.content.station_id,
              });
            } catch (streamError: any) {
              // Handle backend stream validation failure (503 Service Unavailable)
              const statusCode = streamError.status || streamError.response?.status;
              if (statusCode === 503) {
                logger.warn('Radio stream unavailable (backend validation failed)', 'WidgetManager', {
                  stationId: widget.content.station_id,
                  statusCode,
                  detail: streamError.message || streamError.response?.data?.detail,
                });
                // Don't set streamUrl - frontend will show error message to user
              } else if (statusCode === 404) {
                logger.warn('Radio station not found', 'WidgetManager', {
                  stationId: widget.content.station_id,
                });
              } else {
                logger.error('Failed to fetch radio stream URL', 'WidgetManager', {
                  stationId: widget.content.station_id,
                  statusCode,
                  error: streamError.message,
                });
              }
            }

            // Fetch station metadata for cover art
            const stationData = await radioService.getStation(widget.content.station_id).catch(() => null);
            coverUrl = stationData?.logo;
          }
          break;

        case 'iframe':
          // No stream URL needed for iframe
          return undefined;

        default:
          break;
      }

      // Update widget with cover URL if available
      if (coverUrl && !widget.cover_url) {
        // Create a copy and update locally (will be used in render)
        const updated = { ...widget, cover_url: coverUrl };
        // Update in store
        const { updateWidget } = useWidgetStore.getState();
        updateWidget(widget.id, { cover_url: coverUrl });
      }

      if (streamUrl) {
        const result = { streamUrl, episodeData };
        streamUrlCache[cacheKey] = result;
        return result;
      }
    } catch (err) {
      logger.error('Failed to get stream URL', 'WidgetManager', {
        error: err,
        contentType: widget.content.content_type,
        widgetId: widget.id,
      });
    }

    return {};
  }, []);

  // Debounced position save
  const savePosition = useCallback(async (widgetId: string, position: Partial<WidgetPosition>) => {
    // Validate position values before sending to API
    if (
      position.x === undefined ||
      position.y === undefined ||
      !isFinite(position.x) ||
      !isFinite(position.y) ||
      position.x < 0 ||
      position.y < 0
    ) {
      logger.warn('Invalid widget position values, skipping save', 'WidgetManager', { widgetId, position });
      return;
    }

    // Validate width/height if provided
    if (position.width !== undefined && (!isFinite(position.width) || position.width <= 0)) {
      logger.warn('Invalid widget width, skipping save', 'WidgetManager', { widgetId, position });
      return;
    }

    if (position.height !== undefined && (!isFinite(position.height) || position.height <= 0)) {
      logger.warn('Invalid widget height, skipping save', 'WidgetManager', { widgetId, position });
      return;
    }

    try {
      await adminWidgetsService.updateWidgetPosition(widgetId, {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      });
    } catch (err) {
      logger.error('Failed to save position', 'WidgetManager', { error: err, widgetId, position });
    }
  }, []);

  // Position update handler with debounce
  const handlePositionChange = useCallback((widgetId: string, position: Partial<WidgetPosition>) => {
    updatePosition(widgetId, position);

    // Debounce the API call
    const debounceKey = `widget-position-${widgetId}`;
    if ((window as any)[debounceKey]) {
      clearTimeout((window as any)[debounceKey]);
    }
    (window as any)[debounceKey] = setTimeout(() => {
      savePosition(widgetId, position);
    }, 500);
  }, [updatePosition, savePosition]);

  // Close widget handler
  const handleClose = useCallback(async (widgetId: string) => {
    closeWidget(widgetId);
    try {
      await adminWidgetsService.closeWidget(widgetId);
    } catch (err) {
      logger.error('Failed to close widget', 'WidgetManager', { error: err, widgetId });
    }
  }, [closeWidget]);

  // Toggle minimize handler
  const handleToggleMinimize = useCallback(async (widgetId: string) => {
    const state = getWidgetState(widgetId);
    if (!state) return;

    const newIsMinimized = !state.isMinimized;
    toggleMinimize(widgetId);

    try {
      await adminWidgetsService.toggleWidgetMinimize(widgetId, newIsMinimized);
    } catch (err) {
      logger.error('Failed to toggle widget minimize', 'WidgetManager', { error: err, widgetId });
      // Revert on error
      toggleMinimize(widgetId);
    }
  }, [toggleMinimize, getWidgetState]);

  // Get visible widgets
  const visibleWidgets = getVisibleWidgets();

  // Render nothing if no visible widgets
  if (visibleWidgets.length === 0) {
    return null;
  }

  return (
    <>
      {visibleWidgets.map((widget) => {
        const state = getWidgetState(widget.id);
        if (!state) return null;

        return (
          <WidgetItem
            key={widget.id}
            widget={widget}
            state={state}
            onToggleMute={() => toggleMute(widget.id)}
            onClose={() => handleClose(widget.id)}
            onToggleMinimize={() => handleToggleMinimize(widget.id)}
            onPositionChange={(pos) => handlePositionChange(widget.id, pos)}
            getContentStreamUrl={getContentStreamUrl}
          />
        );
      })}

      <MinimizedWidgetDock />
    </>
  );
}

// Separate component to handle async stream URL loading
interface WidgetItemProps {
  widget: Widget;
  state: { isMuted: boolean; isVisible: boolean; isMinimized: boolean; position: WidgetPosition };
  onToggleMute: () => void;
  onClose: () => void;
  onToggleMinimize: () => void;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  getContentStreamUrl: (widget: Widget) => Promise<{ streamUrl?: string; episodeData?: PodcastEpisode }>;
}

function WidgetItem({
  widget,
  state,
  onToggleMute,
  onClose,
  onToggleMinimize,
  onPositionChange,
  getContentStreamUrl,
}: WidgetItemProps) {
  const [streamUrl, setStreamUrl] = React.useState<string | undefined>();
  const [episodeData, setEpisodeData] = React.useState<PodcastEpisode | undefined>();

  // Subscribe to widget updates from store (for cover_url updates)
  const storeWidget = useWidgetStore((s) => s.widgets.find((w) => w.id === widget.id));
  const currentWidget = storeWidget || widget;

  // Load stream URL based on content type
  useEffect(() => {
    // Don't fetch URL for iframe or custom content (no stream URL needed)
    if (widget.content.content_type === 'iframe' || widget.content.content_type === 'custom') {
      return;
    }

    // Fetch stream URL and episode data for other content types
    getContentStreamUrl(widget).then((data) => {
      setStreamUrl(data.streamUrl);
      setEpisodeData(data.episodeData);
    });
  }, [widget, getContentStreamUrl]);

  return (
    <WidgetContainer
      widget={currentWidget}
      isMuted={state.isMuted}
      isMinimized={state.isMinimized}
      position={state.position}
      onToggleMute={onToggleMute}
      onClose={onClose}
      onToggleMinimize={onToggleMinimize}
      onPositionChange={onPositionChange}
      streamUrl={streamUrl}
      episodeData={episodeData}
    />
  );
}
