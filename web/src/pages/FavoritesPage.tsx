import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Star, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { favoritesService } from '@/services/api';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import logger from '@/utils/logger';

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  channel: '📡',
  podcast: '🎙️',
  radio: '📻',
};

const TYPE_ROUTES: Record<string, string> = {
  movie: 'vod',
  series: 'vod',
  channel: 'live',
  podcast: 'podcasts',
  radio: 'radio',
};

interface FavoriteItem {
  id: string;
  type: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
}

function FavoriteCard({ item, onRemove }: { item: FavoriteItem; onRemove: (id: string) => void }) {
  const { i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getLocalizedText = (field: 'title' | 'subtitle') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || item.title;
    if (lang === 'es') return item[`${field}_es` as keyof FavoriteItem] || item[`${field}_en` as keyof FavoriteItem] || item[field];
    return item[`${field}_en` as keyof FavoriteItem] || item[field];
  };

  const route = `/${TYPE_ROUTES[item.type] || 'vod'}/${item.id}`;

  return (
    <Link to={route} style={styles.cardLinkWrapper}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.cardContainer, isHovered && styles.cardHovered]}>
          <View style={styles.cardImageContainer}>
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⭐'}</Text>
              </View>
            )}

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Hover Overlay */}
            {isHovered && (
              <View style={styles.hoverOverlay}>
                <View style={styles.playButton}>
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
            )}
          </View>

          {/* Remove Button */}
          {isHovered && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              style={styles.removeButton}
            >
              <X size={16} color={colors.text} />
            </Pressable>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await favoritesService.getFavorites();
      setFavorites(data.items || []);
    } catch (error) {
      logger.error('Failed to load favorites', 'FavoritesPage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await favoritesService.removeFavorite(id);
      setFavorites((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      logger.error('Failed to remove favorite', 'FavoritesPage', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <View style={styles.headerIcon}>
          <Star size={28} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { textAlign }]}>{t('favorites.title')}</Text>
          <Text style={[styles.headerSubtitle, { textAlign }]}>{favorites.length} {t('favorites.items')}</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <LoadingState
          message={t('favorites.loading', 'Loading favorites...')}
          spinnerColor={colors.warning}
        />
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <View style={[styles.gridItem, { maxWidth: `${100 / numColumns}%` }]}>
              <FavoriteCard item={item} onRemove={handleRemove} />
            </View>
          )}
        />
      ) : (
        <EmptyState
          icon={<Star size={72} color="rgba(245, 158, 11, 0.5)" strokeWidth={1.5} />}
          title={t('favorites.empty')}
          description={t('favorites.emptyHint')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: '16.66%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
  },
  gridContent: {
    gap: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  cardLinkWrapper: {
    textDecoration: 'none',
    flex: 1,
  },
  cardContainer: {
    padding: 0,
    marginHorizontal: spacing.xs,
    position: 'relative',
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
  },
  cardImageContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: fontSize['3xl'],
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  typeBadgeText: {
    fontSize: fontSize.sm,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
