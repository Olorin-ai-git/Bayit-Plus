/**
 * Wizard Avatar Component - React Native Implementation
 * Displays the Olorin wizard character with speaking animation
 *
 * PLATFORMS: iOS (React Native), tvOS
 * DESIGN SYSTEM: Glass Components + TailwindCSS Only (NativeWind)
 * VIDEO LIBRARY: react-native-video
 *
 * STYLING EXCEPTION: Video element is a platform-specific media component
 * where no Glass alternative exists (see CLAUDE.md Styling Exceptions #3)
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { GlassCard } from '@bayit/glass';
import { ASSET_PATHS } from '../config/assetPaths';

export interface WizardAvatarProps {
  /**
   * Whether the video should auto-play on mount
   * @default true
   */
  autoPlay?: boolean;

  /**
   * Whether the video should loop continuously
   * @default false
   */
  loop?: boolean;

  /**
   * Whether the video should be muted
   * @default false
   */
  muted?: boolean;

  /**
   * Size variant for the avatar
   * For tvOS, consider using 'tv-large' or 'tv-xlarge' for 10-foot viewing
   * @default 'large'
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'tv-large' | 'tv-xlarge';

  /**
   * Callback fired when video ends
   */
  onEnded?: () => void;

  /**
   * Callback fired when video starts playing
   */
  onPlay?: () => void;

  /**
   * Callback fired when video is paused
   */
  onPause?: () => void;

  /**
   * Use silent version (no audio track)
   * @default false
   */
  silent?: boolean;

  /**
   * Additional className for styling
   */
  className?: string;

  /**
   * Whether to show glassmorphic container
   * @default true
   */
  showContainer?: boolean;
}

/**
 * Size dimensions mapping (TailwindCSS/NativeWind)
 * tv-large and tv-xlarge are optimized for 10-foot tvOS viewing distance
 */
const SIZE_DIMENSIONS = {
  small: 'w-32 h-32',
  medium: 'w-48 h-48',
  large: 'w-64 h-64',
  xlarge: 'w-96 h-96',
  'tv-large': 'w-80 h-80',
  'tv-xlarge': 'w-120 h-120',
} as const;

/**
 * WizardAvatar Component - React Native Version
 * Uses react-native-video for iOS/tvOS playback
 */
export const WizardAvatar: React.FC<WizardAvatarProps> = ({
  autoPlay = true,
  loop = false,
  muted = false,
  size = 'large',
  onEnded,
  onPlay,
  onPause,
  silent = false,
  className = '',
  showContainer = true,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // tvOS-specific state
  const isTVOS = Platform.OS === 'ios' && Platform.isTV;

  // Get video source - React Native requires static imports
  // Asset paths must be resolved at build time for Metro bundler
  // Path is relative to this file: shared/components/WizardAvatar.native.tsx
  // Assets are in: shared/assets/video/wizard/
  // Therefore: ../assets (one level up from components)
  //
  // HARDCODED PATH EXCEPTION (CLAUDE.md compliant):
  // Metro bundler requires static require() statements at build time.
  // Dynamic paths like require(ASSET_PATHS.video.wizard.speaking) are
  // NOT supported by Metro. This is a platform limitation, not a violation.
  // Web implementation uses ASSET_PATHS configuration as required.
  const videoSource = silent
    ? require('../assets/video/wizard/wizard-speaking-animation.mp4')
    : require('../assets/video/wizard/wizard-speaking-with-audio.mp4');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Video component handles cleanup automatically
      setIsPlaying(false);
    };
  }, []);

  const handleLoad = () => {
    setError(null);
    if (autoPlay) {
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const handleEnd = () => {
    if (!loop) {
      setIsPlaying(false);
    }
    onEnded?.();
  };

  const handleError = (error: any) => {
    console.error('Video error:', error);
    setError('Failed to load wizard animation');
    setIsPlaying(false);
  };

  const handleProgress = (data: any) => {
    // Track progress if needed for future enhancements
  };

  const sizeClass = SIZE_DIMENSIONS[size];

  // tvOS focus handlers
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleTVSelect = () => {
    // Toggle play/pause on tvOS remote select button
    if (videoRef.current) {
      setIsPlaying(!isPlaying);
    }
  };

  // Video element using react-native-video
  const videoElement = (
    <Video
      ref={videoRef}
      source={videoSource}
      repeat={loop}
      muted={muted}
      paused={!isPlaying}
      resizeMode="cover"
      onLoad={handleLoad}
      onEnd={handleEnd}
      onError={handleError}
      onProgress={handleProgress}
      className={`${sizeClass} rounded-2xl ${className} w-full h-full`}
    />
  );

  // Error state
  if (error) {
    return (
      <GlassCard className={`${sizeClass} ${className} flex items-center justify-center p-4`}>
        <View className="flex flex-col items-center gap-2">
          <Text className="text-white/70 text-center text-sm">
            {error}
          </Text>
        </View>
      </GlassCard>
    );
  }

  // Return with or without container based on showContainer prop
  if (!showContainer) {
    return videoElement;
  }

  // Wrap in Pressable for tvOS focus support
  const content = (
    <GlassCard
      className={`${sizeClass} ${className} overflow-hidden backdrop-blur-xl bg-black/20 rounded-2xl border border-white/10 shadow-2xl`}
    >
      {videoElement}

      {/* tvOS focus indicator */}
      {isTVOS && isFocused && (
        <View className="absolute inset-0 rounded-2xl ring-4 ring-white/60 pointer-events-none" />
      )}

      {/* Playing indicator (subtle glassmorphic overlay) */}
      {isPlaying && (
        <View className="absolute top-2 right-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <Text className="text-white/90 text-xs font-medium">Speaking</Text>
        </View>
      )}
    </GlassCard>
  );

  // For tvOS, wrap in Pressable for focus management
  if (isTVOS) {
    return (
      <Pressable
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={handleTVSelect}
        className={`${sizeClass}`}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

/**
 * Export default for convenience
 */
export default WizardAvatar;
