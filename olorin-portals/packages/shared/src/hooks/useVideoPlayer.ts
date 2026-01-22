/**
 * useVideoPlayer Hook
 * Manages video player state, handlers, and platform detection
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { detectPlatform } from './usePlatformDetection';

interface UseVideoPlayerOptions {
  autoplay?: boolean;
  muted?: boolean;
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isMobile: boolean;
  isLoading: boolean;
  hasError: boolean;
  showKeyboardHelp: boolean;
  setShowKeyboardHelp: (show: boolean) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
}

export const useVideoPlayer = ({
  autoplay = false,
  muted = true,
}: UseVideoPlayerOptions = {}): UseVideoPlayerReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const togglePlay = useCallback(async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false); // ✅ Update after successful pause
        } else {
          await videoRef.current.play(); // ✅ Await promise
          setIsPlaying(true); // ✅ Update after successful play
        }
      } catch (error) {
        // Handle autoplay blocked or other errors
        console.warn('Video playback failed:', error);
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(async () => {
    if (videoRef.current) {
      try {
        if (!isFullscreen) {
          // ✅ Try standard API first, then webkit fallbacks
          if (videoRef.current.requestFullscreen) {
            await videoRef.current.requestFullscreen();
          } else if ((videoRef.current as any).webkitRequestFullscreen) {
            await (videoRef.current as any).webkitRequestFullscreen();
          } else if ((videoRef.current as any).webkitEnterFullscreen) {
            // ✅ iOS-specific method for iPhones
            (videoRef.current as any).webkitEnterFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
        setIsFullscreen(!isFullscreen);
      } catch (error) {
        // Fullscreen errors are expected (user denied permission, not supported, etc.)
        // No action needed - user can try again
      }
    }
  }, [isFullscreen]);

  const skipForward = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + seconds
      );
    }
  }, []);

  const skipBackward = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seconds);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
        case 'enter': // tvOS Select button
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipBackward(10);
          break;
        case 'arrowright':
          e.preventDefault();
          skipForward(10);
          break;
        case 'escape':
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
      }
    },
    [togglePlay, toggleMute, toggleFullscreen, isFullscreen, skipForward, skipBackward]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set webkit-playsinline for iOS 9 compatibility
    video.setAttribute('webkit-playsinline', '');

    // ✅ Use existing shared hook instead of duplicate code
    const checkMobile = () => {
      const platform = detectPlatform();
      setIsMobile(platform === 'mobile');
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    // ✅ Sync state with actual video events
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(video.muted);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      // Pause and cleanup video to prevent audio leak
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }

      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    videoRef,
    isPlaying,
    isMuted,
    isFullscreen,
    isMobile,
    isLoading,
    hasError,
    showKeyboardHelp,
    setShowKeyboardHelp,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    handleKeyDown,
    skipForward,
    skipBackward,
  };
};
