/**
 * DownloadsScreenMobile - Mobile-optimized downloads/offline content screen
 *
 * Features:
 * - Pull-to-refresh
 * - Swipe-to-delete support
 * - 2-3 columns grid based on device
 * - Storage info from device
 * - Download progress indicators
 * - RTL support
 * - Haptic feedback
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { downloadsService, type Download } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.25;

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

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${Math.round(bytes / 1048576)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

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

interface SwipeableDownloadCardProps {
  item: DownloadItem;
  onPress: () => void;
  onDelete: () => void;
  getLocalizedText: (item: any, field: string) => string;
}

const SwipeableDownloadCard: React.FC<SwipeableDownloadCardProps> = ({
  item,
  onPress,
  onDelete,
  getLocalizedText,
}) => {
  const { isRTL, textAlign } = useDirection();
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwiping, setIsSwiping] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        setIsSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swipe in the correct direction for delete
        const swipeValue = isRTL ? gestureState.dx : -gestureState.dx;
        if (swipeValue > 0) {
          translateX.setValue(isRTL ? gestureState.dx : gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsSwiping(false);
        const swipeValue = isRTL ? gestureState.dx : -gestureState.dx;

        if (swipeValue > DELETE_THRESHOLD) {
          // Trigger delete with animation
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.spring(translateX, {
            toValue: isRTL ? SCREEN_WIDTH : -SCREEN_WIDTH,
            useNativeDriver: true,
          }).start(() => {
            onDelete();
          });
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (!isSwiping) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [isSwiping, onPress]);

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <View style={[styles.deleteBackground, isRTL ? { left: 0 } : { right: 0 }]}>
        <Text style={styles.deleteIcon}>🗑️</Text>
        <Text style={styles.deleteText}>Delete</Text>
      </View>

      {/* Card */}
      <Animated.View
        style={[styles.cardTouchable, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} disabled={isSwiping}>
          <View style={styles.card}>
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
              {item.status === 'downloading' && (
                <View style={[styles.statusRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                  <Text style={styles.statusText}>{item.progress}%</Text>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const DownloadsScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const { isPhone } = useResponsive();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const currentLang = i18n.language;

  // Responsive columns: 2 on phone, 3 on tablet
  const numColumns = getGridColumns({ phone: 2, tablet: 3 });

  const getLocalizedText = useCallback((item: any, field: string): string => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  }, [currentLang]);

  const getTotalSize = useCallback(() => {
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
  }, [downloads]);

  const loadDownloads = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadDownloads();
    setRefreshing(false);
  }, [loadDownloads]);

  const handleItemPress = useCallback((item: DownloadItem) => {
    if (item.status !== 'completed') {
      Alert.alert(
        t('downloads.notReady', 'Download Not Ready'),
        t('downloads.waitForCompletion', 'Please wait for the download to complete.')
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'podcast' ? 'podcast' : 'vod',
    });
  }, [navigation, getLocalizedText, t]);

  const handleDeleteDownload = useCallback(async (id: string) => {
    Alert.alert(
      t('downloads.confirmDelete', 'Delete Download?'),
      t('downloads.confirmDeleteMessage', 'This will remove the downloaded content from your device.'),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => {
            // Reset any animation
            setDownloads(prev => [...prev]);
          },
        },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await downloadsService.deleteDownload(id);
              setDownloads(prev => prev.filter(item => item.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Failed to delete download:', err);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }, [t]);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }]}>
          <Text style={styles.headerIconText}>⬇️</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { textAlign }]}>{t('downloads.title', 'Downloads')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {downloads.length} {t('downloads.items', 'items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View style={styles.storageInfo}>
        <Text style={styles.storageLabel}>{t('downloads.storage', 'Storage')}</Text>
        <View style={styles.storageBarContainer}>
          <View style={[styles.storageBar, { width: '35%' }]} />
        </View>
        <Text style={styles.storageText}>12.5 GB / 32 GB</Text>
      </View>

      {/* Swipe hint */}
      <Text style={[styles.swipeHint, { textAlign }]}>
        {t('downloads.swipeToDelete', '← Swipe to delete')}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>⬇️</Text>
        <Text style={[styles.emptyTitle, { textAlign }]}>
          {t('downloads.empty', 'No downloads yet')}
        </Text>
        <Text style={[styles.emptySubtitle, { textAlign }]}>
          {t('downloads.emptyHint', 'Download content to watch offline')}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`downloads-grid-${numColumns}`}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <SwipeableDownloadCard
            item={item}
            onPress={() => handleItemPress(item)}
            onDelete={() => handleDeleteDownload(item.id)}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
    fontSize: 16,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  storageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  storageBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  storageText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  swipeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  swipeContainer: {
    flex: 1,
    margin: spacing.xs,
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  deleteIcon: {
    fontSize: 24,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cardTouchable: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    height: 3,
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
    fontSize: 12,
  },
  sizeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(126, 34, 206, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sizeBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statusRow: {
    marginTop: 4,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default DownloadsScreenMobile;
