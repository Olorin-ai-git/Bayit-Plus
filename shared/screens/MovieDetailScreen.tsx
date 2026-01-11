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
import { PreviewHero } from '../components/content/PreviewHero';
import { IMDBFactsCard } from '../components/content/IMDBFactsCard';
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

export default function MovieDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MovieDetailRouteParams, 'MovieDetail'>>();
  const { movieId } = route.params;

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getMovieDetails(movieId);
      setMovie(data);
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

        {/* Cast Section */}
        {movie.cast && movie.cast.length > 0 && (
          <View style={styles.castSection}>
            <Text style={styles.sectionTitle}>{t('content.cast')}</Text>
            <Text style={styles.castText}>{movie.cast.join(', ')}</Text>
          </View>
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
  castSection: {
    marginTop: spacing.lg,
  },
  castText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.textSecondary,
    lineHeight: isTV ? 28 : 22,
  },
});
