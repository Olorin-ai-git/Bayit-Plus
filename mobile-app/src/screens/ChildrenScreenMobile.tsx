/**
 * ChildrenScreenMobile - Mobile-optimized kids content screen
 *
 * Features:
 * - Pull-to-refresh
 * - 2 columns (phone) / 3 columns (tablet)
 * - Touch-optimized cards (48x48 minimum touch targets)
 * - Haptic feedback on actions
 * - RTL support
 * - Age-appropriate content filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { childrenService } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, borderRadius } from '../theme';

interface KidsItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  category: string;
  duration?: string;
  age_rating?: number;
  educational_tags?: string[];
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  all: '🌈',
  cartoons: '🎬',
  educational: '📚',
  music: '🎵',
  hebrew: 'א',
  stories: '📖',
  jewish: '✡️',
};

interface KidsCardProps {
  item: KidsItem;
  onPress: () => void;
  getLocalizedText: (item: KidsItem, field: string) => string;
}

const KidsCard: React.FC<KidsCardProps> = ({ item, onPress, getLocalizedText }) => {
  const { isRTL, textAlign } = useDirection();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const categoryIcon = CATEGORY_ICONS[item.category] || '🌈';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.cardTouchable}
    >
      <View style={styles.card}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
          </View>
        )}
        <View style={[styles.categoryBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.categoryBadgeText}>{categoryIcon}</Text>
        </View>
        {item.age_rating !== undefined && (
          <View style={[styles.ageBadge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.ageText}>{item.age_rating}+</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.duration && (
            <Text style={[styles.cardDuration, { textAlign }]}>
              ⏱️ {item.duration}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface CategoryPillProps {
  category: Category;
  isActive: boolean;
  onPress: () => void;
  getLocalizedText: (item: Category, field: string) => string;
}

const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  isActive,
  onPress,
  getLocalizedText,
}) => {
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.categoryPill, isActive && styles.categoryPillActive]}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryEmoji}>
        {CATEGORY_ICONS[category.id] || '🌈'}
      </Text>
      <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
        {getLocalizedText(category, 'name')}
      </Text>
    </TouchableOpacity>
  );
};

export const ChildrenScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const { isPhone } = useResponsive();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<KidsItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  // Responsive columns: 2 on phone, 3 on tablet
  const numColumns = getGridColumns({ phone: 2, tablet: 3 });

  const getLocalizedText = useCallback((item: any, field: string): string => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  }, [currentLang]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await childrenService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load children categories:', err);
    }
  }, []);

  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await childrenService.getContent(category);
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      }
    } catch (err) {
      console.error('Failed to load kids content:', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadCategories(), loadContent()]);
    setRefreshing(false);
  }, [loadCategories, loadContent]);

  const handleItemPress = useCallback((item: KidsItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.category === 'music' ? 'radio' : 'vod',
    });
  }, [navigation, getLocalizedText]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    Haptics.selectionAsync();
  }, []);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }]}>
          <Text style={styles.headerIconText}>👶</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { textAlign }]}>{t('children.title', 'ילדים')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {content.length} {t('children.items', 'פריטים')}
          </Text>
        </View>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoriesContainer,
            { flexDirection: isRTL ? 'row' : 'row-reverse' },
          ]}
        >
          {(isRTL ? categories : [...categories].reverse()).map((category) => (
            <CategoryPill
              key={category.id}
              category={category}
              isActive={selectedCategory === category.id}
              onPress={() => handleCategoryChange(category.id)}
              getLocalizedText={getLocalizedText}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🌈</Text>
        <Text style={[styles.emptyTitle, { textAlign }]}>
          {t('children.empty', 'אין תוכן זמין')}
        </Text>
        <Text style={[styles.emptySubtitle, { textAlign }]}>
          {t('children.emptyHint', 'נסה קטגוריה אחרת')}
        </Text>
      </View>
    </View>
  );

  if (isLoading && content.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffd93d" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`children-grid-${numColumns}`}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <KidsCard
            item={item}
            onPress={() => handleItemPress(item)}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffd93d"
            colors={['#ffd93d']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1525',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffd93d',
    fontSize: 16,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd93d',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 217, 61, 0.7)',
    marginTop: 2,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minHeight: 48,
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255, 217, 61, 0.3)',
    borderWidth: 1,
    borderColor: '#ffd93d',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#ffd93d',
  },
  grid: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.xs,
    minHeight: 48,
  },
  card: {
    backgroundColor: '#2d2540',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(255, 217, 61, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageText: {
    fontSize: 10,
    color: '#1a1525',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 18,
  },
  cardDuration: {
    fontSize: 11,
    color: '#ffd93d',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    borderRadius: borderRadius.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffd93d',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 217, 61, 0.7)',
  },
});

export default ChildrenScreenMobile;
