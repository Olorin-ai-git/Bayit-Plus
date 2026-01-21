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
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Image } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Play, Pause } from 'lucide-react-native';

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
    console.error('[MobileAudioPlayer] Error:', err);
    setLoading(false);
    setError('Failed to load audio');
  }, []);

  // Handle buffer start
  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setLoading(isBuffering);
  }, []);

  return (
    <View style={styles.container}>
      {/* Hidden video component for audio playback */}
      <Video
        ref={audioRef}
        source={{ uri: src }}
        style={styles.hiddenVideo}
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
      <View style={styles.glassContainer}>
        {/* Cover Art */}
        {cover && (
          <View style={styles.coverContainer}>
            <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
          </View>
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Live Indicator */}
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Pressable style={styles.playPauseButton} onPress={togglePlayPause}>
              {isPlaying ? <Pause size={32} color="#fff" /> : <Play size={32} color="#fff" />}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  hiddenVideo: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  glassContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(30, 30, 50, 0.9)',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  controlsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '500',
    textAlign: 'center',
  },
});
