/**
 * PlayerScreen - Fullscreen TV video player
 *
 * Features:
 * - Fullscreen video playback
 * - Auto-hiding controls (5s timeout)
 * - Focus navigation
 * - Info panel toggle
 * - Remote control integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Video from 'react-native-video';
import { useTVEventHandler } from 'react-native';
import { api } from '@bayit/shared-services';
import { PlayerControls } from '../components/player/PlayerControls';
import { PlayerInfoPanel } from '../components/player/PlayerInfoPanel';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface PlayerScreenProps {
  route: {
    params: {
      vodId?: string;
      channelId?: string;
      podcastId?: string;
      contentId?: string;
    };
  };
  navigation: any;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({ route, navigation }) => {
  const { vodId, channelId, podcastId, contentId } = route.params;
  const id = vodId || channelId || podcastId || contentId;

  const videoRef = useRef<Video>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [infoPanelVisible, setInfoPanelVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);

  // Fetch stream URL
  const { data: streamData, isLoading, error } = useQuery({
    queryKey: ['stream', id],
    queryFn: async () => {
      let endpoint = '';
      if (vodId) endpoint = `/content/${vodId}/stream`;
      else if (channelId) endpoint = `/channels/${channelId}/stream`;
      else if (podcastId) endpoint = `/podcasts/${podcastId}/stream`;
      else endpoint = `/content/${id}/stream`;

      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch content metadata
  const { data: metadata } = useQuery({
    queryKey: queryKeys.content.detail(id!),
    queryFn: async () => {
      const response = await api.get(`/content/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Auto-hide controls after 5s
  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setControlsVisible(true);
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 5000);
  }, [isPlaying]);

  // Remote control handlers
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    resetHideTimeout();
  }, [resetHideTimeout]);

  const handleSeek = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
    resetHideTimeout();
  }, [currentTime, duration, resetHideTimeout]);

  const handleExit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleInfoPanel = useCallback(() => {
    setInfoPanelVisible((prev) => !prev);
    resetHideTimeout();
  }, [resetHideTimeout]);

  // TV remote event handling
  useTVEventHandler((evt) => {
    if (evt.eventType === 'playPause') {
      handlePlayPause();
    } else if (evt.eventType === 'menu') {
      if (infoPanelVisible) {
        setInfoPanelVisible(false);
      } else {
        handleExit();
      }
    } else if (evt.eventType === 'select') {
      resetHideTimeout();
    }
  });

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>Loading player...</Text>
      </View>
    );
  }

  // Error state
  if (error || !streamData?.stream_url) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load content</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Video */}
      <Video
        ref={videoRef}
        source={{ uri: streamData.stream_url }}
        style={styles.video}
        resizeMode="contain"
        paused={!isPlaying}
        onLoad={(data) => setDuration(data.duration)}
        onProgress={(data) => setCurrentTime(data.currentTime)}
        onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
        onEnd={() => setIsPlaying(false)}
      />

      {/* Buffering Indicator */}
      {buffering && (
        <View style={styles.bufferingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {/* Controls Overlay */}
      {controlsVisible && (
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onExit={handleExit}
          onToggleInfo={toggleInfoPanel}
        />
      )}

      {/* Info Panel */}
      {infoPanelVisible && metadata && (
        <PlayerInfoPanel
          metadata={metadata}
          onClose={() => setInfoPanelVisible(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  errorText: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
