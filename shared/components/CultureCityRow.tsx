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
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Linking,
  ImageBackground,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { cultureService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { useCultureStore, CultureCity, CultureCityCategory } from '../contexts/CultureContext';

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
      console.error('Failed to fetch city:', err);
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
      console.error('Failed to fetch city content:', err);
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
        console.error('Failed to open URL:', err)
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
      <View className="my-4 rounded-2xl overflow-hidden">
        <ImageBackground
          source={FallbackBackground}
          className={clsx("justify-end", isTV ? "min-h-[320px]" : "min-h-[280px]")}
          imageStyle={{ borderRadius: borderRadius.lg }}
          resizeMode="cover"
        >
          <View className="absolute inset-0 bg-black/50 rounded-2xl" />
          <View className="p-4">
            {showTitle && (
              <View className={clsx(
                "items-center mb-1",
                isRTL ? "flex-row-reverse" : "flex-row"
              )}>
                <Text className={clsx(
                  "font-bold text-white",
                  isTV ? "text-xl" : "text-lg"
                )}>{getCityDisplayName()}</Text>
                <Text className={clsx(
                  isTV ? "text-xl" : "text-lg",
                  isRTL ? "mr-2" : "ml-2"
                )}>
                  {getCultureFlag()}
                </Text>
              </View>
            )}
            <View className="h-[200px] justify-center items-center">
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
      <View className="my-4 rounded-2xl overflow-hidden">
        <ImageBackground
          source={FallbackBackground}
          className={clsx("justify-end", isTV ? "min-h-[320px]" : "min-h-[280px]")}
          imageStyle={{ borderRadius: borderRadius.lg }}
          resizeMode="cover"
        >
          <View className="absolute inset-0 bg-black/50 rounded-2xl" />
          <View className="p-4">
            {showTitle && (
              <View className={clsx(
                "items-center mb-1",
                isRTL ? "flex-row-reverse" : "flex-row"
              )}>
                <Text className={clsx(
                  "font-bold text-white",
                  isTV ? "text-xl" : "text-lg"
                )}>{getCityDisplayName()}</Text>
                <Text className={clsx(
                  isTV ? "text-xl" : "text-lg",
                  isRTL ? "mr-2" : "ml-2"
                )}>
                  {getCultureFlag()}
                </Text>
              </View>
            )}
            <View className="h-[150px] justify-center items-center">
              <Text className="text-white/60 text-base">{t('cultureCities.noContent')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View className="my-4 rounded-2xl overflow-hidden">
      <ImageBackground
        source={FallbackBackground}
        className={clsx("justify-end", isTV ? "min-h-[320px]" : "min-h-[280px]")}
        imageStyle={{ borderRadius: borderRadius.lg }}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-black/50 rounded-2xl" />

        <View className="p-4">
          {/* Header */}
          {showTitle && (
            <View className={clsx(
              "items-center mb-1",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}>
              <Text className={clsx(
                "font-bold text-white",
                isTV ? "text-xl" : "text-lg"
              )}>
                {t('cultureCities.connectionTo', { city: getCityDisplayName() })}
              </Text>
              <Text className={clsx(
                isTV ? "text-xl" : "text-lg",
                isRTL ? "mr-2" : "ml-2"
              )}>
                {getCultureFlag()}
              </Text>
            </View>
          )}

          {/* Subtitle with city native name */}
          {city?.name_native && (
            <Text className={clsx(
              "text-white/80 mb-4",
              isTV ? "text-base" : "text-sm"
            )} style={{ textAlign: isRTL ? 'right' : 'left' }}>
              {city.name_native}
            </Text>
          )}

          {/* Content ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName={clsx(
              "py-2 gap-4",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}
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
          <View className={clsx(
            "mt-4 items-center flex-wrap",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Text className={clsx(
              "text-white/40",
              isTV ? "text-xs" : "text-[10px]"
            )}>{t('cultureCities.sources')}: </Text>
            <Text className={clsx(
              "text-white/60 flex-shrink",
              isTV ? "text-xs" : "text-[10px]"
            )}>
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
          className={clsx(
            "w-[261px] h-[180px] p-4 rounded-2xl border-2 overflow-hidden backdrop-blur-sm",
            isFocused ? "border-2" : "border-transparent bg-transparent"
          )}
          style={[
            isFocused && { borderColor: accentColor },
            // @ts-ignore - Web-specific CSS properties
            {
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }
          ]}
        >
          <View className={clsx(
            "items-center mb-2",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Text className={clsx(
              isTV ? "text-lg" : "text-base",
              isRTL ? "ml-2" : "mr-2"
            )}>
              {categoryEmoji}
            </Text>
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}40` }}>
              <Text className={clsx(
                "font-semibold",
                isTV ? "text-sm" : "text-xs"
              )} style={{ color: accentColor }}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text
            className={clsx(
              "font-semibold text-white mb-2",
              isTV ? "text-base leading-6" : "text-sm leading-5"
            )}
            style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }}
            numberOfLines={3}
          >
            {title}
          </Text>

          {summary && (
            <Text
              className={clsx(
                "text-white/80 mb-2",
                isTV ? "text-sm leading-5" : "text-xs leading-4"
              )}
              style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }}
              numberOfLines={2}
            >
              {summary}
            </Text>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View className={clsx(
              "flex-wrap gap-1 mt-auto mb-2",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} className="bg-white/10 px-2 py-0.5 rounded-full">
                  <Text className={clsx(
                    "text-white/60",
                    isTV ? "text-xs" : "text-[10px]"
                  )}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source and score */}
          <View className={clsx(
            "justify-between items-center mt-auto",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Text className={clsx(
              "text-white/40",
              isTV ? "text-xs" : "text-[10px]"
            )}>{item.source_name}</Text>
            <View className="flex-row gap-0.5">
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: i < Math.round(item.relevance_score / 2) ? accentColor : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default CultureCityRow;
