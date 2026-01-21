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
import { GlassView, GlassCategoryPill } from '../components/ui';
import { podcastService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';

interface PodcastShow {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  host?: string;
  host_en?: string;
  host_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  episodeCount?: number;
  episodes?: any[];
  category?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

const PodcastCard: React.FC<{
  show: PodcastShow;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ show, onPress, index, getLocalizedText }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      className={`flex-1 m-2 ${isTV ? 'max-w-[20%]' : 'max-w-[33.33%]'}`}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#1a1a2e] rounded-lg overflow-hidden border-[3px] ${
          isFocused ? 'border-[#10b981]' : 'border-transparent'
        }`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Cover Image */}
        {show.thumbnail ? (
          <Image
            source={{ uri: show.thumbnail }}
            className="w-full aspect-square"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-square bg-[#2a2a3e] justify-center items-center">
            <Text className="text-5xl">🎙️</Text>
          </View>
        )}

        {/* Content */}
        <View className="p-2">
          <Text className="text-sm font-semibold text-white mb-0.5" style={{ textAlign }} numberOfLines={2}>
            {getLocalizedText(show, 'title')}
          </Text>
          {show.host && (
            <Text className="text-xs text-gray-400 mb-1" style={{ textAlign }} numberOfLines={1}>
              {getLocalizedText(show, 'host')}
            </Text>
          )}
          <View className={`flex-wrap gap-2 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
            {show.episodes && show.episodes.length > 0 && (
              <View className={`flex-row items-center ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                <Text className="text-[10px] ml-1">🎧</Text>
                <Text className="text-[10px] text-gray-500">{show.episodes.length} {t('content.episodes')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Play Overlay */}
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-14 h-14 rounded-full bg-[#10b981] justify-center items-center">
              <Text className="text-2xl text-black ml-1">▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const PodcastsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  // Helper to get localized text (uses centralized utility)
  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') {
      return getLocalizedName(item, currentLang);
    }
    if (field === 'description') {
      return getLocalizedDescription(item, currentLang);
    }
    if (field === 'host') {
      // Host doesn't have a dedicated utility yet, so use inline logic
      if (currentLang === 'en' && item.host_en) return item.host_en;
      if (currentLang === 'es' && item.host_es) return item.host_es;
      return item.host || '';
    }
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadShows();
  }, [selectedCategory]);

  const loadShows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await podcastService.getShows(selectedCategory) as any;
      setShows(data.shows || []);
      setCategories(data.categories || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('podcasts.loadError', 'Failed to load podcasts');
      setError(errorMessage);
      setShows([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPress = (show: PodcastShow) => {
    navigation.navigate('Player', {
      id: show.id,
      title: getLocalizedText(show, 'title'),
      type: 'podcast',
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={colors.success} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className={`flex-row items-center px-12 pt-10 pb-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View className={`w-[60px] h-[60px] rounded-[30px] bg-[rgba(16,185,129,0.2)] justify-center items-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
          <Text className="text-[28px]">🎙️</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white text-right" style={{ textAlign }}>{t('podcasts.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5 text-right" style={{ textAlign }}>{shows.length} {t('podcasts.shows')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View className={`flex-row px-12 mb-6 gap-3 z-10 ${isRTL ? 'flex-row justify-start' : 'flex-row-reverse justify-start'}`}>
        <GlassCategoryPill
          label={t('podcasts.categories.all')}
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          hasTVPreferredFocus
        />
        {(isRTL ? categories : [...categories].reverse()).map((category) => (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedText(category, 'name')}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </View>

      {/* Shows Grid */}
      <FlatList
        data={shows}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 64, paddingTop: 16 }}
        renderItem={({ item, index }) => (
          <PodcastCard
            show={item}
            onPress={() => handleShowPress(item)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-[64px] mb-4">🎙️</Text>
              <Text className="text-xl font-semibold text-white mb-2">{t('empty.noPodcasts')}</Text>
              <Text className="text-base text-gray-400">{t('empty.tryLater')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default PodcastsScreen;
