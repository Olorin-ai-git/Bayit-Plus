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
  StyleSheet,
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
import { spacing, colors, typography } from '../theme';

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

      const [contentRes, categoriesRes] = await Promise.all([
        contentService.getVOD(),
        contentService.getCategories(),
      ]) as [any, any];

      const contentData = (contentRes.items || []).map((item: any) => ({
        ...item,
        posterUrl: item.poster || item.thumbnail,
      }));

      setContent(contentData);

      const categoriesData = categoriesRes.categories || [];
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading VOD content:', error);
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
    <View style={styles.container}>
      {/* Category filters - horizontal scroll */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
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
        key={`grid-${numColumns}`} // Force re-render when columns change
        data={filteredContent}
        renderItem={renderContent}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoriesSection: {
    paddingVertical: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
