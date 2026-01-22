/**
 * VideoControls Component
 * WCAG 2.1 AA compliant video controls with i18n support
 * Supports both overlay+progress mode and minimal controls-only mode
 */

import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { glassTokens } from '../../styles/glass-tokens';
import { usePlatformDetection } from '../../hooks/usePlatformDetection';

export interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  progress?: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  isFullscreen?: boolean;
  isMobile?: boolean;
  showOverlay?: boolean;
  ariaLabels?: {
    playVideo?: string;
    pauseVideo?: string;
    muteVideo?: string;
    unmuteVideo?: string;
    fullscreenVideo?: string;
    exitFullscreen?: string;
    videoControls?: string;
  };
  keyboardHints?: boolean;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  isMuted,
  progress,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  isFullscreen = false,
  isMobile = false,
  showOverlay = true,
  ariaLabels = {},
  keyboardHints = false,
}) => {
  const platform = usePlatformDetection();
  const isTvOS = platform === 'tvos';

  const labels = {
    playVideo: ariaLabels.playVideo || 'Play video',
    pauseVideo: ariaLabels.pauseVideo || 'Pause video',
    muteVideo: ariaLabels.muteVideo || 'Mute',
    unmuteVideo: ariaLabels.unmuteVideo || 'Unmute',
    fullscreenVideo: ariaLabels.fullscreenVideo || 'Fullscreen',
    exitFullscreen: ariaLabels.exitFullscreen || 'Exit Fullscreen',
    videoControls: ariaLabels.videoControls || 'Video controls',
  };

  const getTitle = (base: string, hint?: string) => {
    return keyboardHints && hint ? `${base} ${hint}` : base;
  };

  // Icon sizes: tvOS needs larger icons for 10-foot viewing
  const iconSize = isTvOS ? 'w-12 h-12' : (isMobile ? 'w-8 h-8' : 'w-6 h-6');
  const overlayIconSize = isTvOS ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <>
      {/* Play/Pause Overlay (optional) */}
      {showOverlay && (
        <GlassButton
          onClick={onTogglePlay}
          variant="ghost"
          className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm ${
            isTvOS || isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity duration-300 p-0 min-h-0 min-w-0 rounded-none`}
          aria-label={isPlaying ? labels.pauseVideo : labels.playVideo}
          focusable={isTvOS}
          hasTVPreferredFocus={isTvOS}
        >
          {isPlaying ? (
            <Pause className={`${overlayIconSize} text-white`} />
          ) : (
            <Play className={`${overlayIconSize} text-white`} />
          )}
        </GlassButton>
      )}

      {/* Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-200 ${
          isTvOS || isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
        role="group"
        aria-label={labels.videoControls}
      >
        <div className="flex items-center gap-4">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className="flex items-center justify-center"
            aria-label={isPlaying ? labels.pauseVideo : labels.playVideo}
            title={getTitle(isPlaying ? 'Pause' : 'Play', '(Space/K)')}
            focusable={isTvOS}
          >
            {isPlaying ? (
              <Pause className={`${iconSize} text-white`} aria-hidden="true" />
            ) : (
              <Play className={`${iconSize} text-white`} aria-hidden="true" />
            )}
          </GlassButton>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onToggleMute}
            className="flex items-center justify-center"
            aria-label={isMuted ? labels.unmuteVideo : labels.muteVideo}
            title={getTitle(isMuted ? 'Unmute' : 'Mute', '(M)')}
            focusable={isTvOS}
          >
            {isMuted ? (
              <VolumeX className={`${iconSize} text-white`} aria-hidden="true" />
            ) : (
              <Volume2 className={`${iconSize} text-white`} aria-hidden="true" />
            )}
          </GlassButton>

          {progress !== undefined && (
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-wizard-accent-purple transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="flex items-center justify-center ml-auto"
            aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreenVideo}
            title={getTitle(isFullscreen ? 'Exit Fullscreen' : 'Fullscreen', '(F)')}
            focusable={isTvOS}
          >
            {isFullscreen ? (
              <Minimize className={`${iconSize} text-white`} aria-hidden="true" />
            ) : (
              <Maximize className={`${iconSize} text-white`} aria-hidden="true" />
            )}
          </GlassButton>
        </div>
      </div>
    </>
  );
};

export default VideoControls;
