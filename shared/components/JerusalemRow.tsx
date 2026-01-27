/**
 * Jerusalem Row Component (Backward Compatible Export)
 *
 * Displays Jerusalem-focused content from Israeli news sources.
 * Built with React Native StyleSheet, Glass components, theme colors, and i18n.
 *
 * Features:
 * - Kotel events, IDF ceremonies, diaspora connection news
 * - Glassmorphic design with backdrop blur
 * - Full RTL support
 * - Multi-language (Hebrew, English, Spanish)
 * - Cross-platform (iOS, Android, tvOS, Web)
 */

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
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { GlassCard } from './ui/GlassCard';
import { GlassBadge } from './ui/GlassBadge';
import { apiJerusalemService } from '../services/api/cultureServices';
import { colors, spacing, borderRadius, fontSize, shadowRN } from '@olorin/design-tokens';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import logger from '../utils/logger';

// Platform detection
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

// Jerusalem panoramic background
const JerusalemBackground = require('../assets/images/Scenery/Jerusalem.png');

// Content item interface
interface JerusalemContentItem {
  id: string;
  source_name: string;
  title: string;
  title_he?: string;
  title_en?: string;
  title_es?: string;
  url: string;
  published_at: string;
  summary?: string;
  summary_he?: string;
  summary_en?: string;
  summary_es?: string;
  image_url?: string;
  category: string;
  category_label: { he: string; en: string; es?: string };
  tags: string[];
  relevance_score: number;
}

interface JerusalemContentData {
  items: JerusalemContentItem[];
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

interface JerusalemRowProps {
  onItemPress?: (item: JerusalemContentItem) => void;
  category?: string;
  showTitle?: boolean;
}

// Category emojis
const CATEGORY_EMOJIS: Record<string, string> = {
  kotel: '🕎',
  'idf-ceremony': '🎖️',
  'diaspora-connection': '🌍',
  'holy-sites': '✡️',
  'jerusalem-events': '🇮🇱',
  general: '📰',
};

/**
 * JerusalemRow Component
 */
export const JerusalemRow: React.FC<JerusalemRowProps> = ({
  onItemPress,
  category,
  showTitle = true,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [data, setData] = useState<JerusalemContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const currentLang = i18n.language;

  // Localized field helper
  const getLocalizedField = (
    item: Record<string, any>,
    field: string
  ): string => {
    const langSuffix = currentLang === 'he' ? '_he' : currentLang === 'es' ? '_es' : '_en';
    return item[`${field}${langSuffix}`] || item[`${field}_en`] || item[field] || '';
  };

  // Fetch content from API
  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiJerusalemService.getContent(category);
      setData(result.data || result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to fetch Jerusalem content', 'JerusalemRow', { error: errorMsg });
      setError(errorMsg);
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

  // Handle item press
  const handleItemPress = (item: JerusalemContentItem) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      Linking.openURL(item.url).catch((err) =>
        logger.error('Failed to open URL', 'JerusalemRow', { error: err.message, url: item.url })
      );
    }
  };

  // Get category label
  const getCategoryLabel = (item: JerusalemContentItem): string => {
    const categoryKey = `cities.jerusalem.categories.${item.category}`;
    const translated = t(categoryKey);
    if (translated !== categoryKey) return translated;

    if (currentLang === 'he') return item.category_label?.he || item.category;
    if (currentLang === 'es') return item.category_label?.es || item.category_label?.en || item.category;
    return item.category_label?.en || item.category;
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, isMobilePhone && styles.containerMobile]}>
        <ImageBackground
          source={JerusalemBackground}
          style={[styles.background, isMobilePhone && styles.backgroundMobile]}
          imageStyle={[styles.backgroundImage, isMobilePhone && styles.backgroundImageMobile]}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <View style={[styles.content, isMobilePhone && styles.contentMobile]}>
            {showTitle && (
              <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={[styles.title, isMobilePhone && styles.titleMobile]}>
                  {t('cities.jerusalem.title')}
                </Text>
                <Text style={[styles.titleEmoji, isRTL && styles.titleEmojiRTL]}>
                  🇮🇱
                </Text>
              </View>
            )}
            <View style={[styles.loadingContainer, isMobilePhone && styles.loadingContainerMobile]}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Error state
  if (error || !data?.items?.length) {
    return (
      <View style={[styles.container, isMobilePhone && styles.containerMobile]}>
        <ImageBackground
          source={JerusalemBackground}
          style={[styles.background, isMobilePhone && styles.backgroundMobile]}
          imageStyle={[styles.backgroundImage, isMobilePhone && styles.backgroundImageMobile]}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <View style={[styles.content, isMobilePhone && styles.contentMobile]}>
            {showTitle && (
              <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={[styles.title, isMobilePhone && styles.titleMobile]}>
                  {t('cities.jerusalem.title')}
                </Text>
                <Text style={[styles.titleEmoji, isRTL && styles.titleEmojiRTL]}>
                  🇮🇱
                </Text>
              </View>
            )}
            <View style={[styles.emptyContainer, isMobilePhone && styles.emptyContainerMobile]}>
              <Text style={[styles.emptyText, isMobilePhone && styles.emptyTextMobile]}>
                {error ? t('common.error') : t('cities.jerusalem.noContent')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Success state with content
  return (
    <View style={[styles.container, isMobilePhone && styles.containerMobile]}>
      <ImageBackground
        source={JerusalemBackground}
        style={[styles.background, isMobilePhone && styles.backgroundMobile]}
        imageStyle={[styles.backgroundImage, isMobilePhone && styles.backgroundImageMobile]}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={[styles.content, isMobilePhone && styles.contentMobile]}>
          {/* Header */}
          {showTitle && (
            <View style={[styles.header, isRTL && styles.headerRTL]}>
              <Text style={[styles.title, isMobilePhone && styles.titleMobile]}>
                {t('cities.jerusalem.title')}
              </Text>
              <Text style={[styles.titleEmoji, isRTL && styles.titleEmojiRTL]}>
                🇮🇱
              </Text>
            </View>
          )}

          {/* Subtitle */}
          <Text style={[
            styles.subtitle,
            isMobilePhone && styles.subtitleMobile,
            isRTL && styles.subtitleRTL
          ]}>
            {t('cities.jerusalem.subtitle')}
          </Text>

          {/* Content ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isMobilePhone && styles.scrollContentMobile,
              isRTL && styles.scrollContentRTL
            ]}
          >
            {data.items.map((item, index) => (
              <ContentCard
                key={item.id}
                item={item}
                title={getLocalizedField(item, 'title')}
                summary={item.summary ? getLocalizedField(item, 'summary') : undefined}
                categoryLabel={getCategoryLabel(item)}
                isFocused={focusedIndex === index}
                isRTL={isRTL}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </ScrollView>

          {/* Sources */}
          <View style={[styles.sources, isMobilePhone && styles.sourcesMobile, isRTL && styles.sourcesRTL]}>
            <Text style={[styles.sourcesLabel, isMobilePhone && styles.sourcesLabelMobile]}>
              {t('cities.jerusalem.sources')}:{' '}
            </Text>
            <Text style={[styles.sourcesText, isMobilePhone && styles.sourcesTextMobile]}>
              {Array.from(new Set(data.items.map(item => item.source_name).filter(Boolean))).join(', ')}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

// Content Card Component
interface ContentCardProps {
  item: JerusalemContentItem;
  title: string;
  summary?: string;
  categoryLabel: string;
  isFocused: boolean;
  isRTL: boolean;
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
  isRTL,
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

  return (
    <TouchableOpacity
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassCard
          style={[
            styles.card,
            isMobilePhone && styles.cardMobile,
            isFocused && styles.cardFocused,
          ]}
        >
          {/* Category Badge */}
          <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
            <Text style={[styles.cardEmoji, isRTL && styles.cardEmojiRTL]}>
              {CATEGORY_EMOJIS[item.category] || '📰'}
            </Text>
            <GlassBadge
              variant="info"
              style={[styles.badge, isMobilePhone && styles.badgeMobile]}
            >
              <Text style={[styles.badgeText, isMobilePhone && styles.badgeTextMobile]}>
                {categoryLabel}
              </Text>
            </GlassBadge>
          </View>

          {/* Title */}
          <Text
            style={[
              styles.cardTitle,
              isMobilePhone && styles.cardTitleMobile,
              isRTL && styles.cardTitleRTL
            ]}
            numberOfLines={3}
          >
            {title}
          </Text>

          {/* Summary */}
          {summary && (
            <Text
              style={[
                styles.cardSummary,
                isMobilePhone && styles.cardSummaryMobile,
                isRTL && styles.cardSummaryRTL
              ]}
              numberOfLines={2}
            >
              {summary}
            </Text>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={[styles.tags, isRTL && styles.tagsRTL]}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={[styles.tag, isMobilePhone && styles.tagMobile]}>
                  <Text style={[styles.tagText, isMobilePhone && styles.tagTextMobile]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={[styles.cardFooter, isRTL && styles.cardFooterRTL]}>
            <Text style={[styles.sourceName, isMobilePhone && styles.sourceNameMobile]}>
              {item.source_name}
            </Text>
            <View style={[styles.scoreIndicator, isRTL && styles.scoreIndicatorRTL]}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.scoreDot,
                    isMobilePhone && styles.scoreDotMobile,
                    i < Math.ceil(item.relevance_score / 2) && styles.scoreDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  containerMobile: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  background: {
    width: '100%',
    minHeight: 320,
    position: 'relative',
  },
  backgroundMobile: {
    minHeight: 180,
  },
  backgroundImage: {
    opacity: 1,
    borderRadius: borderRadius.xl,
  },
  backgroundImageMobile: {
    borderRadius: borderRadius.lg,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 30, 0.1)',
    borderRadius: borderRadius.xl,
  },
  content: {
    position: 'relative',
    zIndex: 10,
    paddingVertical: spacing.md,
  },
  contentMobile: {
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  titleMobile: {
    fontSize: fontSize.base,
  },
  titleEmoji: {
    fontSize: fontSize.xl,
    marginLeft: spacing.sm,
  },
  titleEmojiRTL: {
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: `${colors.text}99`,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'left',
  },
  subtitleMobile: {
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitleRTL: {
    textAlign: 'right',
  },
  loadingContainer: {
    height: 144,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainerMobile: {
    height: 80,
  },
  emptyContainer: {
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyContainerMobile: {
    height: 56,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: `${colors.text}99`,
    textAlign: 'center',
  },
  emptyTextMobile: {
    fontSize: fontSize.sm,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
  },
  scrollContentMobile: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
  },
  scrollContentRTL: {
    flexDirection: 'row-reverse',
  },
  sources: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  sourcesMobile: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  sourcesRTL: {
    flexDirection: 'row-reverse',
  },
  sourcesLabel: {
    fontSize: fontSize.sm,
    color: `${colors.text}66`,
  },
  sourcesLabelMobile: {
    fontSize: fontSize.xs,
  },
  sourcesText: {
    fontSize: fontSize.sm,
    color: `${colors.text}66`,
  },
  sourcesTextMobile: {
    fontSize: fontSize.xs,
  },
  // Card styles
  card: {
    width: 256,
    minWidth: 256,
    height: 176,
    minHeight: 176,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    flexShrink: 0,
  },
  cardMobile: {
    width: 176,
    minWidth: 176,
    height: 128,
    minHeight: 128,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  cardFocused: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: `${colors.primary.DEFAULT}33`,
    ...shadowRN.glass,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  cardEmoji: {
    fontSize: fontSize.xxl,
    marginRight: spacing.sm,
  },
  cardEmojiRTL: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: `${colors.primary.DEFAULT}4D`,
    borderColor: `${colors.primary.DEFAULT}99`,
  },
  badgeMobile: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: '600',
  },
  badgeTextMobile: {
    fontSize: fontSize.xs,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
    textAlign: 'left',
  },
  cardTitleMobile: {
    fontSize: fontSize.sm,
    lineHeight: 16,
  },
  cardTitleRTL: {
    textAlign: 'right',
  },
  cardSummary: {
    fontSize: fontSize.sm,
    color: `${colors.text}B3`,
    marginBottom: spacing.sm,
    lineHeight: 16,
    textAlign: 'left',
  },
  cardSummaryMobile: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
    lineHeight: 12,
  },
  cardSummaryRTL: {
    textAlign: 'right',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  tagsRTL: {
    flexDirection: 'row-reverse',
  },
  tag: {
    backgroundColor: `${colors.text}1A`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagMobile: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: `${colors.text}99`,
  },
  tagTextMobile: {
    fontSize: 9,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  cardFooterRTL: {
    flexDirection: 'row-reverse',
  },
  sourceName: {
    fontSize: fontSize.xs,
    color: `${colors.text}66`,
    textTransform: 'uppercase',
  },
  sourceNameMobile: {
    fontSize: 9,
  },
  scoreIndicator: {
    flexDirection: 'row',
  },
  scoreIndicatorRTL: {
    flexDirection: 'row-reverse',
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${colors.text}33`,
    marginRight: spacing.xs,
  },
  scoreDotMobile: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: spacing.xs,
  },
  scoreDotActive: {
    backgroundColor: colors.primary[600],
  },
});

export default JerusalemRow;
