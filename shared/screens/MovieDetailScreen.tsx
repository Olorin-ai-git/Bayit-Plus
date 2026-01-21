import React, { useState, useEffect } from 'react';
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
  IMDBFactsCard,
  CastCarousel,
  RecommendationsCarousel,
} from '../components/content';
import { contentService } from '../services/api';
import { colors } from '../theme';
import { isTV } from '../utils/platform';

type MovieDetailRouteParams = {
  MovieDetail: {
    movieId: string;
  };
};

interface MovieData {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  duration?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  trailer_url?: string;
  preview_url?: string;
  imdb_rating?: number;
  imdb_votes?: number;
}

/**
 * Format IMDb votes for display (e.g., 1200000 → "1.2M", 150000 → "150K")
 */
const formatVotes = (votes?: number): string => {
  if (!votes) return '';
  if (votes >= 1000000) return `${(votes / 1000000).toFixed(1)}M`;
  if (votes >= 1000) return `${(votes / 1000).toFixed(0)}K`;
  return votes.toString();
};

export default function MovieDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MovieDetailRouteParams, 'MovieDetail'>>();
  const { movieId } = route.params;

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getMovieDetails(movieId);
      setMovie(data);

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
        const recs = await contentService.getRecommendations?.(movieId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        // Non-blocking error - continue without recommendations
      }
    } catch (error) {
      console.error('Failed to load movie:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (movie) {
      navigation.navigate('Player' as never, {
        contentId: movie.id,
        type: 'vod',
      } as never);
    }
  };

  const handleCastPress = (castMember: any) => {
    // Navigate to cast member details (future enhancement)
    console.log('Cast member pressed:', castMember.name);
  };

  const handleRecommendationPress = (item: any) => {
    // Navigate to recommended content detail
    navigation.navigate('MovieDetail' as never, {
      movieId: item.id,
    } as never);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d0d1a]">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d0d1a]">
        <Text className={`${isTV ? 'text-lg' : 'text-base'} text-gray-400`}>
          {t('content.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0d0d1a]" showsVerticalScrollIndicator={false}>
      <PreviewHero
        title={movie.title}
        description={movie.description}
        backdropUrl={movie.backdrop}
        thumbnailUrl={movie.thumbnail}
        previewUrl={movie.preview_url}
        trailerUrl={movie.trailer_url}
        category={movie.category}
        metadata={{
          year: movie.year,
          rating: movie.rating,
          duration: movie.duration,
          genre: movie.genre,
          imdbRating: movie.imdb_rating,
        }}
        onPlay={handlePlay}
      />

      <View className={isTV ? 'p-6' : 'p-4'}>
        {/* IMDB Facts Card */}
        {(movie.imdb_rating || movie.director || movie.cast) && (
          <IMDBFactsCard
            imdbRating={movie.imdb_rating}
            imdbVotes={movie.imdb_votes}
            imdbVotesFormatted={formatVotes(movie.imdb_votes)}
            runtime={movie.duration}
            releaseDate={movie.year?.toString()}
            genres={movie.genre ? [movie.genre] : undefined}
            director={movie.director}
            cast={movie.cast}
          />
        )}

        {/* Synopsis */}
        {movie.description && (
          <View className="mt-4">
            <Text className={`${isTV ? 'text-xl' : 'text-lg'} font-semibold text-white mb-3`}>
              {t('content.synopsis')}
            </Text>
            <Text
              className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400`}
              style={{ lineHeight: isTV ? 28 : 22 }}
            >
              {movie.description}
            </Text>
          </View>
        )}

        {/* Cast Carousel */}
        {castMembers.length > 0 && (
          <CastCarousel cast={castMembers} onCastPress={handleCastPress} />
        )}

        {/* Crew Section */}
        {movie.director && (
          <View className={`mt-4 ${isTV ? 'px-6' : 'px-4'}`}>
            <Text className={`${isTV ? 'text-xl' : 'text-lg'} font-semibold text-white mb-3`}>
              {t('content.crew', 'Crew')}
            </Text>
            <View className="mb-2">
              <Text
                className={`${isTV ? 'text-sm' : 'text-xs'} text-gray-500 uppercase font-semibold mb-1`}
              >
                {t('content.director', 'Director')}
              </Text>
              <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white font-medium`}>
                {movie.director}
              </Text>
            </View>
          </View>
        )}

        {/* Recommendations Carousel */}
        {recommendations.length > 0 && (
          <RecommendationsCarousel
            recommendations={recommendations}
            onItemPress={handleRecommendationPress}
          />
        )}
      </View>
    </ScrollView>
  );
}
