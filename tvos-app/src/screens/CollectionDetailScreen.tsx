import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TVFocusGuideView,
  findNodeHandle,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Play, ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@bayit/shared-hooks';
import api from '@/services/api';
import logger from '@/utils/logger';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';

interface MovieInCollection {
  id: string;
  title: string;
  title_en?: string;
  year?: number;
  thumbnail?: string;
  duration?: string;
  collection_order: number;
  rating?: number;
  stream_url: string;
}

interface CollectionDetail {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  thumbnail?: string;
  backdrop?: string;
  promo_text?: string;
  promo_text_en?: string;
  available_movies: number;
  total_movies: number;
  movies: MovieInCollection[];
}

export default function CollectionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { openPlayer } = useFullscreenPlayerStore();

  const { collectionId } = route.params as { collectionId: string };
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);

  const playAllButtonRef = useRef(null);
  const movieRefs = useRef<(TouchableOpacity | null)[]>([]);

  useEffect(() => {
    loadCollectionDetail();
  }, [collectionId]);

  // Auto-focus first element when screen loads
  useFocusEffect(
    React.useCallback(() => {
      if (playAllButtonRef.current) {
        const nodeHandle = findNodeHandle(playAllButtonRef.current);
        if (nodeHandle) {
          // Request focus on Play All button when screen loads
          setTimeout(() => {
            playAllButtonRef.current?.focus?.();
          }, 100);
        }
      }
    }, [collection])
  );

  const loadCollectionDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get(`/content/collections/${collectionId}`);
      setCollection(data);
      logger.info(`tvOS: Loaded collection: ${data.title}`);
    } catch (err) {
      logger.error('tvOS: Failed to load collection', 'CollectionDetailScreen', err);
      setError(t('vod.collection.notFound', 'Collection not found'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = async () => {
    if (!collection || collection.movies.length === 0) return;

    try {
      const movieIds = collection.movies
        .sort((a, b) => a.collection_order - b.collection_order)
        .map(m => m.id);

      await api.post('/playlist/items/bulk', {
        content_ids: movieIds,
        content_type: 'vod',
      });

      openPlayer({
        contentId: movieIds[0],
        contentType: 'vod',
        title: collection.movies[0].title,
      });

      logger.info(`tvOS: Playing all ${movieIds.length} movies from collection`);
    } catch (err) {
      logger.error('tvOS: Failed to play collection', 'CollectionDetailScreen', err);
    }
  };

  const handleMoviePress = (movie: MovieInCollection) => {
    openPlayer({
      contentId: movie.id,
      contentType: 'vod',
      title: movie.title,
    });
  };

  const handleMovieFocus = (index: number) => {
    setFocusedMovieIndex(index);
  };

  if (loading && !collection) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { textAlign }]}>
            {t('common.loading', 'Loading...')}
          </Text>
        </View>
      </View>
    );
  }

  if (error || !collection) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign }]}>
            {error || t('vod.collection.notFound')}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonError}>
            <Text style={styles.backButtonText}>{t('common.goBack', 'Go Back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const promoText = i18n.language === 'en' ? collection.promo_text_en : collection.promo_text;
  const title = i18n.language === 'en' ? collection.title_en || collection.title : collection.title;
  const description = i18n.language === 'en'
    ? collection.description_en || collection.description
    : collection.description;

  return (
    <TVFocusGuideView style={styles.container} autoFocus>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Backdrop/Hero */}
        {collection.backdrop && (
          <View style={styles.heroContainer}>
            <Image source={{ uri: collection.backdrop }} style={styles.backdrop} />
            <View style={styles.heroOverlay}>
              <Text style={[styles.heroTitle, { textAlign }]} numberOfLines={2}>
                {title}
              </Text>
              <Text style={[styles.heroSubtitle, { textAlign }]}>
                {collection.available_movies} {t('vod.collection.movies', 'movies')}
                {collection.total_movies > collection.available_movies &&
                  ` ${t('vod.collection.of', 'of')} ${collection.total_movies}`}
              </Text>
            </View>
          </View>
        )}

        {/* Collection Info */}
        <View style={styles.infoSection}>
          <GlassCard style={styles.card}>
            {promoText && (
              <Text style={[styles.promoText, { textAlign }]}>{promoText}</Text>
            )}

            {description && (
              <Text style={[styles.description, { textAlign }]}>{description}</Text>
            )}

            <TouchableOpacity
              ref={playAllButtonRef}
              onPress={handlePlayAll}
              style={styles.playAllButton}
            >
              <Play size={28} color={colors.text} />
              <Text style={styles.playAllText}>
                {t('vod.collection.playAll', 'Play All')}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Movies Grid */}
        <View style={styles.moviesSection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('vod.collection.movies', 'Movies')}
          </Text>

          <View style={styles.moviesGrid}>
            {collection.movies.map((movie, index) => (
              <TouchableOpacity
                key={movie.id}
                ref={ref => { movieRefs.current[index] = ref; }}
                onPress={() => handleMoviePress(movie)}
                onFocus={() => handleMovieFocus(index)}
                style={[
                  styles.movieCard,
                  focusedMovieIndex === index && styles.movieCardFocused,
                ]}
              >
                {movie.thumbnail && (
                  <Image
                    source={{ uri: movie.thumbnail }}
                    style={styles.movieThumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.movieOverlay}>
                  <Text style={[styles.movieOrder, { textAlign }]}>
                    {movie.collection_order}
                  </Text>
                  <Text style={[styles.movieTitle, { textAlign }]} numberOfLines={2}>
                    {i18n.language === 'en' ? movie.title_en || movie.title : movie.title}
                  </Text>
                  {movie.year && (
                    <Text style={[styles.movieYear, { textAlign }]}>{movie.year}</Text>
                  )}
                  {movie.duration && (
                    <Text style={[styles.movieDuration, { textAlign }]}>
                      {movie.duration}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: { paddingBottom: spacing.xl * 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.xl, color: colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { fontSize: fontSize.xl, color: colors.textSecondary, marginBottom: spacing.lg },
  backButtonError: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: { fontSize: fontSize.lg, color: colors.text, fontWeight: 'bold' },
  heroContainer: { height: 500, position: 'relative' },
  backdrop: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    backgroundColor: 'rgba(10, 10, 20, 0.9)',
  },
  heroTitle: { fontSize: fontSize['3xl'], fontWeight: 'bold', color: colors.text, marginBottom: spacing.sm },
  heroSubtitle: { fontSize: fontSize.xl, color: colors.textSecondary },
  infoSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  card: { padding: spacing.lg },
  promoText: {
    fontSize: fontSize.xl,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  description: { fontSize: fontSize.lg, color: colors.textSecondary, marginBottom: spacing.lg },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  playAllText: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text },
  moviesSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  moviesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  movieCard: {
    width: 320,
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  movieCardFocused: {
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  movieThumbnail: { width: '100%', height: '100%' },
  movieOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
  },
  movieOrder: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  movieTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '500', marginBottom: spacing.xs },
  movieYear: { fontSize: fontSize.md, color: colors.textSecondary },
  movieDuration: { fontSize: fontSize.md, color: colors.textSecondary },
});
