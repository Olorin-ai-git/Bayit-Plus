/**
 * MobileVideoPlayer - React Native video player for mobile
 *
 * Features:
 * - HLS streaming support
 * - Background audio (for PiP widgets)
 * - iOS native PiP support (AVPictureInPictureController)
 * - Playback controls
 * - Loading and error states
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Play, Pause } from 'lucide-react-native';

interface MobileVideoPlayerProps {
  src: string;
  title: string;
  isLive: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export default function MobileVideoPlayer({
  src,
  title,
  isLive,
  autoPlay = false,
  muted = false,
  onPlaybackStateChange,
}: MobileVideoPlayerProps) {
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);

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
    console.error('[MobileVideoPlayer] Error:', err);
    setLoading(false);
    setError('Failed to load video');
  }, []);

  // Handle buffer start
  const handleBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setLoading(isBuffering);
  }, []);

  // Show controls on tap
  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: src }}
        style={styles.video}
        resizeMode="contain"
        paused={!isPlaying}
        muted={muted}
        repeat={false}
        playInBackground={false} // Video stops in background (use audio widgets for background audio)
        playWhenInactive={false}
        // PiP is handled by react-native-video automatically on iOS
        onLoad={handleLoad}
        onError={handleError}
        onBuffer={handleBuffer}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Controls Overlay */}
      <Pressable style={styles.touchArea} onPress={handleTap}>
        {showControls && !loading && !error && (
          <View style={styles.controlsOverlay}>
            <Pressable style={styles.playPauseButton} onPress={togglePlayPause}>
              {isPlaying ? <Pause size={32} color="#fff" /> : <Play size={32} color="#fff" />}
            </Pressable>

            {/* Live Indicator */}
            {isLive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
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
});
