import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { colors, spacing, fontSize } from '../theme';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('content.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

      <View style={styles.content}>
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
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>{t('content.synopsis')}</Text>
            <Text style={styles.synopsisText}>{movie.description}</Text>
          </View>
        )}

        {/* Cast Carousel */}
        {castMembers.length > 0 && (
          <CastCarousel cast={castMembers} onCastPress={handleCastPress} />
        )}

        {/* Crew Section */}
        {movie.director && (
          <View style={styles.crewSection}>
            <Text style={styles.sectionTitle}>{t('content.crew', 'Crew')}</Text>
            <View style={styles.crewItem}>
              <Text style={styles.crewRole}>{t('content.director', 'Director')}</Text>
              <Text style={styles.crewName}>{movie.director}</Text>
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
  synopsisSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  synopsisText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.textSecondary,
    lineHeight: isTV ? 28 : 22,
  },
  crewSection: {
    marginTop: spacing.lg,
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
  },
  crewItem: {
    marginBottom: spacing.sm,
  },
  crewRole: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  crewName: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
});
