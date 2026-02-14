import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Play, ChevronLeft } from 'lucide-react-native';
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

export default function CollectionDetailScreenMobile() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { openPlayer } = useFullscreenPlayerStore();

  const { collectionId } = route.params as { collectionId: string };
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCollectionDetail();
  }, [collectionId]);

  const loadCollectionDetail = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.get(`/content/collections/${collectionId}`);
      setCollection(data);
      logger.info(`Mobile: Loaded collection: ${data.title}`);
    } catch (err) {
      logger.error('Mobile: Failed to load collection', 'CollectionDetailScreenMobile', err);
      setError(t('vod.collection.notFound', 'Collection not found'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCollectionDetail(true);
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

      logger.info(`Mobile: Playing all ${movieIds.length} movies from collection`);
    } catch (err) {
      logger.error('Mobile: Failed to play collection', 'CollectionDetailScreenMobile', err);
    }
  };

  const handleMoviePress = (movie: MovieInCollection) => {
    openPlayer({
      contentId: movie.id,
      contentType: 'vod',
      title: movie.title,
    });
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>
            {t('vod.collection.detail', 'Collection')}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign }]}>
            {error || t('vod.collection.notFound')}
          </Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Backdrop/Hero */}
        {collection.backdrop && (
          <Image source={{ uri: collection.backdrop }} style={styles.backdrop} />
        )}

        {/* Collection Info Card */}
        <GlassCard style={styles.card}>
          <Text style={[styles.subtitle, { textAlign }]}>
            {collection.available_movies} {t('vod.collection.movies', 'movies')}
            {collection.total_movies > collection.available_movies &&
              ` ${t('vod.collection.of', 'of')} ${collection.total_movies}`}
          </Text>

          {promoText && (
            <Text style={[styles.promoText, { textAlign }]}>{promoText}</Text>
          )}

          {description && (
            <Text style={[styles.description, { textAlign }]}>{description}</Text>
          )}

          <GlassButton
            icon={Play}
            label={t('vod.collection.playAll', 'Play All')}
            onPress={handlePlayAll}
            disabled={collection.movies.length === 0}
            style={styles.playButton}
          />
        </GlassCard>

        {/* Movies List */}
        <View style={styles.moviesSection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('vod.collection.movies', 'Movies')}
          </Text>

          {collection.movies.map((movie, index) => (
            <TouchableOpacity
              key={movie.id}
              onPress={() => handleMoviePress(movie)}
              style={styles.movieRow}
              activeOpacity={0.7}
            >
              <GlassCard style={styles.movieCard}>
                <View style={[styles.movieContent, isRTL && styles.movieContentRTL]}>
                  {movie.thumbnail && (
                    <Image
                      source={{ uri: movie.thumbnail }}
                      style={styles.movieThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.movieInfo}>
                    <Text style={[styles.movieOrder, { textAlign }]}>
                      {movie.collection_order}.
                    </Text>
                    <Text style={[styles.movieTitle, { textAlign }]} numberOfLines={2}>
                      {i18n.language === 'en' ? movie.title_en || movie.title : movie.title}
                    </Text>
                    <View style={styles.movieMeta}>
                      {movie.year && (
                        <Text style={[styles.movieMetaText, { textAlign }]}>{movie.year}</Text>
                      )}
                      {movie.duration && (
                        <Text style={[styles.movieMetaText, { textAlign }]}>
                          {movie.duration}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  scrollView: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  backdrop: { width: '100%', height: 200, resizeMode: 'cover' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  card: { margin: spacing.md },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.sm },
  promoText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  playButton: { marginTop: spacing.sm },
  moviesSection: { paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  movieRow: { marginBottom: spacing.sm },
  movieCard: { padding: spacing.sm },
  movieContent: { flexDirection: 'row', alignItems: 'center' },
  movieContentRTL: { flexDirection: 'row-reverse' },
  movieThumbnail: {
    width: 120,
    height: 68,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  movieInfo: { flex: 1 },
  movieOrder: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  movieTitle: { fontSize: fontSize.md, color: colors.text, marginBottom: spacing.xs },
  movieMeta: { flexDirection: 'row', gap: spacing.sm },
  movieMetaText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
