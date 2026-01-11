import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PreviewHero } from '../components/content/PreviewHero';
import { SeasonSelector } from '../components/content/SeasonSelector';
import { EpisodeList } from '../components/content/EpisodeList';
import { contentService } from '../services/api';
import { colors, spacing, fontSize } from '../theme';
import { isTV } from '../utils/platform';

type SeriesDetailRouteParams = {
  SeriesDetail: {
    seriesId: string;
  };
};

interface Season {
  season_number: number;
  episode_count: number;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  episode_number: number;
  duration?: string;
  preview_url?: string;
}

interface SeriesData {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  total_seasons: number;
  total_episodes: number;
  trailer_url?: string;
  preview_url?: string;
  seasons: Season[];
}

export default function SeriesDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SeriesDetailRouteParams, 'SeriesDetail'>>();
  const { seriesId } = route.params;

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  useEffect(() => {
    loadSeriesDetails();
  }, [seriesId]);

  useEffect(() => {
    if (selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [seriesId, selectedSeason]);

  const loadSeriesDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getSeriesDetails(seriesId);
      setSeries(data);
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].season_number);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonEpisodes = async () => {
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
  };

  const handlePlay = () => {
    if (selectedEpisode) {
      navigation.navigate('Player' as never, {
        contentId: selectedEpisode.id,
        type: 'vod',
      } as never);
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const handleEpisodePlay = (episode: Episode) => {
    navigation.navigate('Player' as never, {
      contentId: episode.id,
      type: 'vod',
    } as never);
  };

  const handleSeasonChange = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('content.notFound')}</Text>
      </View>
    );
  }

  const seasons = series.seasons.map((s) => ({
    seasonNumber: s.season_number,
    episodeCount: s.episode_count,
  }));

  const mappedEpisodes = episodes.map((ep) => ({
    id: ep.id,
    title: ep.title,
    description: ep.description,
    thumbnail: ep.thumbnail,
    episodeNumber: ep.episode_number,
    duration: ep.duration,
    previewUrl: ep.preview_url,
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <PreviewHero
        title={series.title}
        description={series.description}
        backdropUrl={selectedEpisode?.thumbnail || series.backdrop}
        thumbnailUrl={series.thumbnail}
        previewUrl={selectedEpisode?.preview_url || series.preview_url}
        trailerUrl={series.trailer_url}
        category={series.category}
        metadata={{
          year: series.year,
          rating: series.rating,
          seasonCount: series.total_seasons,
          episodeCount: series.total_episodes,
        }}
        onPlay={handlePlay}
      >
        <SeasonSelector
          seasons={seasons}
          selectedSeason={selectedSeason}
          onSeasonChange={handleSeasonChange}
        />
      </PreviewHero>

      <View style={styles.content}>
        {episodesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <EpisodeList
            episodes={mappedEpisodes}
            selectedEpisodeId={selectedEpisode?.id}
            onEpisodeSelect={handleEpisodeSelect}
            onEpisodePlay={handleEpisodePlay}
            seasonNumber={selectedSeason}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  content: {
    padding: isTV ? spacing.xl : spacing.lg,
  },
});
