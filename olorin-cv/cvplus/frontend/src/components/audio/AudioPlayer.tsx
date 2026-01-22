/**
 * Audio Player Component
 *
 * Accessible audio player with waveform visualization
 * WCAG 2.1 Level AA compliant
 *
 * Features:
 * - Web Audio API with gain control and waveform visualization
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Screen reader support (ARIA labels, live regions)
 * - GlassButton component integration
 */

import { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../glass';
import { useAudioEngine } from './useAudioEngine';
import { useWaveform } from './useWaveform';
import { AudioControls } from './AudioControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';

interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
}

export function AudioPlayer({ src, title, autoPlay = false, className = '' }: AudioPlayerProps) {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom hooks
  const { gainNodeRef, analyserRef, resumeAudioContext } = useAudioEngine(audioElementRef);
  useWaveform(canvasRef, analyserRef, isPlaying);

  // Load audio metadata
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleLoadedMetadata = async () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        try {
          await resumeAudioContext();
          await audio.play();
        } catch (err) {
          console.error('Autoplay failed:', err);
          setError('Autoplay blocked. Please click play.');
        }
      }
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src, autoPlay]);

  // Play/pause toggle
  const togglePlayPause = async () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        // Resume AudioContext if suspended (browser autoplay policy)
        await resumeAudioContext();

        // Attempt playback
        await audio.play();
        setIsPlaying(true);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Play failed:', err);
        const error = err as Error;

        // Provide specific error messages based on error type
        if (error.name === 'NotAllowedError') {
          setError('Autoplay blocked by browser. Please click play again.');
        } else if (error.name === 'NotSupportedError') {
          setError('Audio format not supported by your browser.');
        } else if (error.name === 'AbortError') {
          setError('Playback was interrupted. Please try again.');
        } else {
          setError(`Playback failed: ${error.message || 'Unknown error'}`);
        }
      }
    }
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    const audio = audioElementRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  // Seek to specific time
  const handleSeek = (time: number) => {
    const audio = audioElementRef.current;
    if (!audio) return;

    audio.currentTime = time;
  };

  // Volume change
  const handleVolumeChange = (newVolume: number) => {
    const gainNode = gainNodeRef.current;
    if (!gainNode) return;

    gainNode.gain.value = newVolume;
    setVolume(newVolume);
  };

  // Mute toggle
  const toggleMute = () => {
    handleVolumeChange(volume === 0 ? 1.0 : 0);
  };

  return (
    <GlassCard className={`p-6 space-y-4 ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioElementRef} src={src} preload="metadata" />

      {/* Title */}
      {title && <div className="text-white text-lg font-semibold truncate">{title}</div>}

      {/* Waveform Visualization */}
      <div className="relative h-32 bg-black/20 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={128}
          className="w-full h-full"
          aria-hidden="true"
        />
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="text-white/70">Loading audio...</div>
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            role="alert"
            aria-live="assertive"
          >
            <div className="text-red-400">{error}</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />

      {/* Playback Controls */}
      <AudioControls
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlayPause={togglePlayPause}
        onSkip={skip}
      />

      {/* Volume Control */}
      <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} onToggleMute={toggleMute} />
    </GlassCard>
  );
}
