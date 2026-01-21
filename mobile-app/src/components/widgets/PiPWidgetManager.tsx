/**
 * PiPWidgetManager - Orchestrates multiple PiP widgets on mobile
 *
 * Features:
 * - Load widgets from backend API (same endpoints as web)
 * - Filter by role/subscription/page
 * - Render PiPWidgetContainer for each visible widget
 * - Handle multi-widget z-index ordering
 * - Fetch stream URLs for content types
 * - Enforce mobile constraints (max 2 concurrent widgets, single active audio)
 * - Manage background playback coordination
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import { usePiPWidgetStore } from '../../stores/pipWidgetStore';
import { useAuthStore } from '@bayit/shared-stores';
import { api } from '@bayit/shared-services';
import PiPWidgetContainer from './PiPWidgetContainer';
import type { Widget } from '../../stores/pipWidgetStore';

interface PiPWidgetManagerProps {
  currentPage?: string;
}

// Mobile constraints
const MAX_CONCURRENT_WIDGETS = 2;

export default function PiPWidgetManager({ currentPage = 'home' }: PiPWidgetManagerProps) {
  const { user } = useAuthStore();
  const {
    widgets,
    getVisibleWidgets,
    setWidgets,
    setLoading,
    setError,
    activeAudioWidget,
    setActiveAudio,
  } = usePiPWidgetStore();

  const [streamUrls, setStreamUrls] = useState<Record<string, string>>({});
  const [appState, setAppState] = useState(AppState.currentState);

  // Load widgets from backend
  const loadWidgets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch system widgets
      const systemResponse = await api.get('/widgets/system');
      const systemWidgets = systemResponse.data || [];

      // Fetch user's personal widgets
      const personalResponse = await api.get(`/widgets/personal/${user.id}`);
      const personalWidgets = personalResponse.data || [];

      // Combine and filter widgets
      const allWidgets = [...systemWidgets, ...personalWidgets];

      // Filter by current page
      const filteredWidgets = allWidgets.filter((widget: Widget) => {
        // Check if active
        if (!widget.is_active) return false;

        // Check page targeting
        if (widget.target_pages.length > 0 && !widget.target_pages.includes(currentPage)) {
          return false;
        }

        // Check role permissions
        if (widget.visible_to_roles.length > 0) {
          const userRoles = user.roles || [];
          if (!widget.visible_to_roles.some((role) => userRoles.includes(role))) {
            return false;
          }
        }

        // Check subscription tier
        if (widget.visible_to_subscription_tiers.length > 0) {
          const userTier = user.subscription_tier || 'free';
          if (!widget.visible_to_subscription_tiers.includes(userTier)) {
            return false;
          }
        }

        return true;
      });

      // Sort by order
      const sortedWidgets = filteredWidgets.sort((a: Widget, b: Widget) => a.order - b.order);

      // Mobile constraint: limit to MAX_CONCURRENT_WIDGETS
      const limitedWidgets = sortedWidgets.slice(0, MAX_CONCURRENT_WIDGETS);

      setWidgets(limitedWidgets);
      setError(null);
    } catch (err: any) {
      console.error('[PiPWidgetManager] Error loading widgets:', err);
      setError(err.message || 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, setWidgets, setLoading, setError]);

  // Fetch stream URL for a widget
  const fetchStreamUrl = useCallback(async (widget: Widget) => {
    const { content_type, channel_id, podcast_id, station_id, vod_id } = widget.content;

    try {
      let url = '';

      switch (content_type) {
        case 'live_channel':
          if (channel_id) {
            const response = await api.get(`/channels/${channel_id}/stream`);
            url = response.data.stream_url;
          }
          break;

        case 'podcast':
          if (podcast_id) {
            const response = await api.get(`/podcasts/${podcast_id}/stream`);
            url = response.data.audio_url;
          }
          break;

        case 'radio':
          if (station_id) {
            const response = await api.get(`/radio/${station_id}/stream`);
            url = response.data.stream_url;
          }
          break;

        case 'vod':
          if (vod_id) {
            const response = await api.get(`/content/${vod_id}/stream`);
            url = response.data.stream_url;
          }
          break;

        case 'iframe':
        case 'custom':
          // No stream URL needed
          break;

        default:
          console.warn('[PiPWidgetManager] Unknown content type:', content_type);
      }

      if (url) {
        setStreamUrls((prev) => ({ ...prev, [widget.id]: url }));
      }
    } catch (err: any) {
      console.error(`[PiPWidgetManager] Error fetching stream URL for widget ${widget.id}:`, err);
    }
  }, []);

  // Load widgets on mount and when user/page changes
  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Fetch stream URLs for all visible widgets
  useEffect(() => {
    const visibleWidgets = getVisibleWidgets();
    visibleWidgets.forEach((widget) => {
      // Only fetch if content type requires a stream URL and we don't have it yet
      const needsStreamUrl =
        widget.content.content_type === 'live_channel' ||
        widget.content.content_type === 'podcast' ||
        widget.content.content_type === 'radio' ||
        widget.content.content_type === 'vod';

      if (needsStreamUrl && !streamUrls[widget.id]) {
        fetchStreamUrl(widget);
      }
    });
  }, [widgets, getVisibleWidgets, streamUrls, fetchStreamUrl]);

  // Handle audio widget coordination (only one active at a time)
  useEffect(() => {
    const visibleWidgets = getVisibleWidgets();
    const audioWidgets = visibleWidgets.filter(
      (widget) =>
        widget.content.content_type === 'podcast' ||
        widget.content.content_type === 'radio' ||
        widget.content.content_type === 'live_channel'
    );

    // If multiple audio widgets visible, ensure only one is active
    if (audioWidgets.length > 1 && !activeAudioWidget) {
      // Set first audio widget as active
      setActiveAudio(audioWidgets[0].id);
    }
  }, [widgets, getVisibleWidgets, activeAudioWidget, setActiveAudio]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.match(/active/) && nextAppState === 'background') {
        // App going to background
        console.log('[PiPWidgetManager] App backgrounded - maintaining audio playback');
        // Background audio will continue for audio widgets
        // Video widgets should pause (handled by player component)
      } else if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground
        console.log('[PiPWidgetManager] App foregrounded - resuming playback');
        // Resume playback if needed (handled by player component)
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Get visible widgets sorted by z-index
  const visibleWidgets = getVisibleWidgets().sort((a, b) => {
    const aPosition = usePiPWidgetStore.getState().localState[a.id]?.position || a.position;
    const bPosition = usePiPWidgetStore.getState().localState[b.id]?.position || b.position;
    return aPosition.z_index - bPosition.z_index;
  });

  return (
    <View className="absolute inset-0 z-[1000]" pointerEvents="box-none">
      {visibleWidgets.map((widget) => (
        <PiPWidgetContainer
          key={widget.id}
          widgetId={widget.id}
          streamUrl={streamUrls[widget.id]}
        />
      ))}
    </View>
  );
}
