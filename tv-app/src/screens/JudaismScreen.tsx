import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { judaismService } from '../services/api';

interface JudaismItem {
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
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon?: string;
}

interface NewsItem {
  id: string;
  source_name: string;
  title: string;
  title_he?: string;
  link: string;
  published_at: string;
  summary?: string;
  category: string;
}

interface CalendarData {
  gregorian_date: string;
  hebrew_date: string;
  hebrew_date_full: string;
  day_of_week: string;
  day_of_week_he: string;
  is_shabbat: boolean;
  is_holiday: boolean;
  parasha?: string;
  parasha_he?: string;
  holidays: Array<{ title: string; title_he?: string; category: string }>;
}

interface ShabbatStatus {
  status: 'regular' | 'erev_shabbat' | 'shabbat';
  is_erev_shabbat: boolean;
  is_shabbat: boolean;
  candle_lighting: string;
  havdalah: string;
  parasha: string;
  parasha_he: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  all: '✡️',
  news: '📰',
  calendar: '📅',
  community: '🏛️',
  shiurim: '📖',
  tefila: '🕯️',
  music: '🎵',
  holidays: '🕎',
  documentaries: '🎬',
};

// Judaism Content Card Component
const JudaismCard: React.FC<{
  item: JudaismItem;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();
  // Track which thumbnail quality we're trying: 0=maxres, 1=hqdefault, 2=failed
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️';

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

  const getThumbnailUrl = (): string | null => {
    if (!item.thumbnail) return null;
    // If YouTube maxresdefault failed, try hqdefault
    if (item.thumbnail.includes('maxresdefault')) {
      if (thumbnailAttempt === 0) return item.thumbnail;
      if (thumbnailAttempt === 1) return item.thumbnail.replace('maxresdefault', 'hqdefault');
      return null; // Both failed
    }
    return thumbnailAttempt < 2 ? item.thumbnail : null;
  };

  const handleImageError = () => {
    // Try next fallback quality
    if (thumbnailAttempt < 2) {
      setThumbnailAttempt(prev => prev + 1);
    }
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      // @ts-ignore - TV specific prop
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
          </View>
        )}
        <View style={[styles.categoryBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.categoryBadgeText}>{categoryIcon}</Text>
        </View>
        {item.duration && (
          <View style={[styles.durationBadge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.rabbi && (
            <Text style={[styles.cardRabbi, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'rabbi')}
            </Text>
          )}
          {item.description && (
            <Text style={[styles.cardDescription, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'description')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Shabbat Eve Banner Component
const ShabbatEveBanner: React.FC<{
  status: ShabbatStatus;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ status, getLocalizedText }) => {
  const { t, i18n } = useTranslation();
  const { isRTL, flexDirection } = useDirection();

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  const getParasha = () => {
    return i18n.language === 'he' ? status.parasha_he : status.parasha;
  };

  return (
    <GlassView style={styles.shabbatBanner}>
      <View style={[styles.shabbatHeader, { flexDirection }]}>
        <View style={[styles.shabbatIconsContainer, { flexDirection }]}>
          <Text style={styles.shabbatCandle}>🕯️</Text>
          <Text style={[styles.shabbatCandle, { marginLeft: -8 }]}>🕯️</Text>
        </View>
        <View style={styles.shabbatTitleContainer}>
          <Text style={styles.shabbatTitle}>
            {t('judaism.erevShabbat.title', 'Erev Shabbat')}
          </Text>
          <Text style={styles.shabbatSubtitle}>
            {t('judaism.erevShabbat.shabbatShalom', 'Shabbat Shalom!')} 🍞
          </Text>
        </View>
      </View>

      {getParasha() && (
        <View style={styles.parashaContainer}>
          <Text style={styles.parashaLabel}>
            {t('judaism.shabbat.parashat', 'Parashat')}
          </Text>
          <Text style={styles.parashaName}>{getParasha()}</Text>
        </View>
      )}

      <View style={[styles.shabbatTimesRow, { flexDirection }]}>
        <View style={styles.shabbatTimeCard}>
          <Text style={styles.shabbatTimeIcon}>🔥</Text>
          <Text style={styles.shabbatTimeLabel}>
            {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
          </Text>
          <Text style={styles.shabbatTimeValue}>
            {formatTime(status.candle_lighting)}
          </Text>
        </View>
        <View style={styles.shabbatTimeCard}>
          <Text style={styles.shabbatTimeIcon}>🌙</Text>
          <Text style={styles.shabbatTimeLabel}>
            {t('judaism.shabbat.havdalah', 'Havdalah')}
          </Text>
          <Text style={styles.shabbatTimeValue}>
            {formatTime(status.havdalah)}
          </Text>
        </View>
      </View>
    </GlassView>
  );
};

// News Item Component
const NewsItemCard: React.FC<{
  item: NewsItem;
  index: number;
  onPress: () => void;
}> = ({ item, index, onPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const { i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[styles.newsItem, isFocused && styles.newsItemFocused]}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <View style={[styles.newsItemContent, { flexDirection }]}>
        <View style={styles.newsSourceBadge}>
          <Text style={styles.newsSourceText}>{item.source_name}</Text>
        </View>
        <Text style={styles.newsDate}>{formatDate(item.published_at)}</Text>
      </View>
      <Text style={[styles.newsTitle, { textAlign }]} numberOfLines={2}>
        {stripHtml(i18n.language === 'he' && item.title_he ? item.title_he : item.title)}
      </Text>
      {item.summary && (
        <Text style={[styles.newsSummary, { textAlign }]} numberOfLines={2}>
          {stripHtml(item.summary)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Calendar Widget Component
const CalendarWidget: React.FC<{ data: CalendarData }> = ({ data }) => {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  const getDayName = () => {
    return i18n.language === 'he' ? data.day_of_week_he : data.day_of_week;
  };

  return (
    <GlassView style={styles.calendarWidget}>
      <View style={[styles.calendarHeader, { flexDirection }]}>
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={styles.calendarTitle}>
          {t('judaism.calendar.title', 'Jewish Calendar')}
        </Text>
      </View>
      <View style={styles.hebrewDateContainer}>
        <Text style={styles.hebrewDate}>{data.hebrew_date}</Text>
        <Text style={styles.gregorianDate}>
          {getDayName()} • {data.gregorian_date}
        </Text>
      </View>
      {(data.is_shabbat || data.is_holiday) && (
        <View style={styles.specialDayBadge}>
          <Text style={styles.specialDayIcon}>⭐</Text>
          <Text style={styles.specialDayText}>
            {data.is_shabbat ? t('judaism.calendar.shabbat', 'Shabbat') : t('judaism.calendar.holiday', 'Holiday')}
          </Text>
        </View>
      )}
      {data.parasha && (
        <View style={styles.parashaRow}>
          <Text style={styles.parashaRowIcon}>📖</Text>
          <Text style={styles.parashaRowLabel}>{t('judaism.calendar.parasha', 'Parasha')}:</Text>
          <Text style={styles.parashaRowValue}>
            {i18n.language === 'he' ? data.parasha_he : data.parasha}
          </Text>
        </View>
      )}
      {data.holidays.length > 0 && (
        <View style={styles.holidaysList}>
          {data.holidays.map((holiday, index) => (
            <View key={index} style={styles.holidayItem}>
              <Text style={styles.holidayItemText}>
                {i18n.language === 'he' && holiday.title_he ? holiday.title_he : holiday.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </GlassView>
  );
};

export const JudaismScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
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
        // Load community data - for now show empty
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
    // Open news link - on TV we could show a QR code or just display the article
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
            <NewsItemCard
              item={item}
              index={index}
              onPress={() => handleNewsPress(item)}
            />
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
              : t('judaism.dashboard', 'Your Jewish Dashboard')
            }
          </Text>
        </View>
      </View>

      {/* Shabbat Eve Banner */}
      {shabbatStatus?.is_erev_shabbat && (
        <ShabbatEveBanner status={shabbatStatus} getLocalizedText={getLocalizedText} />
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categories: {
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '20%' : '33.33%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: colors.overlayDark,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 14,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardRabbi: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Shabbat Banner Styles
  shabbatBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  shabbatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shabbatIconsContainer: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  shabbatCandle: {
    fontSize: 40,
  },
  shabbatTitleContainer: {
    flex: 1,
  },
  shabbatTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  shabbatSubtitle: {
    fontSize: 18,
    color: colors.warning,
    marginTop: 2,
  },
  parashaContainer: {
    backgroundColor: `${colors.primary}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  parashaLabel: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  parashaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  shabbatTimesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shabbatTimeCard: {
    flex: 1,
    backgroundColor: `${colors.warning}26`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  shabbatTimeIcon: {
    fontSize: 28,
  },
  shabbatTimeLabel: {
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  shabbatTimeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },

  // News Styles
  newsList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  newsItem: {
    flex: 1,
    margin: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  newsItemFocused: {
    borderColor: colors.primary,
  },
  newsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  newsSourceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newsSourceText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  newsDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  newsSummary: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Calendar Styles
  calendarContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  calendarWidget: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    maxWidth: 500,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  calendarIcon: {
    fontSize: 24,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  hebrewDateContainer: {
    backgroundColor: `${colors.primary}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  hebrewDate: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  gregorianDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  specialDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.gold}4D`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    alignSelf: 'center',
    gap: 4,
  },
  specialDayIcon: {
    fontSize: 14,
  },
  specialDayText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
  parashaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLighter,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  parashaRowIcon: {
    fontSize: 18,
  },
  parashaRowLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  parashaRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  holidaysList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  holidayItem: {
    backgroundColor: colors.backgroundLighter,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  holidayItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});

export default JudaismScreen;
