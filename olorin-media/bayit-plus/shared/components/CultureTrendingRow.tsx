/**
 * CultureTrendingRow Component
 *
 * Displays "What's Trending" content for the selected culture.
 * Replaces hardcoded "Israel" trending with dynamic culture-aware content.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { cultureService } from '../services/api';
import { useCultureStore } from '../contexts/CultureContext';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

interface CultureTrendingTopic {
  id: string;
  title: string;
  title_localized?: Record<string, string>;
  category: string;
  sentiment?: string;
  relevance_score: number;
  summary?: string;
  summary_localized?: Record<string, string>;
  keywords?: string[];
  source?: string;
  published_at?: string;
}

interface CultureTrendingData {
  culture_id: string;
  topics: CultureTrendingTopic[];
  overall_mood?: string;
  overall_mood_localized?: Record<string, string>;
  sources: string[];
  analyzed_at: string;
}

interface CultureTrendingRowProps {
  cultureId?: string; // Optional - uses current culture if not provided
  onTopicPress?: (topic: CultureTrendingTopic) => void;
  showSources?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  // General categories
  security: '🔒',
  politics: '🏛️',
  tech: '💻',
  technology: '💻',
  culture: '🎭',
  sports: '⚽',
  economy: '📈',
  finance: '💰',
  entertainment: '🎬',
  weather: '🌤️',
  health: '🏥',
  food: '🍜',
  fashion: '👗',
  travel: '✈️',
  history: '📜',
  expat: '🌍',
  general: '📰',
  // Israeli-specific categories
  kotel: '🕍',
  'idf-ceremony': '🎖️',
  diaspora: '🌐',
  'holy-sites': '✡️',
  'jerusalem-events': '🏛️',
  beaches: '🏖️',
  nightlife: '🌃',
};

/**
 * CultureTrendingRow Component
 * Displays trending topics for a specific culture.
 */
export const CultureTrendingRow: React.FC<CultureTrendingRowProps> = ({
  cultureId,
  onTopicPress,
  showSources = true,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const { currentCulture, getLocalizedName } = useCultureStore();

  const [data, setData] = useState<CultureTrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Determine which culture to use
  const effectiveCultureId = cultureId || currentCulture?.culture_id || 'israeli';

  // Get culture display info
  const getCultureLabel = (): string => {
    if (currentCulture) {
      return getLocalizedName(currentCulture, i18n.language);
    }
    // Fallback labels
    const labels: Record<string, Record<string, string>> = {
      israeli: { en: 'Israel', he: 'ישראל', es: 'Israel' },
      chinese: { en: 'China', he: 'סין', es: 'China' },
      japanese: { en: 'Japan', he: 'יפן', es: 'Japón' },
      korean: { en: 'Korea', he: 'קוריאה', es: 'Corea' },
      indian: { en: 'India', he: 'הודו', es: 'India' },
    };
    const cultureLbl = labels[effectiveCultureId];
    if (cultureLbl) {
      return cultureLbl[i18n.language] || cultureLbl.en || '';
    }
    return '';
  };

  const getCultureFlag = (): string => {
    if (currentCulture?.flag_emoji) {
      return currentCulture.flag_emoji;
    }
    const flags: Record<string, string> = {
      israeli: '🇮🇱',
      chinese: '🇨🇳',
      japanese: '🇯🇵',
      korean: '🇰🇷',
      indian: '🇮🇳',
    };
    return flags[effectiveCultureId] || '🌍';
  };

  // Fetch trending data from API
  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cultureService.getTrending(effectiveCultureId);
      const rawData = response.data || response;

      // Transform backend array response to expected structure
      // Backend returns: Array<{id, title, title_localized, category, source_name, summary, ...}>
      // Frontend expects: {culture_id, topics: [...], sources: [...], analyzed_at}
      let trendingData: CultureTrendingData;

      if (Array.isArray(rawData)) {
        // Backend returns array directly - transform to expected structure
        const topics: CultureTrendingTopic[] = rawData.map((item: any) => ({
          id: item.id,
          title: item.title || item.title_native || '',
          title_localized: item.title_localized,
          category: item.category || 'general',
          sentiment: item.sentiment,
          relevance_score: item.relevance_score || 0,
          summary: item.summary || item.summary_native,
          summary_localized: item.summary_localized,
          keywords: item.tags || [],
          source: item.source_name,
          published_at: item.published_at,
        }));

        // Extract unique sources
        const sources = [...new Set(rawData.map((item: any) => item.source_name).filter(Boolean))];

        trendingData = {
          culture_id: effectiveCultureId,
          topics,
          sources,
          analyzed_at: new Date().toISOString(),
        };
      } else {
        // Already in expected format
        trendingData = rawData as CultureTrendingData;
      }

      setData(trendingData);
    } catch (err) {
      console.warn('Failed to fetch culture trending:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveCultureId]);

  useEffect(() => {
    fetchTrending();
    // Refresh every 30 minutes
    const interval = setInterval(fetchTrending, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  // Helper to get localized text
  const getLocalizedText = (
    defaultText: string,
    localized?: Record<string, string>
  ): string => {
    if (localized && localized[i18n.language]) {
      return localized[i18n.language];
    }
    if (localized?.en) return localized.en;
    return defaultText;
  };

  if (loading) {
    return (
      <GlassView className="my-4" intensity="light">
        <View className={clsx(
          "flex-row items-center mb-2 px-4",
          isRTL && "flex-row-reverse"
        )}>
          <Text className={clsx(
            "font-semibold text-white",
            isTV ? "text-lg" : "text-base"
          )}>
            {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
          </Text>
          <Text className={clsx(
            isTV ? "text-xl" : "text-lg",
            isRTL ? "mr-2" : "ml-2"
          )}>
            🔥
          </Text>
        </View>
        <View className="h-[150px] justify-center items-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GlassView>
    );
  }

  if (!data?.topics?.length) {
    return (
      <GlassView className="my-4" intensity="light">
        <View className={clsx(
          "flex-row items-center mb-2 px-4",
          isRTL && "flex-row-reverse"
        )}>
          <Text className={clsx(
            "font-semibold text-white",
            isTV ? "text-lg" : "text-base"
          )}>
            {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
          </Text>
          <Text className={clsx(
            isTV ? "text-xl" : "text-lg",
            isRTL ? "mr-2" : "ml-2"
          )}>
            🔥
          </Text>
        </View>
        <View className="h-[100px] justify-center items-center px-4">
          <Text className="text-base text-white/80 text-center">{t('cultureTrending.noTopics')}</Text>
        </View>
      </GlassView>
    );
  }

  return (
    <View className="my-4">
      {/* Header */}
      <View className={clsx(
        "flex-row items-center mb-2 px-4",
        isRTL && "flex-row-reverse"
      )}>
        <Text className={isTV ? "text-2xl" : "text-xl"}>{getCultureFlag()}</Text>
        <Text className={clsx(
          "font-semibold text-white",
          isTV ? "text-lg" : "text-base",
          isRTL ? "mr-2" : "ml-2"
        )}>
          {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
        </Text>
        <Text className={isTV ? "text-2xl" : "text-xl"}>🔥</Text>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text
          className="text-sm text-white/80 px-4 mb-4"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {getLocalizedText(data.overall_mood, data.overall_mood_localized)}
        </Text>
      )}

      {/* Topics ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={clsx(
          "px-4 gap-4",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}
      >
        {data.topics.map((topic, index) => (
          <TopicCard
            key={topic.id || index}
            topic={topic}
            title={getLocalizedText(topic.title, topic.title_localized)}
            summary={topic.summary ? getLocalizedText(topic.summary, topic.summary_localized) : undefined}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onPress={() => onTopicPress?.(topic)}
            isRTL={isRTL}
          />
        ))}
      </ScrollView>

      {/* Sources */}
      {showSources && data.sources?.length > 0 && (
        <View className={clsx(
          "flex-row px-4 mt-2",
          isRTL && "flex-row-reverse"
        )}>
          <Text className="text-xs text-white/40">{t('cultureTrending.sources')}: </Text>
          <Text className="text-xs text-white/40 flex-1">{data.sources.join(', ')}</Text>
        </View>
      )}
    </View>
  );
};

interface TopicCardProps {
  topic: CultureTrendingTopic;
  title: string;
  summary?: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
  isRTL: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  title,
  summary,
  isFocused,
  onFocus,
  onBlur,
  onPress,
  isRTL,
}) => {
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

  const categoryEmoji = CATEGORY_EMOJIS[topic.category] || '📌';

  return (
    <TouchableOpacity
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassView
          className={clsx(
            "p-6 rounded-2xl border-2 mr-4",
            isTV ? "w-80 h-[220px]" : "w-[261px] h-[180px]",
            isFocused
              ? "border-purple-500 border-2 bg-purple-900/30 shadow-purple-500/40"
              : "border-transparent"
          )}
          style={
            isFocused && {
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }
          }
          intensity="subtle"
        >
          <View className={clsx(
            "items-center mb-2 gap-2",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Text className={isTV ? "text-3xl" : "text-2xl"}>{categoryEmoji}</Text>
            <View className="bg-purple-900/30 px-4 py-1 rounded-full border border-purple-500/60">
              <Text className="text-xs text-purple-400/90 font-semibold capitalize">
                {topic.category}
              </Text>
            </View>
          </View>

          <Text
            className={clsx(
              "font-bold text-white mb-1",
              isTV ? "text-base leading-[22px]" : "text-sm leading-[18px]"
            )}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
            numberOfLines={3}
          >
            {title}
          </Text>

          {summary && (
            <Text
              className="text-xs text-white/70 mb-2 leading-4 flex-1"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
              numberOfLines={2}
            >
              {summary}
            </Text>
          )}

          {/* Relevance indicator */}
          <View className={clsx(
            "flex-row gap-1 mt-auto",
            isRTL && "flex-row-reverse"
          )}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  i < Math.ceil(topic.relevance_score * 5) ? "bg-purple-500" : "bg-white/20"
                )}
              />
            ))}
          </View>

          {/* Source badge */}
          {topic.source && (
            <Text className="text-[10px] text-white/40 mt-1" numberOfLines={1}>
              {topic.source}
            </Text>
          )}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default CultureTrendingRow;
