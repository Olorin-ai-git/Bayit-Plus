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
import { GlassView, GlassCategoryPill } from '../components';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { contentService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';

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
      className="flex-1 m-2 max-w-[16.66%]"
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          isFocused && { boxShadow: `0 0 20px ${colors.primary}` },
        ]}
        className={`bg-white/10 rounded-xl overflow-hidden border-[3px] ${isFocused ? `border-[${colors.primary}]` : 'border-transparent'}`}
      >
        <View className="relative">
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              className="w-full aspect-video"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full aspect-video bg-white/5 justify-center items-center">
              <Text className="text-[32px]">🎬</Text>
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
            <Text className="text-xs text-gray-400 mt-0.5 text-right">
              {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
            </Text>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className={`w-12 h-12 rounded-full bg-[${colors.primary}] justify-center items-center`}>
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
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
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
      <View className={`flex-1 bg-[${colors.background}] justify-center items-center`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-[${colors.background}]`}>
      {/* Header */}
      <View className={`flex-row items-center px-12 pt-10 pb-5 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View className={`w-[60px] h-[60px] rounded-full bg-purple-900/30 justify-center items-center ${isRTL ? 'ml-5' : 'mr-5'}`}>
          <Text className="text-[28px]">🎬</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('vod.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5" style={{ textAlign }}>{content.length} {t('vod.movies')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View className={`flex-row px-12 mb-6 gap-3 z-10 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
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
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.md, direction: 'ltr' }}
        renderItem={({ item, index }) => (
          <ContentCard
            item={item}
            onPress={() => handleContentPress(item)}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-[60px]">
            <GlassView className="p-8 items-center">
              <Text className="text-6xl mb-4">🎬</Text>
              <Text className="text-xl font-semibold text-white mb-2">{t('empty.noContent')}</Text>
              <Text className="text-base text-gray-400">{t('empty.tryAnotherCategory')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default VODScreen;
