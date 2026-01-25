/**
 * VODScreenMobile
 *
 * Mobile-optimized VOD screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-5 columns on tablet (based on orientation)
 * - Horizontal scrolling category filters
 * - Touch-optimized content cards
 * - Pull-to-refresh
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { contentService } from '@bayit/shared-services';
import { GlassCategoryPill } from '@bayit/shared';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { ContentCardMobile } from '../components';
import { colors } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('VODScreenMobile');

interface Content {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  posterUrl?: string;
  thumbnail?: string;
  year?: number;
  rating?: number;
  duration?: number;
  category?: string;
  type?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

export const VODScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [content, setContent] = useState<Content[]>([]);
  const [filteredContent, setFilteredContent] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-5 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

  useEffect(() => {
    loadContent();
  }, [i18n.language]);

  useEffect(() => {
    filterContent();
  }, [selectedCategory, content]);

  const loadContent = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled for graceful partial failure handling
      const results = await Promise.allSettled([
        contentService.getFeatured(),
        contentService.getCategories(),
      ]);

      const featuredRes = results[0].status === 'fulfilled' ? results[0].value : { spotlight: [], categories: [] };
      const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { categories: [] };

      // Log any failures for debugging
      if (results[0].status === 'rejected') {
        moduleLogger.warn('Failed to load featured content:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        moduleLogger.warn('Failed to load categories:', results[1].reason);
      }

      // Extract content from featured response
      // API returns { hero, spotlight, categories: [{id, name, items: [...]}] }
      const allItems: Content[] = [];

      // Add spotlight items
      if (featuredRes.spotlight && Array.isArray(featuredRes.spotlight)) {
        featuredRes.spotlight.forEach((item: any) => {
          allItems.push({
            ...item,
            posterUrl: item.backdrop || item.thumbnail,
          });
        });
      }

      // Add items from each category in featured response
      if (featuredRes.categories && Array.isArray(featuredRes.categories)) {
        featuredRes.categories.forEach((cat: any) => {
          if (cat.items && Array.isArray(cat.items)) {
            cat.items.forEach((item: any) => {
              // Avoid duplicates
              if (!allItems.find(existing => existing.id === item.id)) {
                allItems.push({
                  ...item,
                  posterUrl: item.thumbnail,
                  category: cat.id,
                });
              }
            });
          }
        });
      }

      setContent(allItems);

      const categoriesData = categoriesRes.categories || [];
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      moduleLogger.error('Error loading VOD content:', error);
      setIsLoading(false);
    }
  };

  const filterContent = () => {
    if (!selectedCategory) {
      setFilteredContent(content);
    } else {
      setFilteredContent(
        content.filter((item) => item.category === selectedCategory)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleContentPress = (item: Content) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedName(item, currentLang),
      type: item.type || 'vod',
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const renderContent = ({ item }: { item: Content }) => {
    const localizedTitle = getLocalizedName(item, currentLang);

    return (
      <ContentCardMobile
        content={{
          id: item.id,
          title: localizedTitle,
          posterUrl: item.posterUrl,
          year: item.year,
          rating: item.rating,
          duration: item.duration,
        }}
        onPress={() => handleContentPress(item)}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Category filters - horizontal scroll */}
      {categories.length > 0 && (
        <View className="py-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          >
            <GlassCategoryPill
              category={{ id: 'all', name: t('vod.allContent') }}
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                category={{
                  id: category.id,
                  name: getLocalizedName(category, currentLang),
                }}
                selected={selectedCategory === category.id}
                onPress={() => handleCategoryPress(category.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content grid */}
      <FlatList
        key={`grid-${numColumns}`}
        data={filteredContent}
        renderItem={renderContent}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center py-24">
              <Text className="text-base text-text-secondary text-center">
                {selectedCategory
                  ? t('vod.noContentInCategory')
                  : t('vod.noContent')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};
