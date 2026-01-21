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
import { watchlistService } from '../services';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';

interface WatchlistItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series';
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number; // 0-100 for continue watching
}

// Demo watchlist data with localization
const demoWatchlist: WatchlistItem[] = [
  {
    id: 'wl-1',
    title: 'פאודה עונה 4',
    title_en: 'Fauda Season 4',
    title_es: 'Fauda Temporada 4',
    subtitle: 'הסדרה הישראלית המצליחה',
    subtitle_en: 'The hit Israeli series',
    subtitle_es: 'La exitosa serie israeli',
    thumbnail: 'https://picsum.photos/seed/fauda4/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-15',
    progress: 45,
  },
  {
    id: 'wl-2',
    title: 'טהרן עונה 3',
    title_en: 'Tehran Season 3',
    title_es: 'Teheran Temporada 3',
    subtitle: 'מותחן ריגול',
    subtitle_en: 'Spy thriller',
    subtitle_es: 'Thriller de espionaje',
    thumbnail: 'https://picsum.photos/seed/tehran3/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-12',
  },
  {
    id: 'wl-3',
    title: 'גט',
    title_en: 'Gett: The Trial of Viviane Amsalem',
    title_es: 'Gett: El divorcio de Viviane Amsalem',
    subtitle: 'דרמה משפטית',
    subtitle_en: 'Legal drama',
    subtitle_es: 'Drama legal',
    thumbnail: 'https://picsum.photos/seed/gett/400/225',
    type: 'movie',
    year: '2014',
    duration: '1h 55m',
    addedAt: '2024-01-10',
  },
  {
    id: 'wl-4',
    title: 'שבעה ימים טובים',
    title_en: 'Seven Blessed Days',
    title_es: 'Siete Dias Bendecidos',
    subtitle: 'קומדיה ישראלית',
    subtitle_en: 'Israeli comedy',
    subtitle_es: 'Comedia israeli',
    thumbnail: 'https://picsum.photos/seed/shiva/400/225',
    type: 'movie',
    year: '2023',
    duration: '1h 42m',
    addedAt: '2024-01-08',
    progress: 78,
  },
  {
    id: 'wl-5',
    title: 'בית הספר של שבתאי',
    title_en: 'Shabbtai\'s School',
    title_es: 'La Escuela de Shabbtai',
    subtitle: 'סדרת דרמה',
    subtitle_en: 'Drama series',
    subtitle_es: 'Serie de drama',
    thumbnail: 'https://picsum.photos/seed/shabbtai/400/225',
    type: 'series',
    year: '2023',
    addedAt: '2024-01-05',
  },
  {
    id: 'wl-6',
    title: 'נערות פורנו',
    title_en: 'Checkout Girls',
    title_es: 'Chicas de Caja',
    subtitle: 'סדרה קומית',
    subtitle_en: 'Comedy series',
    subtitle_es: 'Serie de comedia',
    thumbnail: 'https://picsum.photos/seed/checkout/400/225',
    type: 'series',
    year: '2022',
    addedAt: '2024-01-03',
  },
];

const WatchlistCard: React.FC<{
  item: WatchlistItem;
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
      className={`flex-1 m-2 ${isTV ? 'max-w-[16.66%]' : 'max-w-[25%]'}`}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#1a1a2e] rounded-lg overflow-hidden border-[3px] ${
          isFocused ? 'border-[#8a2be2]' : 'border-transparent'
        }`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-[#2a2a3e] justify-center items-center">
            <Text className="text-[32px]">📋</Text>
          </View>
        )}

        {/* Progress bar for items in progress */}
        {item.progress !== undefined && item.progress > 0 && (
          <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
            <View className="h-full bg-[#8a2be2]" style={{ width: `${item.progress}%` }} />
          </View>
        )}

        <View className={`absolute top-2 bg-black/70 rounded-xl px-2 py-1 ${isRTL ? 'left-2' : 'right-2'}`}>
          <Text className="text-sm">{item.type === 'movie' ? '🎬' : '📺'}</Text>
        </View>

        <View className="p-2">
          <Text className="text-sm font-semibold text-white" style={{ textAlign }} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5" style={{ textAlign }}>
            {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
          </Text>
          {item.progress !== undefined && item.progress > 0 && (
            <Text className="text-[11px] text-[#8a2be2] mt-0.5 font-semibold" style={{ textAlign }}>
              {item.progress}%
            </Text>
          )}
        </View>

        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="flex-row gap-4">
              <View className="w-12 h-12 rounded-full bg-[#8a2be2] justify-center items-center">
                <Text className="text-xl text-white ml-1">▶</Text>
              </View>
              <TouchableOpacity onPress={onRemove} className="w-12 h-12 rounded-full bg-white/20 justify-center items-center">
                <Text className="text-lg text-white">✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const WatchlistScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series' | 'continue'>('all');
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
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      const data = await watchlistService.getWatchlist();
      setWatchlist(data.items || []);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      setWatchlist([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWatchlist = watchlist.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    return true;
  });

  const handleItemPress = (item: WatchlistItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: 'vod',
    });
  };

  const handleRemoveFromWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const filterOptions = [
    { id: 'all', labelKey: 'watchlist.filters.all' },
    { id: 'continue', labelKey: 'watchlist.filters.continue' },
    { id: 'movies', labelKey: 'watchlist.filters.movies' },
    { id: 'series', labelKey: 'watchlist.filters.series' },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className={`flex-row items-center px-12 pt-10 pb-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View className={`w-[60px] h-[60px] rounded-[30px] bg-[rgba(138,43,226,0.2)] justify-center items-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
          <Text className="text-[28px]">📋</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('watchlist.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5" style={{ textAlign }}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View className={`px-12 mb-4 gap-2 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        {(isRTL ? filterOptions : [...filterOptions].reverse()).map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setFilter(option.id as any)}
            className={`px-6 py-3 rounded-3xl bg-[#1a1a2e] border-2 ${
              filter === option.id ? 'bg-[rgba(138,43,226,0.2)] border-[#8a2be2]' : 'border-transparent'
            }`}
          >
            <Text className={`text-base ${filter === option.id ? 'text-[#8a2be2] font-bold' : 'text-gray-500'}`}>
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Grid */}
      <FlatList
        data={filteredWatchlist}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 64, paddingTop: 16 }}
        renderItem={({ item, index }) => (
          <WatchlistCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFromWatchlist(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">📋</Text>
              <Text className="text-xl font-semibold text-white mb-2" style={{ textAlign }}>{t('watchlist.empty')}</Text>
              <Text className="text-base text-gray-400" style={{ textAlign }}>{t('watchlist.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default WatchlistScreen;
