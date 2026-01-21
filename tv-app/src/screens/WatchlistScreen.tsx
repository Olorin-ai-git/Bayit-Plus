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
import { demoWatchlist, type WatchlistItem } from '../demo/watchlist';

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
      className="flex-1 m-1"
      style={{ maxWidth: isTV ? '16.66%' : '25%' }}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#1a1a2e] rounded-2xl overflow-hidden border-[3px] ${isFocused ? 'border-[#8a2be2]' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-[#2d2540] justify-center items-center">
            <Text className="text-[32px]">📋</Text>
          </View>
        )}

        {/* Progress bar for items in progress */}
        {item.progress !== undefined && item.progress > 0 && (
          <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
            <View className="h-full bg-[#8a2be2]" style={{ width: `${item.progress}%` }} />
          </View>
        )}

        <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/70 rounded-xl px-2 py-1`}>
          <Text className="text-sm">{item.type === 'movie' ? '🎬' : '📺'}</Text>
        </View>

        <View className="p-2">
          <Text className="text-sm font-semibold text-white" style={{ textAlign }} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          <Text className="text-xs text-[#888888] mt-0.5" style={{ textAlign }}>
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
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series' | 'continue'>('all');
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setWatchlist(demoWatchlist);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
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
      <View className="flex-1 bg-[#0d0d18] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0d0d18]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-[60px] h-[60px] rounded-[30px] bg-[#8a2be2]/20 justify-center items-center" style={{ marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }}>
          <Text className="text-[28px]">📋</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('watchlist.title')}</Text>
          <Text className="text-lg text-[#888888] mt-0.5" style={{ textAlign }}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View className="px-12 mb-5 gap-2" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        {(isRTL ? filterOptions : [...filterOptions].reverse()).map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setFilter(option.id as any)}
            className={`px-6 py-3 rounded-3xl border-2 ${filter === option.id ? 'bg-[#8a2be2]/20 border-[#8a2be2]' : 'bg-[#1a1a2e] border-transparent'}`}
          >
            <Text className={`text-base ${filter === option.id ? 'text-[#8a2be2] font-bold' : 'text-[#888888]'}`}>
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
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.md }}
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
              <Text className="text-base text-[#888888]" style={{ textAlign }}>{t('watchlist.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default WatchlistScreen;
