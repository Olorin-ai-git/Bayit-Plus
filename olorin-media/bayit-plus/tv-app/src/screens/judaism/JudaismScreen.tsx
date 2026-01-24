/**
 * JudaismScreen - Jewish content, calendar, and community dashboard.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill, JerusalemRow, TelAvivRow } from '../../components';
import { colors, spacing } from '../../theme';
import { isTV } from '../../utils/platform';
import { useDirection } from '@bayit/shared/hooks';
import { judaismService } from '../../services/api';
import logger from '../../utils/logger';

const judaismLogger = logger.scope('JudaismScreen');
import {
  JudaismItem,
  Category,
  NewsItem,
  CalendarData,
  ShabbatStatus,
  CATEGORY_ICONS,
} from './types';
import {
  JudaismCard,
  ShabbatEveBanner,
  NewsItemCard,
  CalendarWidget,
} from './components';

export const JudaismScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<JudaismItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [shabbatStatus, setShabbatStatus] = useState<ShabbatStatus | null>(null);
  const currentLang = i18n.language;

  const getLocalizedText = useCallback((item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name || '';
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field] || '';
    return item[`${field}_en`] || item[field] || '';
  }, [currentLang]);

  useEffect(() => {
    loadCategories();
    loadShabbatStatus();
  }, []);

  useEffect(() => {
    loadContentForCategory();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories();
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      }
    } catch (err) {
      judaismLogger.error('Failed to load Judaism categories', err);
    }
  };

  const loadShabbatStatus = async () => {
    try {
      const response = await judaismService.getShabbatStatus();
      if (response) {
        setShabbatStatus(response);
      }
    } catch (err) {
      judaismLogger.error('Failed to load Shabbat status', err);
    }
  };

  const loadContentForCategory = async () => {
    try {
      setIsLoading(true);

      if (selectedCategory === 'news') {
        const response = await judaismService.getNews(undefined, undefined, 1, 30);
        if (response?.items) {
          setNews(response.items);
        }
        setContent([]);
      } else if (selectedCategory === 'calendar') {
        const response = await judaismService.getCalendarToday();
        if (response) {
          setCalendarData(response);
        }
        setContent([]);
      } else if (selectedCategory === 'community') {
        setContent([]);
      } else {
        const category = selectedCategory !== 'all' ? selectedCategory : undefined;
        const response = await judaismService.getContent(category);
        if (response?.content && Array.isArray(response.content)) {
          setContent(response.content);
        }
        setNews([]);
        setCalendarData(null);
      }
    } catch (err) {
      judaismLogger.error('Failed to load Judaism content', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: JudaismItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: item.category === 'music' ? 'radio' : 'vod',
    });
  };

  const handleNewsPress = (item: NewsItem) => {
    judaismLogger.debug('News item pressed', { link: item.link });
  };

  const renderSpecialView = () => {
    if (selectedCategory === 'news') {
      return (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          numColumns={isTV ? 3 : 1}
          key="news"
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => (
            <NewsItemCard item={item} index={index} onPress={() => handleNewsPress(item)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-[60px]">
              <Text className="text-[64px] mb-3">📰</Text>
              <Text className="text-[20px] font-semibold text-white">{t('judaism.news.empty', 'No news available')}</Text>
            </View>
          }
        />
      );
    }

    if (selectedCategory === 'calendar' && calendarData) {
      return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl }}>
          <CalendarWidget data={calendarData} />
        </ScrollView>
      );
    }

    if (selectedCategory === 'community') {
      return (
        <View className="flex-1 justify-center items-center py-[60px]">
          <Text className="text-[64px] mb-3">🏛️</Text>
          <Text className="text-[20px] font-semibold text-white">{t('judaism.community.title', 'Community Directory')}</Text>
          <Text className="text-[16px] text-[rgba(255,255,255,0.6)]">{t('judaism.community.comingSoon', 'Coming soon to TV')}</Text>
        </View>
      );
    }

    return null;
  };

  const showSpecialView = ['news', 'calendar', 'community'].includes(selectedCategory);

  if (isLoading && content.length === 0 && news.length === 0 && !calendarData) {
    return (
      <View className="flex-1 bg-[#0f0a1a] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-[18px] mt-3">{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0f0a1a]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-4" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-[60px] h-[60px] rounded-full bg-[rgba(107,33,168,0.2)] justify-center items-center" style={{ marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }}>
          <Text className="text-[28px]">✡️</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white" style={{ textAlign }}>{t('judaism.title', 'Judaism')}</Text>
          <Text className="text-[18px] text-[rgba(255,255,255,0.6)] mt-0.5" style={{ textAlign }}>
            {content.length > 0
              ? `${content.length} ${t('judaism.items', 'items')}`
              : t('judaism.dashboard', 'Your Jewish Dashboard')}
          </Text>
        </View>
      </View>

      {/* Shabbat Eve Banner */}
      {shabbatStatus?.is_erev_shabbat && (
        <ShabbatEveBanner status={shabbatStatus} getLocalizedText={getLocalizedText} />
      )}

      {/* Jerusalem Connection */}
      <View className="mb-4">
        <JerusalemRow showTitle={false} />
      </View>

      {/* Tel Aviv Connection */}
      <View className="mb-4">
        <TelAvivRow showTitle={false} />
      </View>

      {/* Categories */}
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
              emoji={CATEGORY_ICONS[category.id] || category.icon || '✡️'}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              hasTVPreferredFocus={index === 0}
            />
          ))}
        </ScrollView>
      )}

      {/* Content Area */}
      {showSpecialView ? (
        renderSpecialView()
      ) : (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          numColumns={isTV ? 5 : 3}
          key={isTV ? 'tv' : 'mobile'}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.md }}
          renderItem={({ item, index }) => (
            <JudaismCard
              item={item}
              onPress={() => handleItemPress(item)}
              index={index}
              getLocalizedText={getLocalizedText}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-[60px]">
              <GlassView className="p-12 items-center">
                <Text className="text-[64px] mb-3">✡️</Text>
                <Text className="text-[20px] font-semibold text-white mb-2" style={{ textAlign }}>
                  {t('judaism.empty', 'No content available')}
                </Text>
                <Text className="text-[16px] text-[rgba(255,255,255,0.6)]" style={{ textAlign }}>
                  {t('judaism.emptyHint', 'Check back later for Torah content')}
                </Text>
              </GlassView>
            </View>
          }
        />
      )}
    </View>
  );
};

export default JudaismScreen;
