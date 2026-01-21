import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { downloadsService, type Download } from '../services/api';

interface DownloadItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'episode' | 'podcast';
  size: string;
  downloadedAt: string;
  status: 'completed' | 'downloading' | 'paused';
  progress?: number;
}

// Helper to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${Math.round(bytes / 1048576)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

// Helper to map content type to display type
const mapContentType = (contentType: string): 'movie' | 'series' | 'episode' | 'podcast' => {
  switch (contentType) {
    case 'movie':
    case 'vod':
      return 'movie';
    case 'episode':
      return 'episode';
    case 'series':
      return 'series';
    case 'podcast_episode':
    case 'podcast':
      return 'podcast';
    default:
      return 'movie';
  }
};

// Transform API download to DownloadItem
const transformDownload = (dl: Download): DownloadItem => ({
  id: dl.id,
  title: dl.title || `Content ${dl.content_id.slice(0, 8)}`,
  title_en: dl.title_en,
  title_es: dl.title_es,
  thumbnail: dl.thumbnail,
  type: mapContentType(dl.content_type),
  size: formatFileSize(dl.file_size),
  downloadedAt: dl.downloaded_at,
  status: dl.status === 'failed' ? 'paused' : (dl.status as 'completed' | 'downloading' | 'paused'),
  progress: dl.progress,
});

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  episode: '📺',
  podcast: '🎙️',
};

const DownloadCard: React.FC<{
  item: DownloadItem;
  onPress: () => void;
  onDelete: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onDelete, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{TYPE_ICONS[item.type] || '⬇️'}</Text>
          </View>
        )}

        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && item.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}

        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
        </View>

        <View style={[styles.sizeBadge, isRTL ? { right: 8 } : { left: 8 }]}>
          <Text style={styles.sizeBadgeText}>{item.size}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.subtitle && (
            <Text style={[styles.cardSubtitle, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
          {item.status === 'downloading' && (
            <View style={[styles.statusRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
              <Text style={styles.statusText}>{item.progress}%</Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.overlayButtons}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const DownloadsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  // Calculate total size
  const getTotalSize = () => {
    let totalMB = 0;
    downloads.forEach(item => {
      const sizeStr = item.size.toUpperCase();
      if (sizeStr.includes('GB')) {
        totalMB += parseFloat(sizeStr) * 1024;
      } else if (sizeStr.includes('MB')) {
        totalMB += parseFloat(sizeStr);
      }
    });
    if (totalMB >= 1024) {
      return `${(totalMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(totalMB)} MB`;
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setIsLoading(true);
      const apiDownloads = await downloadsService.getDownloads();
      const transformedDownloads = apiDownloads.map(transformDownload);
      setDownloads(transformedDownloads);
    } catch (err) {
      console.error('Failed to load downloads:', err);
      setDownloads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: DownloadItem) => {
    if (item.status !== 'completed') return;

    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'podcast' ? 'podcast' : 'vod',
    });
  };

  const handleDeleteDownload = async (id: string) => {
    try {
      await downloadsService.deleteDownload(id);
      setDownloads(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete download:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>⬇️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('downloads.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {downloads.length} {t('downloads.items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View style={[styles.storageInfo, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <Text style={styles.storageLabel}>{t('downloads.storage')}</Text>
        <View style={styles.storageBarContainer}>
          <View style={[styles.storageBar, { width: '35%' }]} />
        </View>
        <Text style={styles.storageText}>12.5 GB / 32 GB</Text>
      </View>

      {/* Content Grid */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <DownloadCard
            item={item}
            onPress={() => handleItemPress(item)}
            onDelete={() => handleDeleteDownload(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⬇️</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('downloads.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>{t('downloads.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  storageInfo: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  storageLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  storageBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundLighter,
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  storageText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '16.66%' : '25%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    // @ts-ignore
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 14,
  },
  sizeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sizeBadgeText: {
    fontSize: 10,
    color: colors.background,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 4,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 4,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 100, 100, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default DownloadsScreen;
