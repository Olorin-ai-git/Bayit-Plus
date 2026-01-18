import { useState, useEffect, useCallback } from 'react';
import { contentService } from '@/services/api';
import type { SeriesData, Episode } from '../types';

interface UseSeriesDataParams {
  seriesId: string | undefined;
}

interface UseSeriesDataResult {
  series: SeriesData | null;
  episodes: Episode[];
  selectedSeason: number;
  selectedEpisode: Episode | null;
  loading: boolean;
  episodesLoading: boolean;
  setSelectedSeason: (season: number) => void;
  setSelectedEpisode: (episode: Episode | null) => void;
}

export function useSeriesData({ seriesId }: UseSeriesDataParams): UseSeriesDataResult {
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);

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
    if (!seriesId || !selectedSeason) return;

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

  useEffect(() => {
    if (seriesId) {
      loadSeriesDetails();
    }
  }, [loadSeriesDetails, seriesId]);

  useEffect(() => {
    if (seriesId && selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [loadSeasonEpisodes, seriesId, selectedSeason]);

  return {
    series,
    episodes,
    selectedSeason,
    selectedEpisode,
    loading,
    episodesLoading,
    setSelectedSeason,
    setSelectedEpisode,
  };
}
