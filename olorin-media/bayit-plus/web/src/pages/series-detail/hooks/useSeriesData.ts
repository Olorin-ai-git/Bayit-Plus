/**
 * Series Data Hook
 * Manages series details, episodes, and user interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { contentService, watchlistService } from '@/services/api';
import type { SeriesData, Episode } from '../types/series.types';

interface UseSeriesDataProps {
  seriesId: string | undefined;
}

interface UseSeriesDataReturn {
  series: SeriesData | null;
  episodes: Episode[];
  selectedSeason: number;
  selectedEpisode: Episode | null;
  loading: boolean;
  episodesLoading: boolean;
  inWatchlist: boolean;
  setSelectedSeason: (season: number) => void;
  setSelectedEpisode: (episode: Episode | null) => void;
  toggleWatchlist: () => Promise<void>;
}

export function useSeriesData({ seriesId }: UseSeriesDataProps): UseSeriesDataReturn {
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  const loadSeriesDetails = useCallback(async () => {
    if (!seriesId) return;

    setLoading(true);
    try {
      const data = await contentService.getSeriesDetails(seriesId);
      setSeries(data);

      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].season_number);
      }
    } catch (error) {
      console.error('Failed to load series details:', error);
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  const loadSeasonEpisodes = useCallback(async () => {
    if (!seriesId) return;

    setEpisodesLoading(true);
    try {
      const data = await contentService.getSeasonEpisodes(seriesId, selectedSeason);
      setEpisodes(data.episodes || []);

      if (data.episodes && data.episodes.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data.episodes[0]);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  }, [seriesId, selectedSeason, selectedEpisode]);

  const toggleWatchlist = useCallback(async () => {
    if (!series || !series.id) {
      console.warn('Cannot toggle watchlist: series or series.id is missing');
      return;
    }
    try {
      const result = await watchlistService.toggleWatchlist(series.id, 'series');
      if (result && typeof result.in_watchlist === 'boolean') {
        setInWatchlist(result.in_watchlist);
      } else {
        setInWatchlist(!inWatchlist);
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
      setInWatchlist(!inWatchlist);
    }
  }, [series, inWatchlist]);

  useEffect(() => {
    if (seriesId) {
      loadSeriesDetails();
    }
  }, [seriesId, loadSeriesDetails]);

  useEffect(() => {
    if (seriesId && selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [seriesId, selectedSeason, loadSeasonEpisodes]);

  return {
    series,
    episodes,
    selectedSeason,
    selectedEpisode,
    loading,
    episodesLoading,
    inWatchlist,
    setSelectedSeason,
    setSelectedEpisode,
    toggleWatchlist,
  };
}
