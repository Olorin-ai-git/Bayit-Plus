import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Star, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { favoritesService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';
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
    <Link to={route} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⭐'}</Text>
              </View>
            )}

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeIcon}>{TYPE_ICONS[item.type]}</Text>
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

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
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
          <Text style={[styles.pageTitle, { textAlign }]}>{t('favorites.title')}</Text>
          <Text style={[styles.itemCount, { textAlign }]}>{favorites.length} {t('favorites.items')}</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.grid}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <FavoriteCard item={item} onRemove={handleRemove} />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Star size={64} color="rgba(245, 158, 11, 0.5)" />
            <Text style={styles.emptyTitle}>{t('favorites.empty')}</Text>
            <Text style={styles.emptyDescription}>{t('favorites.emptyHint')}</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    padding: 0,
    margin: spacing.xs,
    overflow: 'visible' as any,
    position: 'relative',
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeIcon: {
    fontSize: 14,
  },
  hoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: '16.66%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    margin: spacing.xs,
  },
});
