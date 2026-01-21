import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill } from '../components/ui';
import { SubtitleFlags } from '../components/SubtitleFlags';
import { OptimizedImage } from '../components/OptimizedImage';
import { contentService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { getOptimizedGridProps, createGridItemLayout } from '../utils/listOptimization';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  year?: string;
  duration?: string;
  category?: string;
  has_subtitles?: boolean;
  available_subtitle_languages?: string[];
}

interface Category {
  id: string;
  name: string;
}

const ContentCard: React.FC<{
  item: ContentItem;
  onPress: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
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
      className={`flex-1 m-2 ${isTV ? 'max-w-[16.66%]' : 'max-w-[25%]'}`}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-white/10 rounded-2xl overflow-hidden border-[3px] ${isFocused ? 'border-purple-500' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <View className="relative">
          {item.thumbnail ? (
            <OptimizedImage
              source={{ uri: item.thumbnail }}
              className="w-full aspect-video"
              resizeMode="cover"
              lazy={true}
              lazyThreshold={300}
            />
          ) : (
            <View className="w-full aspect-video bg-white/20 justify-center items-center">
              <Text className="text-4xl">🎬</Text>
            </View>
          )}

          {/* Subtitle Flags */}
          {item.available_subtitle_languages && item.available_subtitle_languages.length > 0 && (
            <SubtitleFlags
              languages={item.available_subtitle_languages}
              position="bottom-right"
              size="medium"
              showTooltip={false}
            />
          )}
        </View>
        <View className="p-3">
          <Text className="text-sm font-semibold text-white text-right" numberOfLines={1}>
            {item.title}
          </Text>
          {(item.year || item.duration) && (
            <Text className="text-xs text-white/60 mt-0.5 text-right">
              {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
            </Text>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-12 h-12 rounded-full bg-purple-500 justify-center items-center">
              <Text className="text-xl text-black ml-1">▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const VODScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
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
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [categoriesRes, contentRes] = await Promise.all([
        contentService.getCategories(),
        selectedCategory === 'all'
          ? contentService.getFeatured()
          : contentService.getByCategory(selectedCategory),
      ]) as [any, any];

      setCategories(categoriesRes.categories || []);
      const items = contentRes.items || contentRes.categories?.flatMap((c: any) => c.items) || [];
      // Map items with localized titles
      setContent(items.map((item: any) => ({
        ...item,
        title: getLocalizedText(item, 'title'),
      })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('vod.loadError', 'Failed to load content');
      setError(errorMessage);
      setContent([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentPress = (item: ContentItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: 'vod',
    });
  };

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
      <View
        className="px-12 pt-10 pb-5 items-center"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
      >
        <View
          className="w-[60px] h-[60px] rounded-full bg-purple-700/30 justify-center items-center"
          style={isRTL ? { marginLeft: spacing.lg } : { marginRight: spacing.lg }}
        >
          <Text className="text-3xl">🎬</Text>
        </View>
        <View>
          <Text className="text-5xl font-bold text-white" style={{ textAlign }}>{t('vod.title')}</Text>
          <Text className="text-lg text-white/60 mt-0.5" style={{ textAlign }}>{content.length} {t('vod.movies')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View
        className="px-12 mb-6 gap-3 z-10"
        style={{ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'flex-start' }}
      >
        <GlassCategoryPill
          label={t('vod.categories.all')}
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          hasTVPreferredFocus
        />
        {categories.map((category: any) => (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedText(category, 'name')}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </View>

      {/* Content Grid */}
      <FlatList
        data={content}
        keyExtractor={(item) => `vod-${item.id}`}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerClassName="px-8 pb-16 pt-4"
        renderItem={({ item, index }) => (
          <ContentCard
            item={item}
            onPress={() => handleContentPress(item)}
            index={index}
          />
        )}
        {...getOptimizedGridProps(isTV ? 6 : 4)}
        getItemLayout={createGridItemLayout(220, isTV ? 6 : 4, spacing.sm)}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-12 items-center">
              <Text className="text-6xl mb-4">🎬</Text>
              <Text className="text-xl font-semibold text-white mb-2">{t('empty.noContent')}</Text>
              <Text className="text-base text-white/60">{t('empty.tryAnotherCategory')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default VODScreen;
