/**
 * WidgetManager - Global widget orchestrator
 *
 * Loads widgets from the API, filters by page/role/subscription,
 * and renders WidgetContainer for each visible widget.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useWidgetStore } from '@/stores/widgetStore';
import { widgetsService, contentService } from '@/services/adminApi';
import { useAuthStore } from '@/stores/authStore';
import WidgetContainer from './WidgetContainer';
import type { Widget, WidgetPosition } from '@/types/widget';

// Cache for live channel URLs to avoid repeated API calls
const channelUrlCache: Record<string, string> = {};

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
    updatePosition,
    localState,
  } = useWidgetStore();

  // Load widgets from API
  const loadWidgets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await widgetsService.getMyWidgets(location.pathname);
      setWidgets(response.items || []);
    } catch (err) {
      console.error('[WidgetManager] Failed to load widgets:', err);
      setError('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, [location.pathname, setWidgets, setLoading, setError]);

  // Load widgets on mount and when path changes
  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Get live channel URL for a widget
  const getLiveChannelUrl = useCallback(async (channelId: string): Promise<string | undefined> => {
    if (channelUrlCache[channelId]) {
      return channelUrlCache[channelId];
    }

    try {
      const channel = await contentService.getLiveChannel(channelId);
      if (channel?.stream_url) {
        channelUrlCache[channelId] = channel.stream_url;
        return channel.stream_url;
      }
    } catch (err) {
      console.error('[WidgetManager] Failed to get channel URL:', err);
    }

    return undefined;
  }, []);

  // Debounced position save
  const savePosition = useCallback(async (widgetId: string, position: Partial<WidgetPosition>) => {
    try {
      await widgetsService.updateWidgetPosition(widgetId, {
        x: position.x!,
        y: position.y!,
        width: position.width,
        height: position.height,
      });
    } catch (err) {
      console.error('[WidgetManager] Failed to save position:', err);
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
      await widgetsService.closeWidget(widgetId);
    } catch (err) {
      console.error('[WidgetManager] Failed to close widget:', err);
    }
  }, [closeWidget]);

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
            onPositionChange={(pos) => handlePositionChange(widget.id, pos)}
            getLiveChannelUrl={getLiveChannelUrl}
          />
        );
      })}
    </>
  );
}

// Separate component to handle async channel URL loading
interface WidgetItemProps {
  widget: Widget;
  state: { isMuted: boolean; isVisible: boolean; position: WidgetPosition };
  onToggleMute: () => void;
  onClose: () => void;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  getLiveChannelUrl: (channelId: string) => Promise<string | undefined>;
}

function WidgetItem({
  widget,
  state,
  onToggleMute,
  onClose,
  onPositionChange,
  getLiveChannelUrl,
}: WidgetItemProps) {
  const [streamUrl, setStreamUrl] = React.useState<string | undefined>();

  // Load stream URL for live channel widgets
  useEffect(() => {
    if (widget.content.content_type === 'live_channel' && widget.content.live_channel_id) {
      getLiveChannelUrl(widget.content.live_channel_id).then(setStreamUrl);
    }
  }, [widget.content, getLiveChannelUrl]);

  return (
    <WidgetContainer
      widget={widget}
      isMuted={state.isMuted}
      position={state.position}
      onToggleMute={onToggleMute}
      onClose={onClose}
      onPositionChange={onPositionChange}
      liveChannelStreamUrl={streamUrl}
    />
  );
}
