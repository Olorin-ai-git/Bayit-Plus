import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Download, Play, Trash2, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { downloadsService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';
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
      >
        <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⬇️'}</Text>
              </View>
            )}

            {/* Progress Bar */}
            {isDownloading && item.progress !== undefined && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
              </View>
            )}

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeIcon}>{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Size Badge */}
            {item.size && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeText}>{item.size}</Text>
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

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
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
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <View style={styles.headerIcon}>
          <Download size={28} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('downloads.title')}</Text>
          <Text style={[styles.itemCount, { textAlign }]}>{downloads.length} {t('downloads.items')}</Text>
        </View>
      </View>

      {/* Storage Bar */}
      <GlassCard style={styles.storageCard}>
        <View style={styles.storageRow}>
          <HardDrive size={24} color={colors.textMuted} />
          <View style={styles.storageInfo}>
            <View style={styles.storageHeader}>
              <Text style={styles.storageLabel}>{t('downloads.storage')}</Text>
              <Text style={styles.storageValue}>
                {formatSize(storageInfo.used)} / {storageInfo.total} GB
              </Text>
            </View>
            <View style={styles.storageBarContainer}>
              <View style={[styles.storageBarFill, { width: `${(storageInfo.used / storageInfo.total) * 100}%` }]} />
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Loading State */}
      {loading ? (
        <View style={styles.grid}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : downloads.length > 0 ? (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <DownloadCard item={item} onDelete={handleDelete} pausedText={pausedText} />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Download size={64} color="rgba(168, 85, 247, 0.5)" />
            <Text style={styles.emptyTitle}>{t('downloads.empty')}</Text>
            <Text style={styles.emptyDescription}>{t('downloads.emptyHint')}</Text>
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
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
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
  storageCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  storageInfo: {
    flex: 1,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  storageLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  storageValue: {
    fontSize: 14,
    color: colors.text,
  },
  storageBarContainer: {
    height: 8,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
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
    overflow: 'hidden',
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
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.backgroundLighter,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
  sizeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
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
  deleteButton: {
    position: 'absolute',
    top: 40,
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
