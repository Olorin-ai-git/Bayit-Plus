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
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
      const response = await cultureService.getCultureTrending(effectiveCultureId);
      const trendingData: CultureTrendingData = response.data || response;
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
      <GlassView style={styles.container} intensity="light">
        <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
          <Text style={styles.headerTitle}>
            {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
          </Text>
          <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>
            🔥
          </Text>
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
        <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
          <Text style={styles.headerTitle}>
            {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
          </Text>
          <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>
            🔥
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('cultureTrending.noTopics')}</Text>
        </View>
      </GlassView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
        <Text style={styles.headerEmoji}>{getCultureFlag()}</Text>
        <Text style={[
          styles.headerTitle,
          { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }
        ]}>
          {t('cultureTrending.whatsHotIn', { location: getCultureLabel() })}
        </Text>
        <Text style={styles.headerEmoji}>🔥</Text>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text style={[styles.overallMood, { textAlign: isRTL ? 'right' : 'left' }]}>
          {getLocalizedText(data.overall_mood, data.overall_mood_localized)}
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
        <View style={[styles.sourcesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.sourcesLabel}>{t('cultureTrending.sources')}: </Text>
          <Text style={styles.sourcesText}>{data.sources.join(', ')}</Text>
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
          style={[
            styles.topicCard,
            isFocused && styles.topicCardFocused,
          ]}
          intensity="medium"
        >
          <View style={[styles.topicHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {topic.category}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.topicTitle, { textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={3}
          >
            {title}
          </Text>

          {summary && (
            <Text
              style={[styles.topicSummary, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              {summary}
            </Text>
          )}

          {/* Relevance indicator */}
          <View style={[styles.relevanceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.relevanceDot,
                  i < Math.ceil(topic.relevance_score * 5) && styles.relevanceDotActive,
                ]}
              />
            ))}
          </View>

          {/* Source badge */}
          {topic.source && (
            <Text style={styles.sourceText} numberOfLines={1}>
              {topic.source}
            </Text>
          )}
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
    fontSize: isTV ? 24 : 20,
  },
  headerTitle: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
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
    color: colors.text.secondary,
    textAlign: 'center',
  },
  overallMood: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  topicsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  topicCard: {
    width: isTV ? 320 : 260,
    height: isTV ? 220 : 180,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: spacing.md,
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
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryEmoji: {
    fontSize: isTV ? 28 : 24,
  },
  categoryBadge: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: 'rgba(168, 85, 247, 0.9)',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  topicTitle: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    lineHeight: isTV ? 22 : 18,
  },
  topicSummary: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.sm,
    lineHeight: 16,
    flex: 1,
  },
  relevanceContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 'auto',
  },
  relevanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  relevanceDotActive: {
    backgroundColor: '#a855f7',
  },
  sourceText: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  sourcesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sourcesLabel: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  sourcesText: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    flex: 1,
  },
});

export default CultureTrendingRow;
