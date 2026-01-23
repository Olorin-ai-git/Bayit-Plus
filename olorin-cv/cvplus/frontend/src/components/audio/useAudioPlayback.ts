/**
 * Audio Playback Hook
 * Handles play/pause, seeking, and error states
 */

import { useState, useEffect, RefObject } from 'react';

interface AudioPlaybackOptions {
  audioRef: RefObject<HTMLAudioElement>;
  autoPlay?: boolean;
  resumeAudioContext: () => Promise<void>;
}

export function useAudioPlayback({ audioRef, autoPlay, resumeAudioContext }: AudioPlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load audio metadata and setup event listeners
  useEffect(() => {
    const audio = audioRef.current;
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
  }, [audioRef, autoPlay, resumeAudioContext]);

  // Play/pause toggle with comprehensive error handling
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await resumeAudioContext();
        await audio.play();
        setIsPlaying(true);
        setError(null);
      } catch (err) {
        console.error('Play failed:', err);
        const error = err as Error;

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
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  // Seek to specific time
  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
  };

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    togglePlayPause,
    skip,
    handleSeek,
  };
}
