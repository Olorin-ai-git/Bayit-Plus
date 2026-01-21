import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  PreviewHero,
  SeasonSelector,
  EpisodeList,
  IMDBFactsCard,
  CastCarousel,
  RecommendationsCarousel,
} from '../components/content';
import { contentService } from '../services/api';
import { colors } from '../theme';
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
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<any[]>([]);

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

      // Format cast data if available
      if (data.cast && Array.isArray(data.cast)) {
        const formattedCast = data.cast.map((name: string, index: number) => ({
          id: `cast-${index}`,
          name,
          character: '',
          photo: undefined,
        }));
        setCastMembers(formattedCast);
      }

      // Load recommendations in parallel
      try {
        const recs = await contentService.getRecommendations?.(seriesId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        // Non-blocking error - continue without recommendations
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

  const handleCastPress = (castMember: any) => {
    // Navigate to cast member details (future enhancement)
    console.log('Cast member pressed:', castMember.name);
  };

  const handleRecommendationPress = (item: any) => {
    // Navigate to recommended content detail
    navigation.navigate('SeriesDetail' as never, {
      seriesId: item.id,
    } as never);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d0d1a]">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!series) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d0d1a]">
        <Text className={`${isTV ? 'text-lg' : 'text-base'} text-gray-400`}>
          {t('content.notFound')}
        </Text>
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
    <ScrollView className="flex-1 bg-[#0d0d1a]" showsVerticalScrollIndicator={false}>
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

      <View className={isTV ? 'p-6' : 'p-4'}>
        {/* Synopsis */}
        {series.description && (
          <View className={isTV ? 'mb-6' : 'mb-4'}>
            <Text className={`${isTV ? 'text-[28px]' : 'text-xl'} font-semibold text-white ${isTV ? 'mb-3' : 'mb-2'}`}>
              {t('content.synopsis')}
            </Text>
            <Text
              className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400`}
              style={{ lineHeight: isTV ? 28 : 22 }}
            >
              {series.description}
            </Text>
          </View>
        )}

        {/* Episodes List */}
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

        {/* Cast Carousel */}
        {castMembers.length > 0 && (
          <CastCarousel cast={castMembers} onCastPress={handleCastPress} />
        )}

        {/* Recommendations Carousel */}
        {recommendations.length > 0 && (
          <RecommendationsCarousel
            recommendations={recommendations}
            onItemPress={handleRecommendationPress}
            title={t('content.moreLikeThis', 'More Like This')}
          />
        )}
      </View>
    </ScrollView>
  );
}
