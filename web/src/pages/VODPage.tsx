import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSearchParams } from 'react-router-dom';
import { Film } from 'lucide-react';
import ContentCard from '@/components/content/ContentCard';
import { contentService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface Category {
  id: string;
  name: string;
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
}

export default function VODPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [categoriesData, contentData] = await Promise.all([
        contentService.getCategories(),
        selectedCategory === 'all'
          ? contentService.getFeatured()
          : contentService.getByCategory(selectedCategory),
      ]);
      setCategories(categoriesData.categories);
      setContent(contentData.items || contentData.categories?.flatMap((c: any) => c.items) || []);
    } catch (error) {
      logger.error('Failed to load content', 'VODPage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { direction: 'rtl' }]}>
        <Text style={styles.title}>סרטים וסדרות</Text>
        <GlassView style={styles.headerIcon}>
          <Film size={24} color={colors.primary} />
        </GlassView>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoriesScroll, { direction: 'rtl' }]}
        contentContainerStyle={styles.categoriesContent}
      >
        <Pressable
          onPress={() => handleCategoryChange('all')}
          style={[styles.categoryPill, selectedCategory === 'all' && styles.categoryPillActive]}
        >
          <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
            הכל
          </Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => handleCategoryChange(category.id)}
            style={[styles.categoryPill, selectedCategory === category.id && styles.categoryPillActive]}
          >
            <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
              {category.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading State */}
      {loading ? (
        <View style={[styles.grid, { direction: 'rtl' }]}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { width: `${100 / numColumns - 2}%` }]}>
              <View style={styles.skeletonThumbnail} />
            </View>
          ))}
        </View>
      ) : (
        <>
          {/* Content Grid */}
          <FlatList
            data={content}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            style={{ direction: 'rtl' }}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / numColumns}%`, padding: spacing.xs, direction: 'ltr' }}>
                <ContentCard content={item} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <GlassCard style={styles.emptyCard}>
                  <Film size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>אין תוכן זמין</Text>
                  <Text style={styles.emptyDescription}>נסה לבחור קטגוריה אחרת</Text>
                </GlassCard>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minWidth: 60,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridContent: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  skeletonCard: {
    margin: spacing.xs,
    minWidth: 150,
  },
  skeletonThumbnail: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
  },
});
