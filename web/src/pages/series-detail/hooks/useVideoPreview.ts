/**
 * Video Preview Hook
 * Manages video preview playback and HLS streaming
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import type { Episode, SeriesData } from '../types/series.types';

interface UseVideoPreviewProps {
  selectedEpisode: Episode | null;
  series: SeriesData | null;
  episodes: Episode[];
}

interface UseVideoPreviewReturn {
  isPreviewPlaying: boolean;
  showPoster: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  startPreview: () => void;
  stopPreview: () => void;
  cleanup: () => void;
}

export function useVideoPreview({
  selectedEpisode,
  series,
  episodes,
}: UseVideoPreviewProps): UseVideoPreviewReturn {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef<string | null>(null); // Track which episode/series auto-started

  const getPreviewUrl = useCallback((): string | null => {
    if (selectedEpisode?.preview_url) return selectedEpisode.preview_url;
    if (series?.preview_url) return series.preview_url;
    if (series?.trailer_url) return series.trailer_url;
    if (selectedEpisode?.stream_url) return selectedEpisode.stream_url;
    if (episodes.length > 0 && (episodes[0] as any).stream_url) {
      return (episodes[0] as any).stream_url;
    }
    return null;
  }, [selectedEpisode, series, episodes]);

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }

    setIsPreviewPlaying(false);
    setShowPoster(true);
  }, []);

  const startPreview = useCallback(() => {
    const previewUrl = getPreviewUrl();
    if (!previewUrl) return;

    if (!videoRef.current) {
      setTimeout(() => startPreview(), 100);
      return;
    }

    setIsPreviewPlaying(true);
    setShowPoster(false);

    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;

    if (previewUrl.includes('.m3u8') && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        startLevel: -1,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(previewUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => stopPreview());
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) stopPreview();
      });
    } else if (
      previewUrl.includes('.m3u8') &&
      video.canPlayType('application/vnd.apple.mpegurl')
    ) {
      video.src = previewUrl;
      video.load();
      video.play().catch(() => stopPreview());
    } else {
      video.src = previewUrl;
      video.load();
      video.play().catch(() => stopPreview());
    }

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      stopPreview();
    }, 20000);
  }, [getPreviewUrl, stopPreview]);

  // Auto-start preview when episode/series changes (only once per content)
  useEffect(() => {
    const contentKey = `${selectedEpisode?.id || ''}-${series?.id || ''}`;
    const previewUrl = getPreviewUrl();

    // Only auto-start if:
    // 1. We have a preview URL
    // 2. We haven't already auto-started for this content
    if (previewUrl && hasAutoStartedRef.current !== contentKey) {
      hasAutoStartedRef.current = contentKey;
      const startTimer = setTimeout(() => {
        startPreview();
      }, 800);
      return () => clearTimeout(startTimer);
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [selectedEpisode?.id, series?.id, getPreviewUrl, startPreview, cleanup]);

  return {
    isPreviewPlaying,
    showPoster,
    videoRef,
    startPreview,
    stopPreview,
    cleanup,
  };
}
