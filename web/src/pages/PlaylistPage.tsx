import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Link } from 'react-router-dom';
import { Play, X, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { playlistService } from '@/services/api';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassCard, GlassView, GlassPageHeader, GlassEmptyState } from '@bayit/shared/ui';
import { LoadingState } from '@bayit/shared-components/states';
import logger from '@/utils/logger';

const TYPE_ICON_NAMES: Record<string, string> = {
  movie: 'vod',
  series: 'vod',
  channel: 'live',
  podcast: 'podcasts',
  radio: 'radio',
};

const TYPE_ROUTES: Record<string, string> = {
  movie: 'vod',
  series: 'vod',
  channel: 'live',
  podcast: 'podcasts',
  radio: 'radio',
};

interface PlaylistItem {
  id: string;
  type: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  position?: number;
}

function PlaylistCard({ item, onRemove }: { item: PlaylistItem; onRemove: (id: string) => void }) {
  const { i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getLocalizedText = (field: 'title' | 'subtitle') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || item.title;
    if (lang === 'es') return item[`${field}_es` as keyof PlaylistItem] || item[`${field}_en` as keyof PlaylistItem] || item[field];
    return item[`${field}_en` as keyof PlaylistItem] || item[field];
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
                <NativeIcon name={TYPE_ICON_NAMES[item.type] || 'discover'} size="xl" color={colors.textMuted} />
              </View>
            )}

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <NativeIcon name={TYPE_ICON_NAMES[item.type] || 'discover'} size="sm" color={colors.background} />
            </View>

            {/* Position Badge */}
            {item.position !== undefined && (
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{item.position + 1}</Text>
              </View>
            )}

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

export default function PlaylistPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useResponsive();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const data = await playlistService.getPlaylist();
      setPlaylist((data as any).items || []);
    } catch (error) {
      logger.error('Failed to load playlist', 'PlaylistPage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await playlistService.removeItem(id);
      setPlaylist((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      logger.error('Failed to remove playlist item', 'PlaylistPage', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlassPageHeader
        title={t('playlist.title')}
        pageType="playlist"
        badge={playlist.length}
        isRTL={isRTL}
      />

      {/* Loading State */}
      {loading ? (
        <LoadingState
          message={t('playlist.loading', 'Loading playlist...')}
          spinnerColor={colors.primary.DEFAULT}
        />
      ) : playlist.length > 0 ? (
        <FlatList
          data={playlist}
          keyExtractor={(item: any) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.gridItem, { maxWidth: `${100 / numColumns}%` }]}>
              <PlaylistCard item={item} onRemove={handleRemove} />
            </View>
          )}
        />
      ) : (
        <GlassEmptyState
          variant="no-playlist"
          icon={<List size={72} color="rgba(139, 92, 246, 0.5)" strokeWidth={1.5} />}
          title={t('playlist.empty')}
          description={t('playlist.emptyHint')}
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
  gridContent: {
    gap: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
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
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  positionBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.primary.DEFAULT,
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
    zIndex: 10,
  },
});
