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
      className="flex-1 m-2 max-w-[16.66%] md:max-w-[25%]"
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`bg-[${colors.backgroundLight}] rounded-lg overflow-hidden border-[3px] ${
          isFocused ? `border-[${colors.primary}]` : 'border-transparent'
        }`}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className={`w-full aspect-video bg-[${colors.backgroundLighter}] justify-center items-center`}>
            <Text className="text-[32px]">{TYPE_ICONS[item.type] || '⬇️'}</Text>
          </View>
        )}

        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && item.progress !== undefined && (
          <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
            <View className={`h-full bg-[${colors.primary}]`} style={{ width: `${item.progress}%` }} />
          </View>
        )}

        <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/70 rounded-xl px-2 py-1`}>
          <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
        </View>

        <View className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} bg-[#a855f7]/80 rounded-lg px-1.5 py-0.5`}>
          <Text className={`text-[10px] text-[${colors.background}] font-bold`}>{item.size}</Text>
        </View>

        <View className="p-2">
          <Text className={`text-sm font-semibold text-[${colors.text}]`} style={{ textAlign }} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.subtitle && (
            <Text className={`text-xs text-[${colors.textSecondary}] mt-0.5`} style={{ textAlign }} numberOfLines={1}>
              {getLocalizedText(item, 'subtitle')}
            </Text>
          )}
          {item.status === 'downloading' && (
            <View className={`mt-1 items-center gap-1 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
              <Text className={`text-xs text-[${colors.primary}] font-semibold`}>{item.progress}%</Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <View className={`w-12 h-12 rounded-full bg-[${colors.primary}] justify-center items-center`}>
                <Text className={`text-xl text-[${colors.background}] ml-1`}>▶</Text>
              </View>
              <TouchableOpacity onPress={onDelete} className="w-12 h-12 rounded-full bg-[#ff6464]/80 justify-center items-center">
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
      <View className={`flex-1 bg-[${colors.background}] justify-center items-center`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`text-[${colors.text}] text-lg mt-4`}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-[${colors.background}]`}>
      {/* Header */}
      <View className={`flex-row items-center px-12 pt-10 pb-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View className={`w-[60px] h-[60px] rounded-full bg-[#6b21a8]/30 justify-center items-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
          <Text className="text-[28px]">⬇️</Text>
        </View>
        <View>
          <Text className={`text-[42px] font-bold text-[${colors.text}]`} style={{ textAlign }}>{t('downloads.title')}</Text>
          <Text className={`text-lg text-[${colors.textSecondary}] mt-0.5`} style={{ textAlign }}>
            {downloads.length} {t('downloads.items')} • {getTotalSize()}
          </Text>
        </View>
      </View>

      {/* Storage info */}
      <View className={`px-12 pb-4 items-center gap-2 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <Text className={`text-sm text-[${colors.textSecondary}]`}>{t('downloads.storage')}</Text>
        <View className={`flex-1 h-2 bg-[${colors.backgroundLighter}] rounded overflow-hidden`}>
          <View className={`h-full bg-[${colors.primary}] rounded`} style={{ width: '35%' }} />
        </View>
        <Text className={`text-sm text-[${colors.text}] font-medium`}>12.5 GB / 32 GB</Text>
      </View>

      {/* Content Grid */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        className="px-6 pb-12 pt-4"
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
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">⬇️</Text>
              <Text className={`text-xl font-semibold text-[${colors.text}] mb-2`} style={{ textAlign }}>{t('downloads.empty')}</Text>
              <Text className={`text-base text-[${colors.textSecondary}]`} style={{ textAlign }}>{t('downloads.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default DownloadsScreen;
