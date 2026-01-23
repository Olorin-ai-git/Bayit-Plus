import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Linking,
  ImageBackground,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { telAvivService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

// Platform-specific detection
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

// Import Tel Aviv panoramic background
const TelAvivBackground = require('../assets/images/Scenery/TelAviv.png');

interface TelAvivContentItem {
  id: string;
  source_name: string;
  title: string;
  title_he?: string;
  title_en?: string;
  url: string;
  published_at: string;
  summary?: string;
  summary_he?: string;
  summary_en?: string;
  image_url?: string;
  category: string;
  category_label: { he: string; en: string; es?: string };
  tags: string[];
  relevance_score: number;
}

interface TelAvivContentData {
  items: TelAvivContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  sources_count: number;
  last_updated: string;
  category?: string;
}

interface TelAvivRowProps {
  onItemPress?: (item: TelAvivContentItem) => void;
  category?: string;
  showTitle?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  beaches: '🏖️',
  nightlife: '🌃',
  culture: '🎭',
  music: '🎵',
  food: '🍽️',
  tech: '💻',
  events: '🎉',
  general: '📰',
};

/**
 * TelAvivRow Component
 * Displays Tel Aviv-focused content from Israeli news.
 * Includes beaches, nightlife, culture, music, food, tech, and events.
 */
export const TelAvivRow: React.FC<TelAvivRowProps> = ({
  onItemPress,
  category,
  showTitle = true,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [data, setData] = useState<TelAvivContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const currentLang = i18n.language;

  // Helper to get localized text from an item's localized fields
  const getLocalizedField = (
    item: { [key: string]: any },
    field: string
  ): string => {
    const heValue = item[`${field}_he`] || item[field];
    const enValue = item[`${field}_en`] || item[field];
    const esValue = item[`${field}_es`] || enValue || heValue;

    if (currentLang === 'he') return heValue;
    if (currentLang === 'es') return esValue;
    return enValue;
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const result = await telAvivService.getContent(category) as TelAvivContentData;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch Tel Aviv content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
    // Refresh every 15 minutes
    const interval = setInterval(fetchContent, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [category]);

  const handleItemPress = (item: TelAvivContentItem) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      // Default: open URL in browser
      Linking.openURL(item.url).catch(err =>
        console.error('Failed to open URL:', err)
      );
    }
  };

  if (loading) {
    return (
      <View className={`${isMobilePhone ? 'my-2 rounded-2xl mx-2' : 'my-4 rounded-3xl mx-4'} overflow-hidden`}>
        <ImageBackground
          source={TelAvivBackground}
          style={{ width: '100%', minHeight: isMobilePhone ? 180 : 320 }}
          imageStyle={{ opacity: 0.6, borderRadius: isMobilePhone ? 16 : 24 }}
          resizeMode="cover"
        >
          <View
            className={`absolute inset-0 bg-[rgba(10,10,30,0.5)] ${isMobilePhone ? 'rounded-2xl' : 'rounded-3xl'}`}
          />
          <View className={`relative z-10 ${isMobilePhone ? 'py-2' : 'py-4'}`}>
            {showTitle && (
              <View className={`flex items-center mb-1 ${isMobilePhone ? 'px-4' : 'px-6'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <Text className={`text-${isMobilePhone ? 'base' : 'lg'} font-semibold text-white`}>
                  {t('telAviv.title')}
                </Text>
                <Text className={`text-${isMobilePhone ? 'base' : 'xl'} ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  🌆
                </Text>
              </View>
            )}
            <View className={`justify-center items-center ${isMobilePhone ? 'h-20' : 'h-36'}`}>
              <ActivityIndicator color="#a855f7" size="large" />
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (!data?.items?.length) {
    return (
      <View className={`${isMobilePhone ? 'my-2 rounded-2xl mx-2' : 'my-4 rounded-3xl mx-4'} overflow-hidden`}>
        <ImageBackground
          source={TelAvivBackground}
          style={{ width: '100%', minHeight: isMobilePhone ? 180 : 320 }}
          imageStyle={{ opacity: 0.6, borderRadius: isMobilePhone ? 16 : 24 }}
          resizeMode="cover"
        >
          <View
            className={`absolute inset-0 bg-[rgba(10,10,30,0.5)] ${isMobilePhone ? 'rounded-2xl' : 'rounded-3xl'}`}
          />
          <View className={`relative z-10 ${isMobilePhone ? 'py-2' : 'py-4'}`}>
            {showTitle && (
              <View className={`flex items-center mb-1 ${isMobilePhone ? 'px-4' : 'px-6'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <Text className={`text-${isMobilePhone ? 'base' : 'lg'} font-semibold text-white`}>
                  {t('telAviv.title')}
                </Text>
                <Text className={`text-${isMobilePhone ? 'base' : 'xl'} ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  🌆
                </Text>
              </View>
            )}
            <View className={`justify-center items-center px-6 ${isMobilePhone ? 'h-14' : 'h-24'}`}>
              <Text className={`text-${isMobilePhone ? 'sm' : 'base'} text-white/60 text-center`}>
                {t('telAviv.noContent')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Get category label from translations
  const getCategoryLabel = (item: TelAvivContentItem) => {
    // Use translation keys for known categories
    const categoryKey = `telAviv.categories.${item.category}`;
    const translated = t(categoryKey);
    // If translation not found (returns the key), fall back to API label
    if (translated === categoryKey) {
      if (currentLang === 'he') {
        return item.category_label?.he || item.category;
      }
      if (currentLang === 'es') {
        return item.category_label?.es || item.category_label?.en || item.category;
      }
      return item.category_label?.en || item.category;
    }
    return translated;
  };

  return (
    <View className={`${isMobilePhone ? 'my-2 rounded-2xl mx-2' : 'my-4 rounded-3xl mx-4'} overflow-hidden`}>
      {/* Background Image */}
      <ImageBackground
        source={TelAvivBackground}
        style={{ width: '100%', minHeight: isMobilePhone ? 180 : 320 }}
        imageStyle={{ opacity: 0.6, borderRadius: isMobilePhone ? 16 : 24 }}
        resizeMode="cover"
      >
        {/* Semi-transparent overlay */}
        <View
          className={`absolute inset-0 bg-[rgba(10,10,30,0.5)] ${isMobilePhone ? 'rounded-2xl' : 'rounded-3xl'}`}
        />

        {/* Content */}
        <View className={`relative z-10 ${isMobilePhone ? 'py-2' : 'py-4'}`}>
          {/* Header */}
          {showTitle && (
            <View className={`flex items-center mb-1 ${isMobilePhone ? 'px-4' : 'px-6'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Text className={`text-${isMobilePhone ? 'base' : 'lg'} font-semibold text-white`}>
                {t('telAviv.title')}
              </Text>
              <Text className={`text-${isMobilePhone ? 'base' : 'xl'} ${isRTL ? 'mr-2' : 'ml-2'}`}>
                🌆
              </Text>
            </View>
          )}

          {/* Subtitle */}
          <Text className={`text-${isMobilePhone ? 'xs' : 'sm'} text-white/60 ${isMobilePhone ? 'px-4 mb-2' : 'px-6 mb-4'} ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('telAviv.subtitle')}
          </Text>

          {/* Content ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName={`${isMobilePhone ? 'px-4 gap-2' : 'px-6 gap-4'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {data.items.map((item, index) => (
              <ContentCard
                key={item.id}
                item={item}
                title={getLocalizedField(item, 'title')}
                summary={item.summary ? getLocalizedField(item, 'summary') : undefined}
                categoryLabel={getCategoryLabel(item)}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </ScrollView>

          {/* Sources */}
          <View className={`${isMobilePhone ? 'px-4 mt-1' : 'px-6 mt-2'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Text className={`text-${isMobilePhone ? 'xs' : 'sm'} text-white/40`}>
              {t('telAviv.sources')}:{' '}
            </Text>
            <Text className={`text-${isMobilePhone ? 'xs' : 'sm'} text-white/40`}>
              {Array.from(new Set(data.items.map(item => item.source_name))).join(', ')}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

interface ContentCardProps {
  item: TelAvivContentItem;
  title: string;
  summary?: string;
  categoryLabel: string;
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
        <GlassView
          className={`
            ${isMobilePhone ? 'w-44 h-32 p-4 rounded-xl mr-2' : 'w-64 h-44 p-6 rounded-2xl mr-4'}
            border-2
            ${isFocused ? 'border-orange-500 bg-orange-500/20 shadow-orange-500/40 shadow-lg' : 'border-transparent'}
          `}
          intensity="subtle"
        >
          <View className={`flex items-center ${isMobilePhone ? 'mb-1' : 'mb-2'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Text className={`text-${isMobilePhone ? 'lg' : '2xl'} ${isRTL ? 'ml-2' : 'mr-2'}`}>
              {CATEGORY_EMOJIS[item.category] || '📰'}
            </Text>
            <View className={`bg-orange-500/30 ${isMobilePhone ? 'px-2 py-0.5' : 'px-4 py-1'} rounded-full border border-orange-500/60`}>
              <Text className={`text-${isMobilePhone ? 'xs' : 'sm'} text-orange-300/90 font-semibold`}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text
            className={`text-${isMobilePhone ? 'sm' : 'base'} font-bold text-white mb-1 leading-${isMobilePhone ? '4' : '5'} ${isRTL ? 'text-right' : 'text-left'}`}
            numberOfLines={3}
          >
            {title}
          </Text>

          {summary && (
            <Text
              className={`text-${isMobilePhone ? 'xs' : 'sm'} text-white/70 ${isMobilePhone ? 'mb-1 leading-3' : 'mb-2 leading-4'} ${isRTL ? 'text-right' : 'text-left'}`}
              numberOfLines={2}
            >
              {summary}
            </Text>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View className={`flex flex-wrap ${isMobilePhone ? 'gap-0.5 mb-1' : 'gap-1 mb-2'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} className={`bg-white/10 ${isMobilePhone ? 'px-1 py-0.5 rounded-sm' : 'px-2 py-1 rounded'}`}>
                  <Text className={`text-${isMobilePhone ? '[9px]' : 'xs'} text-white/60`}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Source and score */}
          <View className={`flex justify-between items-center mt-auto ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Text className={`text-${isMobilePhone ? '[9px]' : 'xs'} text-white/40 uppercase`}>
              {item.source_name}
            </Text>
            <View className={`flex ${isMobilePhone ? 'gap-0.5' : 'gap-1'} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  className={`
                    ${isMobilePhone ? 'w-1 h-1 rounded-[2px]' : 'w-1.5 h-1.5 rounded-[3px]'}
                    ${i < Math.ceil(item.relevance_score / 2) ? 'bg-orange-500' : 'bg-white/20'}
                  `}
                />
              ))}
            </View>
          </View>
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default TelAvivRow;
