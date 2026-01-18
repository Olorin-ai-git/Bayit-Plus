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
import { styles } from './JudaismScreen.styles';
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
      console.error('Failed to load Judaism categories:', err);
    }
  };

  const loadShabbatStatus = async () => {
    try {
      const response = await judaismService.getShabbatStatus();
      if (response) {
        setShabbatStatus(response);
      }
    } catch (err) {
      console.error('Failed to load Shabbat status:', err);
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
      console.error('Failed to load Judaism content:', err);
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
    console.log('News item pressed:', item.link);
  };

  const renderSpecialView = () => {
    if (selectedCategory === 'news') {
      return (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          numColumns={isTV ? 3 : 1}
          key="news"
          contentContainerStyle={styles.newsList}
          renderItem={({ item, index }) => (
            <NewsItemCard item={item} index={index} onPress={() => handleNewsPress(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={styles.emptyTitle}>{t('judaism.news.empty', 'No news available')}</Text>
            </View>
          }
        />
      );
    }

    if (selectedCategory === 'calendar' && calendarData) {
      return (
        <ScrollView contentContainerStyle={styles.calendarContainer}>
          <CalendarWidget data={calendarData} />
        </ScrollView>
      );
    }

    if (selectedCategory === 'community') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏛️</Text>
          <Text style={styles.emptyTitle}>{t('judaism.community.title', 'Community Directory')}</Text>
          <Text style={styles.emptySubtitle}>{t('judaism.community.comingSoon', 'Coming soon to TV')}</Text>
        </View>
      );
    }

    return null;
  };

  const showSpecialView = ['news', 'calendar', 'community'].includes(selectedCategory);

  if (isLoading && content.length === 0 && news.length === 0 && !calendarData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>✡️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('judaism.title', 'Judaism')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
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
      <View style={styles.jerusalemSection}>
        <JerusalemRow showTitle={false} />
      </View>

      {/* Tel Aviv Connection */}
      <View style={styles.jerusalemSection}>
        <TelAvivRow showTitle={false} />
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
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
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <JudaismCard
              item={item}
              onPress={() => handleItemPress(item)}
              index={index}
              getLocalizedText={getLocalizedText}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <GlassView style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>✡️</Text>
                <Text style={[styles.emptyTitle, { textAlign }]}>
                  {t('judaism.empty', 'No content available')}
                </Text>
                <Text style={[styles.emptySubtitle, { textAlign }]}>
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
