import { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassCategoryPill } from '@bayit/shared/ui';
import { JerusalemRow, TelAvivRow } from '@bayit/shared';
import {
  JewishNewsFeed,
  JewishCalendarWidget,
  ShabbatTimesCard,
  CommunityDirectory,
  ShabbatEveSection,
} from '@/components/judaism';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

const CATEGORY_ICONS: Record<string, string> = {
  all: '✡️',
  news: '📰',
  calendar: '📅',
  community: '🏛️',
  shiurim: '📖',
  tefila: '🕯️',
  music: '🎵',
  holidays: '🕎',
  documentaries: '🎬',
};

interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  category: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
  duration?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

function JudaismCard({ item }: { item: JudaismItem }) {
  const { i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [isHovered, setIsHovered] = useState(false);
  // Track which thumbnail quality we're trying: 0=maxres, 1=hqdefault, 2=failed
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️';

  const getLocalizedText = (field: 'title' | 'description' | 'rabbi') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || '';
    if (lang === 'es') return item[`${field}_es` as keyof JudaismItem] || item[`${field}_en` as keyof JudaismItem] || item[field] || '';
    return item[`${field}_en` as keyof JudaismItem] || item[field] || '';
  };

  // Try different YouTube thumbnail qualities with proper fallback
  // Always prefer hqdefault (480x360) which is always available for any YouTube video
  // maxresdefault (1280x720) is not always available and causes 404 errors
  const getThumbnailUrl = (): string | null => {
    if (!item.thumbnail) return null;

    // Convert any maxresdefault URLs to hqdefault for reliability
    if (item.thumbnail.includes('maxresdefault')) {
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }

    // For other YouTube thumbnails or non-YouTube images
    return thumbnailAttempt < 2 ? item.thumbnail : null;
  };

  const handleImageError = () => {
    // Try next fallback quality
    if (thumbnailAttempt < 2) {
      setThumbnailAttempt(prev => prev + 1);
    }
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', width: '100%' }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={{ width: '100%' }}
      >
        <GlassCard style={[
          judaismCardStyles.card,
          isHovered && judaismCardStyles.cardHovered,
        ]}>
          {/* Thumbnail Container - portrait aspect ratio like carousel cards */}
          <View style={judaismCardStyles.thumbnailContainer}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={judaismCardStyles.thumbnail}
                resizeMode="cover"
                onError={handleImageError}
              />
            ) : (
              <View style={judaismCardStyles.thumbnailPlaceholder}>
                <Text style={{ fontSize: 48 }}>{categoryIcon}</Text>
              </View>
            )}

            {/* Play Overlay - matches carousel style */}
            {isHovered && (
              <View style={judaismCardStyles.playOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={judaismCardStyles.playButton}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}

            {/* Duration Badge - dark glass style like carousel cards */}
            {item.duration && (
              <View style={[
                judaismCardStyles.durationBadge,
                isRTL ? { left: 'auto', right: spacing.sm } : {},
              ]}>
                <Text style={judaismCardStyles.durationText}>{item.duration}</Text>
              </View>
            )}

            {/* Category Badge - top corner */}
            <View style={[
              judaismCardStyles.categoryBadge,
              isRTL ? { left: 'auto', right: spacing.sm } : {},
            ]}>
              <Text style={{ fontSize: 14 }}>{categoryIcon}</Text>
            </View>
          </View>

          {/* Content Info */}
          <View style={judaismCardStyles.info}>
            <Text
              style={[
                judaismCardStyles.title,
                isHovered && judaismCardStyles.titleHovered,
                { textAlign },
              ]}
              numberOfLines={2}
            >
              {getLocalizedText('title')}
            </Text>
            {item.rabbi && (
              <View style={judaismCardStyles.rabbiRow}>
                <User size={14} color={colors.primary} />
                <Text style={judaismCardStyles.rabbiText}>{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text style={judaismCardStyles.description} numberOfLines={2}>
                {getLocalizedText('description')}
              </Text>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const judaismCardStyles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
    // @ts-ignore - web-specific property
    boxShadow: `0 8px 32px rgba(107, 33, 168, 0.3)`,
  },
  thumbnailContainer: {
    aspectRatio: 2 / 3, // Portrait aspect ratio like carousel cards
    position: 'relative',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore - web-specific property
    backdropFilter: 'blur(8px)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - web-specific property
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    // @ts-ignore - web-specific property
    backdropFilter: 'blur(8px)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titleHovered: {
    color: colors.primary,
  },
  rabbiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  rabbiText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default function JudaismPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [content, setContent] = useState<JudaismItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories();
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      }
    } catch (err) {
      logger.error('Failed to load Judaism categories', 'JudaismPage', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await judaismService.getContent(category);
      if (response?.content && Array.isArray(response.content)) {
        setContent(response.content);
      }
    } catch (err) {
      logger.error('Failed to load Judaism content', 'JudaismPage', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (category: Category) => {
    const lang = i18n.language;
    if (lang === 'he') return category.name;
    if (lang === 'es') return category.name_es || category.name_en || category.name;
    return category.name_en || category.name;
  };

  // Special views for news, calendar, and community categories
  const renderSpecialView = () => {
    switch (selectedCategory) {
      case 'news':
        return (
          <View className="gap-4">
            <JewishNewsFeed limit={30} />
          </View>
        );
      case 'calendar':
        return (
          <View className="gap-4">
            <View className="flex-row gap-4 flex-wrap">
              <View className="flex-1 min-w-80">
                <JewishCalendarWidget />
              </View>
              <View className="flex-1 min-w-80">
                <ShabbatTimesCard />
              </View>
            </View>
          </View>
        );
      case 'community':
        return (
          <View className="gap-4">
            <CommunityDirectory />
          </View>
        );
      default:
        return null;
    }
  };

  const showSpecialView = ['news', 'calendar', 'community'].includes(selectedCategory);

  // Default view when "All" is selected and no content - show dashboard
  const renderDashboardView = () => {
    return (
      <View className="gap-6">
        {/* Shabbat Eve Section - prominent at top */}
        <ShabbatEveSection />

        {/* Jerusalem Connection Section */}
        <View>
          <JerusalemRow />
        </View>

        {/* Tel Aviv Connection Section */}
        <View>
          <TelAvivRow />
        </View>

        {/* Calendar and Shabbat Times Row */}
        <View className="flex-row gap-4 flex-wrap">
          <View className="flex-1 min-w-80">
            <JewishCalendarWidget />
          </View>
          <View className="flex-1 min-w-80">
            <ShabbatTimesCard />
          </View>
        </View>

        {/* News Section */}
        <View>
          <Text className="text-xl font-bold mb-4" style={{ color: colors.text, textAlign }}>
            📰 {t('judaism.categories.news', 'Jewish News')}
          </Text>
          <JewishNewsFeed limit={10} />
        </View>

        {/* Community Section */}
        <View>
          <Text className="text-xl font-bold mb-4" style={{ color: colors.text, textAlign }}>
            🏛️ {t('judaism.categories.community', 'Community')}
          </Text>
          <CommunityDirectory />
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-6" style={{ flexDirection, justifyContent }}>
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: colors.glassLight }}>
            <Text className="text-4xl">✡️</Text>
          </View>
          <View>
            <Text className="text-3xl font-bold" style={{ color: colors.text, textAlign }}>
              {t('judaism.title', 'Judaism')}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary, textAlign }}>
              {content.length > 0 ? `${content.length} ${t('judaism.items', 'items')}` : t('judaism.dashboard', 'Your Jewish Dashboard')}
            </Text>
          </View>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
          >
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                label={getCategoryName(category)}
                emoji={CATEGORY_ICONS[category.id] || '✡️'}
                isActive={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Content Area */}
        {showSpecialView ? (
          renderSpecialView()
        ) : isLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : content.length > 0 ? (
          <>
            {/* Show Shabbat Eve Section at top when viewing content */}
            <ShabbatEveSection />

            {/* Jerusalem and Tel Aviv Connection Sections */}
            <View className="gap-4 my-4">
              <JerusalemRow />
              <TelAvivRow />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
              {content.map((item) => (
                <View
                  key={item.id}
                  style={{
                    width: `calc(${100 / numColumns}% - ${(numColumns - 1) * spacing.md / numColumns}px)`,
                    minWidth: 200,
                  }}
                >
                  <JudaismCard item={item} />
                </View>
              ))}
            </View>
          </>
        ) : (
          // No content - show the dashboard view with all widgets
          renderDashboardView()
        )}
      </View>
    </ScrollView>
  );
}
