import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { Download, Play, Trash2, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { downloadsService } from '@/services/api';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassView, GlassPageHeader } from '@bayit/shared/ui';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import logger from '@/utils/logger';

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  episode: '📺',
  podcast: '🎙️',
};

interface DownloadItem {
  id: string;
  type: string;
  status: 'downloading' | 'paused' | 'completed';
  progress?: number;
  size?: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
}

function DownloadCard({ item, onDelete, pausedText }: { item: DownloadItem; onDelete: (id: string) => void; pausedText: string }) {
  const { i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getLocalizedText = (field: 'title' | 'subtitle') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || item.title;
    if (lang === 'es') return item[`${field}_es` as keyof DownloadItem] || item[`${field}_en` as keyof DownloadItem] || item[field];
    return item[`${field}_en` as keyof DownloadItem] || item[field];
  };

  const isDownloading = item.status === 'downloading';
  const isPaused = item.status === 'paused';
  const route = item.type === 'podcast' ? `/podcasts/${item.id}` : `/vod/${item.id}`;

  return (
    <Link to={item.status === 'completed' ? route : '#'} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[styles.cardPressable, isHovered && styles.cardPressableHovered]}
      >
        <GlassCard style={styles.cardContainer}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⬇️'}</Text>
              </View>
            )}

            {/* Progress Bar */}
            {isDownloading && item.progress !== undefined && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
              </View>
            )}

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Size Badge */}
            {item.size && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{item.size}</Text>
              </View>
            )}

            {/* Status Overlay */}
            {(isDownloading || isPaused) && (
              <View style={styles.statusOverlay}>
                {isDownloading && (
                  <>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </>
                )}
                {isPaused && <Text style={styles.pausedText}>{pausedText}</Text>}
              </View>
            )}

            {/* Hover Overlay */}
            {item.status === 'completed' && isHovered && (
              <View style={styles.hoverOverlay}>
                <View style={styles.playButton}>
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.titleText} numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text style={styles.subtitleText} numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
            )}
          </View>

          {/* Delete Button */}
          {isHovered && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              style={styles.deleteButton}
            >
              <Trash2 size={14} color={colors.text} />
            </Pressable>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

export default function DownloadsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 32 });
  const { width } = useWindowDimensions();

  // Localized pause text
  const pausedText = t('downloads.paused');

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const data = await downloadsService.getDownloads();
      setDownloads(data.items || []);
      calculateStorage(data.items || []);
    } catch (error) {
      logger.error('Failed to load downloads', 'DownloadsPage', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStorage = (items: DownloadItem[]) => {
    let totalMB = 0;
    items.forEach((item) => {
      const sizeStr = item.size?.toUpperCase() || '0';
      if (sizeStr.includes('GB')) {
        totalMB += parseFloat(sizeStr) * 1024;
      } else if (sizeStr.includes('MB')) {
        totalMB += parseFloat(sizeStr);
      }
    });
    setStorageInfo({ used: totalMB / 1024, total: 32 });
  };

  const handleDelete = async (id: string) => {
    try {
      await downloadsService.deleteDownload(id);
      const newDownloads = downloads.filter((item) => item.id !== id);
      setDownloads(newDownloads);
      calculateStorage(newDownloads);
    } catch (error) {
      logger.error('Failed to delete download', 'DownloadsPage', error);
    }
  };

  const formatSize = (gb: number) => {
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${Math.round(gb * 1024)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlassPageHeader
        title={t('downloads.title')}
        pageType="downloads"
        badge={downloads.length}
        isRTL={isRTL}
      />

      {/* Storage Bar */}
      <GlassCard style={styles.storageCard}>
        <View style={styles.storageContent}>
          <HardDrive size={24} color={colors.textMuted} />
          <View style={styles.storageInfo}>
            <View style={styles.storageLabelRow}>
              <Text style={styles.storageLabel}>{t('downloads.storage')}</Text>
              <Text style={styles.storageValue}>
                {formatSize(storageInfo.used)} / {storageInfo.total} GB
              </Text>
            </View>
            <View style={styles.storageBarBackground}>
              <View style={[styles.storageBarFill, { width: `${(storageInfo.used / storageInfo.total) * 100}%` }]} />
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Loading State */}
      {loading ? (
        <LoadingState
          message={t('downloads.loading', 'Loading downloads...')}
          spinnerColor={colors.primary}
        />
      ) : downloads.length > 0 ? (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ gap: spacing.md }}
          columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <DownloadCard item={item} onDelete={handleDelete} pausedText={pausedText} />
            </View>
          )}
        />
      ) : (
        <EmptyState
          icon={<Download size={72} color="rgba(168, 85, 247, 0.5)" strokeWidth={1.5} />}
          title={t('downloads.empty')}
          description={t('downloads.emptyHint')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerContainerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize['3xl'],
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  textRight: {
    textAlign: 'right',
  },

  // Storage Card
  storageCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  storageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  storageInfo: {
    flex: 1,
  },
  storageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  storageLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  storageValue: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  storageBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.full,
  },

  // Loading State
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius['2xl'],
    margin: spacing.xs,
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateCard: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    color: colors.textMuted,
    fontSize: fontSize.base,
  },

  // Download Card
  cardPressable: {
    transform: [{ scale: 1 }],
  },
  cardPressableHovered: {
    transform: [{ scale: 1.05 }],
  },
  cardContainer: {
    padding: 0,
    margin: spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
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
    fontSize: 48,
  },

  // Progress Bar
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },

  // Badges
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
  sizeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  sizeBadgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  // Status Overlay
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  pausedText: {
    color: '#EAB308',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Hover Overlay
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  // Content
  contentContainer: {
    padding: spacing.sm,
  },
  titleText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  // Delete Button
  deleteButton: {
    position: 'absolute',
    top: 40,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
