/**
 * JudaismScreenMobile - Mobile-optimized Jewish content hub
 *
 * Features:
 * - 2-column grid for phones, 3 for tablets
 * - Horizontal carousels for rows
 * - Touch-optimized cards
 * - RTL support
 * - Pull-to-refresh
 * - Haptic feedback
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
import { judaismService } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { JerusalemRow, TelAvivRow } from '@bayit/shared-components';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('JudaismScreenMobile');

interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'shiur' | 'prayer' | 'music' | 'documentary' | 'lecture' | 'holiday';
  duration?: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon: string;
}

const TYPE_ICONS: Record<string, string> = {
  shiur: '📖',
  prayer: '🕯️',
  music: '🎵',
  documentary: '🎬',
  lecture: '🎓',
  holiday: '🕎',
};

interface JudaismCardProps {
  item: JudaismItem;
  onPress: () => void;
  getLocalizedText: (item: any, field: string) => string;
}

const JudaismCard: React.FC<JudaismCardProps> = ({ item, onPress, getLocalizedText }) => {
  const { isRTL, textAlign } = useDirection();

  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-1 m-1 min-h-[48px]"
    >
      <View className="bg-[#2d2540] rounded-xl overflow-hidden">
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-purple-500/10 justify-center items-center">
            <Text className="text-4xl">{TYPE_ICONS[item.type] || '✡️'}</Text>
          </View>
        )}
        <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/70 rounded-xl px-2 py-1`}>
          <Text className="text-xs">{TYPE_ICONS[item.type]}</Text>
        </View>
        {item.duration && (
          <View className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} bg-purple-600/90 rounded-lg px-1.5 py-0.5`}>
            <Text className="text-[10px] text-white font-bold">{item.duration}</Text>
          </View>
        )}
        <View className="p-3">
          <Text className="text-[13px] font-semibold text-white leading-[18px]" numberOfLines={2} style={{ textAlign }}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.rabbi && (
            <Text className="text-xs text-purple-300 mt-0.5" numberOfLines={1} style={{ textAlign }}>
              {getLocalizedText(item, 'rabbi')}
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
  getLocalizedText: (item: any, field: string) => string;
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
      className={`flex-row items-center px-4 py-2 bg-white/10 rounded-lg gap-1 min-h-[48px] ${isActive ? 'bg-purple-500/30 border border-purple-500' : ''}`}
      activeOpacity={0.7}
    >
      <Text className="text-base">{category.icon}</Text>
      <Text className={`text-sm font-medium ${isActive ? 'text-purple-500' : 'text-white/60'}`}>
        {getLocalizedText(category, 'name')}
      </Text>
    </TouchableOpacity>
  );
};

export const JudaismScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const { isPhone } = useResponsive();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<JudaismItem[]>([]);
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
      const response = await judaismService.getCategories();
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      }
    } catch (err) {
      moduleLogger.error('Failed to load Judaism categories:', err);
    }
  }, []);

  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await judaismService.getContent(category);
      if (response?.content && Array.isArray(response.content)) {
        setContent(response.content);
      }
    } catch (err) {
      moduleLogger.error('Failed to load Judaism content:', err);
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

  const handleItemPress = useCallback((item: JudaismItem) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.type === 'music' ? 'radio' : 'vod',
    });
  }, [navigation, getLocalizedText]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    ReactNativeHapticFeedback.trigger('selection');
  }, []);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-6 pb-4" style={{ flexDirection: isRTL ? 'row' : 'row-reverse', marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }}>
        <View className="w-12 h-12 rounded-full bg-purple-500/20 justify-center items-center">
          <Text className="text-2xl">✡️</Text>
        </View>
        <View className="flex-1">
          <Text className="text-3xl font-bold text-purple-500" style={{ textAlign }}>{t('judaism.title', 'יהדות')}</Text>
          <Text className="text-sm text-purple-500/70 mt-0.5" style={{ textAlign }}>
            {content.length} {t('judaism.items', 'פריטים')}
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

      {/* Jerusalem Row */}
      <View className="mb-4">
        <JerusalemRow showTitle={true} />
      </View>

      {/* Tel Aviv Row */}
      <View className="mb-4">
        <TelAvivRow showTitle={true} />
      </View>

      {/* Section Title */}
      <Text className="text-lg font-semibold text-white mb-2 px-4" style={{ textAlign }}>
        {t('judaism.allContent', 'כל התוכן')}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-[60px] px-6">
      <View className="p-6 items-center bg-purple-500/10 rounded-lg">
        <Text className="text-5xl mb-4">✡️</Text>
        <Text className="text-lg font-semibold text-purple-500 mb-2" style={{ textAlign }}>
          {t('judaism.empty', 'אין תוכן זמין')}
        </Text>
        <Text className="text-sm text-purple-500/70" style={{ textAlign }}>
          {t('judaism.emptyHint', 'נסה קטגוריה אחרת')}
        </Text>
      </View>
    </View>
  );

  if (isLoading && content.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#1a1525] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-base mt-4">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#1a1525]">
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`judaism-grid-${numColumns}`}
        contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <JudaismCard
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};


export default JudaismScreenMobile;
