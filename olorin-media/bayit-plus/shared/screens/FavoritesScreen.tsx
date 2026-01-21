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
import { favoritesService } from '../services';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';

interface FavoriteItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'channel' | 'podcast' | 'radio';
  addedAt?: string;
}

// Demo favorites data with localization
const demoFavorites: FavoriteItem[] = [
  {
    id: 'fav-1',
    title: 'פאודה',
    title_en: 'Fauda',
    title_es: 'Fauda',
    subtitle: 'סדרה דרמטית',
    subtitle_en: 'Drama Series',
    subtitle_es: 'Serie Dramatica',
    thumbnail: 'https://picsum.photos/seed/fauda/400/225',
    type: 'series',
    addedAt: '2024-01-15',
  },
  {
    id: 'fav-2',
    title: 'שטיסל',
    title_en: 'Shtisel',
    title_es: 'Shtisel',
    subtitle: 'סדרה דרמטית',
    subtitle_en: 'Drama Series',
    subtitle_es: 'Serie Dramatica',
    thumbnail: 'https://picsum.photos/seed/shtisel/400/225',
    type: 'series',
    addedAt: '2024-01-10',
  },
  {
    id: 'fav-3',
    title: 'כאן 11',
    title_en: 'Kan 11',
    title_es: 'Kan 11',
    subtitle: 'ערוץ חדשות',
    subtitle_en: 'News Channel',
    subtitle_es: 'Canal de Noticias',
    thumbnail: 'https://picsum.photos/seed/kan11/400/225',
    type: 'channel',
    addedAt: '2024-01-08',
  },
  {
    id: 'fav-4',
    title: 'גלגלצ',
    title_en: 'Galgalatz',
    title_es: 'Galgalatz',
    subtitle: 'תחנת רדיו',
    subtitle_en: 'Radio Station',
    subtitle_es: 'Estacion de Radio',
    thumbnail: 'https://picsum.photos/seed/galgalatz/400/225',
    type: 'radio',
    addedAt: '2024-01-05',
  },
  {
    id: 'fav-5',
    title: 'עושים היסטוריה',
    title_en: 'Making History',
    title_es: 'Haciendo Historia',
    subtitle: 'פודקאסט היסטוריה',
    subtitle_en: 'History Podcast',
    subtitle_es: 'Podcast de Historia',
    thumbnail: 'https://picsum.photos/seed/history/400/225',
    type: 'podcast',
    addedAt: '2024-01-03',
  },
  {
    id: 'fav-6',
    title: 'חטופים',
    title_en: 'Hostages',
    title_es: 'Rehenes',
    subtitle: 'סרט מותחן',
    subtitle_en: 'Thriller Movie',
    subtitle_es: 'Pelicula de Suspenso',
    thumbnail: 'https://picsum.photos/seed/hostages/400/225',
    type: 'movie',
    addedAt: '2024-01-01',
  },
];

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  channel: '📡',
  podcast: '🎙️',
  radio: '📻',
};

const FavoriteCard: React.FC<{
  item: FavoriteItem;
  onPress: () => void;
  onRemove: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onRemove, index, getLocalizedText }) => {
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
            <Text className="text-[32px]">{TYPE_ICONS[item.type] || '⭐'}</Text>
          </View>
        )}
        <View className={`absolute top-2 bg-black/70 rounded-xl px-2 py-1 ${isRTL ? 'left-2' : 'right-2'}`}>
          <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
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
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <View className={`w-12 h-12 rounded-full bg-[${colors.primary}] justify-center items-center`}>
                <Text className={`text-xl text-[${colors.background}] ml-1`}>▶</Text>
              </View>
              <TouchableOpacity onPress={onRemove} className="w-12 h-12 rounded-full bg-white/20 justify-center items-center">
                <Text className="text-lg">✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const FavoritesScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
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

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const data = await favoritesService.getFavorites();
      setFavorites(data.items || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: FavoriteItem) => {
    const typeMap: Record<string, string> = {
      movie: 'vod',
      series: 'vod',
      channel: 'live',
      podcast: 'podcast',
      radio: 'radio',
    };
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: typeMap[item.type] || 'vod',
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id));
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
        <View className={`w-[60px] h-[60px] rounded-full bg-[rgba(255,215,0,0.2)] justify-center items-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
          <Text className="text-[28px]">⭐</Text>
        </View>
        <View>
          <Text className={`text-[42px] font-bold text-[${colors.text}]`} style={{ textAlign }}>{t('favorites.title')}</Text>
          <Text className={`text-lg text-[${colors.textSecondary}] mt-0.5`} style={{ textAlign }}>
            {favorites.length} {t('favorites.items')}
          </Text>
        </View>
      </View>

      {/* Content Grid */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        className="px-6 pb-12 pt-4"
        renderItem={({ item, index }) => (
          <FavoriteCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFavorite(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">⭐</Text>
              <Text className={`text-xl font-semibold text-[${colors.text}] mb-2`} style={{ textAlign }}>{t('favorites.empty')}</Text>
              <Text className={`text-base text-[${colors.textSecondary}]`} style={{ textAlign }}>{t('favorites.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default FavoritesScreen;
