import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { GlassView } from './ui/GlassView';
import { trendingService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

// Platform-specific detection
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

interface TrendingTopic {
  title: string;
  title_en?: string;
  title_es?: string;
  category: string;
  category_label: { he: string; en: string; es?: string };
  sentiment: string;
  importance: number;
  summary?: string;
  summary_en?: string;
  summary_es?: string;
  keywords: string[];
}

interface TrendingData {
  topics: TrendingTopic[];
  overall_mood: string;
  overall_mood_en?: string;
  overall_mood_es?: string;
  top_story?: string;
  top_story_en?: string;
  top_story_es?: string;
  sources: string[];
  analyzed_at: string;
}

interface TrendingRowProps {
  onTopicPress?: (topic: TrendingTopic) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  security: '🔒',
  politics: '🏛️',
  tech: '💻',
  culture: '🎭',
  sports: '⚽',
  economy: '📈',
  entertainment: '🎬',
  weather: '🌤️',
  health: '🏥',
  general: '📰',
};

/**
 * TrendingRow Component for TV App
 * Displays "What's Trending in Israel" with topics from Israeli news.
 */
export const TrendingRow: React.FC<TrendingRowProps> = ({ onTopicPress }) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const currentLang = i18n.language;
  const isHebrew = currentLang === 'he';

  // Helper to get localized text
  const getLocalizedText = (heText: string, enText?: string, esText?: string) => {
    if (currentLang === 'he') return heText;
    if (currentLang === 'es') return esText || enText || heText;
    return enText || heText;
  };

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const result = await trendingService.getTopics() as TrendingData;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch trending:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    // Refresh every 30 minutes
    const interval = setInterval(fetchTrending, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <GlassView
        className={isMobilePhone ? "my-2" : "my-4"}
        intensity="light"
      >
        <View className={clsx(
          "flex items-center",
          isMobilePhone ? "mb-2" : "mb-4",
          isMobilePhone ? "px-4" : "px-6",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}>
          <Text className={clsx(
            "font-semibold text-white",
            isMobilePhone ? "text-base" : "text-lg"
          )}>
            {t('trending.title')}
          </Text>
          <Text className={clsx(
            isMobilePhone ? "text-base" : "text-xl",
            isRTL ? "mr-2" : "ml-2"
          )}>
            📈
          </Text>
        </View>
        <View className={clsx(
          "justify-center items-center",
          isMobilePhone ? "h-24" : "h-36"
        )}>
          <ActivityIndicator color="#a855f7" size="large" />
        </View>
      </GlassView>
    );
  }

  if (!data?.topics?.length) {
    return (
      <GlassView
        className={isMobilePhone ? "my-2" : "my-4"}
        intensity="light"
      >
        <View className={clsx(
          "flex items-center",
          isMobilePhone ? "mb-2" : "mb-4",
          isMobilePhone ? "px-4" : "px-6",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}>
          <Text className={clsx(
            "font-semibold text-white",
            isMobilePhone ? "text-base" : "text-lg"
          )}>
            {t('trending.title')}
          </Text>
          <Text className={clsx(
            isMobilePhone ? "text-base" : "text-xl",
            isRTL ? "mr-2" : "ml-2"
          )}>
            📈
          </Text>
        </View>
        <View className={clsx(
          "justify-center items-center px-6",
          isMobilePhone ? "h-14" : "h-24"
        )}>
          <Text className={clsx(
            "text-white/60 text-center",
            isMobilePhone ? "text-sm" : "text-base"
          )}>
            {t('trending.noTopics')}
          </Text>
        </View>
      </GlassView>
    );
  }

  // Get category label from translations
  const getCategoryLabel = (topic: TrendingTopic) => {
    // Use translation keys for known categories
    const categoryKey = `trending.categories.${topic.category}`;
    const translated = t(categoryKey);
    // If translation not found (returns the key), fall back to API label or category name
    if (translated === categoryKey) {
      if (currentLang === 'he') {
        return topic.category_label?.he || topic.category;
      }
      if (currentLang === 'es') {
        return topic.category_label?.es || topic.category_label?.en || topic.category;
      }
      return topic.category_label?.en || topic.category;
    }
    return translated;
  };

  return (
    <View className={isMobilePhone ? "my-2" : "my-4"}>
      {/* Header */}
      <View className={clsx(
        "flex items-center",
        isMobilePhone ? "mb-2" : "mb-4",
        isMobilePhone ? "px-4" : "px-6",
        isRTL ? "flex-row-reverse" : "flex-row"
      )}>
        <Text className={clsx(
          "font-semibold text-white",
          isMobilePhone ? "text-base" : "text-lg"
        )}>
          {t('trending.title')}
        </Text>
        <Text className={clsx(
          isMobilePhone ? "text-base" : "text-xl",
          isRTL ? "mr-2" : "ml-2"
        )}>
          📈
        </Text>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text className={clsx(
          "text-white/60",
          isMobilePhone ? "text-xs" : "text-sm",
          isMobilePhone ? "px-4" : "px-6",
          isMobilePhone ? "mb-2" : "mb-4",
          isRTL ? "text-right" : "text-left"
        )}>
          🇮🇱 {getLocalizedText(data.overall_mood, data.overall_mood_en, data.overall_mood_es)}
        </Text>
      )}

      {/* Topics ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={`px-6 py-1`}
        style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      >
        {data.topics.slice(0, isMobilePhone ? 4 : data.topics.length).map((topic, index) => (
          <View key={index} style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
            <TopicCard
              topic={topic}
              title={getLocalizedText(topic.title, topic.title_en, topic.title_es)}
              summary={isMobilePhone ? undefined : (topic.summary ? getLocalizedText(topic.summary, topic.summary_en, topic.summary_es) : undefined)}
              categoryLabel={getCategoryLabel(topic)}
              isFocused={focusedIndex === index}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              onPress={() => onTopicPress?.(topic)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Top Story */}
      {data.top_story && (
        <GlassView
          className={clsx(
            isMobilePhone ? "mx-4" : "mx-6",
            isMobilePhone ? "mt-2" : "mt-4",
            isMobilePhone ? "p-4" : "p-6",
            isMobilePhone ? "rounded-xl" : "rounded-2xl"
          )}
          intensity="light"
        >
          <Text className={clsx(
            "font-semibold text-purple-400 mb-1",
            isMobilePhone ? "text-xs" : "text-sm",
            isRTL ? "text-right" : "text-left"
          )}>
            {t('trending.topStory')}
          </Text>
          <Text className={clsx(
            "text-white",
            isMobilePhone ? "text-xs" : "text-sm",
            isRTL ? "text-right" : "text-left"
          )}>
            {getLocalizedText(data.top_story, data.top_story_en, data.top_story_es)}
          </Text>
        </GlassView>
      )}

      {/* Sources */}
      <View className={clsx(
        isMobilePhone ? "px-4" : "px-6",
        isMobilePhone ? "mt-1" : "mt-2",
        isRTL ? "flex-row-reverse" : "flex-row"
      )}>
        <Text className={clsx(
          "text-white/40",
          isMobilePhone ? "text-xs" : "text-sm"
        )}>
          {t('trending.sources')}:{' '}
        </Text>
        <Text className={clsx(
          "text-white/40",
          isMobilePhone ? "text-xs" : "text-sm"
        )}>
          {data.sources.join(', ')}
        </Text>
      </View>
    </View>
  );
};

interface TopicCardProps {
  topic: TrendingTopic;
  title: string;
  summary?: string;
  categoryLabel: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
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
            ${isMobilePhone ? 'w-40 min-h-[100px] p-4' : 'w-70 min-h-[240px] p-6'}
            rounded-2xl
            border-2
            ${isFocused ? 'border-purple-500 bg-purple-900/30 shadow-purple-500/40 shadow-lg' : 'border-transparent bg-[rgba(30,30,50,0.6)]'}
            mr-6
          `}
          intensity="medium"
        >
          <View className={clsx(
            "flex items-center",
            isMobilePhone ? "mb-2" : "mb-4",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            <Text className={clsx(
              isMobilePhone ? "text-base" : "text-3xl",
              isRTL ? "ml-2" : "mr-2"
            )}>
              {CATEGORY_EMOJIS[topic.category] || '📌'}
            </Text>
            <View className={clsx(
              "bg-purple-900/30 py-1 rounded-full border border-purple-400/60",
              isMobilePhone ? "px-2" : "px-4"
            )}>
              <Text className={clsx(
                "text-purple-400/90 font-semibold",
                isMobilePhone ? "text-xs" : "text-sm"
              )}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text
            className={clsx(
              "font-bold text-white flex-1",
              isMobilePhone ? "text-sm" : "text-base",
              isMobilePhone ? "mb-2" : "mb-4",
              isMobilePhone ? "leading-5" : "leading-6",
              isRTL ? "text-right" : "text-left"
            )}
            numberOfLines={isMobilePhone ? 2 : 3}
          >
            {title}
          </Text>

          {summary && !isMobilePhone && (
            <Text
              className={clsx(
                "text-white/70",
                isMobilePhone ? "text-xs" : "text-sm",
                isMobilePhone ? "mb-2" : "mb-4",
                isMobilePhone ? "leading-4" : "leading-5",
                isRTL ? "text-right" : "text-left"
              )}
              numberOfLines={3}
            >
              {summary}
            </Text>
          )}

          {/* Importance indicator - hide on mobile phones */}
          {!isMobilePhone && (
            <View className={clsx(
              "flex mt-auto",
              isMobilePhone ? "gap-1" : "gap-1.5",
              isRTL ? "flex-row-reverse" : "flex-row"
            )}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  className={clsx(
                    isMobilePhone ? "w-1.5 h-1.5 rounded-[3px]" : "w-2 h-2 rounded-[4px]",
                    i < Math.ceil(topic.importance / 2) ? "bg-purple-500" : "bg-white/20"
                  )}
                />
              ))}
            </View>
          )}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default TrendingRow;
