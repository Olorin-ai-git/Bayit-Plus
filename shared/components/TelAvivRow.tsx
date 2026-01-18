import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { telAvivService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

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

  // Helper to get localized text
  const getLocalizedText = (heText: string, enText?: string, esText?: string) => {
    if (currentLang === 'he') return heText;
    if (currentLang === 'es') return esText || enText || heText;
    return enText || heText;
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
      <GlassView style={styles.container} intensity="light">
        {showTitle && (
          <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
            <Text style={styles.headerTitle}>{t('telAviv.title')}</Text>
            <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>🌆</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GlassView>
    );
  }

  if (!data?.items?.length) {
    return (
      <GlassView style={styles.container} intensity="light">
        {showTitle && (
          <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
            <Text style={styles.headerTitle}>{t('telAviv.title')}</Text>
            <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>🌆</Text>
          </View>
        )}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('telAviv.noContent')}</Text>
        </View>
      </GlassView>
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
    <View style={styles.container}>
      {/* Header */}
      {showTitle && (
        <View style={[styles.header, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row', direction: 'ltr' }]}>
          <Text style={styles.headerTitle}>{t('telAviv.title')}</Text>
          <Text style={[styles.headerEmoji, { marginLeft: isRTL ? 0 : spacing.sm, marginRight: isRTL ? spacing.sm : 0 }]}>🌆</Text>
        </View>
      )}

      {/* Subtitle */}
      <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('telAviv.subtitle')}
      </Text>

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
            title={getLocalizedText(item.title, item.title_en)}
            summary={item.summary ? getLocalizedText(item.summary, item.summary_en) : undefined}
            categoryLabel={getCategoryLabel(item)}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onPress={() => handleItemPress(item)}
          />
        ))}
      </ScrollView>

      {/* Sources */}
      <View style={[styles.sourcesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.sourcesLabel}>{t('telAviv.sources')}: </Text>
        <Text style={styles.sourcesText}>
          {Array.from(new Set(data.items.map(item => item.source_name))).join(', ')}
        </Text>
      </View>
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
          style={[
            styles.contentCard,
            isFocused && styles.contentCardFocused,
          ]}
          intensity="medium"
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.categoryEmoji, { marginLeft: isRTL ? spacing.sm : 0, marginRight: isRTL ? 0 : spacing.sm }]}>
              {CATEGORY_EMOJIS[item.category] || '📰'}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
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
                    i < Math.ceil(item.relevance_score / 2) && styles.scoreDotActive,
                  ]}
                />
              ))}
            </View>
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
    marginBottom: spacing.xs,
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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
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
  itemsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  contentCard: {
    width: 300,
    height: 220,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: spacing.md,
    backgroundColor: 'rgba(30, 30, 50, 0.6)',
  },
  contentCardFocused: {
    borderColor: '#f97316',
    borderWidth: 2,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.6)',
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: 'rgba(253, 186, 116, 0.9)',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  cardSummary: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  tagsContainer: {
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  sourceText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scoreDotActive: {
    backgroundColor: '#f97316',
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

export default TelAvivRow;
