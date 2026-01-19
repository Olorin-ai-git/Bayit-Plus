import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
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
      <GlassView style={styles.container} intensity="light">
        <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
          <Text style={styles.headerTitle}>{t('trending.title')}</Text>
          <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>📈</Text>
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
        <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
          <Text style={styles.headerTitle}>{t('trending.title')}</Text>
          <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>📈</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('trending.noTopics')}</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
        <Text style={styles.headerTitle}>{t('trending.title')}</Text>
        <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>📈</Text>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text style={[styles.overallMood, { textAlign: isRTL ? 'right' : 'left' }]}>
          🇮🇱 {getLocalizedText(data.overall_mood, data.overall_mood_en, data.overall_mood_es)}
        </Text>
      )}

      {/* Topics ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.topicsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {data.topics.map((topic, index) => (
          <TopicCard
            key={index}
            topic={topic}
            title={getLocalizedText(topic.title, topic.title_en, topic.title_es)}
            summary={topic.summary ? getLocalizedText(topic.summary, topic.summary_en, topic.summary_es) : undefined}
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
            {getLocalizedText(data.top_story, data.top_story_en, data.top_story_es)}
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
          style={[
            styles.topicCard,
            isFocused && styles.topicCardFocused,
          ]}
          intensity="medium"
        >
          <View style={[styles.topicHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.categoryEmoji, { marginLeft: isRTL ? spacing.sm : 0, marginRight: isRTL ? 0 : spacing.sm }]}>
              {CATEGORY_EMOJIS[topic.category] || '📌'}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categoryLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.topicTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }]} numberOfLines={3}>
            {title}
          </Text>

          {summary && (
            <Text style={[styles.topicSummary, { textAlign: isRTL ? 'right' : 'left', writingDirection: 'auto' }]} numberOfLines={3}>
              {summary}
            </Text>
          )}

          {/* Importance indicator */}
          <View style={[styles.importanceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
    marginVertical: isMobilePhone ? spacing.sm : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isMobilePhone ? spacing.xs : spacing.sm,
    paddingHorizontal: isMobilePhone ? spacing.sm : spacing.md,
  },
  headerEmoji: {
    fontSize: isMobilePhone ? 16 : 20,
    marginRight: isMobilePhone ? spacing.xs : spacing.sm,
  },
  headerTitle: {
    fontSize: isMobilePhone ? fontSize.md : fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    height: isMobilePhone ? 100 : 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: isMobilePhone ? 60 : 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontSize: isMobilePhone ? fontSize.sm : fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overallMood: {
    fontSize: isMobilePhone ? fontSize.xs : fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: isMobilePhone ? spacing.sm : spacing.md,
    marginBottom: isMobilePhone ? spacing.sm : spacing.md,
  },
  topicsContainer: {
    paddingHorizontal: isMobilePhone ? spacing.sm : spacing.md,
    gap: isMobilePhone ? spacing.sm : spacing.md,
  },
  topicCard: {
    width: isMobilePhone ? 160 : 280,
    height: isMobilePhone ? 140 : 240,
    padding: isMobilePhone ? spacing.sm : spacing.lg,
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: isMobilePhone ? spacing.sm : spacing.md,
    backgroundColor: 'rgba(30, 30, 50, 0.6)',
  },
  topicCardFocused: {
    borderColor: '#a855f7',
    borderWidth: 2,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  topicHeader: {
    alignItems: 'center',
    marginBottom: isMobilePhone ? spacing.xs : spacing.md,
  },
  categoryEmoji: {
    fontSize: isMobilePhone ? 20 : 28,
  },
  categoryBadge: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: isMobilePhone ? spacing.sm : spacing.md,
    paddingVertical: isMobilePhone ? 2 : 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  categoryText: {
    fontSize: isMobilePhone ? 10 : fontSize.xs,
    color: 'rgba(168, 85, 247, 0.9)',
    fontWeight: '600',
  },
  topicTitle: {
    fontSize: isMobilePhone ? fontSize.sm : fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: isMobilePhone ? spacing.xs : spacing.sm,
    lineHeight: isMobilePhone ? 16 : 22,
  },
  topicSummary: {
    fontSize: isMobilePhone ? 11 : fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: isMobilePhone ? spacing.xs : spacing.md,
    lineHeight: isMobilePhone ? 14 : 18,
  },
  importanceContainer: {
    flexDirection: 'row',
    gap: isMobilePhone ? 4 : 6,
    marginTop: 'auto',
  },
  importanceDot: {
    width: isMobilePhone ? 6 : 8,
    height: isMobilePhone ? 6 : 8,
    borderRadius: isMobilePhone ? 3 : 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  importanceDotActive: {
    backgroundColor: '#a855f7',
  },
  topStoryContainer: {
    marginHorizontal: isMobilePhone ? spacing.sm : spacing.md,
    marginTop: isMobilePhone ? spacing.sm : spacing.md,
    padding: isMobilePhone ? spacing.sm : spacing.md,
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
  },
  topStoryLabel: {
    fontSize: isMobilePhone ? 10 : fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  topStoryText: {
    fontSize: isMobilePhone ? fontSize.xs : fontSize.sm,
    color: colors.text,
  },
  sourcesContainer: {
    flexDirection: 'row',
    paddingHorizontal: isMobilePhone ? spacing.sm : spacing.md,
    marginTop: isMobilePhone ? spacing.xs : spacing.sm,
  },
  sourcesLabel: {
    fontSize: isMobilePhone ? 10 : fontSize.xs,
    color: colors.textMuted,
  },
  sourcesText: {
    fontSize: isMobilePhone ? 10 : fontSize.xs,
    color: colors.textMuted,
  },
});

export default TrendingRow;
