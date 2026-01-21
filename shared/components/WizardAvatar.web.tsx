/**
 * Wizard Avatar Component - Web Implementation
 * Displays the Olorin wizard character with speaking animation
 *
 * PLATFORM: Web (React in browser)
 * DESIGN SYSTEM: Glass Components + TailwindCSS Only
 * VIDEO: HTML5 native video element
 *
 * STYLING EXCEPTION: Video element is a platform-specific media component
 * where no Glass alternative exists (see CLAUDE.md Styling Exceptions #3)
 */

import React, { useRef, useEffect, useState } from 'react';
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
 * Size dimensions mapping (TailwindCSS)
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
 * WizardAvatar Component - Web Version
 * Uses HTML5 video element for browser playback
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get video source based on silent prop
  const videoSource = silent
    ? ASSET_PATHS.video.wizard.speakingSilent
    : ASSET_PATHS.video.wizard.speaking;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Web-specific video initialization
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    // Auto-play if enabled
    if (autoPlay) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            onPlay?.();
          })
          .catch((err) => {
            console.error('Auto-play failed:', err);
            setError('Playback failed - please click to play');
          });
      }
    }

    // Cleanup
    return () => {
      if (video) {
        video.pause();
      }
    };
  }, [autoPlay, onPlay]);

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setError(null);
    onPlay?.();
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    onPause?.();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', e);
    setError('Failed to load wizard animation');
  };

  const sizeClass = SIZE_DIMENSIONS[size];

  // HTML5 video element
  const videoElement = (
    <video
      ref={videoRef}
      src={videoSource}
      loop={loop}
      muted={muted}
      playsInline
      webkit-playsinline="true"
      onEnded={handleVideoEnd}
      onPlay={handleVideoPlay}
      onPause={handleVideoPause}
      onError={handleVideoError}
      className={`${sizeClass} object-cover rounded-2xl aspect-[9/16] ${className}`}
    />
  );

  // Error state
  if (error) {
    return (
      <GlassCard className={`${sizeClass} ${className} flex items-center justify-center p-4`}>
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/70 text-center text-sm">
            {error}
          </span>
        </div>
      </GlassCard>
    );
  }

  // Return with or without container based on showContainer prop
  if (!showContainer) {
    return videoElement;
  }

  return (
    <GlassCard
      className={`${sizeClass} ${className} overflow-hidden backdrop-blur-xl bg-black/20 rounded-2xl border border-white/10 shadow-2xl`}
    >
      {videoElement}

      {/* Playing indicator (subtle glassmorphic overlay) */}
      {isPlaying && (
        <div className="absolute top-2 right-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <span className="text-white/90 text-xs font-medium">Speaking</span>
        </div>
      )}
    </GlassCard>
  );
};

/**
 * Export default for convenience
 */
export default WizardAvatar;
