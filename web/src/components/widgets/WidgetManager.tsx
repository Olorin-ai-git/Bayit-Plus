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
import type { Widget, WidgetPosition } from '@/types/widget';
import logger from '@/utils/logger';

// Cache for stream URLs to avoid repeated API calls
const streamUrlCache: Record<string, string> = {};

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
      logger.error('Failed to load widgets', { error: err, pathname: location.pathname, component: 'WidgetManager' });
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
  const getContentStreamUrl = useCallback(async (widget: Widget): Promise<string | undefined> => {
    const cacheKey = `${widget.content.content_type}-${widget.content.live_channel_id || widget.content.podcast_id || widget.content.content_id || widget.content.station_id}`;

    if (streamUrlCache[cacheKey]) {
      return streamUrlCache[cacheKey];
    }

    try {
      let streamUrl: string | undefined;
      let coverUrl: string | undefined;

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
            streamUrl = podcast?.latestEpisode?.audioUrl;
            coverUrl = podcast?.cover;
          }
          break;

        case 'radio':
          if (widget.content.station_id) {
            const response = await radioService.getStreamUrl(widget.content.station_id);
            streamUrl = response?.url || response?.stream_url;
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
        streamUrlCache[cacheKey] = streamUrl;
        return streamUrl;
      }
    } catch (err) {
      logger.error(`Failed to get stream URL`, {
        error: err,
        contentType: widget.content.content_type,
        widgetId: widget.id,
        component: 'WidgetManager'
      });
    }

    return undefined;
  }, []);

  // Debounced position save
  const savePosition = useCallback(async (widgetId: string, position: Partial<WidgetPosition>) => {
    try {
      await adminWidgetsService.updateWidgetPosition(widgetId, {
        x: position.x!,
        y: position.y!,
        width: position.width,
        height: position.height,
      });
    } catch (err) {
      logger.error('Failed to save position', { error: err, widgetId, position, component: 'WidgetManager' });
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
      logger.error('Failed to close widget', { error: err, widgetId, component: 'WidgetManager' });
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
      logger.error('Failed to toggle widget minimize', { error: err, widgetId, component: 'WidgetManager' });
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
  getContentStreamUrl: (widget: Widget) => Promise<string | undefined>;
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

  // Subscribe to widget updates from store (for cover_url updates)
  const storeWidget = useWidgetStore((s) => s.widgets.find((w) => w.id === widget.id));
  const currentWidget = storeWidget || widget;

  // Load stream URL based on content type
  useEffect(() => {
    // Don't fetch URL for iframe or custom content (no stream URL needed)
    if (widget.content.content_type === 'iframe' || widget.content.content_type === 'custom') {
      return;
    }

    // Fetch stream URL for other content types
    getContentStreamUrl(widget).then(setStreamUrl);
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
    />
  );
}
