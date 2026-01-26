/**
 * CultureCityRow Component
 *
 * Generic city content row that replaces hardcoded JerusalemRow/TelAvivRow.
 * Dynamically loads content and styling based on culture and city configuration.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Linking,
  ImageBackground,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { cultureService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { useCultureStore, CultureCity, CultureCityCategory } from '../contexts/CultureContext';
import { logger } from '../utils/logger';

// Scoped logger for culture city row
const cultureCityLogger = logger.scope('UI:CultureCityRow');

// Fallback background images
const FallbackBackground = require('../assets/images/Scenery/Jerusalem.png');

interface CultureContentItem {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  title_native?: string;
  title_localized?: Record<string, string>;
  url: string;
  published_at: string;
  summary?: string;
  summary_native?: string;
  summary_localized?: Record<string, string>;
  image_url?: string;
  category: string;
  category_label: Record<string, string>;
  tags: string[];
  relevance_score: number;
}

interface CultureContentData {
  items: CultureContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  sources_count: number;
  last_updated: string;
  culture_id: string;
  city_id?: string;
  category?: string;
}

interface CultureCityRowProps {
  cultureId: string;
  cityId: string;
  category?: string;
  showTitle?: boolean;
  onItemPress?: (item: CultureContentItem) => void;
}

/**
 * CultureCityRow Component
 *
 * Displays culture-specific city content from configured news sources.
 * Supports all cultures: Israeli, Chinese, Japanese, Korean, Indian, etc.
 */
export const CultureCityRow: React.FC<CultureCityRowProps> = ({
  cultureId,
  cityId,
  category,
  showTitle = true,
  onItemPress,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const { getLocalizedName } = useCultureStore();

  const [city, setCity] = useState<CultureCity | null>(null);
  const [data, setData] = useState<CultureContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const currentLang = i18n.language;

  // Get localized text from item
  const getLocalizedField = useCallback((
    item: CultureContentItem,
    field: 'title' | 'summary'
  ): string => {
    // Try localized map first
    const localizedMap = field === 'title' ? item.title_localized : item.summary_localized;
    if (localizedMap && localizedMap[currentLang]) {
      return localizedMap[currentLang];
    }

    // Fall back to native if Hebrew/RTL
    if (currentLang === 'he' || isRTL) {
      const nativeField = field === 'title' ? item.title_native : item.summary_native;
      if (nativeField) return nativeField;
    }

    // Fall back to English in localized map
    if (localizedMap && localizedMap.en) {
      return localizedMap.en;
    }

    // Fall back to base field
    return field === 'title' ? item.title : (item.summary || '');
  }, [currentLang, isRTL]);

  // Fetch city configuration
  const fetchCity = useCallback(async () => {
    try {
      const response = await cultureService.getCity(cultureId, cityId);
      const cityData: CultureCity = response.data || response;
      setCity(cityData);
    } catch (err) {
      cultureCityLogger.error('Failed to fetch city', {
        cultureId,
        cityId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }, [cultureId, cityId]);

  // Fetch content
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cultureService.getCityContent(cultureId, cityId, category);
      const contentData: CultureContentData = response.data || response;
      setData(contentData);
    } catch (err) {
      cultureCityLogger.error('Failed to fetch city content', {
        cultureId,
        cityId,
        category,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [cultureId, cityId, category]);

  useEffect(() => {
    fetchCity();
    fetchContent();
    // Refresh every 15 minutes
    const interval = setInterval(fetchContent, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCity, fetchContent]);

  const handleItemPress = useCallback((item: CultureContentItem) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      // Default: open URL in browser
      Linking.openURL(item.url).catch(err =>
        cultureCityLogger.error('Failed to open URL', {
          url: item.url,
          itemId: item.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        })
      );
    }
  }, [onItemPress]);

  // Get category emoji from city config or fallback
  const getCategoryEmoji = useCallback((categoryId: string): string => {
    if (city?.categories) {
      const cat = city.categories.find(c => c.id === categoryId);
      if (cat?.icon_emoji) return cat.icon_emoji;
    }
    // Fallback emojis
    const fallbacks: Record<string, string> = {
      kotel: '🕎',
      'idf-ceremony': '🎖️',
      'diaspora-connection': '🌍',
      'holy-sites': '✡️',
      beaches: '🏖️',
      nightlife: '🌃',
      tech: '💻',
      culture: '🎭',
      food: '🍽️',
      history: '🏛️',
      finance: '💹',
      general: '📰',
    };
    return fallbacks[categoryId] || '📰';
  }, [city]);

  // Get category label
  const getCategoryLabel = useCallback((item: CultureContentItem): string => {
    // Try city category config first
    if (city?.categories) {
      const cat = city.categories.find(c => c.id === item.category);
      if (cat?.name_localized?.[currentLang]) {
        return cat.name_localized[currentLang];
      }
      if (cat?.name) return cat.name;
    }

    // Try item's category_label
    if (item.category_label?.[currentLang]) {
      return item.category_label[currentLang];
    }
    if (item.category_label?.en) {
      return item.category_label.en;
    }

    return item.category;
  }, [city, currentLang]);

  // Get city display name
  const getCityDisplayName = useCallback((): string => {
    if (!city) return cityId;
    return getLocalizedName(city, currentLang);
  }, [city, getLocalizedName, currentLang, cityId]);

  // Get culture flag from city config
  const getCultureFlag = useCallback((): string => {
    // Map culture IDs to flags
    const flags: Record<string, string> = {
      israeli: '🇮🇱',
      chinese: '🇨🇳',
      japanese: '🇯🇵',
      korean: '🇰🇷',
      indian: '🇮🇳',
    };
    return flags[cultureId] || '🌍';
  }, [cultureId]);

  // Dynamic accent color
  const accentColor = city?.accent_color || colors.primary;

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={FallbackBackground}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
          resizeMode="cover"
        >
          <View style={styles.backgroundOverlay} />
          <View style={styles.contentWrapper}>
            {showTitle && (
              <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                <Text style={styles.headerTitle}>{getCityDisplayName()}</Text>
                <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>
                  {getCultureFlag()}
                </Text>
              </View>
            )}
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Empty state
  if (!data?.items?.length) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={FallbackBackground}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
          resizeMode="cover"
        >
          <View style={styles.backgroundOverlay} />
          <View style={styles.contentWrapper}>
            {showTitle && (
              <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                <Text style={styles.headerTitle}>{getCityDisplayName()}</Text>
                <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>
                  {getCultureFlag()}
                </Text>
              </View>
            )}
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('cultureCities.noContent')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={FallbackBackground}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover"
      >
        <View style={styles.backgroundOverlay} />

        <View style={styles.contentWrapper}>
          {/* Header */}
          {showTitle && (
            <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
              <Text style={styles.headerTitle}>
                {t('cultureCities.connectionTo', { city: getCityDisplayName() })}
              </Text>
              <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>
                {getCultureFlag()}
              </Text>
            </View>
          )}

          {/* Subtitle with city native name */}
          {city?.name_native && (
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {city.name_native}
            </Text>
          )}

          {/* Content ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.itemsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {data.items.map((item, index) => (
              <ContentCard
                key={item.id}
                item={item}
                title={getLocalizedField(item, 'title')}
                summary={getLocalizedField(item, 'summary') || undefined}
                categoryLabel={getCategoryLabel(item)}
                categoryEmoji={getCategoryEmoji(item.category)}
                accentColor={accentColor}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </ScrollView>

          {/* Sources */}
          <View style={[styles.sourcesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.sourcesLabel}>{t('cultureCities.sources')}: </Text>
            <Text style={styles.sourcesText}>
              {Array.from(new Set(data.items.map(item => item.source_name))).join(', ')}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

interface ContentCardProps {
  item: CultureContentItem;
  title: string;
  summary?: string;
  categoryLabel: string;
  categoryEmoji: string;
  accentColor: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  title,
  summary,
  categoryLabel,
  categoryEmoji,
  accentColor,
  isFocused,
  onFocus,
  onBlur,
  onPress,
}) => {
  const { isRTL } = useDirection();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, scaleAnim]);

  return (
    <TouchableOpacity
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View
          style={[
            styles.contentCard,
            isFocused && [styles.contentCardFocused, { borderColor: accentColor }],
          ]}
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.categoryEmoji, { marginLeft: isRTL ? spacing.sm : 0, marginRight: isRTL ? 0 : spacing.sm }]}>
              {categoryEmoji}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: `${accentColor}40` }]}>
              <Text style={[styles.categoryText, { color: accentColor }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }]} numberOfLines={3}>
            {title}
          </Text>

          {summary && (
            <Text style={[styles.cardSummary, { textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }]} numberOfLines={2}>
              {summary}
            </Text>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={[styles.tagsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source and score */}
          <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.sourceText}>{item.source_name}</Text>
            <View style={styles.scoreContainer}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.scoreDot,
                    i < Math.round(item.relevance_score / 2) && { backgroundColor: accentColor },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 10, 30, 0.4)',
    // @ts-ignore - Web-specific CSS properties
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  backgroundImage: {
    minHeight: isTV ? 320 : 280,
    justifyContent: 'flex-end',
  },
  backgroundImageStyle: {
    borderRadius: borderRadius.lg,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 30, 0.5)',
    borderRadius: borderRadius.lg,
    // @ts-ignore - Web-specific CSS properties
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  contentWrapper: {
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerEmoji: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
  },
  subtitle: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  itemsContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  contentCard: {
    width: 261,
    height: 220,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    // @ts-ignore - Web-specific CSS properties
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  contentCardFocused: {
    borderWidth: 2,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryEmoji: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: isTV ? 24 : 20,
  },
  cardSummary: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: isTV ? 20 : 16,
  },
  tagsContainer: {
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 'auto',
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: isTV ? fontSize.xs : 10,
    color: colors.textMuted,
  },
  cardFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  sourceText: {
    fontSize: isTV ? fontSize.xs : 10,
    color: colors.textMuted,
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sourcesContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sourcesLabel: {
    fontSize: isTV ? fontSize.xs : 10,
    color: colors.textMuted,
  },
  sourcesText: {
    fontSize: isTV ? fontSize.xs : 10,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});

export default CultureCityRow;
