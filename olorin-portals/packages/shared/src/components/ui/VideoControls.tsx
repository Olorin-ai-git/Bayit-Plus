/**
 * VideoControls Component
 * Custom video player controls with play/pause, mute, progress, and fullscreen
 */

import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { glassTokens } from '../../styles/glass-tokens';

export interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  progress: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  isMuted,
  progress,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
}) => {
  return (
    <>
      {/* Play/Pause Overlay */}
      <button
        onClick={onTogglePlay}
        className={`
          absolute inset-0 flex items-center justify-center
          bg-black/40 backdrop-blur-sm
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          ${glassTokens.states.focus}
        `}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      >
        {isPlaying ? (
          <Pause className="w-16 h-16 text-white" />
        ) : (
          <Play className="w-16 h-16 text-white" />
        )}
      </button>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-4">
        <div className="flex items-center gap-4">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </GlassButton>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </GlassButton>

          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-wizard-accent-purple transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            aria-label="Fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </GlassButton>
        </div>
      </div>
    </>
  );
};

export default VideoControls;
