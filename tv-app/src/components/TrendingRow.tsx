import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { trendingService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

interface TrendingTopic {
  title: string;
  title_en?: string;
  category: string;
  category_label: { he: string; en: string };
  sentiment: string;
  importance: number;
  summary?: string;
  keywords: string[];
}

interface TrendingData {
  topics: TrendingTopic[];
  overall_mood: string;
  top_story?: string;
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
      <GlassView style={styles.container} intensity="light">
        <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
          <Text style={styles.headerEmoji}>📈</Text>
          <Text style={styles.headerTitle}>{t('trending.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GlassView>
    );
  }

  if (!data?.topics?.length) {
    return (
      <GlassView style={styles.container} intensity="light">
        <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
          <Text style={styles.headerEmoji}>📈</Text>
          <Text style={styles.headerTitle}>{t('trending.title')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('trending.noTopics')}</Text>
        </View>
      </GlassView>
    );
  }

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { borderColor: colors.success };
      case 'negative':
        return { borderColor: colors.error };
      default:
        return { borderColor: colors.glassBorder };
    }
  };

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
      return topic.category_label?.en || topic.category;
    }
    return translated;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <Text style={styles.headerEmoji}>📈</Text>
        <Text style={styles.headerTitle}>{t('trending.title')}</Text>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text style={[styles.overallMood, { textAlign: isRTL ? 'right' : 'left' }]}>
          🇮🇱 {data.overall_mood}
        </Text>
      )}

      {/* Topics ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicsContainer}
      >
        {data.topics.map((topic, index) => (
          <TopicCard
            key={index}
            topic={topic}
            categoryLabel={getCategoryLabel(topic)}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onPress={() => onTopicPress?.(topic)}
          />
        ))}
      </ScrollView>

      {/* Top Story */}
      {data.top_story && (
        <GlassView style={styles.topStoryContainer} intensity="light">
          <Text style={[styles.topStoryLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('trending.topStory')}
          </Text>
          <Text style={[styles.topStoryText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {data.top_story}
          </Text>
        </GlassView>
      )}

      {/* Sources */}
      <View style={[styles.sourcesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.sourcesLabel}>{t('trending.sources')}: </Text>
        <Text style={styles.sourcesText}>{data.sources.join(', ')}</Text>
      </View>
    </View>
  );
};

interface TopicCardProps {
  topic: TrendingTopic;
  categoryLabel: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  categoryLabel,
  isFocused,
  onFocus,
  onBlur,
  onPress,
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

  const getSentimentBorder = () => {
    switch (topic.sentiment) {
      case 'positive':
        return colors.success;
      case 'negative':
        return colors.error;
      default:
        return colors.glassBorder;
    }
  };

  return (
    <TouchableOpacity
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassView
          style={[
            styles.topicCard,
            { borderColor: getSentimentBorder() },
            isFocused && styles.topicCardFocused,
          ]}
          intensity="medium"
        >
          <View style={styles.topicHeader}>
            <Text style={styles.categoryEmoji}>
              {CATEGORY_EMOJIS[topic.category] || '📌'}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.topicTitle} numberOfLines={2}>
            {topic.title}
          </Text>

          {topic.summary && (
            <Text style={styles.topicSummary} numberOfLines={2}>
              {topic.summary}
            </Text>
          )}

          {/* Importance indicator */}
          <View style={styles.importanceContainer}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.importanceDot,
                  i < Math.ceil(topic.importance / 2) && styles.importanceDotActive,
                ]}
              />
            ))}
          </View>
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overallMood: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  topicsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  topicCard: {
    width: 220,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.md,
  },
  topicCardFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  topicTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  topicSummary: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  importanceContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  importanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  importanceDotActive: {
    backgroundColor: colors.primary,
  },
  topStoryContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  topStoryLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  topStoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'right',
  },
  sourcesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sourcesLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sourcesText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

export default TrendingRow;
