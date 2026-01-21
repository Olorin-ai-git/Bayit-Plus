import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { downloadsService, type Download } from '@bayit/shared-services';

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
      className="flex-1 m-2 max-w-[16.66%]"
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#2d2540] rounded-lg overflow-hidden border-3 ${isFocused ? 'border-purple-600' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-purple-600/10 justify-center items-center">
            <Text className="text-3xl">{TYPE_ICONS[item.type] || '⬇️'}</Text>
          </View>
        )}

        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && item.progress !== undefined && (
          <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
            <View className="h-full bg-purple-600" style={{ width: `${item.progress}%` }} />
          </View>
        )}

        <View className="absolute top-2 bg-black/70 rounded-xl px-2 py-1" style={isRTL ? { left: 8 } : { right: 8 }}>
          <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
        </View>

        <View className="absolute top-2 bg-purple-500/80 rounded-lg px-1.5 py-0.5" style={isRTL ? { right: 8 } : { left: 8 }}>
          <Text className="text-[10px] text-black font-bold">{item.size}</Text>
        </View>

        <View className="p-2">
          <Text className="text-sm font-semibold text-white" style={{ textAlign }} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.subtitle && (
            <Text className="text-xs text-white/60 mt-0.5" style={{ textAlign }} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
          {item.status === 'downloading' && (
            <View className="flex-row items-center gap-2 mt-1" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
              <Text className="text-xs text-purple-600 font-semibold">{item.progress}%</Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <View className="w-12 h-12 rounded-full bg-purple-600 justify-center items-center">
                <Text className="text-xl text-black ml-1">▶</Text>
              </View>
              <TouchableOpacity onPress={onDelete} className="w-12 h-12 rounded-full bg-red-500/80 justify-center items-center">
                <Text className="text-lg">🗑️</Text>
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
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
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
      <View className="flex-1 bg-[#1a1525] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1a1525]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-15 h-15 rounded-full bg-purple-600/30 justify-center items-center" style={{ marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }}>
          <Text className="text-3xl">⬇️</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('downloads.title')}</Text>
          <Text className="text-lg text-white/60 mt-0.5" style={{ textAlign }}>
            {downloads.length} {t('downloads.items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View className="px-12 pb-4 items-center gap-2" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <Text className="text-sm text-white/60">{t('downloads.storage')}</Text>
        <View className="flex-1 h-2 bg-white/10 rounded overflow-hidden">
          <View className="h-full bg-purple-600 rounded" style={{ width: '35%' }} />
        </View>
        <Text className="text-sm text-white font-medium">12.5 GB / 32 GB</Text>
      </View>

      {/* Content Grid */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.md }}
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
          <View className="flex-1 justify-center items-center py-15">
            <GlassView className="p-12 items-center">
              <Text className="text-6xl mb-4">⬇️</Text>
              <Text className="text-xl font-semibold text-white mb-2" style={{ textAlign }}>{t('downloads.empty')}</Text>
              <Text className="text-base text-white/60" style={{ textAlign }}>{t('downloads.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default DownloadsScreen;
