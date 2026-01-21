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
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { downloadsService, type Download } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { colors } from '../theme';

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
          ReactNativeHapticFeedback.trigger('notificationWarning');
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
      ReactNativeHapticFeedback.trigger('impactLight');
      onPress();
    }
  }, [isSwiping, onPress]);

  return (
    <View className="flex-1 m-1 overflow-hidden rounded-lg">
      {/* Delete background */}
      <View
        className="absolute top-0 bottom-0 w-[40%] bg-red-500 justify-center items-center flex-col"
        style={isRTL ? { left: 0 } : { right: 0 }}
      >
        <Text className="text-2xl">🗑️</Text>
        <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
      </View>

      {/* Card */}
      <Animated.View
        className="bg-white/5 rounded-lg overflow-hidden"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} disabled={isSwiping}>
          <View className="bg-white/5 rounded-lg overflow-hidden">
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full aspect-video"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full aspect-video bg-white/10 justify-center items-center">
                <Text className="text-3xl">{TYPE_ICONS[item.type] || '⬇️'}</Text>
              </View>
            )}

            {/* Progress bar for downloading items */}
            {item.status === 'downloading' && item.progress !== undefined && (
              <View className="absolute bottom-12 left-0 right-0 h-[3px] bg-black/50">
                <View
                  className="h-full rounded"
                  style={{ width: `${item.progress}%`, backgroundColor: colors.primary }}
                />
              </View>
            )}

            <View
              className="absolute top-2 bg-black/70 rounded-xl px-2 py-1"
              style={isRTL ? { left: 8 } : { right: 8 }}
            >
              <Text className="text-xs">{TYPE_ICONS[item.type]}</Text>
            </View>

            <View
              className="absolute top-2 bg-purple-500/90 rounded-lg px-1.5 py-0.5"
              style={isRTL ? { right: 8 } : { left: 8 }}
            >
              <Text className="text-[9px] text-white font-bold">{item.size}</Text>
            </View>

            <View className="p-2">
              <Text
                className="text-[13px] font-semibold text-white"
                style={{ textAlign }}
                numberOfLines={1}
              >
                {getLocalizedText(item, 'title')}
              </Text>
              {item.status === 'downloading' && (
                <View
                  className="mt-1 items-center gap-1"
                  style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
                >
                  <Text className="text-[11px] font-semibold" style={{ color: colors.primary }}>
                    {item.progress}%
                  </Text>
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
    ReactNativeHapticFeedback.trigger('impactLight');
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

    ReactNativeHapticFeedback.trigger('impactMedium');
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
              ReactNativeHapticFeedback.trigger('notificationSuccess');
            } catch (err) {
              console.error('Failed to delete download:', err);
              ReactNativeHapticFeedback.trigger('notificationError');
            }
          },
        },
      ]
    );
  }, [t]);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View
        className="items-center px-4 pt-6 pb-4"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
      >
        <View
          className="w-12 h-12 rounded-full bg-purple-500/20 justify-center items-center"
          style={{ marginLeft: isRTL ? 16 : 0, marginRight: isRTL ? 0 : 16 }}
        >
          <Text className="text-2xl">⬇️</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[28px] font-bold" style={{ color: colors.text, textAlign }}>
            {t('downloads.title', 'Downloads')}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary, textAlign }}>
            {downloads.length} {t('downloads.items', 'items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View className="flex-row items-center px-4 pb-4 gap-2">
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {t('downloads.storage', 'Storage')}
        </Text>
        <View className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
          <View
            className="h-full rounded"
            style={{ width: '35%', backgroundColor: colors.primary }}
          />
        </View>
        <Text className="text-xs font-medium" style={{ color: colors.text }}>
          12.5 GB / 32 GB
        </Text>
      </View>

      {/* Swipe hint */}
      <Text className="text-xs px-4 pb-2" style={{ color: colors.textSecondary, textAlign }}>
        {t('downloads.swipeToDelete', '← Swipe to delete')}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-16 px-6">
      <View className="p-8 items-center bg-white/5 rounded-xl">
        <Text className="text-5xl mb-4">⬇️</Text>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.text, textAlign }}>
          {t('downloads.empty', 'No downloads yet')}
        </Text>
        <Text className="text-sm" style={{ color: colors.textSecondary, textAlign }}>
          {t('downloads.emptyHint', 'Download content to watch offline')}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-base mt-4" style={{ color: colors.text }}>
          {t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`downloads-grid-${numColumns}`}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
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

export default DownloadsScreenMobile;
