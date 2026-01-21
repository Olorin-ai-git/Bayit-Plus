import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, useWindowDimensions } from 'react-native';
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
        <GlassCard className={`p-0 mx-1 relative ${isHovered ? 'scale-102' : ''}`}>
          <View className="aspect-video relative">
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-white/5 justify-center items-center">
                <Text className="text-3xl">{TYPE_ICONS[item.type] || '⭐'}</Text>
              </View>
            )}

            {/* Type Badge */}
            <View className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-lg">
              <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Hover Overlay */}
            {isHovered && (
              <View className="absolute inset-0 bg-black/50 justify-center items-center">
                <View className="w-12 h-12 rounded-full bg-purple-600 justify-center items-center">
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View className="p-2">
            <Text className="text-base font-semibold text-white" numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.subtitle && (
              <Text className="text-sm text-white/60 mt-1" numberOfLines={1}>{getLocalizedText('subtitle')}</Text>
            )}
          </View>

          {/* Remove Button */}
          {isHovered && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-red-500/80 justify-center items-center"
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
    <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <View className={`flex-row items-center gap-2 mb-6 ${isRTL ? 'flex-row-reverse justify-end' : ''}`} style={{ flexDirection, justifyContent }}>
        <View className="w-14 h-14 rounded-full bg-yellow-500/20 justify-center items-center">
          <Star size={28} color={colors.warning} />
        </View>
        <View>
          <Text className="text-3xl font-bold text-white" style={{ textAlign }}>{t('favorites.title')}</Text>
          <Text className="text-sm text-white/60" style={{ textAlign }}>{favorites.length} {t('favorites.items')}</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View className="flex-row flex-wrap gap-4">
          {[...Array(12)].map((_, i) => (
            <View key={i} className="flex-1 min-w-[150px] max-w-[16.66%] aspect-video bg-white/5 rounded-lg mx-1" />
          ))}
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ gap: spacing.md }}
          columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <FavoriteCard item={item} onRemove={handleRemove} />
            </View>
          )}
        />
      ) : (
        <View className="flex-1 justify-center items-center py-16">
          <GlassCard className="p-12 items-center">
            <Star size={64} color="rgba(245, 158, 11, 0.5)" />
            <Text className="text-xl font-semibold text-white mt-4 mb-2">{t('favorites.empty')}</Text>
            <Text className="text-base text-white/70">{t('favorites.emptyHint')}</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}
