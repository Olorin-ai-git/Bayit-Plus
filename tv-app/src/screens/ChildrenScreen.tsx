/**
 * ChildrenScreen - Kid-friendly content page
 * Features age-appropriate content, parental controls, and colorful UI
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill } from '../components';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { useProfile } from '../contexts/ProfileContext';
import { childrenService } from '../services/api';

interface KidsItem {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
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

const KidsCard: React.FC<{
  item: KidsItem;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, index, getLocalizedText }) => {
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

  const categoryIcon = CATEGORY_ICONS[item.category] || '🌈';

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      className="flex-1 m-2 max-w-[20%]"
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        className={`bg-[#2d2540] rounded-lg overflow-hidden border-3 ${isFocused ? 'border-[#ffd93d]' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-yellow-300/10 justify-center items-center">
            <Text className="text-5xl">{categoryIcon}</Text>
          </View>
        )}
        <View className="absolute top-2 bg-black/70 rounded-xl px-2 py-1" style={isRTL ? { left: 8 } : { right: 8 }}>
          <Text className="text-sm">{categoryIcon}</Text>
        </View>
        {item.age_rating !== undefined && (
          <View className="absolute top-2 bg-yellow-300/90 rounded-lg px-1.5 py-0.5" style={isRTL ? { right: 8 } : { left: 8 }}>
            <Text className="text-[10px] text-[#1a1525] font-bold">{item.age_rating}+</Text>
          </View>
        )}
        <View className="p-2">
          <Text className="text-sm font-semibold text-white" style={{ textAlign }} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.description && (
            <Text className="text-[11px] text-white/60 mt-0.5" style={{ textAlign }} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          {item.duration && (
            <Text className="text-[10px] text-yellow-300 mt-1" style={{ textAlign }}>
              ⏱️ {item.duration}
            </Text>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-14 h-14 rounded-full bg-yellow-300 justify-center items-center">
              <Text className="text-2xl text-[#1a1525] ml-1">▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const ChildrenScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const { currentProfile: activeProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<KidsItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory, activeProfile]);

  const loadCategories = async () => {
    try {
      const response = await childrenService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load children categories:', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const maxAge = activeProfile?.is_kids_profile ? activeProfile.kids_age_limit : undefined;
      const response = await childrenService.getContent(category, maxAge);
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      }
    } catch (err) {
      console.error('Failed to load kids content:', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: KidsItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.category === 'music' ? 'radio' : 'vod',
    });
  };

  if (isLoading && content.length === 0) {
    return (
      <View className="flex-1 bg-[#1a1525] justify-center items-center">
        <ActivityIndicator size="large" color="#ffd93d" />
        <Text className="text-yellow-300 text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1a1525]">
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-15 h-15 rounded-full bg-yellow-300/20 justify-center items-center" style={{ marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }}>
          <Text className="text-3xl">👶</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-yellow-300" style={{ textAlign }}>{t('children.title', 'ילדים')}</Text>
          <Text className="text-lg text-yellow-300/70 mt-0.5" style={{ textAlign }}>
            {content.length} {t('children.items', 'פריטים')}
          </Text>
        </View>
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 48, marginBottom: 24, gap: 12, flexDirection: isRTL ? 'row' : 'row-reverse' }}
        >
          {(isRTL ? categories : [...categories].reverse()).map((category, index) => (
            <GlassCategoryPill
              key={category.id}
              label={getLocalizedText(category, 'name')}
              emoji={CATEGORY_ICONS[category.id] || '🌈'}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              hasTVPreferredFocus={index === 0}
            />
          ))}
        </ScrollView>
      )}

      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.md }}
        renderItem={({ item, index }) => (
          <KidsCard
            item={item}
            onPress={() => handleItemPress(item)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-15">
            <GlassView className="p-12 items-center bg-yellow-300/10">
              <Text className="text-6xl mb-4">🌈</Text>
              <Text className="text-xl font-semibold text-yellow-300 mb-2" style={{ textAlign }}>{t('children.empty', 'אין תוכן זמין')}</Text>
              <Text className="text-base text-yellow-300/70" style={{ textAlign }}>{t('children.emptyHint', 'נסה קטגוריה אחרת')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default ChildrenScreen;
