/**
 * Audio Tracks Hook
 *
 * Manages AI-generated audio tracks for VOD content.
 * Fetches available tracks, handles track selection, and integrates with HLS.js.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAudioTracks } from '@/services/audioTracksService';
import type { AudioTrack } from '@bayit/shared/components/player/AudioTrackSelector';
import logger from '@/utils/logger';

export interface UseAudioTracksProps {
  contentId: string;
  contentType: string;
  hlsInstance: any | null; // HLS.js instance
  enabled?: boolean;
}

export interface UseAudioTracksReturn {
  audioTracks: AudioTrack[];
  loading: boolean;
  error: string | null;
  selectedTrackId: string | null;
  handleTrackChange: (trackId: string) => void;
  refreshTracks: () => Promise<void>;
}

/**
 * Hook to manage audio tracks for VOD content.
 *
 * Fetches AI-generated audio tracks from API and integrates with HLS.js player.
 *
 * @param props - Hook configuration
 * @returns Audio tracks state and handlers
 */
export function useAudioTracks({
  contentId,
  contentType,
  hlsInstance,
  enabled = true,
}: UseAudioTracksProps): UseAudioTracksReturn {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  /**
   * Load audio tracks from API
   */
  const loadAudioTracks = useCallback(async () => {
    // Only load for VOD content
    if (!enabled || contentType !== 'vod' || !contentId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getAudioTracks(contentId);

      // Map API response to AudioTrack interface
      const tracks: AudioTrack[] = response.audio_tracks.map((t) => ({
        id: t.id,
        language: t.language_name,
        languageCode: t.language,
        variantType: t.variant_type as AudioTrack['variantType'],
        variantDisplayName: t.variant_display_name,
        format: t.audio_format.toUpperCase(),
        isDefault: t.is_default,
      }));

      // Sort tracks: Original → Heblish → Slang → Grammar-Flip → Engrew
      const variantOrder = ['original', 'heblish', 'slang', 'grammar_flip', 'engrew'];
      const sortedTracks = tracks.sort((a, b) => {
        const aIndex = variantOrder.indexOf(a.variantType || 'original');
        const bIndex = variantOrder.indexOf(b.variantType || 'original');
        return aIndex - bIndex;
      });

      setAudioTracks(sortedTracks);

      // Auto-select default track
      const defaultTrack = sortedTracks.find((t) => t.isDefault);
      if (defaultTrack) {
        setSelectedTrackId(defaultTrack.id);
      }

      logger.info('Audio tracks loaded', {
        contentId,
        trackCount: sortedTracks.length,
        variants: sortedTracks.map((t) => t.variantType),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio tracks';
      setError(errorMessage);
      logger.error('Failed to load audio tracks', {
        contentId,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType, enabled]);

  /**
   * Handle audio track change
   *
   * Switches the HLS.js audio track to the selected variant.
   */
  const handleTrackChange = useCallback(
    (trackId: string) => {
      const selectedTrack = audioTracks.find((t) => t.id === trackId);

      if (!selectedTrack) {
        logger.warn('Selected audio track not found', { trackId });
        return;
      }

      setSelectedTrackId(trackId);

      // Integrate with HLS.js if available
      if (hlsInstance && hlsInstance.audioTracks) {
        try {
          // Find matching HLS audio track by variant display name
          const hlsTrackIndex = hlsInstance.audioTracks.findIndex(
            (track: any) => track.name === selectedTrack.variantDisplayName
          );

          if (hlsTrackIndex >= 0) {
            hlsInstance.audioTrack = hlsTrackIndex;
            logger.info('HLS audio track changed', {
              trackId,
              variantType: selectedTrack.variantType,
              hlsTrackIndex,
            });
          } else {
            logger.warn('HLS audio track not found for variant', {
              variantDisplayName: selectedTrack.variantDisplayName,
              availableTracks: hlsInstance.audioTracks.map((t: any) => t.name),
            });
          }
        } catch (err) {
          logger.error('Failed to change HLS audio track', {
            trackId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      } else {
        logger.debug('HLS instance not available for audio track switching');
      }
    },
    [audioTracks, hlsInstance]
  );

  /**
   * Refresh audio tracks (useful after generation completes)
   */
  const refreshTracks = useCallback(async () => {
    await loadAudioTracks();
  }, [loadAudioTracks]);

  // Load audio tracks on mount and when dependencies change
  useEffect(() => {
    loadAudioTracks();
  }, [loadAudioTracks]);

  return {
    audioTracks,
    loading,
    error,
    selectedTrackId,
    handleTrackChange,
    refreshTracks,
  };
}

export default useAudioTracks;
