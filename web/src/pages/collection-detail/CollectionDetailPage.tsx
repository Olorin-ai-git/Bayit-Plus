import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, ArrowLeft } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import api from '@/services/api';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';
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

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { openPlayer } = useFullscreenPlayerStore();

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCollectionDetail();
  }, [collectionId]);

  const loadCollectionDetail = async () => {
    if (!collectionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.get(`/content/collections/${collectionId}`) as CollectionDetail;
      setCollection(data);
      logger.info(`Loaded collection: ${data.title}`);
    } catch (err) {
      logger.error('Failed to load collection', 'CollectionDetailPage', err);
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

      // Add all movies to playlist using bulk API
      await api.post('/playlist/items/bulk', {
        content_ids: movieIds,
        content_type: 'vod',
      });

      // Play first movie
      openPlayer({
        id: movieIds[0],
        type: 'vod',
        title: collection.movies[0].title,
        src: collection.movies[0].stream_url,
      });

      logger.info(`Playing all ${movieIds.length} movies from collection`);
    } catch (err) {
      logger.error('Failed to play collection', 'CollectionDetailPage', err);
    }
  };

  const handleMovieClick = (movie: MovieInCollection) => {
    openPlayer({
      id: movie.id,
      type: 'vod',
      title: movie.title,
      src: movie.stream_url,
    });
  };

  if (loading) return <PageLoading />;

  if (error || !collection) {
    return (
      <View style={styles.container}>
        <GlassPageHeader title={t('vod.collection.detail', 'Collection')} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign }]}>
            {error || t('vod.collection.notFound')}
          </Text>
          <GlassButton
            label={t('common.goBack', 'Go Back')}
            onPress={() => navigate(-1)}
          />
        </View>
      </View>
    );
  }

  const promoText = i18n.language === 'en' ? collection.promo_text_en : collection.promo_text;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader
        title={i18n.language === 'en' ? collection.title_en || collection.title : collection.title}
        subtitle={`${collection.available_movies} ${t('vod.collection.movies', 'movies')}${
          collection.total_movies > collection.available_movies
            ? ` ${t('vod.collection.available', 'of')} ${collection.total_movies}`
            : ''
        }`}
      />

      {/* Backdrop/Hero */}
      {collection.backdrop && (
        <View style={styles.heroContainer}>
          <img src={collection.backdrop} style={styles.backdrop as any} alt="" />
          <View style={styles.heroOverlay} />
        </View>
      )}

      {/* Description & Play All */}
      <GlassCard style={styles.card}>
        {promoText && (
          <Text style={[styles.promoText, { textAlign }]} className="promo-fade-in">
            {promoText}
          </Text>
        )}

        {collection.description && (
          <Text style={[styles.description, { textAlign }]}>
            {i18n.language === 'en' ? collection.description_en || collection.description : collection.description}
          </Text>
        )}

        <GlassButton
          icon={Play}
          label={t('vod.collection.playAll', 'Play All')}
          onPress={handlePlayAll}
          disabled={collection.movies.length === 0}
        />
      </GlassCard>

      {/* Movies List */}
      <View style={styles.moviesSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('vod.collection.movies', 'Movies')}
        </Text>

        {collection.movies.map((movie) => (
          <Pressable
            key={movie.id}
            onPress={() => handleMovieClick(movie)}
            style={styles.movieRow}
          >
            <GlassCard style={styles.movieCard}>
              <View style={[styles.movieContent, isRTL && styles.movieContentRTL]}>
                {movie.thumbnail && (
                  <img src={movie.thumbnail} style={styles.movieThumbnail as any} alt={movie.title} />
                )}
                <View style={styles.movieInfo}>
                  <Text style={[styles.movieOrder, { textAlign }]}>
                    {movie.collection_order}.
                  </Text>
                  <Text style={[styles.movieTitle, { textAlign }]}>
                    {i18n.language === 'en' ? movie.title_en || movie.title : movie.title}
                  </Text>
                  {movie.year && (
                    <Text style={[styles.movieMeta, { textAlign }]}>{movie.year}</Text>
                  )}
                  {movie.duration && (
                    <Text style={[styles.movieMeta, { textAlign }]}>{movie.duration}</Text>
                  )}
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <style>{`
        .promo-fade-in {
          animation: fadeIn 0.6s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  heroContainer: { height: 300, position: 'relative' as any, marginBottom: spacing.md },
  backdrop: { width: '100%', height: '100%', objectFit: 'cover' as any },
  heroOverlay: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(to top, rgba(10, 10, 20, 0.95), transparent)',
  },
  errorContainer: { padding: spacing.lg, alignItems: 'center' },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  card: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  promoText: { fontSize: fontSize.lg, color: colors.primary, marginBottom: spacing.sm, fontWeight: '500' },
  description: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  moviesSection: { paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md },
  movieRow: { marginBottom: spacing.sm },
  movieCard: { padding: spacing.sm },
  movieContent: { flexDirection: 'row' as any, alignItems: 'center', gap: spacing.md },
  movieContentRTL: { flexDirection: 'row-reverse' as any },
  movieThumbnail: { width: 100, height: 60, borderRadius: borderRadius.sm, objectFit: 'cover' as any },
  movieInfo: { flex: 1, flexDirection: 'row' as any, flexWrap: 'wrap' as any, gap: spacing.xs },
  movieOrder: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, minWidth: 30 },
  movieTitle: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  movieMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
});
