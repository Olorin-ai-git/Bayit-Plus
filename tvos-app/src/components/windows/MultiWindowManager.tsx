/**
 * MultiWindowManager - Orchestrates multiple windows on tvOS
 *
 * Adapted from mobile PiPWidgetManager with TV-specific features:
 * - 4 concurrent windows (vs mobile's 2)
 * - No AppState handling (TV doesn't background)
 * - Same backend API endpoints (/widgets/system, /widgets/personal/:userId)
 * - Focus navigation instead of touch gestures
 * - Single active audio window coordination
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { useMultiWindowStore } from '../../stores/multiWindowStore';
import { useAuthStore } from '@bayit/shared-stores';
import { api } from '@bayit/shared-services';
import MultiWindowContainer from './MultiWindowContainer';
import type { Window } from '../../stores/multiWindowStore';
import logger from '@/utils/logger';
import config from '@/config/appConfig';

const moduleLogger = logger.scope('MultiWindowManager');

interface MultiWindowManagerProps {
  currentPage?: string;
}

// TV supports 4 concurrent windows (vs mobile's 2)
const MAX_CONCURRENT_WINDOWS = config.tv.maxConcurrentWindows;

export default function MultiWindowManager({ currentPage = 'home' }: MultiWindowManagerProps) {
  const { user } = useAuthStore();
  const {
    windows,
    getVisibleWindows,
    setWindows,
    setLoading,
    setError,
    activeAudioWindow,
    setActiveAudio,
    focusedWindowId,
  } = useMultiWindowStore();

  const [streamUrls, setStreamUrls] = useState<Record<string, string>>({});

  // Filter window by user permissions
  const filterWindow = useCallback((window: Window): boolean => {
    if (!window.is_active) return false;
    if (window.target_pages.length > 0 && !window.target_pages.includes(currentPage)) return false;
    if (window.visible_to_roles.length > 0) {
      const userRoles = user?.roles || [];
      if (!window.visible_to_roles.some((role) => userRoles.includes(role))) return false;
    }
    if (window.visible_to_subscription_tiers.length > 0) {
      const userTier = user?.subscription_tier || 'free';
      if (!window.visible_to_subscription_tiers.includes(userTier)) return false;
    }
    return true;
  }, [user, currentPage]);

  // Load windows from backend
  const loadWindows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [systemResponse, personalResponse] = await Promise.all([
        api.get('/widgets/system'),
        api.get(`/widgets/personal/${user.id}`)
      ]);
      const allWindows = [...(systemResponse.data || []), ...(personalResponse.data || [])];
      const filtered = allWindows.filter(filterWindow).sort((a: Window, b: Window) => a.order - b.order);
      setWindows(filtered.slice(0, MAX_CONCURRENT_WINDOWS));
      setError(null);
    } catch (err: any) {
      moduleLogger.error('Error loading windows', err);
      setError(err.message || 'Failed to load windows');
    } finally {
      setLoading(false);
    }
  }, [user, filterWindow, setWindows, setLoading, setError]);

  // Get stream endpoint for content type
  const getStreamEndpoint = (window: Window): string | null => {
    const { content_type, channel_id, podcast_id, station_id, vod_id } = window.content;
    if (content_type === 'live_channel' || content_type === 'live') return channel_id ? `/channels/${channel_id}/stream` : null;
    if (content_type === 'podcast') return podcast_id ? `/podcasts/${podcast_id}/stream` : null;
    if (content_type === 'radio') return station_id ? `/radio/${station_id}/stream` : null;
    if (content_type === 'vod') return vod_id ? `/content/${vod_id}/stream` : null;
    return null;
  };

  // Fetch stream URL for a window
  const fetchStreamUrl = useCallback(async (window: Window) => {
    const endpoint = getStreamEndpoint(window);
    if (!endpoint) return;
    try {
      const response = await api.get(endpoint);
      const url = response.data.stream_url || response.data.audio_url;
      if (url) setStreamUrls((prev) => ({ ...prev, [window.id]: url }));
    } catch (err: any) {
      moduleLogger.error('Error fetching stream URL', { windowId: window.id, error: err });
    }
  }, []);

  // Load windows on mount and when user/page changes
  useEffect(() => {
    loadWindows();
  }, [loadWindows]);

  // Fetch stream URLs and coordinate audio
  useEffect(() => {
    const visibleWindows = getVisibleWindows();
    const audioTypes = ['live_channel', 'live', 'podcast', 'radio', 'vod'];

    // Fetch stream URLs
    visibleWindows.forEach((window) => {
      if (audioTypes.includes(window.content.content_type) && !streamUrls[window.id]) {
        fetchStreamUrl(window);
      }
    });

    // Coordinate audio (only one active)
    const audioWindows = visibleWindows.filter((w) =>
      ['podcast', 'radio', 'live_channel', 'live'].includes(w.content.content_type)
    );
    if (audioWindows.length > 1 && !activeAudioWindow) {
      setActiveAudio(audioWindows[0].id);
    }
  }, [windows, getVisibleWindows, streamUrls, fetchStreamUrl, activeAudioWindow, setActiveAudio]);

  // Get visible windows sorted by z-index
  const visibleWindows = getVisibleWindows().sort((a, b) => {
    const aPosition = useMultiWindowStore.getState().localState[a.id]?.position || a.position;
    const bPosition = useMultiWindowStore.getState().localState[b.id]?.position || b.position;
    return aPosition.z_index - bPosition.z_index;
  });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} pointerEvents="box-none">
      {visibleWindows.map((window, index) => (
        <MultiWindowContainer
          key={window.id}
          windowId={window.id}
          streamUrl={streamUrls[window.id]}
          hasTVPreferredFocus={focusedWindowId === window.id || (index === 0 && !focusedWindowId)}
        />
      ))}
    </View>
  );
}
