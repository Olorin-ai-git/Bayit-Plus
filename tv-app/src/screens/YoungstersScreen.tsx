/**
 * YoungstersScreen - Teen-friendly content page for ages 12-17
 * Features age-appropriate content, PG-13 filtering, and purple UI theme
 * Optimized for TV with focus navigation and 5-column grid
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
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassView, GlassCategoryPill } from '../components';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { useProfile } from '../contexts/ProfileContext';
import { youngstersService } from '../services/api';
import logger from '../utils/logger';

const youngstersLogger = logger.scope('YoungstersScreen');

interface YoungstersItem {
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
  all: 'target',
  trending: 'flame',
  news: 'news',
  culture: 'vod',
  educational: 'educational',
  music: 'music',
  entertainment: 'vod',
  sports: 'sports',
  tech: 'vod',
  judaism: '✡️',
};

const YoungstersCard: React.FC<{
  item: YoungstersItem;
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

  const categoryIcon = CATEGORY_ICONS[item.category] || 'target';

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
        className={`bg-[#2d2540] rounded-lg overflow-hidden border-3 ${isFocused ? 'border-[#a855f7]' : 'border-transparent'}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-purple-500/10 justify-center items-center">
            <NativeIcon name={categoryIcon} size="xxl" context="tv" color="#a855f7" />
          </View>
        )}
        <View className="absolute top-2 bg-black/70 rounded-xl px-2 py-1" style={isRTL ? { left: 8 } : { right: 8 }}>
          <NativeIcon name={categoryIcon} size="sm" context="tv" color="#FFFFFF" />
        </View>
        {item.age_rating !== undefined && (
          <View className="absolute top-2 bg-purple-500/90 rounded-lg px-1.5 py-0.5" style={isRTL ? { right: 8 } : { left: 8 }}>
            <Text className="text-[10px] text-white font-bold">{item.age_rating}+</Text>
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
            <View className="flex-row items-center gap-1 mt-1">
              <NativeIcon name="clock" size="xs" context="tv" color="#a855f7" />
              <Text className="text-[10px] text-purple-500" style={{ textAlign }}>
                {item.duration}
              </Text>
            </View>
          )}
        </View>
        {isFocused && (
          <View className="absolute inset-0 bg-black/40 justify-center items-center">
            <View className="w-14 h-14 rounded-full bg-purple-500 justify-center items-center">
              <NativeIcon name="play" size="xl" context="tv" color="#1a1525" />
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const YoungstersScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const { currentProfile: activeProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<YoungstersItem[]>([]);
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
      const response = await youngstersService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      youngstersLogger.error('Failed to load youngsters categories', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const maxAge = activeProfile?.youngsters_age_limit || 17;
      const response = await youngstersService.getContent(category, maxAge);
      if (response?.items && Array.isArray(response.items)) {
        setContent(response.items);
      } else if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      }
    } catch (err) {
      youngstersLogger.error('Failed to load youngsters content', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: YoungstersItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.category === 'music' ? 'radio' : 'vod',
    });
  };

  if (isLoading && content.length === 0) {
    return (
      <View className="flex-1 bg-[#1a1525] justify-center items-center">
        <ActivityIndicator size="large" color="#a855f7" />
        <Text className="text-purple-500 text-lg mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1a1525]">
      <View className="flex-row items-center px-12 pt-10 pb-5" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-15 h-15 rounded-full bg-purple-500/20 justify-center items-center" style={{ marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }}>
          <NativeIcon name="users" size="xl" context="tv" color="#a855f7" />
        </View>
        <View>
          <Text className="text-[42px] font-bold text-purple-500" style={{ textAlign }}>{t('youngsters.title', 'צעירים')}</Text>
          <Text className="text-lg text-purple-500/70 mt-0.5" style={{ textAlign }}>
            {content.length} {t('youngsters.items', 'פריטים')}
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
              emoji={CATEGORY_ICONS[category.id] || '🎯'}
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
          <YoungstersCard
            item={item}
            onPress={() => handleItemPress(item)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-15">
            <GlassView className="p-12 items-center bg-purple-500/10">
              <NativeIcon name="target" size="xxxl" context="tv" color="#a855f7" />
              <Text className="text-xl font-semibold text-purple-500 mb-2 mt-4" style={{ textAlign }}>{t('youngsters.empty', 'אין תוכן זמין')}</Text>
              <Text className="text-base text-purple-500/70" style={{ textAlign }}>{t('youngsters.emptyHint', 'נסה קטגוריה אחרת')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default YoungstersScreen;
