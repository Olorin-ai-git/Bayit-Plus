/**
 * MobileAudioPlayer - React Native audio player for mobile
 *
 * Features:
 * - Audio streaming (podcasts, radio)
 * - Background audio playback (continues when app is backgrounded)
 * - Cover art display
 * - Playback controls
 * - Loading and error states
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable, Image } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Play, Pause } from 'lucide-react-native';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('MobileAudioPlayer');

interface MobileAudioPlayerProps {
  src: string;
  title: string;
  cover?: string;
  isLive: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export default function MobileAudioPlayer({
  src,
  title,
  cover,
  isLive,
  autoPlay = false,
  muted = false,
  onPlaybackStateChange,
}: MobileAudioPlayerProps) {
  const audioRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Update parent when playback state changes
  useEffect(() => {
    onPlaybackStateChange?.(isPlaying);
  }, [isPlaying, onPlaybackStateChange]);

  // Handle audio load
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  // Handle audio error
  const handleError = useCallback((err: any) => {
    moduleLogger.error('Audio playback error', err);
    setLoading(false);
    setError('Failed to load audio');
  }, []);

  // Handle buffer start
  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setLoading(isBuffering);
  }, []);

  return (
    <View className="w-full h-full bg-transparent">
      {/* Hidden video component for audio playback */}
      <Video
        ref={audioRef}
        source={{ uri: src }}
        className="w-0 h-0 absolute"
        paused={!isPlaying}
        muted={muted}
        repeat={false}
        playInBackground={true} // Audio continues in background
        playWhenInactive={true} // Audio plays when app is inactive
        onLoad={handleLoad}
        onError={handleError}
        onBuffer={handleBuffer}
      />

      {/* Glass container for audio UI */}
      <View className="w-full h-full bg-[rgba(30,30,50,0.9)] rounded-xl p-5 justify-center items-center">
        {/* Cover Art */}
        {cover && (
          <View className="w-[120px] h-[120px] rounded-xl overflow-hidden mb-4 bg-white/10 border border-white/20">
            <Image source={{ uri: cover }} className="w-full h-full" resizeMode="cover" />
          </View>
        )}

        {/* Title */}
        <Text className="text-sm font-semibold text-white text-center mb-3 px-4" numberOfLines={2}>
          {title}
        </Text>

        {/* Live Indicator */}
        {isLive && (
          <View className="flex-row items-center bg-red-600/80 px-3 py-1.5 rounded mb-4">
            <View className="w-2 h-2 rounded-full bg-white mr-1.5" />
            <Text className="text-xs font-bold text-white">LIVE</Text>
          </View>
        )}

        {/* Controls */}
        <View className="mt-2 items-center">
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : error ? (
            <Text className="text-xs text-[#ff4444] font-medium text-center">{error}</Text>
          ) : (
            <Pressable className="w-16 h-16 rounded-full bg-white/20 justify-center items-center border-2 border-white/30" onPress={togglePlayPause}>
              {isPlaying ? <Pause size={32} color="#fff" /> : <Play size={32} color="#fff" />}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
