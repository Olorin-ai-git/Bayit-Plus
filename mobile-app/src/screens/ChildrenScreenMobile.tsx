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
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
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
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress();
  }, [onPress]);

  const categoryIcon = CATEGORY_ICONS[item.category] || '🌈';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-1 m-1 min-h-[48px]"
    >
      <View className="bg-[#2d2540] rounded-lg overflow-hidden">
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-[#ffd93d]/10 justify-center items-center">
            <Text className="text-4xl">{categoryIcon}</Text>
          </View>
        )}
        <View className={`absolute top-2 bg-black/70 rounded-xl px-2 py-1 ${isRTL ? 'left-2' : 'right-2'}`}>
          <Text className="text-xs">{categoryIcon}</Text>
        </View>
        {item.age_rating !== undefined && (
          <View className={`absolute top-2 bg-[#ffd93d]/90 rounded-lg px-1.5 py-0.5 ${isRTL ? 'right-2' : 'left-2'}`}>
            <Text className="text-[10px] text-[#1a1525] font-bold">{item.age_rating}+</Text>
          </View>
        )}
        <View className="p-2">
          <Text style={{ textAlign }} className="text-sm font-semibold text-white leading-[18px]" numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.duration && (
            <Text style={{ textAlign }} className="text-[11px] text-[#ffd93d] mt-1">
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
    ReactNativeHapticFeedback.trigger('selection');
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-row items-center px-4 py-2 bg-white/10 rounded-lg gap-1 min-h-[48px] ${isActive ? 'bg-[#ffd93d]/30 border border-[#ffd93d]' : ''}`}
      activeOpacity={0.7}
    >
      <Text className="text-base">
        {CATEGORY_ICONS[category.id] || '🌈'}
      </Text>
      <Text className={`text-sm font-medium ${isActive ? 'text-[#ffd93d]' : 'text-white/60'}`}>
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
    ReactNativeHapticFeedback.trigger('impactLight');
    await Promise.all([loadCategories(), loadContent()]);
    setRefreshing(false);
  }, [loadCategories, loadContent]);

  const handleItemPress = useCallback((item: KidsItem) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.category === 'music' ? 'radio' : 'vod',
    });
  }, [navigation, getLocalizedText]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    ReactNativeHapticFeedback.trigger('selection');
  }, []);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-6 pb-4" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-12 h-12 rounded-full bg-[#ffd93d]/20 justify-center items-center" style={{ marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }}>
          <Text className="text-2xl">👶</Text>
        </View>
        <View className="flex-1">
          <Text style={{ textAlign }} className="text-3xl font-bold text-[#ffd93d]">{t('children.title', 'ילדים')}</Text>
          <Text style={{ textAlign }} className="text-sm text-[#ffd93d]/70 mt-0.5">
            {content.length} {t('children.items', 'פריטים')}
          </Text>
        </View>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}
          className="px-4 pb-4 gap-2"
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
    <View className="flex-1 justify-center items-center py-[60px] px-6">
      <View className="p-6 items-center bg-[#ffd93d]/10 rounded-lg">
        <Text className="text-5xl mb-4">🌈</Text>
        <Text style={{ textAlign }} className="text-lg font-semibold text-[#ffd93d] mb-2">
          {t('children.empty', 'אין תוכן זמין')}
        </Text>
        <Text style={{ textAlign }} className="text-sm text-[#ffd93d]/70">
          {t('children.emptyHint', 'נסה קטגוריה אחרת')}
        </Text>
      </View>
    </View>
  );

  if (isLoading && content.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#1a1525] justify-center items-center">
        <ActivityIndicator size="large" color="#ffd93d" />
        <Text className="text-[#ffd93d] text-base mt-4">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#1a1525]">
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`children-grid-${numColumns}`}
        contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
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

export default ChildrenScreenMobile;
