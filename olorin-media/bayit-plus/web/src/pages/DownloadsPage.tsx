import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
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
        <GlassCard className={`p-0 m-1 overflow-hidden relative ${isHovered ? 'scale-105' : ''}`}>
          <View className="aspect-video relative">
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-white/5 justify-center items-center">
                <Text className="text-3xl">{TYPE_ICONS[item.type] || '⬇️'}</Text>
              </View>
            )}

            {/* Progress Bar */}
            {isDownloading && item.progress !== undefined && (
              <View className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                <View className="h-full bg-purple-600" style={{ width: `${item.progress}%` }} />
              </View>
            )}

            {/* Type Badge */}
            <View className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-lg">
              <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Size Badge */}
            {item.size && (
              <View className="absolute top-2 left-2 bg-purple-500/90 px-2 py-1 rounded-lg">
                <Text className="text-black text-xs font-bold">{item.size}</Text>
              </View>
            )}

            {/* Status Overlay */}
            {(isDownloading || isPaused) && (
              <View className="absolute inset-0 bg-black/40 justify-center items-center">
                {isDownloading && (
                  <>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="text-white text-sm font-semibold mt-2">{item.progress}%</Text>
                  </>
                )}
                {isPaused && <Text className="text-yellow-500 text-sm font-semibold">{pausedText}</Text>}
              </View>
            )}

            {/* Hover Overlay */}
            {item.status === 'completed' && isHovered && (
              <View className="absolute inset-0 bg-black/50 justify-center items-center">
                <View className="w-12 h-12 rounded-full bg-purple-600 justify-center items-center">
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View className="p-2">
            <Text className="text-white text-base font-semibold" numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
            )}
          </View>

          {/* Delete Button */}
          {isHovered && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="absolute top-10 left-2 w-8 h-8 rounded-full bg-red-500/80 justify-center items-center"
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
    <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <View className={`flex-row items-center gap-2 mb-4 ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : ''}`}>
        <View className="w-14 h-14 rounded-full bg-purple-700/30 justify-center items-center">
          <Download size={28} color={colors.primary} />
        </View>
        <View>
          <Text className={`text-white text-3xl font-bold ${textAlign === 'right' ? 'text-right' : ''}`}>{t('downloads.title')}</Text>
          <Text className={`text-gray-400 text-sm ${textAlign === 'right' ? 'text-right' : ''}`}>{downloads.length} {t('downloads.items')}</Text>
        </View>
      </View>

      {/* Storage Bar */}
      <GlassCard className="p-4 mb-6">
        <View className="flex-row items-center gap-4">
          <HardDrive size={24} color={colors.textMuted} />
          <View className="flex-1">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400 text-sm">{t('downloads.storage')}</Text>
              <Text className="text-white text-sm">
                {formatSize(storageInfo.used)} / {storageInfo.total} GB
              </Text>
            </View>
            <View className="h-2 bg-white/5 rounded-full overflow-hidden">
              <View className="h-full bg-purple-600 rounded-full" style={{ width: `${(storageInfo.used / storageInfo.total) * 100}%` }} />
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Loading State */}
      {loading ? (
        <View className="flex-row flex-wrap gap-4">
          {[...Array(12)].map((_, i) => (
            <View key={i} className="flex-1 min-w-[150px] max-w-[16.66%] aspect-video bg-white/10 rounded-2xl m-1" />
          ))}
        </View>
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
        <View className="flex-1 justify-center items-center py-16">
          <GlassCard className="p-12 items-center">
            <Download size={64} color="rgba(168, 85, 247, 0.5)" />
            <Text className="text-white text-xl font-semibold mt-4 mb-2">{t('downloads.empty')}</Text>
            <Text className="text-gray-400 text-base">{t('downloads.emptyHint')}</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}
