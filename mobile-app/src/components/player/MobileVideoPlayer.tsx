/**
 * MobileVideoPlayer - React Native video player for mobile
 *
 * Features:
 * - HLS streaming support
 * - Background audio (for PiP widgets)
 * - iOS native PiP support (AVPictureInPictureController)
 * - AirPlay and Chromecast support
 * - Playback controls
 * - Loading and error states
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Play, Pause } from 'lucide-react-native';
import logger from '@/utils/logger';
import { useCastSession } from './hooks/useCastSession';
import CastButton from './controls/CastButton';

const moduleLogger = logger.scope('MobileVideoPlayer');

interface MobileVideoPlayerProps {
  src: string;
  title: string;
  isLive: boolean;
  contentId?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  enableCast?: boolean;
  castReceiverAppId?: string | null;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export default function MobileVideoPlayer({
  src,
  title,
  isLive,
  contentId,
  posterUrl,
  autoPlay = false,
  muted = false,
  enableCast = true,
  castReceiverAppId = null,
  onPlaybackStateChange,
}: MobileVideoPlayerProps) {
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Cast session
  const cast = useCastSession({
    metadata: {
      title,
      posterUrl,
      contentId: contentId || '',
      streamUrl: src,
      duration,
    },
    enabled: enableCast,
    receiverAppId: castReceiverAppId,
  });

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Update parent when playback state changes
  useEffect(() => {
    onPlaybackStateChange?.(isPlaying);
  }, [isPlaying, onPlaybackStateChange]);

  // Handle video load
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  // Handle video error
  const handleError = useCallback((err: any) => {
    moduleLogger.error('Video playback error', err);
    setLoading(false);
    setError('Failed to load video');
  }, []);

  // Handle buffer start
  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setLoading(isBuffering);
  }, []);

  // Handle progress updates
  const handleProgress = useCallback(({ currentTime: time }: { currentTime: number }) => {
    setCurrentTime(time);
  }, []);

  // Handle load with duration
  const handleLoadWithData = useCallback((data: any) => {
    setLoading(false);
    setError(null);
    if (data?.duration) {
      setDuration(data.duration);
    }
  }, []);

  // Sync cast playback state on state changes (event-driven)
  useEffect(() => {
    if (cast.isConnected) {
      cast.syncPlaybackState({
        currentTime,
        isPlaying,
        volume: muted ? 0 : 1,
      });
    }
  }, [cast.isConnected, isPlaying, muted]); // Removed currentTime from deps for performance

  // Periodic time sync (less frequent - every 5 seconds)
  useEffect(() => {
    if (!cast.isConnected) return;

    const interval = setInterval(() => {
      cast.syncPlaybackState({
        currentTime,
        isPlaying,
        volume: muted ? 0 : 1,
      });
    }, 5000); // ✅ Every 5 seconds instead of 1 second

    return () => clearInterval(interval);
  }, [cast.isConnected]);

  // Show controls on tap
  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  return (
    <View className="w-full h-full bg-black justify-center items-center">
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: src }}
        className="w-full h-full"
        resizeMode="contain"
        paused={!isPlaying}
        muted={muted}
        repeat={false}
        playInBackground={false} // Video stops in background (use audio widgets for background audio)
        playWhenInactive={false}
        // PiP is handled by react-native-video automatically on iOS
        onLoad={handleLoadWithData}
        onError={handleError}
        onBuffer={handleBuffer}
        onProgress={handleProgress}
      />

      {/* Loading Indicator */}
      {loading && (
        <View className="absolute inset-0 justify-center items-center bg-black/70">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="mt-3 text-sm text-white font-medium">Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View className="absolute inset-0 justify-center items-center bg-black/70">
          <Text className="text-sm text-[#ff4444] font-medium text-center px-5">{error}</Text>
        </View>
      )}

      {/* Controls Overlay */}
      <Pressable className="absolute inset-0" onPress={handleTap}>
        {showControls && !loading && !error && (
          <View className="absolute inset-0 justify-center items-center bg-black/30">
            <Pressable className="w-16 h-16 rounded-full bg-white/20 justify-center items-center" onPress={togglePlayPause}>
              {isPlaying ? <Pause size={32} color="#fff" /> : <Play size={32} color="#fff" />}
            </Pressable>

            {/* Live Indicator */}
            {isLive && (
              <View className="absolute top-4 left-4 flex-row items-center bg-red-600/80 px-3 py-1.5 rounded">
                <View className="w-2 h-2 rounded-full bg-white mr-1.5" />
                <Text className="text-xs font-bold text-white">LIVE</Text>
              </View>
            )}

            {/* Cast Button */}
            <View className="absolute top-4 right-4">
              <CastButton castSession={cast} />
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}
